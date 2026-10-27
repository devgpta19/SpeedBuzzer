import knex, { Knex } from 'knex';
import { config } from '../config/index.js';
import { up as up001, down as down001 } from './migrations/001_initial_schema.js';
import { up as up002, down as down002 } from './migrations/002_create_guests_table.js';
import { up as up003 } from './migrations/003_expand_idempotency_keys.js';
import { up as up004 } from './migrations/004_add_ip_and_inactive_to_room_members.js';
import { up as up005 } from './migrations/005_add_device_id_to_guests_and_members.js';
import { seedQuestions } from './seed.js';

export async function runMigrations(db: Knex): Promise<void> {
  console.log('⬆️  Running database migrations...');

  try {
    await up001(db);
    console.log('✅ 001_initial_schema executed');
  } catch (e: any) {
    if (e.code === 'ER_TABLE_EXISTS_ERROR' || e.message?.includes('already exists')) {
      console.log('ℹ️  001_initial_schema already applied');
    } else {
      console.warn('001 notice:', e.message);
    }
  }

  try {
    await up002(db);
    console.log('✅ 002_create_guests_table executed');
  } catch (e: any) {
    if (e.code === 'ER_TABLE_EXISTS_ERROR' || e.message?.includes('already exists')) {
      console.log('ℹ️  002_create_guests_table already applied');
    } else {
      console.warn('002 notice:', e.message);
    }
  }

  try {
    await up003(db);
    console.log('✅ 003_expand_idempotency_keys executed');
  } catch (e: any) {
    console.log('ℹ️  003_expand_idempotency_keys notice:', e.message);
  }

  try {
    await up004(db);
    console.log('✅ 004_add_ip_and_inactive_to_room_members executed');
  } catch (e: any) {
    console.log('ℹ️  004_add_ip_and_inactive notice:', e.message);
  }

  try {
    await up005(db);
    console.log('✅ 005_add_device_id_to_guests_and_members executed');
  } catch (e: any) {
    console.log('ℹ️  005_add_device_id notice:', e.message);
  }

  try {
    await seedQuestions(db);
  } catch (e: any) {
    console.warn('Auto-seed notice:', e.message);
  }

  console.log('✅ All migrations and seeds ready');
}

export async function migrate() {
  const direction = process.argv[2] || 'up';

  // If running locally, ensure database exists
  if (['localhost', '127.0.0.1'].includes(config.db.host)) {
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
    } catch (e: any) {
      console.warn('Database creation notice:', e.message);
    } finally {
      await rootDb.destroy();
    }
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
      ssl: config.db.ssl ? { minVersion: 'TLSv1.2', rejectUnauthorized: false } : undefined,
    },
  });

  try {
    if (direction === 'down') {
      console.log('⬇️  Rolling back migrations...');
      try { await down002(db); } catch (e: any) { console.warn('down002 notice:', e.message); }
      try { await down001(db); } catch (e: any) { console.warn('down001 notice:', e.message); }
      console.log('✅ Migrations rolled back');
    } else {
      await runMigrations(db);
    }
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

if (process.argv[1] && process.argv[1].includes('migrate')) {
  migrate();
}
