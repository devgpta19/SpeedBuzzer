import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('guests');
  if (!hasTable) {
    await knex.schema.createTable('guests', (t) => {
      t.string('id', 64).primary(); // e.g. GST-XXXXXXXXXXXX generated from IP
      t.string('ip_address', 64).notNullable().unique();
      t.string('display_name', 48).notNullable();
      t.string('avatar', 255).nullable();
      t.string('color', 7).nullable();
      t.integer('visit_count').unsigned().defaultTo(1);
      t.string('user_agent', 500).nullable();
      t.timestamp('last_seen_at').defaultTo(knex.fn.now());
      t.timestamp('created_at').defaultTo(knex.fn.now());

      t.index('ip_address');
    });
  }

  const hasGuestIdColumn = await knex.schema.hasColumn('guest_sessions', 'guest_id');
  if (!hasGuestIdColumn) {
    await knex.schema.alterTable('guest_sessions', (t) => {
      t.string('guest_id', 64).nullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('guests')) {
    await knex.schema.dropTable('guests');
  }
}
