/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    if (!knex.client.config.client.includes('sqlite')) {
      table.jsonb('tag_profile').defaultTo('{}');
    } else {
      table.json('tag_profile').defaultTo('{}');
    }
    table.timestamp('last_active_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.dropColumn('tag_profile');
    table.dropColumn('last_active_at');
  });
};
