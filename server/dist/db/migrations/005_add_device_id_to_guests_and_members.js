export async function up(knex) {
    const hasGuestDevice = await knex.schema.hasColumn('guests', 'device_id');
    if (!hasGuestDevice) {
        try {
            await knex.schema.alterTable('guests', (t) => {
                t.dropUnique(['ip_address'], 'guests_ip_address_unique');
            });
        }
        catch {
            // index might already be dropped
        }
        await knex.schema.alterTable('guests', (t) => {
            t.string('device_id', 64).nullable();
            t.index('device_id');
        });
    }
    const hasMemberDevice = await knex.schema.hasColumn('room_members', 'device_id');
    if (!hasMemberDevice) {
        await knex.schema.alterTable('room_members', (t) => {
            t.string('device_id', 64).nullable();
            t.index('device_id');
        });
    }
}
export async function down(knex) {
    if (await knex.schema.hasColumn('guests', 'device_id')) {
        await knex.schema.alterTable('guests', (t) => {
            t.dropColumn('device_id');
        });
    }
    if (await knex.schema.hasColumn('room_members', 'device_id')) {
        await knex.schema.alterTable('room_members', (t) => {
            t.dropColumn('device_id');
        });
    }
}
//# sourceMappingURL=005_add_device_id_to_guests_and_members.js.map