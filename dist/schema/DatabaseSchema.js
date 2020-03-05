"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DatabaseTable_1 = require("./DatabaseTable");
class DatabaseSchema {
    constructor() {
        this.tables = [];
    }
    addTable(name, schema) {
        const table = new DatabaseTable_1.DatabaseTable(name, schema);
        this.tables.push(table);
        return table;
    }
    getTables() {
        return this.tables;
    }
    getTable(name) {
        return this.tables.find(t => t.name === name);
    }
    static async create(connection, helper, config) {
        const schema = new DatabaseSchema();
        const tables = await connection.execute(helper.getListTablesSQL());
        for (const t of tables) {
            if (t.table_name === config.get('migrations').tableName) {
                continue;
            }
            const table = schema.addTable(t.table_name, t.schema_name);
            const cols = await helper.getColumns(connection, t.table_name, t.schema_name);
            const indexes = await helper.getIndexes(connection, t.table_name, t.schema_name);
            const pks = await helper.getPrimaryKeys(connection, indexes, t.table_name, t.schema_name);
            const fks = await helper.getForeignKeys(connection, t.table_name, t.schema_name);
            table.init(cols, indexes, pks, fks);
        }
        return schema;
    }
}
exports.DatabaseSchema = DatabaseSchema;