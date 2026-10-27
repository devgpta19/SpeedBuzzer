import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('score_events', (t) => {
    t.string('idempotency_key', 191).notNullable().alter();
  });

  await knex.schema.alterTable('buzzer_events', (t) => {
    t.string('idempotency_key', 191).nullable().alter();
  });

  await knex.schema.alterTable('answer_submissions', (t) => {
    t.string('idempotency_key', 191).nullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('score_events', (t) => {
    t.string('idempotency_key', 64).notNullable().alter();
  });
}
