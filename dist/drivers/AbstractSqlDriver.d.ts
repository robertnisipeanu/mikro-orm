import { Transaction } from 'knex';
import { AnyEntity, Constructor, Dictionary, EntityData, EntityMetadata, EntityProperty, FilterQuery, Primary } from '../typings';
import { DatabaseDriver } from './DatabaseDriver';
import { QueryResult } from '../connections';
import { AbstractSqlConnection } from '../connections/AbstractSqlConnection';
import { QueryBuilder, QueryOrderMap } from '../query';
import { Configuration } from '../utils';
import { LockMode } from '../unit-of-work';
import { Platform } from '../platforms';
export declare abstract class AbstractSqlDriver<C extends AbstractSqlConnection = AbstractSqlConnection> extends DatabaseDriver<C> {
    protected readonly connection: C;
    protected readonly replicas: C[];
    protected readonly platform: Platform;
    protected constructor(config: Configuration, platform: Platform, connection: Constructor<C>, connector: string[]);
    find<T extends AnyEntity<T>>(entityName: string, where: FilterQuery<T>, populate?: string[], orderBy?: QueryOrderMap, fields?: string[], limit?: number, offset?: number, ctx?: Transaction): Promise<T[]>;
    findOne<T extends AnyEntity<T>>(entityName: string, where: FilterQuery<T>, populate?: string[], orderBy?: QueryOrderMap, fields?: string[], lockMode?: LockMode, ctx?: Transaction): Promise<T | null>;
    count(entityName: string, where: any, ctx?: Transaction): Promise<number>;
    nativeInsert<T extends AnyEntity<T>>(entityName: string, data: EntityData<T>, ctx?: Transaction): Promise<QueryResult>;
    nativeUpdate<T extends AnyEntity<T>>(entityName: string, where: FilterQuery<T>, data: EntityData<T>, ctx?: Transaction): Promise<QueryResult>;
    nativeDelete<T extends AnyEntity<T>>(entityName: string, where: FilterQuery<T> | string | any, ctx?: Transaction): Promise<QueryResult>;
    loadFromPivotTable<T extends AnyEntity<T>>(prop: EntityProperty, owners: Primary<T>[], where?: FilterQuery<T>, orderBy?: QueryOrderMap, ctx?: Transaction): Promise<Dictionary<T[]>>;
    /**
     * 1:1 owner side needs to be marked for population so QB auto-joins the owner id
     */
    protected autoJoinOneToOneOwner(meta: EntityMetadata, populate: string[]): string[];
    protected createQueryBuilder<T extends AnyEntity<T>>(entityName: string, ctx?: Transaction, write?: boolean): QueryBuilder<T>;
    protected extractManyToMany<T extends AnyEntity<T>>(entityName: string, data: EntityData<T>): EntityData<T>;
    protected processManyToMany<T extends AnyEntity<T>>(entityName: string, pk: Primary<T>, collections: EntityData<T>, ctx?: Transaction): Promise<void>;
}
