"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
const query_1 = require("../query");
class DatabaseDriver {
    constructor(config, dependencies) {
        this.config = config;
        this.dependencies = dependencies;
        this.replicas = [];
        this.logger = this.config.getLogger();
    }
    async aggregate(entityName, pipeline) {
        throw new Error(`Aggregations are not supported by ${this.constructor.name} driver`);
    }
    async loadFromPivotTable(prop, owners, where, orderBy, ctx) {
        throw new Error(`${this.constructor.name} does not use pivot tables`);
    }
    mapResult(result, meta) {
        if (!result || !meta) {
            return null;
        }
        const ret = Object.assign({}, result);
        Object.values(meta.properties).forEach(prop => {
            if (prop.fieldName && prop.fieldName in ret) {
                utils_1.Utils.renameKey(ret, prop.fieldName, prop.name);
            }
            if (prop.type === 'boolean' && ![null, undefined].includes(ret[prop.name])) {
                ret[prop.name] = !!ret[prop.name];
            }
        });
        return ret;
    }
    async connect() {
        await this.connection.connect();
        await Promise.all(this.replicas.map(replica => replica.connect()));
        return this.connection;
    }
    async reconnect() {
        await this.close(true);
        return this.connect();
    }
    getConnection(type = 'write') {
        if (type === 'write' || this.replicas.length === 0) {
            return this.connection;
        }
        const rand = utils_1.Utils.randomInt(0, this.replicas.length - 1);
        return this.replicas[rand];
    }
    async close(force) {
        await Promise.all(this.replicas.map(replica => replica.close(force)));
        await this.connection.close(force);
    }
    getPlatform() {
        return this.platform;
    }
    setMetadata(metadata) {
        this.metadata = metadata;
        this.connection.setMetadata(metadata);
    }
    getDependencies() {
        return this.dependencies;
    }
    getPivotOrderBy(prop, orderBy) {
        if (orderBy) {
            return orderBy;
        }
        if (prop.orderBy) {
            return prop.orderBy;
        }
        if (prop.fixedOrder) {
            return { [`${prop.pivotTable}.${prop.fixedOrderColumn}`]: query_1.QueryOrder.ASC };
        }
        return {};
    }
    getPrimaryKeyField(entityName) {
        const meta = this.metadata.get(entityName, false, false);
        return meta ? meta.primaryKey : this.config.getNamingStrategy().referenceColumnName();
    }
    getPivotInverseProperty(prop) {
        const pivotMeta = this.metadata.get(prop.pivotTable);
        let inverse;
        if (prop.owner) {
            const pivotProp1 = pivotMeta.properties[prop.type + '_inverse'];
            inverse = pivotProp1.mappedBy;
        }
        else {
            const pivotProp1 = pivotMeta.properties[prop.type + '_owner'];
            inverse = pivotProp1.inversedBy;
        }
        return pivotMeta.properties[inverse];
    }
    createReplicas(cb) {
        const replicas = this.config.get('replicas', []);
        const ret = [];
        const props = ['dbName', 'clientUrl', 'host', 'port', 'user', 'password', 'multipleStatements', 'pool', 'name'];
        replicas.forEach((conf) => {
            props.forEach(prop => conf[prop] = prop in conf ? conf[prop] : this.config.get(prop));
            ret.push(cb(conf));
        });
        return ret;
    }
}
exports.DatabaseDriver = DatabaseDriver;