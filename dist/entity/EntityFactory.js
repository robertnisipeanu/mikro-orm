"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const enums_1 = require("./enums");
exports.SCALAR_TYPES = ['string', 'number', 'boolean', 'Date'];
class EntityFactory {
    constructor(unitOfWork, em) {
        this.unitOfWork = unitOfWork;
        this.em = em;
        this.driver = this.em.getDriver();
        this.config = this.em.config;
        this.metadata = this.em.getMetadata();
        this.hydrator = this.config.getHydrator(this, this.em);
    }
    create(entityName, data, initialized = true, newEntity = false) {
        if (utils_1.Utils.isEntity(data)) {
            return data;
        }
        entityName = utils_1.Utils.className(entityName);
        const meta = this.metadata.get(entityName);
        this.denormalizePrimaryKey(data, meta);
        const entity = this.createEntity(data, meta);
        if (initialized && !utils_1.Utils.isEntity(data)) {
            this.hydrator.hydrate(entity, meta, data, newEntity);
        }
        if (initialized) {
            delete entity.__initialized;
        }
        else {
            entity.__initialized = initialized;
        }
        this.runHooks(entity, meta);
        return entity;
    }
    createReference(entityName, id) {
        entityName = utils_1.Utils.className(entityName);
        const meta = this.metadata.get(entityName);
        if (this.unitOfWork.getById(entityName, id)) {
            return this.unitOfWork.getById(entityName, id);
        }
        return this.create(entityName, { [meta.primaryKey]: id }, false);
    }
    createEntity(data, meta) {
        const Entity = this.metadata.get(meta.name).class;
        if (!data[meta.primaryKey]) {
            const params = this.extractConstructorParams(meta, data);
            meta.constructorParams.forEach(prop => delete data[prop]);
            return new Entity(...params);
        }
        if (this.unitOfWork.getById(meta.name, data[meta.primaryKey])) {
            return this.unitOfWork.getById(meta.name, data[meta.primaryKey]);
        }
        // creates new entity instance, with possibility to bypass constructor call when instancing already persisted entity
        const entity = Object.create(Entity.prototype);
        entity[meta.primaryKey] = data[meta.primaryKey];
        return entity;
    }
    /**
     * denormalize PK to value required by driver (e.g. ObjectId)
     */
    denormalizePrimaryKey(data, meta) {
        const platform = this.driver.getPlatform();
        const pk = platform.getSerializedPrimaryKeyField(meta.primaryKey);
        if (data[pk] || data[meta.primaryKey]) {
            const id = platform.denormalizePrimaryKey(data[pk] || data[meta.primaryKey]);
            delete data[pk];
            data[meta.primaryKey] = id;
        }
    }
    /**
     * returns parameters for entity constructor, creating references from plain ids
     */
    extractConstructorParams(meta, data) {
        return meta.constructorParams.map(k => {
            if (meta.properties[k] && [enums_1.ReferenceType.MANY_TO_ONE, enums_1.ReferenceType.ONE_TO_ONE].includes(meta.properties[k].reference) && data[k]) {
                const entity = this.unitOfWork.getById(meta.properties[k].type, data[k]);
                if (entity) {
                    return entity;
                }
                if (utils_1.Utils.isEntity(data[k])) {
                    return data[k];
                }
                return this.createReference(meta.properties[k].type, data[k]);
            }
            return data[k];
        });
    }
    runHooks(entity, meta) {
        if (meta.hooks && meta.hooks.onInit && meta.hooks.onInit.length > 0) {
            meta.hooks.onInit.forEach(hook => entity[hook]());
        }
    }
}
exports.EntityFactory = EntityFactory;
