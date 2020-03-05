"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const entity_1 = require("../entity");
const ChangeSet_1 = require("./ChangeSet");
const utils_1 = require("../utils");
class ChangeSetPersister {
    constructor(driver, identifierMap, metadata) {
        this.driver = driver;
        this.identifierMap = identifierMap;
        this.metadata = metadata;
    }
    async persistToDatabase(changeSet, ctx) {
        const meta = this.metadata.get(changeSet.name);
        // process references first
        for (const prop of Object.values(meta.properties)) {
            this.processReference(changeSet, prop);
        }
        // persist the entity itself
        await this.persistEntity(changeSet, meta, ctx);
    }
    async persistCollectionToDatabase(coll, ctx) {
        const pk = this.metadata.get(coll.property.type).primaryKey;
        const data = { [coll.property.name]: coll.getIdentifiers(pk) };
        await this.driver.nativeUpdate(coll.owner.constructor.name, entity_1.wrap(coll.owner).__primaryKey, data, ctx);
        coll.setDirty(false);
    }
    async persistEntity(changeSet, meta, ctx) {
        let res;
        if (changeSet.type === ChangeSet_1.ChangeSetType.DELETE) {
            await this.driver.nativeDelete(changeSet.name, changeSet.entity.__primaryKey, ctx);
        }
        else if (changeSet.type === ChangeSet_1.ChangeSetType.UPDATE) {
            res = await this.updateEntity(meta, changeSet, ctx);
            this.mapReturnedValues(changeSet.entity, res, meta);
        }
        else if (changeSet.entity.__primaryKey) { // ChangeSetType.CREATE with primary key
            res = await this.driver.nativeInsert(changeSet.name, changeSet.payload, ctx);
            this.mapReturnedValues(changeSet.entity, res, meta);
            delete changeSet.entity.__initialized;
        }
        else { // ChangeSetType.CREATE without primary key
            res = await this.driver.nativeInsert(changeSet.name, changeSet.payload, ctx);
            this.mapReturnedValues(changeSet.entity, res, meta);
            entity_1.wrap(changeSet.entity).__primaryKey = changeSet.entity.__primaryKey || res.insertId;
            this.identifierMap[changeSet.entity.__uuid].setValue(changeSet.entity.__primaryKey);
            delete changeSet.entity.__initialized;
        }
        await this.processOptimisticLock(meta, changeSet, res, ctx);
        changeSet.persisted = true;
    }
    async updateEntity(meta, changeSet, ctx) {
        if (!meta.versionProperty || !changeSet.entity[meta.versionProperty]) {
            return this.driver.nativeUpdate(changeSet.name, changeSet.entity.__primaryKey, changeSet.payload, ctx);
        }
        const cond = {
            [changeSet.entity.__meta.primaryKey]: changeSet.entity.__primaryKey,
            [meta.versionProperty]: changeSet.entity[meta.versionProperty],
        };
        return this.driver.nativeUpdate(changeSet.name, cond, changeSet.payload, ctx);
    }
    async processOptimisticLock(meta, changeSet, res, ctx) {
        if (meta.versionProperty && changeSet.type === ChangeSet_1.ChangeSetType.UPDATE && res && !res.affectedRows) {
            throw utils_1.ValidationError.lockFailed(changeSet.entity);
        }
        if (meta.versionProperty && [ChangeSet_1.ChangeSetType.CREATE, ChangeSet_1.ChangeSetType.UPDATE].includes(changeSet.type)) {
            const e = await this.driver.findOne(meta.name, changeSet.entity.__primaryKey, [], {}, [meta.versionProperty], undefined, ctx);
            changeSet.entity[meta.versionProperty] = e[meta.versionProperty];
        }
    }
    processReference(changeSet, prop) {
        const value = changeSet.payload[prop.name];
        if (value instanceof entity_1.EntityIdentifier) {
            changeSet.payload[prop.name] = value.getValue();
        }
        if (prop.onCreate && changeSet.type === ChangeSet_1.ChangeSetType.CREATE) {
            changeSet.entity[prop.name] = changeSet.payload[prop.name] = prop.onCreate();
        }
        if (prop.onUpdate) {
            changeSet.entity[prop.name] = changeSet.payload[prop.name] = prop.onUpdate();
        }
    }
    mapReturnedValues(entity, res, meta) {
        if (res.row && Object.keys(res.row).length > 0) {
            Object.values(meta.properties).forEach(prop => {
                if (res.row[prop.fieldName]) {
                    entity[prop.name] = res.row[prop.fieldName];
                }
            });
        }
    }
}
exports.ChangeSetPersister = ChangeSetPersister;
