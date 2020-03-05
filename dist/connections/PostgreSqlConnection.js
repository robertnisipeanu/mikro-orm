"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const AbstractSqlConnection_1 = require("./AbstractSqlConnection");
class PostgreSqlConnection extends AbstractSqlConnection_1.AbstractSqlConnection {
    async connect() {
        this.client = this.createKnexClient('pg');
    }
    getDefaultClientUrl() {
        return 'postgresql://postgres@127.0.0.1:5432';
    }
    getConnectionOptions() {
        const ret = super.getConnectionOptions();
        pg_1.types.setTypeParser(1700, str => parseFloat(str));
        if (this.config.get('forceUtcTimezone')) {
            [1082, 1083, 1114].forEach(oid => pg_1.types.setTypeParser(oid, str => new Date(str + 'Z'))); // date, time, timestamp types
            pg_1.defaults.parseInputDatesAsUTC = true;
        }
        return ret;
    }
    transformRawResult(res, method) {
        if (method === 'get') {
            return res.rows[0];
        }
        if (method === 'all') {
            return res.rows;
        }
        return {
            affectedRows: res.rowCount,
            insertId: res.rows[0] ? res.rows[0].id : 0,
            row: res.rows[0],
        };
    }
}
exports.PostgreSqlConnection = PostgreSqlConnection;
