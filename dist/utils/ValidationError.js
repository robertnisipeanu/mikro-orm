"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const Utils_1 = require("./Utils");
class ValidationError extends Error {
    constructor(message, entity) {
        super(message);
        this.entity = entity;
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.message = message;
    }
    /**
     * Gets instance of entity that caused this error.
     */
    getEntity() {
        return this.entity;
    }
    static fromWrongPropertyType(entity, property, expectedType, givenType, givenValue) {
        const entityName = entity.constructor.name;
        const msg = `Trying to set ${entityName}.${property} of type '${expectedType}' to '${givenValue}' of type '${givenType}'`;
        return new ValidationError(msg);
    }
    static fromCollectionNotInitialized(entity, prop) {
        const entityName = entity.constructor.name;
        const msg = `${entityName}.${prop.name} is not initialized, define it as '${prop.name} = new Collection<${prop.type}>(this);'`;
        return new ValidationError(msg);
    }
    static fromMissingPrimaryKey(meta) {
        return new ValidationError(`${meta.name} entity is missing @PrimaryKey()`);
    }
    static fromWrongReference(meta, prop, key, owner) {
        if (owner) {
            return ValidationError.fromMessage(meta, prop, `has wrong '${key}' reference type: ${owner.type} instead of ${meta.name}`);
        }
        return ValidationError.fromMessage(meta, prop, `has unknown '${key}' reference: ${prop.type}.${prop[key]}`);
    }
    static fromWrongTypeDefinition(meta, prop) {
        if (!prop.type) {
            return ValidationError.fromMessage(meta, prop, `is missing type definition`);
        }
        return ValidationError.fromMessage(meta, prop, `has unknown type: ${prop.type}`);
    }
    static fromWrongOwnership(meta, prop, key) {
        const type = key === 'inversedBy' ? 'owning' : 'inverse';
        const other = key === 'inversedBy' ? 'mappedBy' : 'inversedBy';
        return new ValidationError(`Both ${meta.name}.${prop.name} and ${prop.type}.${prop[key]} are defined as ${type} sides, use '${other}' on one of them`);
    }
    static fromMergeWithoutPK(meta) {
        throw new ValidationError(`You cannot merge entity '${meta.name}' without identifier!`);
    }
    static fromUnknownBaseEntity(meta) {
        return new ValidationError(`Entity '${meta.name}' extends unknown base entity '${meta.extends}', please make sure to provide it in 'entities' array when initializing the ORM`);
    }
    static transactionRequired() {
        return new ValidationError('An open transaction is required for this operation');
    }
    static entityNotManaged(entity) {
        return new ValidationError(`Entity ${entity.constructor.name} is not managed. An entity is managed if its fetched from the database or registered as new through EntityManager.persist()`);
    }
    static notEntity(owner, prop, data) {
        return new ValidationError(`Entity of type ${prop.type} expected for property ${owner.constructor.name}.${prop.name}, ${util_1.inspect(data)} of type ${Utils_1.Utils.getObjectType(data)} given. If you are using Object.assign(entity, data), use wrap(entity).assign(data, { em }) instead.`);
    }
    static notVersioned(meta) {
        return new ValidationError(`Cannot obtain optimistic lock on unversioned entity ${meta.name}`);
    }
    static multipleVersionFields(meta, fields) {
        return new ValidationError(`Entity ${meta.name} has multiple version properties defined: '${fields.join('\', \'')}'. Only one version property is allowed per entity.`);
    }
    static invalidVersionFieldType(meta) {
        const prop = meta.properties[meta.versionProperty];
        return new ValidationError(`Version property ${meta.name}.${prop.name} has unsupported type '${prop.type}'. Only 'number' and 'Date' are allowed.`);
    }
    static lockFailed(entityOrName) {
        const name = Utils_1.Utils.isString(entityOrName) ? entityOrName : entityOrName.constructor.name;
        const entity = Utils_1.Utils.isString(entityOrName) ? undefined : entityOrName;
        return new ValidationError(`The optimistic lock on entity ${name} failed`, entity);
    }
    static lockFailedVersionMismatch(entity, expectedLockVersion, actualLockVersion) {
        expectedLockVersion = expectedLockVersion instanceof Date ? expectedLockVersion.getTime() : expectedLockVersion;
        actualLockVersion = actualLockVersion instanceof Date ? actualLockVersion.getTime() : actualLockVersion;
        return new ValidationError(`The optimistic lock failed, version ${expectedLockVersion} was expected, but is actually ${actualLockVersion}`, entity);
    }
    static noEntityDiscovered() {
        return new ValidationError('No entities were discovered');
    }
    static onlyAbstractEntitiesDiscovered() {
        return new ValidationError('Only abstract entities were discovered, maybe you forgot to use @Entity() decorator?');
    }
    static duplicateEntityDiscovered(paths) {
        return new ValidationError(`Duplicate entity names are not allowed: ${paths.join(', ')}`);
    }
    static entityNotFound(name, path) {
        return new ValidationError(`Entity '${name}' not found in ${path}`);
    }
    static findOneFailed(name, where) {
        return new ValidationError(`${name} not found (${util_1.inspect(where)})`);
    }
    static missingMetadata(entity) {
        return new ValidationError(`Metadata for entity ${entity} not found`);
    }
    static invalidPropertyName(entityName, invalid) {
        return new ValidationError(`Entity '${entityName}' does not have property '${invalid}'`);
    }
    static multipleDecorators(entityName, propertyName) {
        return new ValidationError(`Multiple property decorators used on '${entityName}.${propertyName}' property`);
    }
    static invalidType(type, value, mode) {
        const valueType = Utils_1.Utils.getObjectType(value);
        if (value instanceof Date) {
            value = value.toISOString();
        }
        return new ValidationError(`Could not convert ${mode} value '${value}' of type '${valueType}' to type ${type.name}`);
    }
    static cannotModifyInverseCollection(owner, property) {
        const inverseCollection = `${owner.constructor.name}.${property.name}`;
        const ownerCollection = `${property.type}.${property.mappedBy}`;
        const error = `You cannot modify inverse side of M:N collection ${inverseCollection} when the owning side is not initialized. `
            + `Consider working with the owning side instead (${ownerCollection}).`;
        return new ValidationError(error, owner);
    }
    static fromMessage(meta, prop, message) {
        return new ValidationError(`${meta.name}.${prop.name} ${message}`);
    }
}
exports.ValidationError = ValidationError;
