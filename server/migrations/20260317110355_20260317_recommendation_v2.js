/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.alterTable('events', table => {
      table.jsonb('keywords').defaultTo('[]');
  });

  // Add indexes to user_activity
  await knex.schema.alterTable('user_activity', table => {
      table.index('user_id');
      table.index('event_id');
  });

  // Adding GIN index on events.tags for faster array querying (PostgreSQL specific)
  // Assuming tags is a jsonb array
  await knex.raw('CREATE INDEX idx_events_tags_gin ON events USING GIN (tags)');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.raw('DROP INDEX IF EXISTS idx_events_tags_gin');
  
  await knex.schema.alterTable('user_activity', table => {
      table.dropIndex('user_id');
      table.dropIndex('event_id');
  });

  await knex.schema.alterTable('events', table => {
      table.dropColumn('keywords');
  });
};
