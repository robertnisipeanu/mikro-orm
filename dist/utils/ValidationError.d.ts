import { Dictionary, EntityMetadata, EntityProperty, AnyEntity, IPrimaryKey, Constructor } from '../typings';
import { Type } from '../types';
export declare class ValidationError<T extends AnyEntity = AnyEntity> extends Error {
    private readonly entity?;
    constructor(message: string, entity?: T | undefined);
    /**
     * Gets instance of entity that caused this error.
     */
    getEntity(): AnyEntity | undefined;
    static fromWrongPropertyType(entity: AnyEntity, property: string, expectedType: string, givenType: string, givenValue: string): ValidationError;
    static fromCollectionNotInitialized(entity: AnyEntity, prop: EntityProperty): ValidationError;
    static fromMissingPrimaryKey(meta: EntityMetadata): ValidationError;
    static fromWrongReference(meta: EntityMetadata, prop: EntityProperty, key: keyof EntityProperty, owner?: EntityProperty): ValidationError;
    static fromWrongTypeDefinition(meta: EntityMetadata, prop: EntityProperty): ValidationError;
    static fromWrongOwnership(meta: EntityMetadata, prop: EntityProperty, key: keyof EntityProperty): ValidationError;
    static fromMergeWithoutPK(meta: EntityMetadata): void;
    static fromUnknownBaseEntity(meta: EntityMetadata): ValidationError;
    static transactionRequired(): ValidationError;
    static entityNotManaged(entity: AnyEntity): ValidationError;
    static notEntity(owner: AnyEntity, prop: EntityProperty, data: any): ValidationError;
    static notVersioned(meta: EntityMetadata): ValidationError;
    static multipleVersionFields(meta: EntityMetadata, fields: string[]): ValidationError;
    static invalidVersionFieldType(meta: EntityMetadata): ValidationError;
    static lockFailed(entityOrName: AnyEntity | string): ValidationError;
    static lockFailedVersionMismatch(entity: AnyEntity, expectedLockVersion: number | Date, actualLockVersion: number | Date): ValidationError;
    static noEntityDiscovered(): ValidationError;
    static onlyAbstractEntitiesDiscovered(): ValidationError;
    static duplicateEntityDiscovered(paths: string[]): ValidationError;
    static entityNotFound(name: string, path: string): ValidationError;
    static findOneFailed(name: string, where: Dictionary | IPrimaryKey): ValidationError;
    static missingMetadata(entity: string): ValidationError;
    static invalidPropertyName(entityName: string, invalid: string): ValidationError;
    static multipleDecorators(entityName: string, propertyName: string): ValidationError;
    static invalidType(type: Constructor<Type>, value: any, mode: string): ValidationError;
    static cannotModifyInverseCollection(owner: AnyEntity, property: EntityProperty): ValidationError;
    private static fromMessage;
}