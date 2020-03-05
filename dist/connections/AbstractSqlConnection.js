"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const knex_1 = __importDefault(require("knex"));
const fs_extra_1 = require("fs-extra");
const Connection_1 = require("./Connection");
const utils_1 = require("../utils");
class AbstractSqlConnection extends Connection_1.Connection {
    getKnex() {
        return this.client;
    }
    async close(force) {
        await this.client.destroy();
    }
    async isConnected() {
        try {
            await this.client.raw('select 1');
            return true;
        }
        catch (_a) {
            return false;
        }
    }
    async transactional(cb, ctx) {
        let ret; // knex doesn't return value from the transaction even TS type says the opposite though
        await (ctx || this.client).transaction(async (trx) => {
            try {
                ret = await cb(trx);
                await trx.commit();
            }
            catch (e) {
                await trx.rollback(e);
                throw e;
            }
        });
        return ret;
    }
    async execute(queryOrKnex, params = [], method = 'all') {
        if (utils_1.Utils.isObject(queryOrKnex)) {
            return await this.executeKnex(queryOrKnex, method);
        }
        const sql = this.getSql(this.client.raw(queryOrKnex, params));
        const res = await this.executeQuery(sql, () => this.client.raw(queryOrKnex, params));
        return this.transformRawResult(res, method);
    }
    /**
     * Execute raw SQL queries from file
     */
    async loadFile(path) {
        const buf = await fs_extra_1.readFile(path);
        await this.client.raw(buf.toString());
    }
    logQuery(query, took) {
        super.logQuery(query, took, 'sql');
    }
    createKnexClient(type) {
        return knex_1.default(this.getKnexOptions(type))
            .on('query', data => {
            if (!data.__knexQueryUid) {
                this.logQuery(data.sql.toLowerCase().replace(/;$/, ''));
            }
        });
    }
    getKnexOptions(type) {
        return utils_1.Utils.merge({
            client: type,
            connection: this.getConnectionOptions(),
            pool: this.config.get('pool'),
        }, this.config.get('driverOptions'));
    }
    async executeKnex(qb, method) {
        const sql = this.getSql(qb);
        const res = await this.executeQuery(sql, () => qb);
        return this.transformKnexResult(res, method);
    }
    getSql(qb) {
        const debug = this.config.get('debug');
        const dumpParams = Array.isArray(debug) ? debug.includes('query-params') : debug;
        if (dumpParams) {
            return qb.toString();
        }
        const q = qb.toSQL();
        const query = q.toNative ? q.toNative() : q;
        return this.client.client.positionBindings(query.sql);
    }
    transformKnexResult(res, method) {
        if (method === 'all') {
            return res;
        }
        if (method === 'get') {
            return res[0];
        }
        const affectedRows = typeof res === 'number' ? res : 0;
        const insertId = typeof res[0] === 'number' ? res[0] : 0;
        return { insertId, affectedRows, row: res[0] };
    }
}
exports.AbstractSqlConnection = AbstractSqlConnection;
