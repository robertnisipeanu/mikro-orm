import { PgConnectionConfig } from 'knex';
import { AbstractSqlConnection } from './AbstractSqlConnection';
export declare class PostgreSqlConnection extends AbstractSqlConnection {
    connect(): Promise<void>;
    getDefaultClientUrl(): string;
    getConnectionOptions(): PgConnectionConfig;
    protected transformRawResult<T>(res: any, method: 'all' | 'get' | 'run'): T;
}
