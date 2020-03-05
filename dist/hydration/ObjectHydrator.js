"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Hydrator_1 = require("./Hydrator");
const entity_1 = require("../entity");
const utils_1 = require("../utils");
class ObjectHydrator extends Hydrator_1.Hydrator {
    hydrateProperty(entity, prop, value, newEntity) {
        if (prop.reference === entity_1.ReferenceType.MANY_TO_ONE || prop.reference === entity_1.ReferenceType.ONE_TO_ONE) {
            this.hydrateManyToOne(value, entity, prop);
        }
        else if (prop.reference === entity_1.ReferenceType.ONE_TO_MANY) {
            this.hydrateOneToMany(entity, prop, value, newEntity);
        }
        else if (prop.reference === entity_1.ReferenceType.MANY_TO_MANY) {
            this.hydrateManyToMany(entity, prop, value, newEntity);
        }
        else { // ReferenceType.SCALAR
            this.hydrateScalar(entity, prop, value);
        }
    }
    hydrateOneToMany(entity, prop, value, newEntity) {
        entity[prop.name] = new entity_1.Collection(entity, undefined, !!value || newEntity);
    }
    hydrateScalar(entity, prop, value) {
        if (typeof value === 'undefined' || (prop.getter && !prop.setter)) {
            return;
        }
        if (prop.customType) {
            value = prop.customType.convertToJSValue(value, this.em.getDriver().getPlatform());
        }
        entity[prop.name] = value;
    }
    hydrateManyToMany(entity, prop, value, newEntity) {
        if (prop.owner) {
            return this.hydrateManyToManyOwner(entity, prop, value, newEntity);
        }
        this.hydrateManyToManyInverse(entity, prop, newEntity);
    }
    hydrateManyToManyOwner(entity, prop, value, newEntity) {
        if (Array.isArray(value)) {
            const items = value.map((value) => this.createCollectionItem(prop, value));
            const coll = new entity_1.Collection(entity, items);
            entity[prop.name] = coll;
            coll.setDirty();
        }
        else if (!entity[prop.name]) {
            const items = this.em.getDriver().getPlatform().usesPivotTable() ? undefined : [];
            entity[prop.name] = new entity_1.Collection(entity, items, newEntity);
        }
    }
    hydrateManyToManyInverse(entity, prop, newEntity) {
        if (!entity[prop.name]) {
            entity[prop.name] = new entity_1.Collection(entity, undefined, newEntity);
        }
    }
    hydrateManyToOne(value, entity, prop) {
        if (typeof value === 'undefined') {
            return;
        }
        if (utils_1.Utils.isPrimaryKey(value)) {
            entity[prop.name] = utils_1.Utils.wrapReference(this.factory.createReference(prop.type, value), prop);
        }
        else if (utils_1.Utils.isObject(value)) {
            entity[prop.name] = utils_1.Utils.wrapReference(this.factory.create(prop.type, value), prop);
        }
        if (entity[prop.name]) {
            entity_1.EntityAssigner.autoWireOneToOne(prop, entity);
        }
    }
    createCollectionItem(prop, value) {
        if (utils_1.Utils.isPrimaryKey(value)) {
            return this.factory.createReference(prop.type, value);
        }
        const child = this.factory.create(prop.type, value);
        if (entity_1.wrap(child).__primaryKey) {
            this.em.merge(child);
        }
        return child;
    }
}
exports.ObjectHydrator = ObjectHydrator;