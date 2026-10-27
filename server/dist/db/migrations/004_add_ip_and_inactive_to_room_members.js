export async function up(knex) {
    const hasIp = await knex.schema.hasColumn('room_members', 'ip_address');
    if (!hasIp) {
        await knex.schema.alterTable('room_members', (t) => {
            t.string('ip_address', 64).nullable();
            t.index('ip_address');
        });
    }
    const hasIsActive = await knex.schema.hasColumn('room_members', 'is_active');
    if (!hasIsActive) {
        await knex.schema.alterTable('room_members', (t) => {
            t.string('is_active', 1).notNullable().defaultTo('Y');
        });
    }
    const hasInactive = await knex.schema.hasColumn('room_members', 'inactive');
    if (!hasInactive) {
        await knex.schema.alterTable('room_members', (t) => {
            t.string('inactive', 1).notNullable().defaultTo('N');
        });
    }
}
export async function down(knex) {
    await knex.schema.alterTable('room_members', (t) => {
        t.dropColumn('ip_address');
        t.dropColumn('is_active');
        t.dropColumn('inactive');
    });
}
//# sourceMappingURL=004_add_ip_and_inactive_to_room_members.js.map