import { AbstractSqlDriver } from '../drivers';
import { MigrationsOptions } from '../utils';
export declare class MigrationStorage {
    protected readonly driver: AbstractSqlDriver;
    protected readonly options: MigrationsOptions;
    private readonly connection;
    private readonly knex;
    private readonly helper;
    constructor(driver: AbstractSqlDriver, options: MigrationsOptions);
    executed(): Promise<string[]>;
    logMigration(name: string): Promise<void>;
    unlogMigration(name: string): Promise<void>;
    getExecutedMigrations(): Promise<MigrationRow[]>;
    ensureTable(): Promise<void>;
}
export interface MigrationRow {
    name: string;
    executed_at: Date;
}
