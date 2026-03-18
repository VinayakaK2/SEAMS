/**
 * Refinement migration: adds missing constraints, composite indexes,
 * and tightens schema for production readiness.
 */
exports.up = async function(knex) {
  await knex.schema.table('registrations', (table) => {
    // Composite index on (student_id, event_id) for fast lookups of a student's registration in a specific event
    table.index(['student_id', 'event_id'], 'idx_registrations_student_event');
  });

  await knex.schema.table('events', (table) => {
    // Index on status for common filtered queries (e.g. "find all approved events")
    table.index('status', 'idx_events_status');
  });

  await knex.schema.table('audit_logs', (table) => {
    // Index on performedBy for admin queries filtering by user
    table.index('performedBy', 'idx_audit_logs_performed_by');
    // Index on timestamp for time-range queries
    table.index('timestamp', 'idx_audit_logs_timestamp');
  });
};

exports.down = async function(knex) {
  await knex.schema.table('registrations', (table) => {
    table.dropIndex(['student_id', 'event_id'], 'idx_registrations_student_event');
  });

  await knex.schema.table('events', (table) => {
    table.dropIndex('status', 'idx_events_status');
  });

  await knex.schema.table('audit_logs', (table) => {
    table.dropIndex('performedBy', 'idx_audit_logs_performed_by');
    table.dropIndex('timestamp', 'idx_audit_logs_timestamp');
  });
};
