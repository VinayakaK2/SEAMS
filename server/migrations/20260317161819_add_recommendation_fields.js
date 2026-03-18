/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Add interests and skills to users table
  await knex.schema.alterTable('users', (table) => {
    table.jsonb('interests').defaultTo('[]');
    table.jsonb('skills').defaultTo('[]');
  });

  // Add tags to events table
  await knex.schema.alterTable('events', (table) => {
    table.jsonb('tags').defaultTo('[]');
  });

  // Create user_activity table
  await knex.schema.createTable('user_activity', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('event_id').unsigned().notNullable();
    table.enum('action', ['view', 'like', 'register']).notNullable();
    table.datetime('timestamp').defaultTo(knex.fn.now());

    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('event_id').references('id').inTable('events').onDelete('CASCADE');
    
    // Indexes for fast querying in recommendation engine
    table.index(['user_id', 'action']);
    table.index(['event_id', 'action']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('user_activity');

  await knex.schema.alterTable('events', (table) => {
    table.dropColumn('tags');
  });

  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('skills');
    table.dropColumn('interests');
  });
};
