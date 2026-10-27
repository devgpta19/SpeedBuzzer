export async function up(knex) {
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
export async function down(knex) {
    await knex.schema.alterTable('score_events', (t) => {
        t.string('idempotency_key', 64).notNullable().alter();
    });
}
//# sourceMappingURL=003_expand_idempotency_keys.js.map