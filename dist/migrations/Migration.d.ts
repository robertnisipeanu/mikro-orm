import { Configuration } from '../utils';
import { AbstractSqlDriver } from '../drivers';
export declare abstract class Migration {
    protected readonly driver: AbstractSqlDriver;
    protected readonly config: Configuration;
    private readonly queries;
    constructor(driver: AbstractSqlDriver, config: Configuration);
    abstract up(): Promise<void>;
    down(): Promise<void>;
    isTransactional(): boolean;
    addSql(sql: string): void;
    reset(): void;
    getQueries(): string[];
}
