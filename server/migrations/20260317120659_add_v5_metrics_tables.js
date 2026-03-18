exports.up = function(knex) {
    return knex.schema
        .createTable('recommendation_logs', table => {
            table.increments('id').primary();
            table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
            table.integer('event_id').unsigned().references('id').inTable('events').onDelete('CASCADE');
            table.string('algorithm_group').defaultTo('A'); // Group A vs B
            table.enum('action', ['shown', 'clicked', 'skipped']).notNullable();
            table.timestamp('timestamp').defaultTo(knex.fn.now());
            
            // Index for faster queries
            table.index(['user_id', 'event_id', 'action']);
        })
        .table('events', table => {
            table.integer('total_impressions').defaultTo(0);
            table.integer('total_clicks').defaultTo(0);
            table.integer('total_likes').defaultTo(0);
            table.integer('total_registrations').defaultTo(0);
            table.float('global_event_score').defaultTo(0); // V5 engagement score
        })
        .table('users', table => {
            table.float('engagement_score').defaultTo(0); // V5 User segmentation
        });
};

exports.down = function(knex) {
    return knex.schema
        .dropTableIfExists('recommendation_logs')
        .table('events', table => {
            table.dropColumn('total_impressions');
            table.dropColumn('total_clicks');
            table.dropColumn('total_likes');
            table.dropColumn('total_registrations');
            table.dropColumn('global_event_score');
        })
        .table('users', table => {
            table.dropColumn('engagement_score');
        });
};
