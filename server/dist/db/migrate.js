import knex from 'knex';
import { config } from '../config/index.js';
import { up as up001, down as down001 } from './migrations/001_initial_schema.js';
import { up as up002, down as down002 } from './migrations/002_create_guests_table.js';
async function migrate() {
    const direction = process.argv[2] || 'up';
    // First, ensure the database exists
    const rootDb = knex({
        client: 'mysql2',
        connection: {
            host: config.db.host,
            port: config.db.port,
            user: config.db.user,
            password: config.db.password,
        },
    });
    try {
        await rootDb.raw(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`✅ Database "${config.db.database}" ensured`);
    }
    finally {
        await rootDb.destroy();
    }
    // Connect to the actual database
    const db = knex({
        client: 'mysql2',
        connection: {
            host: config.db.host,
            port: config.db.port,
            user: config.db.user,
            password: config.db.password,
            database: config.db.database,
            charset: 'utf8mb4',
        },
    });
    try {
        if (direction === 'down') {
            console.log('⬇️  Rolling back migrations...');
            try {
                await down002(db);
            }
            catch (e) {
                console.warn('down002 notice:', e.message);
            }
            try {
                await down001(db);
            }
            catch (e) {
                console.warn('down001 notice:', e.message);
            }
            console.log('✅ Migrations rolled back');
        }
        else {
            console.log('⬆️  Running migrations...');
            try {
                await up001(db);
                console.log('✅ 001_initial_schema executed');
            }
            catch (e) {
                if (e.code === 'ER_TABLE_EXISTS_ERROR') {
                    console.log('ℹ️  001_initial_schema already applied');
                }
                else {
                    throw e;
                }
            }
            try {
                await up002(db);
                console.log('✅ 002_create_guests_table executed');
            }
            catch (e) {
                if (e.code === 'ER_TABLE_EXISTS_ERROR') {
                    console.log('ℹ️  002_create_guests_table already applied');
                }
                else {
                    throw e;
                }
            }
            console.log('✅ Migrations complete');
        }
    }
    catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
    finally {
        await db.destroy();
    }
}
migrate();
//# sourceMappingURL=migrate.js.map