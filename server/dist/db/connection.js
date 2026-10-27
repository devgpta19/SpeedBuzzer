import knex from 'knex';
import { config } from '../config/index.js';
let db;
export function getDb() {
    if (!db) {
        db = knex({
            client: 'mysql2',
            connection: {
                host: config.db.host,
                port: config.db.port,
                user: config.db.user,
                password: config.db.password,
                database: config.db.database,
                charset: 'utf8mb4',
                timezone: '+00:00',
                ssl: config.db.ssl ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
            },
            pool: {
                min: 2,
                max: 10,
            },
            migrations: {
                directory: './src/db/migrations',
                extension: 'ts',
            },
            seeds: {
                directory: './src/db/seeds',
                extension: 'ts',
            },
        });
    }
    return db;
}
export async function testConnection() {
    try {
        const db = getDb();
        await db.raw('SELECT 1');
        console.log('✅ Database connected successfully');
        return true;
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}
export async function closeDb() {
    if (db) {
        await db.destroy();
        console.log('Database connection closed');
    }
}
//# sourceMappingURL=connection.js.map