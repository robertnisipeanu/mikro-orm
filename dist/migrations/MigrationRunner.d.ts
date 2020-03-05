import { AbstractSqlDriver } from '../drivers';
import { MigrationsOptions } from '../utils';
import { Migration } from './Migration';
import { Transaction } from '../connections';
export declare class MigrationRunner {
    protected readonly driver: AbstractSqlDriver;
    protected readonly options: MigrationsOptions;
    private readonly connection;
    private readonly helper;
    private masterTransaction?;
    constructor(driver: AbstractSqlDriver, options: MigrationsOptions);
    run(migration: Migration, method: 'up' | 'down'): Promise<void>;
    setMasterMigration(trx: Transaction): void;
    unsetMasterMigration(): void;
}
