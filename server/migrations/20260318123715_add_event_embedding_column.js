/**
 * Migration: Add embedding column to events table
 * Stores a 384-dim float vector (JSON array) for sentence-transformer embeddings.
 */
exports.up = async function (knex) {
    await knex.schema.table('events', (table) => {
        // JSONB stores the float array efficiently; nullable so existing rows are safe
        table.jsonb('embedding').nullable().defaultTo(null);
    });
    console.log('[MIGRATION] Added events.embedding (jsonb) column');
};

exports.down = async function (knex) {
    await knex.schema.table('events', (table) => {
        table.dropColumn('embedding');
    });
    console.log('[MIGRATION] Dropped events.embedding column');
};
