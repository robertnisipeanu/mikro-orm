"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const entity_1 = require("../entity");
const types_1 = require("../types");
const utils_1 = require("../utils");
class EntitySchema {
    constructor(meta, internal = false) {
        this._meta = {};
        this.initialized = false;
        meta.name = meta.class ? meta.class.name : meta.name;
        Object.assign(this._meta, { className: meta.name, properties: {}, hooks: {}, indexes: [], uniques: [] }, meta);
        this.internal = internal;
    }
    addProperty(name, type, options = {}) {
        const prop = Object.assign(Object.assign({ name, reference: entity_1.ReferenceType.SCALAR }, options), { type: this.normalizeType(options, type) });
        if (type && Object.getPrototypeOf(type) === types_1.Type) {
            prop.type = type;
        }
        this._meta.properties[name] = prop;
    }
    addEnum(name, type, options = {}) {
        if (options.items instanceof Function) {
            options.items = utils_1.Utils.extractEnumValues(options.items());
        }
        const prop = Object.assign({ enum: true }, options);
        this.addProperty(name, this.internal ? type : type || 'enum', prop);
    }
    addVersion(name, type, options = {}) {
        this.addProperty(name, type, Object.assign({ version: true }, options));
    }
    addPrimaryKey(name, type, options = {}) {
        this.addProperty(name, type, Object.assign({ primary: true }, options));
    }
    addSerializedPrimaryKey(name, type, options = {}) {
        this._meta.serializedPrimaryKey = name;
        this.addProperty(name, type, options);
    }
    addManyToOne(name, type, options) {
        const prop = Object.assign({ reference: entity_1.ReferenceType.MANY_TO_ONE, cascade: [entity_1.Cascade.PERSIST, entity_1.Cascade.MERGE] }, options);
        utils_1.Utils.defaultValue(prop, 'nullable', prop.cascade.includes(entity_1.Cascade.REMOVE) || prop.cascade.includes(entity_1.Cascade.ALL));
        this.addProperty(name, type, prop);
    }
    addManyToMany(name, type, options) {
        options.fixedOrder = options.fixedOrder || !!options.fixedOrderColumn;
        if (!options.owner && !options.mappedBy) {
            options.owner = true;
        }
        if (options.owner) {
            utils_1.Utils.renameKey(options, 'mappedBy', 'inversedBy');
        }
        const prop = Object.assign({ reference: entity_1.ReferenceType.MANY_TO_MANY, cascade: [entity_1.Cascade.PERSIST, entity_1.Cascade.MERGE] }, options);
        this.addProperty(name, type, prop);
    }
    addOneToMany(name, type, options) {
        const prop = Object.assign({ reference: entity_1.ReferenceType.ONE_TO_MANY, cascade: [entity_1.Cascade.PERSIST, entity_1.Cascade.MERGE] }, options);
        this.addProperty(name, type, prop);
    }
    addOneToOne(name, type, options) {
        const prop = Object.assign({ reference: entity_1.ReferenceType.ONE_TO_ONE, cascade: [entity_1.Cascade.PERSIST, entity_1.Cascade.MERGE] }, options);
        utils_1.Utils.defaultValue(prop, 'nullable', prop.cascade.includes(entity_1.Cascade.REMOVE) || prop.cascade.includes(entity_1.Cascade.ALL));
        prop.owner = prop.owner || !!prop.inversedBy || !prop.mappedBy;
        prop.unique = prop.owner;
        if (prop.owner && options.mappedBy) {
            utils_1.Utils.renameKey(prop, 'mappedBy', 'inversedBy');
        }
        this.addProperty(name, type, prop);
    }
    addIndex(options) {
        this._meta.indexes.push(options);
    }
    addUnique(options) {
        this._meta.uniques.push(options);
    }
    setCustomRepository(repository) {
        this._meta.customRepository = repository;
    }
    setExtends(base) {
        this._meta.extends = base;
    }
    setClass(proto) {
        this._meta.class = proto;
        this._meta.prototype = proto.prototype;
        this._meta.className = proto.name;
        this._meta.constructorParams = utils_1.Utils.getParamNames(proto, 'constructor');
        this._meta.toJsonParams = utils_1.Utils.getParamNames(proto, 'toJSON').filter(p => p !== '...args');
        this._meta.extends = this._meta.extends || Object.getPrototypeOf(proto).name || undefined;
    }
    get meta() {
        return this._meta;
    }
    get name() {
        return this._meta.name;
    }
    /**
     * @internal
     */
    init() {
        if (this.initialized) {
            return this;
        }
        if (this._meta.class) {
            this.setClass(this._meta.class);
        }
        else {
            this.setClass(({ [this.name]: class {
                } })[this.name]);
        }
        if (this._meta.abstract) {
            delete this._meta.name;
        }
        Object.entries(this._meta.properties).forEach(([name, options]) => {
            options.type = 'customType' in options ? options.customType.constructor.name : options.type;
            switch (options.reference) {
                case entity_1.ReferenceType.ONE_TO_ONE:
                    this.addOneToOne(name, options.type, options);
                    break;
                case entity_1.ReferenceType.ONE_TO_MANY:
                    this.addOneToMany(name, options.type, options);
                    break;
                case entity_1.ReferenceType.MANY_TO_ONE:
                    this.addManyToOne(name, options.type, options);
                    break;
                case entity_1.ReferenceType.MANY_TO_MANY:
                    this.addManyToMany(name, options.type, options);
                    break;
                default:
                    if (options.enum) {
                        this.addEnum(name, options.type, options);
                    }
                    else if (options.primary) {
                        this.addPrimaryKey(name, options.type, options);
                    }
                    else if (options.serializedPrimaryKey) {
                        this.addSerializedPrimaryKey(name, options.type, options);
                    }
                    else if (options.version) {
                        this.addVersion(name, options.type, options);
                    }
                    else {
                        this.addProperty(name, options.type, options);
                    }
            }
        });
        const pks = Object.values(this._meta.properties).filter(prop => prop.primary);
        if (pks.length > 0) {
            this._meta.primaryKey = pks[0].name;
            this._meta.primaryKeys = pks.map(prop => prop.name);
            this._meta.compositePK = pks.length > 1;
        }
        const serializedPrimaryKey = Object.values(this._meta.properties).find(prop => prop.serializedPrimaryKey);
        if (serializedPrimaryKey) {
            this._meta.serializedPrimaryKey = serializedPrimaryKey.name;
        }
        this.initialized = true;
        return this;
    }
    normalizeType(options, type) {
        if ('entity' in options) {
            if (utils_1.Utils.isString(options.entity)) {
                type = options.type = options.entity;
            }
            else if (options.entity) {
                type = options.type = utils_1.Utils.className(options.entity());
            }
        }
        if (type instanceof Function) {
            type = type.name;
        }
        if (['String', 'Number', 'Boolean', 'Array'].includes(type)) {
            type = type.toLowerCase();
        }
        return type;
    }
}
exports.EntitySchema = EntitySchema;
