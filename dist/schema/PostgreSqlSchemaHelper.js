"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SchemaHelper_1 = require("./SchemaHelper");
class PostgreSqlSchemaHelper extends SchemaHelper_1.SchemaHelper {
    getSchemaBeginning() {
        return `set names 'utf8';\nset session_replication_role = 'replica';\n\n`;
    }
    getSchemaEnd() {
        return `set session_replication_role = 'origin';\n`;
    }
    getTypeDefinition(prop) {
        return super.getTypeDefinition(prop, PostgreSqlSchemaHelper.TYPES, PostgreSqlSchemaHelper.DEFAULT_TYPE_LENGTHS, true);
    }
    getTypeFromDefinition(type, defaultType) {
        return super.getTypeFromDefinition(type, defaultType, PostgreSqlSchemaHelper.TYPES);
    }
    isSame(prop, column) {
        return super.isSame(prop, column, PostgreSqlSchemaHelper.TYPES, PostgreSqlSchemaHelper.DEFAULT_VALUES);
    }
    indexForeignKeys() {
        return false;
    }
    getListTablesSQL() {
        return 'select table_name, table_schema as schema_name '
            + `from information_schema.tables where table_schema not like 'pg\_%' and table_schema != 'information_schema' `
            + `and table_name != 'geometry_columns' and table_name != 'spatial_ref_sys' and table_type != 'VIEW' order by table_name`;
    }
    async getColumns(connection, tableName, schemaName) {
        const sql = `select column_name, column_default, is_nullable, udt_name, coalesce(datetime_precision, character_maximum_length) length
      from information_schema.columns where table_schema = '${schemaName}' and table_name = '${tableName}'`;
        const columns = await connection.execute(sql);
        return columns.map(col => ({
            name: col.column_name,
            type: col.udt_name,
            maxLength: col.length,
            nullable: col.is_nullable === 'YES',
            defaultValue: this.normalizeDefaultValue(col.column_default, col.length),
        }));
    }
    async getIndexes(connection, tableName, schemaName) {
        const sql = this.getIndexesSQL(tableName, schemaName);
        const indexes = await connection.execute(sql);
        return indexes.reduce((ret, index) => {
            ret[index.column_name] = ret[index.column_name] || [];
            ret[index.column_name].push({
                columnName: index.column_name,
                keyName: index.constraint_name,
                unique: index.unique,
                primary: index.primary,
            });
            return ret;
        }, {});
    }
    getForeignKeysSQL(tableName, schemaName) {
        return `select kcu.table_name as table_name, rel_kcu.table_name as referenced_table_name, kcu.column_name as column_name,
      rel_kcu.column_name as referenced_column_name, kcu.constraint_name, rco.update_rule, rco.delete_rule
      from information_schema.table_constraints tco
      join information_schema.key_column_usage kcu
        on tco.constraint_schema = kcu.constraint_schema
        and tco.constraint_name = kcu.constraint_name
      join information_schema.referential_constraints rco
        on tco.constraint_schema = rco.constraint_schema
        and tco.constraint_name = rco.constraint_name
      join information_schema.key_column_usage rel_kcu
        on rco.unique_constraint_schema = rel_kcu.constraint_schema
        and rco.unique_constraint_name = rel_kcu.constraint_name
        and kcu.ordinal_position = rel_kcu.ordinal_position
      where tco.table_name = '${tableName}' and tco.table_schema = '${schemaName}' and tco.constraint_schema = '${schemaName}' and tco.constraint_type = 'FOREIGN KEY'
      order by kcu.table_schema, kcu.table_name, kcu.ordinal_position`;
    }
    normalizeDefaultValue(defaultValue, length) {
        if (!defaultValue) {
            return defaultValue;
        }
        const match = defaultValue.match(/^'(.*)'::(.*)$/);
        if (match) {
            if (match[2] === 'integer') {
                return +match[1];
            }
            return `'${match[1]}'`;
        }
        return super.normalizeDefaultValue(defaultValue, length, PostgreSqlSchemaHelper.DEFAULT_VALUES);
    }
    getDatabaseExistsSQL(name) {
        return `select 1 from pg_database where datname = '${name}'`;
    }
    getDatabaseNotExistsError(dbName) {
        return `database "${dbName}" does not exist`;
    }
    getManagementDbName() {
        return 'postgres';
    }
    getIndexesSQL(tableName, schemaName) {
        return `select i.indexname as constraint_name, k.column_name, c.contype = 'u' as unique, c.contype = 'p' as primary
      from pg_catalog.pg_indexes i
      join pg_catalog.pg_constraint c on c.conname = i.indexname
      join pg_catalog.pg_class rel on rel.oid = c.conrelid
      join pg_catalog.pg_namespace nsp on nsp.oid = c.connamespace
      join information_schema.key_column_usage k on k.constraint_name = c.conname and k.table_schema = 'public' and k.table_name = '${tableName}'
      where nsp.nspname = '${schemaName}' and rel.relname = '${tableName}'`;
    }
}
exports.PostgreSqlSchemaHelper = PostgreSqlSchemaHelper;
PostgreSqlSchemaHelper.TYPES = {
    boolean: ['bool', 'boolean'],
    number: ['int4', 'integer', 'int8', 'int2', 'int', 'float', 'float8', 'double', 'double precision', 'bigint', 'smallint', 'decimal', 'numeric', 'real'],
    float: ['float'],
    double: ['double', 'double precision', 'float8'],
    tinyint: ['int2'],
    smallint: ['int2'],
    bigint: ['bigint'],
    string: ['varchar(?)', 'character varying', 'text', 'character', 'char', 'uuid', 'enum'],
    Date: ['timestamptz(?)', 'timestamp(?)', 'datetime(?)', 'timestamp with time zone', 'timestamp without time zone', 'datetimetz', 'time', 'date', 'timetz', 'datetz'],
    date: ['timestamptz(?)', 'timestamp(?)', 'datetime(?)', 'timestamp with time zone', 'timestamp without time zone', 'datetimetz', 'time', 'date', 'timetz', 'datetz'],
    text: ['text'],
    object: ['json'],
    json: ['json'],
    uuid: ['uuid'],
    enum: ['enum'],
};
PostgreSqlSchemaHelper.DEFAULT_TYPE_LENGTHS = {
    string: 255,
    date: 0,
};
PostgreSqlSchemaHelper.DEFAULT_VALUES = {
    'now()': ['now()', 'current_timestamp'],
    'current_timestamp(?)': ['current_timestamp(?)'],
    "('now'::text)::timestamp(?) with time zone": ['current_timestamp(?)'],
    "('now'::text)::timestamp(?) without time zone": ['current_timestamp(?)'],
    'null::character varying': ['null'],
    'null::timestamp with time zone': ['null'],
    'null::timestamp without time zone': ['null'],
};
