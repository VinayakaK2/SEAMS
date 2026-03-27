const amqp = require('amqplib');
require('dotenv').config();

let connection = null;
let channel = null;

const connectRabbitMQ = async () => {
    try {
        const url = process.env.RABBITMQ_URL || 'amqp://localhost';
        connection = await amqp.connect(url);
        channel = await connection.createChannel();
        
        console.log('[RABBITMQ] Connected seamlessly to message broker.');

        // Initialize Dead Letter Exchange (DLX) for failed background tasks
        await channel.assertExchange('seams_dlx', 'direct', { durable: true });
        
        // Assert explicit Dead-Letter Queues (DLQs)
        await channel.assertQueue('embedding_jobs_dlq', { durable: true });
        await channel.bindQueue('embedding_jobs_dlq', 'seams_dlx', 'embedding_jobs_key');

        // Assert Main Operational Queues tied back to the DLX
        await channel.assertQueue('queue:embedding_jobs', { 
            durable: true,
            arguments: {
                'x-dead-letter-exchange': 'seams_dlx',
                'x-dead-letter-routing-key': 'embedding_jobs_key'
            }
        });
        
        await channel.assertQueue('queue:retrain_jobs', { durable: true });
        await channel.assertQueue('queue:user_embed_update', { durable: true });

        return channel;
    } catch (err) {
        console.warn(`[RABBITMQ] Connection Warning (Offline local testing expected): ${err.message}`);
        // Do not crash Node on boot if RabbitMQ is not installed locally
        return null;
    }
};

const publishToQueue = async (queueName, data) => {
    if (!channel) {
        await connectRabbitMQ();
    }
    if (!channel) return false;
    
    // Explicitly enforce persistent delivery guarantees onto the disk
    return channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
        persistent: true
    });
};

const getChannel = async () => {
    if (!channel) {
        await connectRabbitMQ();
    }
    return channel;
};

module.exports = {
    connectRabbitMQ,
    publishToQueue,
    getChannel
};
