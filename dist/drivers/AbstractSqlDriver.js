"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DatabaseDriver_1 = require("./DatabaseDriver");
const entity_1 = require("../entity");
const query_1 = require("../query");
const utils_1 = require("../utils");
class AbstractSqlDriver extends DatabaseDriver_1.DatabaseDriver {
    constructor(config, platform, connection, connector) {
        super(config, connector);
        this.replicas = [];
        this.connection = new connection(this.config);
        this.replicas = this.createReplicas(conf => new connection(this.config, conf, 'read'));
        this.platform = platform;
    }
    async find(entityName, where, populate = [], orderBy = {}, fields, limit, offset, ctx) {
        const meta = this.metadata.get(entityName);
        populate = this.autoJoinOneToOneOwner(meta, populate);
        if (fields && !fields.includes(meta.primaryKey)) {
            fields.unshift(meta.primaryKey);
        }
        const qb = this.createQueryBuilder(entityName, ctx, !!ctx);
        qb.select(fields || '*').populate(populate).where(where).orderBy(orderBy);
        if (limit !== undefined) {
            qb.limit(limit, offset);
        }
        return qb.execute('all');
    }
    async findOne(entityName, where, populate = [], orderBy = {}, fields, lockMode, ctx) {
        const meta = this.metadata.get(entityName);
        populate = this.autoJoinOneToOneOwner(meta, populate);
        const pk = meta.primaryKey;
        if (utils_1.Utils.isPrimaryKey(where)) {
            where = { [pk]: where };
        }
        if (fields && !fields.includes(pk)) {
            fields.unshift(pk);
        }
        return this.createQueryBuilder(entityName, ctx, !!ctx)
            .select(fields || '*')
            .populate(populate)
            .where(where)
            .orderBy(orderBy)
            .limit(1)
            .setLockMode(lockMode)
            .execute('get');
    }
    async count(entityName, where, ctx) {
        const qb = this.createQueryBuilder(entityName, ctx, !!ctx);
        const pk = this.metadata.get(entityName).primaryKey;
        const res = await qb.count(pk, true).where(where).execute('get', false);
        return +res.count;
    }
    async nativeInsert(entityName, data, ctx) {
        const collections = this.extractManyToMany(entityName, data);
        const pk = this.getPrimaryKeyField(entityName);
        const qb = this.createQueryBuilder(entityName, ctx, true);
        const res = await qb.insert(data).execute('run', false);
        res.row = res.row || {};
        res.insertId = data[pk] || res.insertId || res.row[pk];
        await this.processManyToMany(entityName, res.insertId, collections, ctx);
        return res;
    }
    async nativeUpdate(entityName, where, data, ctx) {
        const pk = this.getPrimaryKeyField(entityName);
        if (utils_1.Utils.isPrimaryKey(where)) {
            where = { [pk]: where };
        }
        const collections = this.extractManyToMany(entityName, data);
        let res = { affectedRows: 0, insertId: 0, row: {} };
        if (Object.keys(data).length) {
            const qb = this.createQueryBuilder(entityName, ctx, true);
            res = await qb.update(data).where(where).execute('run', false);
        }
        await this.processManyToMany(entityName, utils_1.Utils.extractPK(data[pk] || where, this.metadata.get(entityName, false, false)), collections, ctx);
        return res;
    }
    async nativeDelete(entityName, where, ctx) {
        if (utils_1.Utils.isPrimaryKey(where)) {
            const pk = this.getPrimaryKeyField(entityName);
            where = { [pk]: where };
        }
        return this.createQueryBuilder(entityName, ctx, true).delete(where).execute('run', false);
    }
    async loadFromPivotTable(prop, owners, where, orderBy, ctx) {
        const pivotProp2 = this.getPivotInverseProperty(prop);
        const meta = this.metadata.get(prop.type);
        if (!utils_1.Utils.isEmpty(where) && Object.keys(where).every(k => query_1.QueryBuilderHelper.isOperator(k, false))) {
            where = { [`${prop.pivotTable}.${pivotProp2.name}`]: { $in: owners } };
        }
        else {
            where = Object.assign(Object.assign({}, where), { [`${prop.pivotTable}.${pivotProp2.name}`]: { $in: owners } });
        }
        orderBy = this.getPivotOrderBy(prop, orderBy);
        const qb = this.createQueryBuilder(prop.type, ctx, !!ctx);
        const populate = this.autoJoinOneToOneOwner(meta, [prop.pivotTable]);
        qb.select('*').populate(populate).where(where).orderBy(orderBy);
        const items = owners.length ? await qb.execute('all') : [];
        const fk1 = prop.joinColumn;
        const fk2 = prop.inverseJoinColumn;
        const map = {};
        owners.forEach(owner => map['' + owner] = []);
        items.forEach((item) => {
            map[item[fk1]].push(item);
            delete item[fk1];
            delete item[fk2];
        });
        return map;
    }
    /**
     * 1:1 owner side needs to be marked for population so QB auto-joins the owner id
     */
    autoJoinOneToOneOwner(meta, populate) {
        if (!this.config.get('autoJoinOneToOneOwner')) {
            return populate;
        }
        const toPopulate = Object.values(meta.properties)
            .filter(prop => prop.reference === entity_1.ReferenceType.ONE_TO_ONE && !prop.owner && !populate.includes(prop.name))
            .map(prop => prop.name);
        return [...populate, ...toPopulate];
    }
    createQueryBuilder(entityName, ctx, write) {
        return new query_1.QueryBuilder(entityName, this.metadata, this, ctx, undefined, write ? 'write' : 'read');
    }
    extractManyToMany(entityName, data) {
        if (!this.metadata.get(entityName, false, false)) {
            return {};
        }
        const props = this.metadata.get(entityName).properties;
        const ret = {};
        for (const k of Object.keys(data)) {
            const prop = props[k];
            if (prop && prop.reference === entity_1.ReferenceType.MANY_TO_MANY) {
                ret[k] = data[k];
                delete data[k];
            }
        }
        return ret;
    }
    async processManyToMany(entityName, pk, collections, ctx) {
        if (!this.metadata.get(entityName, false, false)) {
            return;
        }
        const props = this.metadata.get(entityName).properties;
        for (const k of Object.keys(collections)) {
            const prop = props[k];
            const qb1 = this.createQueryBuilder(prop.pivotTable, ctx, true);
            await this.connection.execute(qb1.getKnex().where({ [prop.joinColumn]: pk }).delete());
            const items = [];
            for (const item of collections[k]) {
                items.push({ [prop.joinColumn]: pk, [prop.inverseJoinColumn]: item });
            }
            if (this.platform.allowsMultiInsert()) {
                const qb2 = this.createQueryBuilder(prop.pivotTable, ctx, true);
                await this.connection.execute(qb2.getKnex().insert(items));
            }
            else {
                await utils_1.Utils.runSerial(items, item => this.createQueryBuilder(prop.pivotTable, ctx, true).insert(item).execute('run', false));
            }
        }
    }
}
exports.AbstractSqlDriver = AbstractSqlDriver;
