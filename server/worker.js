const rabbitmq = require('./utils/rabbitmq');
const axios = require('axios');
const db = require('./db');
require('dotenv').config();
const { exec } = require('child_process');

const ML_BASE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:5001';

const processRetrainQueue = async (channel) => {
    console.log('[WORKER] Binding persistent consumer to queue:retrain_jobs');
    channel.consume('queue:retrain_jobs', async (msg) => {
        if (!msg) return;
        console.log('[WORKER] Initiating background Meta-Ranker AMQP dispatched training...');
        
        exec('python ../ml/train_meta_ranker.py', { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                console.error(`[WORKER] Retrain execution failed: ${error.message}`);
                // Discard explicitly. DLX ignores basic queue without routing.
                channel.nack(msg, false, false); 
                return;
            }
            console.log(`[WORKER] Meta-Ranker Updated successfully.`);
            channel.ack(msg); // Explicit strictly guarded persistence
        });
    }, { noAck: false }); // Requires manual acknowledge wrapper
};

const processUserUpdateQueue = async (channel) => {
    console.log('[WORKER] Binding persistent consumer to queue:user_embed_update');
    channel.consume('queue:user_embed_update', async (msg) => {
        if (!msg) return;
        try {
            const jobStr = msg.content.toString();
            const job = JSON.parse(jobStr);
            console.log(`[WORKER] Picked up User EMA job natively: User ${job.userId} -> Event ${job.eventId}`);
            
            const resp = await axios.post(`${ML_BASE_URL}/ml/embed/update-user`, job, { timeout: 10000 });
            if (resp.data?.status === 'success' || resp.data?.status === 'ignored') {
                console.log(`[WORKER] Success -> User ${job.userId} vector profile dynamically scaled.`);
                channel.ack(msg);
            } else {
                // Requeue linearly for timeout or processing stall scenarios
                channel.nack(msg, false, true); 
            }
        } catch (e) {
            console.error(`[WORKER] EMA Panic: ${e.message}`);
            // Rate limit network cascades gently
            setTimeout(() => channel.nack(msg, false, true), 2000);
        }
    }, { noAck: false });
};

const processEmbeddingQueue = async (channel) => {
    console.log('[WORKER] Binding persistent consumer to queue:embedding_jobs');
    channel.consume('queue:embedding_jobs', async (msg) => {
        if (!msg) return;
        try {
            const jobStr = msg.content.toString();
            const job = JSON.parse(jobStr);
            console.log(`[WORKER] Processing embedding pipeline internally via AMQP for event ${job.id}`);
            
            const event = await db('events').where({ id: job.id }).first();
            if (!event) {
                console.log(`[WORKER] Skipped ${job.id} (not found natively in PostgreSQL)`);
                channel.ack(msg);
                return;
            }
            
            let tags = [];
            try { tags = Array.isArray(event.tags) ? event.tags : JSON.parse(event.tags || '[]'); } catch (e) {}

            const resp = await axios.post(`${ML_BASE_URL}/ml/embed/event`, {
                title: event.title || '',
                description: event.description || '',
                tags,
            }, { timeout: 15000 });

            if (resp.data?.status === 'success' && resp.data.embedding) {
                await db('events').where({ id: event.id }).update({
                    embedding: JSON.stringify(resp.data.embedding)
                });
                console.log(`[WORKER] Success -> Target Event Database Model correctly mutated.`);
                channel.ack(msg);
            } else {
                // False drops instantly push toward configured Dead Letter Queue Exchange
                console.warn(`[WORKER] Hard failure mapping Event Model. DLX Routing.`);
                channel.nack(msg, false, false); 
            }
        } catch (e) {
            console.error(`[WORKER] Catastrophic Semantic Pipeline failure mapping Vector: ${e.message}`);
            // Send payload reliably over to DLQ metrics wrapper
            channel.nack(msg, false, false); 
        }
    }, { noAck: false });
};

const start = async () => {
    try {
        const channel = await rabbitmq.getChannel();
        if (!channel) {
            console.warn('[WORKER] AMQP Connection isolated offline. Sleeping instance components.');
            return;
        }
        processEmbeddingQueue(channel);
        processRetrainQueue(channel);
        processUserUpdateQueue(channel);
        console.log('[WORKER] V12 Cluster AMQP Channels bound robustly protecting data-loss margins.');
    } catch(err) {
        console.error('[WORKER] Catastrophic Boot Panic:', err.message);
    }
};

start();
