import { Knex } from 'knex';
export declare function getDb(): Knex;
export declare function testConnection(): Promise<boolean>;
export declare function closeDb(): Promise<void>;
