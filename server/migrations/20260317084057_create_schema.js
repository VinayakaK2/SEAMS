exports.up = async function(knex) {
  // 1. users table
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('email').notNullable().unique();
    table.index('email');
    table.string('password_hash').notNullable();
    table.enum('role', ['student', 'coordinator', 'faculty', 'admin']).defaultTo('student').notNullable();
    table.string('usn');
    table.string('branch');
    table.string('semester');
    table.string('phone');
    table.integer('credits').defaultTo(0);
    table.string('department');
    table.boolean('isEmailVerified').defaultTo(false);
    table.string('emailVerificationToken');
    table.datetime('emailVerificationExpire');
    table.string('resetPasswordToken');
    table.datetime('resetPasswordExpire');
    table.timestamps(true, true);
  });

  // 2. user_badges table
  await knex.schema.createTable('user_badges', (table) => {
    table.integer('user_id').unsigned().notNullable();
    table.string('badge_name').notNullable();
    table.primary(['user_id', 'badge_name']);
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
  });

  // 3. events table
  await knex.schema.createTable('events', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description').notNullable();
    table.date('date').notNullable();
    table.string('time').notNullable();
    table.string('venue').notNullable();
    table.enum('category', ['Technical', 'Cultural', 'Sports', 'NSS', 'Entrepreneurship', 'Placement', 'Life Skills']).notNullable();
    table.integer('organizer_id').unsigned().nullable();
    table.foreign('organizer_id').references('id').inTable('users').onDelete('SET NULL');
    table.index('organizer_id');
    table.string('poster');
    table.integer('points').notNullable();
    table.integer('maxParticipants');
    table.integer('registeredCount').defaultTo(0);
    table.enum('status', ['pending', 'approved', 'rejected', 'completed']).defaultTo('pending');
    table.string('qrCode');
    table.boolean('qrActive').defaultTo(false);
    table.datetime('qrExpiresAt');
    table.datetime('startDate');
    table.string('startTime');
    table.datetime('endDate');
    table.string('endTime');
    table.timestamps(true, true);
  });

  // 4. event_coordinators table
  await knex.schema.createTable('event_coordinators', (table) => {
    table.integer('event_id').unsigned().notNullable();
    table.string('coordinator_name').notNullable();
    table.primary(['event_id', 'coordinator_name']); // Treating the combination as unique
    table.foreign('event_id').references('id').inTable('events').onDelete('CASCADE');
  });

  // 5. registrations table
  await knex.schema.createTable('registrations', (table) => {
    table.increments('id').primary();
    table.integer('student_id').unsigned().notNullable();
    table.integer('event_id').unsigned().notNullable();
    table.enum('status', ['registered', 'attended', 'verified', 'rejected']).defaultTo('registered');
    table.datetime('attendedAt');
    table.integer('verifiedBy').unsigned().nullable();
    table.string('certificateUrl');
    
    table.foreign('student_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('event_id').references('id').inTable('events').onDelete('CASCADE');
    table.foreign('verifiedBy').references('id').inTable('users').onDelete('SET NULL');
    
    table.index('student_id');
    table.index('event_id');
    
    table.unique(['student_id', 'event_id']); // Prevent duplicate registration
    table.timestamps(true, true);
  });

  // 6. audit_logs table
  await knex.schema.createTable('audit_logs', (table) => {
    table.increments('id').primary();
    table.string('action').notNullable();
    table.integer('performedBy').unsigned().nullable();
    table.string('targetId');
    table.string('targetType');
    table.jsonb('details'); // Using jsonb for object details
    table.datetime('timestamp').defaultTo(knex.fn.now());
    table.string('ipAddress');
    
    table.foreign('performedBy').references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('registrations');
  await knex.schema.dropTableIfExists('event_coordinators');
  await knex.schema.dropTableIfExists('events');
  await knex.schema.dropTableIfExists('user_badges');
  await knex.schema.dropTableIfExists('users');
};
