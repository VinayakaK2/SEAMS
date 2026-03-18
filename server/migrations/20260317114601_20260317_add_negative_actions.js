/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Knex implements enums in postgres as TEXT columns with a CHECK constraint.
  // We drop the check constraint entirely to allow the new actions ('skip', 'dislike', 'impression')
  // and future flexibility.
  await knex.raw(`ALTER TABLE user_activity DROP CONSTRAINT IF EXISTS user_activity_action_check`);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Re-adding the original constraint. Note this will fail if existing rows have 'skip' etc.
  await knex.raw(`
    ALTER TABLE user_activity 
    ADD CONSTRAINT user_activity_action_check 
    CHECK (action = ANY (ARRAY['view'::text, 'like'::text, 'register'::text]))
  `);
};
