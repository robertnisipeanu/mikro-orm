import { DatabaseDriver } from './DatabaseDriver';
import { MongoConnection } from '../connections/MongoConnection';
import { EntityData, AnyEntity, FilterQuery } from '../typings';
import { QueryOrderMap } from '../query';
import { Configuration } from '../utils';
import { MongoPlatform } from '../platforms/MongoPlatform';
import { QueryResult } from '../connections';
import { LockMode } from '../unit-of-work';
export declare class MongoDriver extends DatabaseDriver<MongoConnection> {
    protected readonly connection: MongoConnection;
    protected readonly platform: MongoPlatform;
    constructor(config: Configuration);
    find<T extends AnyEntity<T>>(entityName: string, where: FilterQuery<T>, populate: string[], orderBy?: QueryOrderMap, fields?: string[], limit?: number, offset?: number): Promise<T[]>;
    findOne<T extends AnyEntity<T>>(entityName: string, where: FilterQuery<T>, populate?: string[], orderBy?: QueryOrderMap, fields?: string[], lockMode?: LockMode): Promise<T | null>;
    count<T extends AnyEntity<T>>(entityName: string, where: FilterQuery<T>): Promise<number>;
    nativeInsert<T extends AnyEntity<T>>(entityName: string, data: EntityData<T>): Promise<QueryResult>;
    nativeUpdate<T extends AnyEntity<T>>(entityName: string, where: FilterQuery<T>, data: EntityData<T>): Promise<QueryResult>;
    nativeDelete<T extends AnyEntity<T>>(entityName: string, where: FilterQuery<T>): Promise<QueryResult>;
    aggregate(entityName: string, pipeline: any[]): Promise<any[]>;
    private renameFields;
}
