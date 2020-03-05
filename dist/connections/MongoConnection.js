"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
const util_1 = require("util");
const Connection_1 = require("./Connection");
const utils_1 = require("../utils");
const query_1 = require("../query");
class MongoConnection extends Connection_1.Connection {
    async connect() {
        this.client = await mongodb_1.MongoClient.connect(this.config.getClientUrl(), this.getConnectionOptions());
        this.db = this.client.db(this.config.get('dbName'));
    }
    async close(force) {
        return this.client.close(force);
    }
    async isConnected() {
        return this.client.isConnected();
    }
    getCollection(name) {
        return this.db.collection(this.getCollectionName(name));
    }
    getDefaultClientUrl() {
        return 'mongodb://127.0.0.1:27017';
    }
    getConnectionOptions() {
        const ret = { useNewUrlParser: true, useUnifiedTopology: true };
        const user = this.config.get('user');
        const password = this.config.get('password');
        if (user && password) {
            ret.auth = { user, password };
        }
        return utils_1.Utils.merge(ret, this.config.get('driverOptions'));
    }
    getClientUrl() {
        const options = this.getConnectionOptions();
        const clientUrl = this.config.getClientUrl(true);
        const match = clientUrl.match(/^(\w+):\/\/((.*@.+)|.+)$/);
        return match ? `${match[1]}://${options.auth ? options.auth.user + ':*****@' : ''}${match[2]}` : clientUrl;
    }
    async execute(query) {
        throw new Error(`${this.constructor.name} does not support generic execute method`);
    }
    async find(collection, where, orderBy, limit, offset, fields) {
        collection = this.getCollectionName(collection);
        where = this.convertObjectIds(where);
        const options = {};
        if (fields) {
            options.projection = fields.reduce((o, k) => (Object.assign(Object.assign({}, o), { [k]: 1 })), {});
        }
        const resultSet = this.getCollection(collection).find(where, options);
        let query = `db.getCollection('${collection}').find(${this.logObject(where)}, ${this.logObject(options)})`;
        if (orderBy && Object.keys(orderBy).length > 0) {
            orderBy = Object.keys(orderBy).reduce((p, c) => {
                const direction = orderBy[c];
                return Object.assign(Object.assign({}, p), { [c]: utils_1.Utils.isString(direction) ? direction.toUpperCase() === query_1.QueryOrder.ASC ? 1 : -1 : direction });
            }, {});
            query += `.sort(${this.logObject(orderBy)})`;
            resultSet.sort(orderBy);
        }
        if (limit !== undefined) {
            query += `.limit(${limit})`;
            resultSet.limit(limit);
        }
        if (offset !== undefined) {
            query += `.skip(${offset})`;
            resultSet.skip(offset);
        }
        const now = Date.now();
        const res = await resultSet.toArray();
        this.logQuery(`${query}.toArray();`, Date.now() - now);
        return res;
    }
    async insertOne(collection, data) {
        return this.runQuery('insertOne', collection, data);
    }
    async updateMany(collection, where, data) {
        return this.runQuery('updateMany', collection, data, where);
    }
    async deleteMany(collection, where) {
        return this.runQuery('deleteMany', collection, undefined, where);
    }
    async aggregate(collection, pipeline) {
        collection = this.getCollectionName(collection);
        const query = `db.getCollection('${collection}').aggregate(${this.logObject(pipeline)}).toArray();`;
        const now = Date.now();
        const res = this.getCollection(collection).aggregate(pipeline).toArray();
        this.logQuery(query, Date.now() - now);
        return res;
    }
    async countDocuments(collection, where) {
        return this.runQuery('countDocuments', collection, undefined, where);
    }
    logQuery(query, took) {
        super.logQuery(query, took, 'javascript');
    }
    async runQuery(method, collection, data, where) {
        collection = this.getCollectionName(collection);
        data = this.convertObjectIds(data);
        where = this.convertObjectIds(where);
        const now = Date.now();
        let res;
        let query;
        switch (method) {
            case 'insertOne':
                query = `db.getCollection('${collection}').insertOne(${this.logObject(data)});`;
                res = await this.getCollection(collection).insertOne(data);
                break;
            case 'updateMany':
                const payload = Object.keys(data).some(k => k.startsWith('$')) ? data : { $set: data };
                query = `db.getCollection('${collection}').updateMany(${this.logObject(where)}, ${this.logObject(payload)});`;
                res = await this.getCollection(collection).updateMany(where, payload);
                break;
            case 'deleteMany':
            case 'countDocuments':
                query = `db.getCollection('${collection}').${method}(${this.logObject(where)});`;
                res = await this.getCollection(collection)[method](where); // cast to deleteMany to fix some typing weirdness
                break;
        }
        this.logQuery(query, Date.now() - now);
        if (method === 'countDocuments') {
            return res;
        }
        return this.transformResult(res);
    }
    convertObjectIds(payload) {
        if (payload instanceof mongodb_1.ObjectId) {
            return payload;
        }
        if (utils_1.Utils.isString(payload) && payload.match(/^[0-9a-f]{24}$/i)) {
            return new mongodb_1.ObjectId(payload);
        }
        if (Array.isArray(payload)) {
            return payload.map((item) => this.convertObjectIds(item));
        }
        if (utils_1.Utils.isObject(payload)) {
            Object.keys(payload).forEach(k => {
                payload[k] = this.convertObjectIds(payload[k]);
            });
        }
        return payload;
    }
    transformResult(res) {
        return {
            affectedRows: res.modifiedCount || res.deletedCount || 0,
            insertId: res.insertedId,
        };
    }
    getCollectionName(name) {
        name = utils_1.Utils.className(name);
        const meta = this.metadata.get(name, false, false);
        return meta ? meta.collection : name;
    }
    logObject(o) {
        return util_1.inspect(o, { depth: 5, compact: true, breakLength: 300 });
    }
}
exports.MongoConnection = MongoConnection;
mongodb_1.ObjectId.prototype[util_1.inspect.custom] = function () {
    return `ObjectId('${this.toHexString()}')`;
};
Date.prototype[util_1.inspect.custom] = function () {
    return `ISODate('${this.toISOString()}')`;
};
