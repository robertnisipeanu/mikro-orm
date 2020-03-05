"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const globby_1 = __importDefault(require("globby"));
const chalk_1 = __importDefault(require("chalk"));
const utils_1 = require("../utils");
const MetadataValidator_1 = require("./MetadataValidator");
const MetadataStorage_1 = require("./MetadataStorage");
const entity_1 = require("../entity");
const types_1 = require("../types");
const schema_1 = require("../schema");
class MetadataDiscovery {
    constructor(metadata, platform, config) {
        this.metadata = metadata;
        this.platform = platform;
        this.config = config;
        this.namingStrategy = this.config.getNamingStrategy();
        this.metadataProvider = this.config.getMetadataProvider();
        this.cache = this.config.getCacheAdapter();
        this.logger = this.config.getLogger();
        this.schemaHelper = this.platform.getSchemaHelper();
        this.validator = new MetadataValidator_1.MetadataValidator();
        this.discovered = [];
    }
    async discover(preferTsNode = true) {
        const startTime = Date.now();
        this.logger.log('discovery', `ORM entity discovery started`);
        await this.findEntities(preferTsNode);
        // ignore base entities (not annotated with @Entity)
        const filtered = this.discovered.filter(meta => meta.name);
        filtered.forEach(meta => this.defineBaseEntityProperties(meta));
        filtered.forEach(meta => Object.values(meta.properties).forEach(prop => this.initFactoryField(prop)));
        filtered.forEach(meta => Object.values(meta.properties).forEach(prop => this.initFieldName(prop)));
        filtered.forEach(meta => Object.values(meta.properties).forEach(prop => this.initUnsigned(prop)));
        filtered.forEach(meta => this.autoWireBidirectionalProperties(meta));
        filtered.forEach(meta => this.discovered.push(...this.processEntity(meta)));
        const diff = Date.now() - startTime;
        this.logger.log('discovery', `- entity discovery finished after ${chalk_1.default.green(`${diff} ms`)}`);
        const discovered = new MetadataStorage_1.MetadataStorage();
        this.discovered
            .filter(meta => meta.name)
            .forEach(meta => discovered.set(meta.name, meta));
        return discovered;
    }
    async findEntities(preferTsNode) {
        this.discovered.length = 0;
        if (this.config.get('discovery').requireEntitiesArray && this.config.get('entities').length === 0) {
            throw new Error(`[requireEntitiesArray] Explicit list of entities is required, please use the 'entities' option.`);
        }
        if (this.config.get('entities').length > 0) {
            await utils_1.Utils.runSerial(this.config.get('entities'), entity => this.discoverEntity(entity));
        }
        else if (preferTsNode && (this.config.get('tsNode') || utils_1.Utils.detectTsNode())) {
            await utils_1.Utils.runSerial(this.config.get('entitiesDirsTs'), dir => this.discoverDirectory(dir));
        }
        else {
            await utils_1.Utils.runSerial(this.config.get('entitiesDirs'), dir => this.discoverDirectory(dir));
        }
        this.validator.validateDiscovered(this.discovered, this.config.get('discovery').warnWhenNoEntities);
        return this.discovered;
    }
    async discoverDirectory(basePath) {
        const files = await globby_1.default(utils_1.Utils.normalizePath(basePath, '*'), { cwd: utils_1.Utils.normalizePath(this.config.get('baseDir')) });
        this.logger.log('discovery', `- processing ${files.length} files from directory ${basePath}`);
        for (const filepath of files) {
            const filename = path_1.basename(filepath);
            if (!filename.match(/\.[jt]s$/) ||
                filename.endsWith('.js.map') ||
                filename.endsWith('.d.ts') ||
                filename.startsWith('.') ||
                filename.match(/index\.[jt]s$/)) {
                this.logger.log('discovery', `- ignoring file ${filename}`);
                continue;
            }
            const name = this.namingStrategy.getClassName(filename);
            const path = utils_1.Utils.normalizePath(this.config.get('baseDir'), filepath);
            const target = this.getEntityClassOrSchema(path, name);
            this.metadata.set(name, MetadataStorage_1.MetadataStorage.getMetadata(name));
            await this.discoverEntity(target, path);
        }
    }
    prepare(entity) {
        if ('schema' in entity && entity.schema instanceof schema_1.EntitySchema) {
            return entity.schema;
        }
        // save path to entity from schema
        if ('entity' in entity && 'schema' in entity) {
            const meta = this.metadata.get(entity.entity.name, true);
            meta.path = entity.schema.path;
            return entity.entity;
        }
        return entity;
    }
    getSchema(entity) {
        if (entity instanceof schema_1.EntitySchema) {
            return entity;
        }
        const schema = new schema_1.EntitySchema(this.metadata.get(entity.name, true), true);
        schema.setClass(entity);
        schema.meta.useCache = true;
        return schema;
    }
    async discoverEntity(entity, path) {
        entity = this.prepare(entity);
        this.logger.log('discovery', `- processing entity ${chalk_1.default.cyan(entity.name)}`);
        const schema = this.getSchema(entity);
        const meta = schema.init().meta;
        this.metadata.set(meta.className, meta);
        schema.meta.path = utils_1.Utils.relativePath(path || meta.path, this.config.get('baseDir'));
        const cache = meta.useCache && meta.path && await this.cache.get(meta.className + path_1.extname(meta.path));
        if (cache) {
            this.logger.log('discovery', `- using cached metadata for entity ${chalk_1.default.cyan(meta.className)}`);
            this.metadataProvider.loadFromCache(meta, cache);
            this.discovered.push(meta);
            return;
        }
        if (!(entity instanceof schema_1.EntitySchema)) {
            await this.metadataProvider.loadEntityMetadata(meta, meta.className);
        }
        if (!meta.collection && meta.name) {
            meta.collection = this.namingStrategy.classToTableName(meta.name);
        }
        await this.saveToCache(meta);
        this.discovered.push(meta);
    }
    async saveToCache(meta) {
        if (!meta.useCache) {
            return;
        }
        const copy = Object.assign({}, meta);
        delete copy.prototype;
        // base entity without properties might not have path, but nothing to cache there
        if (meta.path) {
            await this.cache.set(meta.className + path_1.extname(meta.path), copy, meta.path);
        }
    }
    applyNamingStrategy(meta, prop) {
        if (!prop.fieldName) {
            this.initFieldName(prop);
        }
        if (prop.reference === entity_1.ReferenceType.MANY_TO_MANY) {
            this.initManyToManyFields(meta, prop);
        }
        if (prop.reference === entity_1.ReferenceType.ONE_TO_MANY || prop.reference === entity_1.ReferenceType.ONE_TO_ONE) {
            this.initOneToManyFields(meta, prop);
        }
    }
    initFieldName(prop) {
        if (prop.fieldName) {
            return;
        }
        if (prop.reference === entity_1.ReferenceType.SCALAR) {
            prop.fieldName = this.namingStrategy.propertyToColumnName(prop.name);
        }
        else if ([entity_1.ReferenceType.MANY_TO_ONE, entity_1.ReferenceType.ONE_TO_ONE].includes(prop.reference)) {
            prop.fieldName = this.initManyToOneFieldName(prop, prop.name);
        }
        else if (prop.reference === entity_1.ReferenceType.MANY_TO_MANY && prop.owner) {
            prop.fieldName = this.namingStrategy.propertyToColumnName(prop.name);
        }
    }
    initManyToOneFieldName(prop, name) {
        const meta2 = this.metadata.get(prop.type);
        const referenceColumnName = meta2.properties[meta2.primaryKey].fieldName;
        return this.namingStrategy.joinKeyColumnName(name, referenceColumnName);
    }
    initManyToManyFields(meta, prop) {
        const meta2 = this.metadata.get(prop.type);
        utils_1.Utils.defaultValue(prop, 'fixedOrder', !!prop.fixedOrderColumn);
        if (!prop.owner && !prop.inversedBy && !prop.mappedBy) {
            prop.owner = true;
        }
        if (!prop.pivotTable && prop.owner) {
            prop.pivotTable = this.namingStrategy.joinTableName(meta.collection, meta2.collection, prop.name);
        }
        if (prop.mappedBy) {
            const prop2 = meta2.properties[prop.mappedBy];
            this.initManyToManyFields(meta2, prop2);
            prop.pivotTable = prop2.pivotTable;
            prop.fixedOrder = prop2.fixedOrder;
            prop.fixedOrderColumn = prop2.fixedOrderColumn;
        }
        if (!prop.referenceColumnName) {
            prop.referenceColumnName = meta.properties[meta.primaryKey].fieldName;
        }
        if (!prop.inverseJoinColumn) {
            const meta2 = this.metadata.get(prop.type);
            prop.inverseJoinColumn = this.initManyToOneFieldName(prop, meta2.collection);
        }
        if (!prop.joinColumn) {
            prop.joinColumn = this.namingStrategy.joinKeyColumnName(meta.collection, prop.referenceColumnName);
        }
    }
    initOneToManyFields(meta, prop) {
        if (!prop.joinColumn) {
            prop.joinColumn = this.namingStrategy.joinColumnName(prop.name);
        }
        if (prop.reference === entity_1.ReferenceType.ONE_TO_ONE && !prop.inverseJoinColumn && prop.mappedBy) {
            prop.inverseJoinColumn = this.metadata.get(prop.type).properties[prop.mappedBy].fieldName;
        }
        if (!prop.referenceColumnName) {
            prop.referenceColumnName = meta.properties[meta.primaryKey].fieldName;
        }
    }
    processEntity(meta) {
        const pks = Object.values(meta.properties).filter(prop => prop.primary);
        meta.primaryKeys = pks.map(prop => prop.name);
        meta.compositePK = pks.length > 1;
        this.validator.validateEntityDefinition(this.metadata, meta.name);
        Object.values(meta.properties).forEach(prop => {
            this.applyNamingStrategy(meta, prop);
            this.initVersionProperty(meta, prop);
            this.initCustomType(prop);
            this.initColumnType(prop, meta.path);
        });
        meta.serializedPrimaryKey = this.platform.getSerializedPrimaryKeyField(meta.primaryKey);
        const serializedPKProp = meta.properties[meta.serializedPrimaryKey];
        if (serializedPKProp && meta.serializedPrimaryKey !== meta.primaryKey) {
            serializedPKProp.persist = false;
        }
        const ret = [];
        if (this.platform.usesPivotTable()) {
            Object
                .values(meta.properties)
                .filter(prop => prop.reference === entity_1.ReferenceType.MANY_TO_MANY && prop.owner && prop.pivotTable)
                .map(prop => this.definePivotTableEntity(meta, prop))
                .forEach(meta => ret.push(meta));
        }
        return ret;
    }
    initFactoryField(prop) {
        ['mappedBy', 'inversedBy'].forEach(type => {
            const value = prop[type];
            if (value instanceof Function) {
                const meta2 = this.metadata.get(prop.type);
                prop[type] = value(meta2.properties).name;
            }
        });
    }
    definePivotTableEntity(meta, prop) {
        const data = {
            name: prop.pivotTable,
            collection: prop.pivotTable,
            pivotTable: true,
            properties: {},
            hooks: {},
            indexes: [],
            uniques: [],
        };
        if (prop.fixedOrder) {
            const primaryProp = this.defineFixedOrderProperty(prop);
            data.properties[primaryProp.name] = primaryProp;
            data.primaryKey = primaryProp.name;
        }
        else {
            data.primaryKeys = [meta.name + '_owner', prop.type + '_inverse'];
            data.compositePK = true;
        }
        // handle self-referenced m:n with same default field names
        if (meta.name === prop.type && prop.joinColumn === prop.inverseJoinColumn) {
            prop.joinColumn = this.namingStrategy.joinKeyColumnName(meta.collection + '_1', prop.referenceColumnName);
            prop.inverseJoinColumn = this.namingStrategy.joinKeyColumnName(meta.collection + '_2', prop.referenceColumnName);
            if (prop.inversedBy) {
                const prop2 = this.metadata.get(prop.type).properties[prop.inversedBy];
                prop2.inverseJoinColumn = prop.joinColumn;
                prop2.joinColumn = prop.inverseJoinColumn;
            }
        }
        data.properties[meta.name + '_owner'] = this.definePivotProperty(prop, meta.name + '_owner', meta.name, prop.type + '_inverse', true);
        data.properties[prop.type + '_inverse'] = this.definePivotProperty(prop, prop.type + '_inverse', prop.type, meta.name + '_owner', false);
        return this.metadata.set(prop.pivotTable, data);
    }
    defineFixedOrderProperty(prop) {
        const pk = prop.fixedOrderColumn || this.namingStrategy.referenceColumnName();
        const primaryProp = {
            name: pk,
            type: 'number',
            reference: entity_1.ReferenceType.SCALAR,
            primary: true,
            unsigned: true,
        };
        this.initFieldName(primaryProp);
        this.initColumnType(primaryProp);
        this.initUnsigned(primaryProp);
        prop.fixedOrderColumn = pk;
        if (prop.inversedBy) {
            const prop2 = this.metadata.get(prop.type).properties[prop.inversedBy];
            prop2.fixedOrder = true;
            prop2.fixedOrderColumn = pk;
        }
        return primaryProp;
    }
    definePivotProperty(prop, name, type, inverse, owner) {
        const ret = {
            name,
            type,
            reference: entity_1.ReferenceType.MANY_TO_ONE,
            cascade: [entity_1.Cascade.ALL],
            fixedOrder: prop.fixedOrder,
            fixedOrderColumn: prop.fixedOrderColumn,
        };
        if (owner) {
            ret.owner = true;
            ret.inversedBy = inverse;
            ret.referenceColumnName = prop.referenceColumnName;
            ret.fieldName = ret.joinColumn = prop.joinColumn;
            ret.inverseJoinColumn = prop.referenceColumnName;
        }
        else {
            const meta = this.metadata.get(type);
            const prop2 = meta.properties[meta.primaryKey];
            ret.owner = false;
            ret.mappedBy = inverse;
            ret.referenceColumnName = prop2.fieldName;
            ret.fieldName = ret.joinColumn = prop.inverseJoinColumn;
            ret.inverseJoinColumn = prop2.fieldName;
        }
        this.initColumnType(ret);
        this.initUnsigned(ret);
        return ret;
    }
    autoWireBidirectionalProperties(meta) {
        Object.values(meta.properties)
            .filter(prop => prop.reference !== entity_1.ReferenceType.SCALAR && !prop.owner && prop.mappedBy)
            .forEach(prop => {
            const meta2 = this.metadata.get(prop.type);
            const prop2 = meta2.properties[prop.mappedBy];
            if (!prop2.inversedBy) {
                prop2.inversedBy = prop.name;
            }
        });
    }
    defineBaseEntityProperties(meta) {
        const base = this.metadata.get(meta.extends);
        if (!meta.extends || !base) {
            return;
        }
        meta.properties = Object.assign(Object.assign({}, base.properties), meta.properties);
        const primary = Object.values(meta.properties).find(p => p.primary);
        if (primary && !meta.primaryKey) {
            meta.primaryKey = primary.name;
        }
        Object.keys(base.hooks).forEach(type => {
            meta.hooks[type] = meta.hooks[type] || [];
            meta.hooks[type].unshift(...base.hooks[type]);
        });
    }
    getDefaultVersionValue(prop) {
        if (typeof prop.default !== 'undefined') {
            return prop.default;
        }
        if (prop.type.toLowerCase() === 'date') {
            prop.length = typeof prop.length === 'undefined' ? 3 : prop.length;
            return this.platform.getCurrentTimestampSQL(prop.length);
        }
        return 1;
    }
    initVersionProperty(meta, prop) {
        if (!prop.version) {
            return;
        }
        meta.versionProperty = prop.name;
        prop.default = this.getDefaultVersionValue(prop);
    }
    initCustomType(prop) {
        if (Object.getPrototypeOf(prop.type) === types_1.Type) {
            prop.customType = types_1.Type.getType(prop.type);
        }
        if (prop.customType) {
            prop.type = prop.customType.constructor.name;
            prop.columnType = prop.customType.getColumnType(prop, this.platform);
        }
    }
    initColumnType(prop, path) {
        if (prop.columnType || !this.schemaHelper) {
            return;
        }
        if (prop.enum && prop.type && path) {
            return this.initEnumValues(prop, path);
        }
        if (prop.reference === entity_1.ReferenceType.SCALAR) {
            prop.columnType = this.schemaHelper.getTypeDefinition(prop);
            return;
        }
        const meta = this.metadata.get(prop.type);
        const pk = meta.properties[meta.primaryKey];
        this.initCustomType(pk);
        prop.columnType = this.schemaHelper.getTypeDefinition(pk);
    }
    initEnumValues(prop, path) {
        path = utils_1.Utils.normalizePath(this.config.get('baseDir'), path);
        const exports = require(path);
        const target = exports[prop.type] || exports.default;
        if (target) {
            const items = utils_1.Utils.extractEnumValues(target);
            utils_1.Utils.defaultValue(prop, 'items', items);
        }
        prop.columnType = this.schemaHelper.getTypeDefinition(prop);
    }
    initUnsigned(prop) {
        if (prop.reference === entity_1.ReferenceType.MANY_TO_ONE || prop.reference === entity_1.ReferenceType.ONE_TO_ONE) {
            const meta2 = this.metadata.get(prop.type);
            const pk = meta2.properties[meta2.primaryKey];
            prop.unsigned = pk.type === 'number';
            prop.referenceColumnName = pk.fieldName;
            prop.referencedTableName = meta2.collection;
            return;
        }
        prop.unsigned = (prop.primary || prop.unsigned) && prop.type === 'number';
    }
    getEntityClassOrSchema(path, name) {
        const exports = require(path);
        const target = exports.default || exports[name];
        const schema = Object.values(exports).find(item => item instanceof schema_1.EntitySchema);
        if (schema) {
            return schema;
        }
        if (!target) {
            throw utils_1.ValidationError.entityNotFound(name, path.replace(this.config.get('baseDir'), '.'));
        }
        return target;
    }
}
exports.MetadataDiscovery = MetadataDiscovery;
