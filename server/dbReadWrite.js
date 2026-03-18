/**
 * Read/Write Database Abstraction — dbReadWrite.js
 * 
 * Separates read (SELECT) and write (INSERT/UPDATE/DELETE) query routing.
 * 
 * Architecture:
 *   - writeDb  → Primary PostgreSQL (always used for writes)
 *   - readDb   → Read replica if REPLICA_DATABASE_URL is set, primary otherwise
 * 
 * This pattern lets you drop in a read replica later by setting
 * REPLICA_DATABASE_URL without changing a single controller line.
 * 
 * Usage:
 *   const { readDb, writeDb } = require('./dbReadWrite');
 *   const events = await readDb('events').select('*');       // goes to replica
 *   await writeDb('events').insert({ ... });                 // goes to primary
 */
const knex = require('knex');
const knexConfig = require('./knexfile');

const environment = process.env.NODE_ENV || 'development';
const primaryConfig = knexConfig[environment];

// ─── Primary (write) pool ─────────────────────────────────────────────────────
const writeDb = require('./db');  // Already initialised primary pool

// ─── Replica (read) pool ──────────────────────────────────────────────────────
let readDb;

if (process.env.REPLICA_DATABASE_URL) {
    console.log('[DB] Read replica pool initialised');
    readDb = knex({
        client: 'postgresql',
        connection: {
            connectionString: process.env.REPLICA_DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        },
        pool: {
            min: parseInt(process.env.DB_READ_POOL_MIN || '2', 10),
            max: parseInt(process.env.DB_READ_POOL_MAX || '10', 10),
            idleTimeoutMillis: 600_000,
            acquireTimeoutMillis: 30_000,
            afterCreate: (conn, done) => conn.query('SELECT 1', (err) => done(err, conn))
        }
    });

    readDb.on('query-error', (err, q) =>
        console.error('[READ-DB ERROR]', err.message, q.sql?.substring(0, 80))
    );
} else {
    // No replica configured — fall through to primary for reads
    // Zero-cost: this is just a reference, no extra connection is created
    readDb = writeDb;
    console.log('[DB] No REPLICA_DATABASE_URL set — reads use primary pool');
}

/**
 * Use for all SELECT queries (events list, user profile, registrations).
 * Routes to replica when available; primary otherwise (zero-config fallback).
 */
module.exports.readDb = readDb;

/**
 * Use for all INSERT / UPDATE / DELETE / transactions.
 * Always routes to primary.
 */
module.exports.writeDb = writeDb;
