"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const DatabaseDriver_1 = require("./DatabaseDriver");
const MongoConnection_1 = require("../connections/MongoConnection");
const utils_1 = require("../utils");
const MongoPlatform_1 = require("../platforms/MongoPlatform");
class MongoDriver extends DatabaseDriver_1.DatabaseDriver {
    constructor(config) {
        super(config, ['mongodb']);
        this.connection = new MongoConnection_1.MongoConnection(this.config);
        this.platform = new MongoPlatform_1.MongoPlatform();
    }
    async find(entityName, where, populate, orderBy, fields, limit, offset) {
        where = this.renameFields(entityName, where);
        const res = await this.getConnection('read').find(entityName, where, orderBy, limit, offset, fields);
        return res.map((r) => this.mapResult(r, this.metadata.get(entityName)));
    }
    async findOne(entityName, where, populate = [], orderBy = {}, fields, lockMode) {
        if (utils_1.Utils.isPrimaryKey(where)) {
            where = { _id: new mongodb_1.ObjectId(where) };
        }
        where = this.renameFields(entityName, where);
        const res = await this.getConnection('read').find(entityName, where, orderBy, 1, undefined, fields);
        return this.mapResult(res[0], this.metadata.get(entityName));
    }
    async count(entityName, where) {
        where = this.renameFields(entityName, where);
        return this.getConnection('read').countDocuments(entityName, where);
    }
    async nativeInsert(entityName, data) {
        data = this.renameFields(entityName, data);
        return this.getConnection('write').insertOne(entityName, data);
    }
    async nativeUpdate(entityName, where, data) {
        if (utils_1.Utils.isPrimaryKey(where)) {
            where = { _id: new mongodb_1.ObjectId(where) };
        }
        where = this.renameFields(entityName, where);
        data = this.renameFields(entityName, data);
        return this.getConnection('write').updateMany(entityName, where, data);
    }
    async nativeDelete(entityName, where) {
        if (utils_1.Utils.isPrimaryKey(where)) {
            where = { _id: new mongodb_1.ObjectId(where) };
        }
        where = this.renameFields(entityName, where);
        return this.getConnection('write').deleteMany(entityName, where);
    }
    async aggregate(entityName, pipeline) {
        return this.getConnection('read').aggregate(entityName, pipeline);
    }
    renameFields(entityName, data) {
        data = Object.assign({}, data); // copy first
        utils_1.Utils.renameKey(data, 'id', '_id');
        const meta = this.metadata.get(entityName, false, false);
        Object.keys(data).forEach(k => {
            if (meta && meta.properties[k]) {
                const prop = meta.properties[k];
                if (prop.fieldName) {
                    utils_1.Utils.renameKey(data, k, prop.fieldName);
                }
            }
        });
        return data;
    }
}
exports.MongoDriver = MongoDriver;
