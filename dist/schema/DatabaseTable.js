"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DatabaseTable {
    constructor(name, schema) {
        this.name = name;
        this.schema = schema;
    }
    getColumns() {
        return Object.values(this.columns);
    }
    getColumn(name) {
        return this.columns[name];
    }
    init(cols, indexes, pks, fks) {
        this.indexes = indexes;
        this.foreignKeys = fks;
        this.columns = cols.reduce((o, v) => {
            const index = indexes[v.name] || [];
            v.primary = pks.includes(v.name);
            v.unique = index.some(i => i.unique && !i.primary);
            v.fk = fks[v.name];
            v.indexes = index.filter(i => !i.primary);
            o[v.name] = v;
            return o;
        }, {});
    }
}
exports.DatabaseTable = DatabaseTable;
