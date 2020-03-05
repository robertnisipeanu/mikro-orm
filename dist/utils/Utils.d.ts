import { GlobbyOptions } from 'globby';
import { MetadataStorage } from '../metadata';
import { AnyEntity, Dictionary, EntityData, EntityMetadata, EntityProperty, Primary } from '../typings';
import { Collection, Reference, ReferenceType } from '../entity';
import { Platform } from '../platforms';
export declare class Utils {
    /**
     * Checks if the argument is not undefined
     */
    static isDefined<T = object>(data: any): data is T;
    /**
     * Checks if the argument is instance of `Object`. Returns false for arrays.
     * `not` argument allows to blacklist classes that should be considered as not object.
     */
    static isObject<T = Dictionary>(o: any, not?: Function[]): o is T;
    /**
     * Checks if the argument is string
     */
    static isString(s: any): s is string;
    /**
     * Checks if the argument is number
     */
    static isNumber<T = number>(s: any): s is T;
    /**
     * Checks if arguments are deeply (but not strictly) equal.
     */
    static equals(a: any, b: any): boolean;
    /**
     * Gets array without duplicates.
     */
    static unique<T = string>(items: T[]): T[];
    /**
     * Merges all sources into the target recursively.
     */
    static merge(target: any, ...sources: any[]): any;
    /**
     * Computes difference between two objects, ignoring items missing in `b`.
     */
    static diff(a: Dictionary, b: Dictionary): Record<keyof (typeof a & typeof b), any>;
    /**
     * Computes difference between two entities. First calls `prepareEntity` on both, then uses the `diff` method.
     */
    static diffEntities<T extends AnyEntity<T>>(a: T, b: T, metadata: MetadataStorage, platform: Platform): EntityData<T>;
    /**
     * Removes ORM specific code from entities and prepares it for serializing. Used before change set computation.
     * References will be mapped to primary keys, collections to arrays of primary keys.
     */
    static prepareEntity<T extends AnyEntity<T>>(entity: T, metadata: MetadataStorage, platform: Platform): EntityData<T>;
    private static shouldIgnoreProperty;
    /**
     * Creates deep copy of given entity.
     */
    static copy<T>(entity: T): T;
    /**
     * Normalize the argument to always be an array.
     */
    static asArray<T>(data?: T | T[]): T[];
    /**
     * Renames object key, keeps order of properties.
     */
    static renameKey<T>(payload: T, from: string | keyof T, to: string): void;
    /**
     * Returns array of functions argument names. Uses `acorn` for source code analysis.
     */
    static getParamNames(func: Function | string, methodName?: string): string[];
    /**
     * Checks whether the argument looks like primary key (string, number or ObjectId).
     */
    static isPrimaryKey<T>(key: any): key is Primary<T>;
    /**
     * Extracts primary key from `data`. Accepts objects or primary keys directly.
     */
    static extractPK<T extends AnyEntity<T>>(data: any, meta?: EntityMetadata): Primary<T> | null;
    /**
     * Checks whether given object is an entity instance.
     */
    static isEntity<T = AnyEntity>(data: any, allowReference?: boolean): data is T;
    /**
     * Checks whether the argument is instance or `Reference` wrapper.
     */
    static isReference<T extends AnyEntity<T>>(data: any): data is Reference<T>;
    /**
     * Returns wrapped entity.
     */
    static unwrapReference<T extends AnyEntity<T>>(ref: T | Reference<T>): T;
    /**
     * Checks whether the argument is ObjectId instance
     */
    static isObjectID(key: any): boolean;
    /**
     * Checks whether the argument is empty (array without items, object without keys or falsy value).
     */
    static isEmpty(data: any): boolean;
    /**
     * Gets string name of given class.
     */
    static className(classOrName: string | Function): string;
    /**
     * Tries to detect `ts-node` runtime.
     */
    static detectTsNode(): boolean;
    /**
     * Uses some dark magic to get source path to caller where decorator is used.
     * Analyses stack trace of error created inside the function call.
     */
    static lookupPathFromDecorator(meta: EntityMetadata, stack?: string[]): string;
    /**
     * Gets the type of the argument.
     */
    static getObjectType(value: any): string;
    /**
     * Wraps the entity in a `Reference` wrapper if the property is defined as `wrappedReference`.
     */
    static wrapReference<T extends AnyEntity<T>>(entity: T | Reference<T>, prop: EntityProperty<T>): Reference<T> | T;
    /**
     * Executes the `cb` promise serially on every element of the `items` array and returns array of resolved values.
     */
    static runSerial<T = any, U = any>(items: Iterable<U>, cb: (item: U) => Promise<T>): Promise<T[]>;
    static isCollection(item: any, prop?: EntityProperty, type?: ReferenceType): item is Collection<AnyEntity>;
    static normalizePath(...parts: string[]): string;
    static relativePath(path: string, relativeTo: string): string;
    static absolutePath(path: string, baseDir?: string): string;
    static hash(data: string): string;
    static runIfNotEmpty(clause: () => any, data: any): void;
    static defaultValue<T extends Dictionary>(prop: T, option: keyof T, defaultValue: any): void;
    static findDuplicates<T>(items: T[]): T[];
    static randomInt(min: number, max: number): number;
    static pathExists(path: string, options?: GlobbyOptions): Promise<boolean>;
    /**
     * Extracts all possible values of a TS enum. Works with both string and numeric enums.
     */
    static extractEnumValues(target: Dictionary): (string | number)[];
}