import { Collection, Db, MongoClient, MongoClientOptions } from 'mongodb';
import { Connection, ConnectionConfig, QueryResult } from './Connection';
import { QueryOrderMap } from '../query';
import { FilterQuery, AnyEntity, EntityName } from '../typings';
export declare class MongoConnection extends Connection {
    protected client: MongoClient;
    protected db: Db;
    connect(): Promise<void>;
    close(force?: boolean): Promise<void>;
    isConnected(): Promise<boolean>;
    getCollection(name: EntityName<AnyEntity>): Collection;
    getDefaultClientUrl(): string;
    getConnectionOptions(): MongoClientOptions & ConnectionConfig;
    getClientUrl(): string;
    execute(query: string): Promise<any>;
    find<T extends AnyEntity<T>>(collection: string, where: FilterQuery<T>, orderBy?: QueryOrderMap, limit?: number, offset?: number, fields?: string[]): Promise<T[]>;
    insertOne<T>(collection: string, data: Partial<T>): Promise<QueryResult>;
    updateMany<T>(collection: string, where: FilterQuery<T>, data: Partial<T>): Promise<QueryResult>;
    deleteMany<T>(collection: string, where: FilterQuery<T>): Promise<QueryResult>;
    aggregate(collection: string, pipeline: any[]): Promise<any[]>;
    countDocuments<T>(collection: string, where: FilterQuery<T>): Promise<number>;
    protected logQuery(query: string, took?: number): void;
    private runQuery;
    private convertObjectIds;
    private transformResult;
    private getCollectionName;
    private logObject;
}
