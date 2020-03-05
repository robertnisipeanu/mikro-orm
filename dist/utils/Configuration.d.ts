import { PoolConfig } from 'knex';
import { Theme } from 'cli-highlight';
import { NamingStrategy } from '../naming-strategy';
import { CacheAdapter, FileCacheAdapter } from '../cache';
import { MetadataProvider, TsMorphMetadataProvider } from '../metadata';
import { EntityFactory, EntityRepository } from '../entity';
import { Dictionary, EntityClass, EntityClassGroup, EntityName, AnyEntity, IPrimaryKey } from '../typings';
import { Hydrator, ObjectHydrator } from '../hydration';
import { Logger, LoggerNamespace, ValidationError } from '../utils';
import { EntityManager } from '../EntityManager';
import { EntityOptions, EntitySchema, IDatabaseDriver } from '..';
export declare class Configuration<D extends IDatabaseDriver = IDatabaseDriver> {
    static readonly DEFAULTS: {
        type: string;
        pool: {};
        entities: never[];
        entitiesDirs: never[];
        entitiesDirsTs: never[];
        discovery: {
            warnWhenNoEntities: boolean;
            requireEntitiesArray: boolean;
            alwaysAnalyseProperties: boolean;
            disableDynamicFileAccess: boolean;
            tsConfigPath: string;
        };
        autoFlush: boolean;
        strict: boolean;
        logger: {
            (message?: any, ...optionalParams: any[]): void;
            (message?: any, ...optionalParams: any[]): void;
        };
        findOneOrFailHandler: (entityName: string, where: string | number | Dictionary<any> | {
            toHexString(): string;
        }) => ValidationError<AnyEntity<any, string | number | symbol>>;
        baseDir: string;
        entityRepository: typeof EntityRepository;
        hydrator: typeof ObjectHydrator;
        autoJoinOneToOneOwner: boolean;
        propagateToOneOwner: boolean;
        forceUtcTimezone: boolean;
        tsNode: boolean;
        debug: boolean;
        verbose: boolean;
        driverOptions: {};
        migrations: {
            tableName: string;
            path: string;
            pattern: RegExp;
            transactional: boolean;
            disableForeignKeys: boolean;
            allOrNothing: boolean;
            emit: string;
        };
        cache: {
            enabled: boolean;
            pretty: boolean;
            adapter: typeof FileCacheAdapter;
            options: {
                cacheDir: string;
            };
        };
        metadataProvider: typeof TsMorphMetadataProvider;
        highlight: boolean;
        highlightTheme: {
            keyword: string[];
            built_in: string[];
            string: string[];
            literal: string;
            meta: string[];
        };
    };
    static readonly PLATFORMS: {
        mongo: string;
        mysql: string;
        mariadb: string;
        postgresql: string;
        sqlite: string;
    };
    private readonly options;
    private readonly logger;
    private readonly driver;
    private readonly platform;
    private readonly cache;
    private readonly highlightTheme;
    constructor(options: Options, validate?: boolean);
    /**
     * Gets specific configuration option. Falls back to specified `defaultValue` if provided.
     */
    get<T extends keyof MikroORMOptions<D>, U extends MikroORMOptions<D>[T]>(key: T, defaultValue?: U): U;
    /**
     * Overrides specified configuration value.
     */
    set<T extends keyof MikroORMOptions<D>, U extends MikroORMOptions<D>[T]>(key: T, value: U): void;
    /**
     * Gets Logger instance.
     */
    getLogger(): Logger;
    /**
     * Gets current client URL (connection string).
     */
    getClientUrl(hidePassword?: boolean): string;
    /**
     * Gets current database driver instance.
     */
    getDriver(): D;
    /**
     * Gets instance of NamingStrategy. (cached)
     */
    getNamingStrategy(): NamingStrategy;
    /**
     * Gets instance of Hydrator. Hydrator cannot be cached as it would have reference to wrong (global) EntityFactory.
     */
    getHydrator(factory: EntityFactory, em: EntityManager): Hydrator;
    /**
     * Gets instance of MetadataProvider. (cached)
     */
    getMetadataProvider(): MetadataProvider;
    /**
     * Gets instance of CacheAdapter. (cached)
     */
    getCacheAdapter(): CacheAdapter;
    /**
     * Gets EntityRepository class to be instantiated.
     */
    getRepositoryClass(customRepository: EntityOptions<AnyEntity>['customRepository']): MikroORMOptions<D>['entityRepository'];
    /**
     * Gets highlight there used when logging SQL.
     */
    getHighlightTheme(): Theme;
    private init;
    private validateOptions;
    private initDriver;
    private cached;
}
export interface ConnectionOptions {
    dbName: string;
    name?: string;
    clientUrl?: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    multipleStatements?: boolean;
    pool?: PoolConfig;
}
export declare type MigrationsOptions = {
    tableName?: string;
    path?: string;
    pattern?: RegExp;
    transactional?: boolean;
    disableForeignKeys?: boolean;
    allOrNothing?: boolean;
    emit?: 'js' | 'ts';
};
export interface MikroORMOptions<D extends IDatabaseDriver = IDatabaseDriver> extends ConnectionOptions {
    entities: (EntityClass<AnyEntity> | EntityClassGroup<AnyEntity> | EntitySchema<any>)[];
    entitiesDirs: string[];
    entitiesDirsTs: string[];
    discovery: {
        warnWhenNoEntities?: boolean;
        requireEntitiesArray?: boolean;
        alwaysAnalyseProperties?: boolean;
        disableDynamicFileAccess?: boolean;
        tsConfigPath?: string;
    };
    autoFlush: boolean;
    type: keyof typeof Configuration.PLATFORMS;
    driver?: {
        new (config: Configuration): D;
    };
    driverOptions: Dictionary;
    namingStrategy?: {
        new (): NamingStrategy;
    };
    autoJoinOneToOneOwner: boolean;
    propagateToOneOwner: boolean;
    forceUtcTimezone: boolean;
    hydrator: {
        new (factory: EntityFactory, em: EntityManager): Hydrator;
    };
    entityRepository: {
        new (em: EntityManager, entityName: EntityName<AnyEntity>): EntityRepository<AnyEntity>;
    };
    replicas?: Partial<ConnectionOptions>[];
    strict: boolean;
    logger: (message: string) => void;
    findOneOrFailHandler: (entityName: string, where: Dictionary | IPrimaryKey) => Error;
    debug: boolean | LoggerNamespace[];
    highlight: boolean;
    highlightTheme?: Record<string, string | string[]>;
    tsNode: boolean;
    baseDir: string;
    migrations: MigrationsOptions;
    cache: {
        enabled?: boolean;
        pretty?: boolean;
        adapter?: {
            new (...params: any[]): CacheAdapter;
        };
        options?: Dictionary;
    };
    metadataProvider: {
        new (config: Configuration): MetadataProvider;
    };
}
export declare type Options<D extends IDatabaseDriver = IDatabaseDriver> = Pick<MikroORMOptions<D>, Exclude<keyof MikroORMOptions<D>, keyof typeof Configuration.DEFAULTS>> | MikroORMOptions<D>;