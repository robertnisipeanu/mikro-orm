"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
class SchemaGenerator {
    constructor(driver, metadata, config) {
        this.driver = driver;
        this.metadata = metadata;
        this.config = config;
        this.platform = this.driver.getPlatform();
        this.helper = this.platform.getSchemaHelper();
        this.connection = this.driver.getConnection();
        this.knex = this.connection.getKnex();
    }
    async generate() {
        let ret = await this.getDropSchemaSQL(false);
        ret += await this.getCreateSchemaSQL(false);
        return this.wrapSchema(ret);
    }
    async createSchema(wrap = true) {
        await this.ensureDatabase();
        const sql = await this.getCreateSchemaSQL(wrap);
        await this.execute(sql);
    }
    async ensureDatabase() {
        const dbName = this.config.get('dbName');
        const exists = await this.helper.databaseExists(this.connection, dbName);
        if (!exists) {
            this.config.set('dbName', this.helper.getManagementDbName());
            await this.driver.reconnect();
            await this.createDatabase(dbName);
        }
    }
    async getCreateSchemaSQL(wrap = true) {
        let ret = '';
        for (const meta of Object.values(this.metadata.getAll())) {
            ret += this.dump(this.createTable(meta));
        }
        for (const meta of Object.values(this.metadata.getAll())) {
            ret += this.dump(this.knex.schema.alterTable(meta.collection, table => this.createForeignKeys(table, meta)));
        }
        return this.wrapSchema(ret, wrap);
    }
    async dropSchema(wrap = true, dropMigrationsTable = false, dropDb = false) {
        if (dropDb) {
            const name = this.config.get('dbName');
            return this.dropDatabase(name);
        }
        const sql = await this.getDropSchemaSQL(wrap, dropMigrationsTable);
        await this.execute(sql);
    }
    async getDropSchemaSQL(wrap = true, dropMigrationsTable = false) {
        let ret = '';
        for (const meta of Object.values(this.metadata.getAll())) {
            ret += this.dump(this.dropTable(meta.collection), '\n');
        }
        if (dropMigrationsTable) {
            ret += this.dump(this.dropTable(this.config.get('migrations').tableName), '\n');
        }
        return this.wrapSchema(ret + '\n', wrap);
    }
    async updateSchema(wrap = true) {
        const sql = await this.getUpdateSchemaSQL(wrap);
        await this.execute(sql);
    }
    async getUpdateSchemaSQL(wrap = true) {
        const schema = await __1.DatabaseSchema.create(this.connection, this.helper, this.config);
        let ret = '';
        for (const meta of Object.values(this.metadata.getAll())) {
            ret += this.getUpdateTableSQL(meta, schema);
        }
        const definedTables = Object.values(this.metadata.getAll()).map(meta => meta.collection);
        const remove = schema.getTables().filter(table => !definedTables.includes(table.name));
        for (const table of remove) {
            ret += this.dump(this.dropTable(table.name));
        }
        return this.wrapSchema(ret, wrap);
    }
    /**
     * creates new database and connects to it
     */
    async createDatabase(name) {
        await this.connection.execute(this.helper.getCreateDatabaseSQL('' + this.knex.ref(name)));
        this.config.set('dbName', name);
        await this.driver.reconnect();
    }
    async dropDatabase(name) {
        this.config.set('dbName', this.helper.getManagementDbName());
        await this.driver.reconnect();
        await this.connection.execute(this.helper.getDropDatabaseSQL('' + this.knex.ref(name)));
    }
    async execute(sql) {
        const lines = sql.split('\n').filter(i => i.trim());
        for (const line of lines) {
            await this.connection.execute(line);
        }
    }
    getUpdateTableSQL(meta, schema) {
        const table = schema.getTable(meta.collection);
        let ret = '';
        if (!table) {
            ret += this.dump(this.createTable(meta));
            ret += this.dump(this.knex.schema.alterTable(meta.collection, table => this.createForeignKeys(table, meta)));
            return ret;
        }
        const sql = this.updateTable(meta, table).map(builder => this.dump(builder));
        ret += sql.join('\n');
        return ret;
    }
    async wrapSchema(sql, wrap = true) {
        if (!wrap) {
            return sql;
        }
        let ret = this.helper.getSchemaBeginning();
        ret += sql;
        ret += this.helper.getSchemaEnd();
        return ret;
    }
    createTable(meta) {
        return this.knex.schema.createTable(meta.collection, table => {
            Object
                .values(meta.properties)
                .filter(prop => this.shouldHaveColumn(prop))
                .forEach(prop => this.createTableColumn(table, meta, prop));
            if (meta.compositePK) {
                table.primary(meta.primaryKeys.map(prop => meta.properties[prop].fieldName));
            }
            meta.indexes.forEach(index => {
                const properties = __1.Utils.asArray(index.properties).map(prop => meta.properties[prop].fieldName);
                table.index(properties, index.name, index.type);
            });
            meta.uniques.forEach(index => {
                const properties = __1.Utils.asArray(index.properties).map(prop => meta.properties[prop].fieldName);
                table.unique(properties, index.name);
            });
            this.helper.finalizeTable(table);
        });
    }
    updateTable(meta, table) {
        const { create, update, remove } = this.computeTableDifference(meta, table);
        if (create.length + update.length + remove.length === 0) {
            return [];
        }
        const rename = this.findRenamedColumns(create, remove);
        const ret = [];
        for (const prop of rename) {
            ret.push(this.knex.schema.raw(this.helper.getRenameColumnSQL(table.name, prop.from, prop.to)));
        }
        ret.push(this.knex.schema.alterTable(meta.collection, t => {
            for (const prop of create) {
                this.createTableColumn(t, meta, prop);
            }
            for (const col of update) {
                this.updateTableColumn(t, meta, col.prop, col.column, col.diff);
            }
            for (const column of remove) {
                this.dropTableColumn(t, column);
            }
        }));
        return ret;
    }
    computeTableDifference(meta, table) {
        const props = Object.values(meta.properties).filter(prop => this.shouldHaveColumn(prop, true));
        const columns = table.getColumns();
        const create = [];
        const update = [];
        const remove = columns.filter(col => !props.find(prop => prop.fieldName === col.name));
        for (const prop of props) {
            this.computeColumnDifference(table, create, prop, update);
        }
        return { create, update, remove };
    }
    computeColumnDifference(table, create, prop, update) {
        const column = table.getColumn(prop.fieldName);
        if (!column) {
            create.push(prop);
            return;
        }
        if (this.helper.supportsColumnAlter() && !this.helper.isSame(prop, column).all) {
            const diff = this.helper.isSame(prop, column);
            update.push({ prop, column, diff });
        }
    }
    dropTable(name) {
        let builder = this.knex.schema.dropTableIfExists(name);
        if (this.platform.usesCascadeStatement()) {
            builder = this.knex.schema.raw(builder.toQuery() + ' cascade');
        }
        return builder;
    }
    shouldHaveColumn(prop, update = false) {
        if (prop.persist === false) {
            return false;
        }
        if (prop.reference !== __1.ReferenceType.SCALAR && !this.helper.supportsSchemaConstraints() && !update) {
            return false;
        }
        return [__1.ReferenceType.SCALAR, __1.ReferenceType.MANY_TO_ONE].includes(prop.reference) || (prop.reference === __1.ReferenceType.ONE_TO_ONE && prop.owner);
    }
    createTableColumn(table, meta, prop, alter) {
        if (prop.primary && !meta.compositePK && prop.type === 'number') {
            return table.increments(prop.fieldName);
        }
        if (prop.enum && prop.items && prop.items.every(item => __1.Utils.isString(item))) {
            const col = table.enum(prop.fieldName, prop.items);
            return this.configureColumn(meta, prop, col, alter);
        }
        const col = table.specificType(prop.fieldName, prop.columnType);
        return this.configureColumn(meta, prop, col, alter);
    }
    updateTableColumn(table, meta, prop, column, diff) {
        const equalDefinition = diff.sameTypes && diff.sameDefault && diff.sameNullable;
        if (column.fk && !diff.sameIndex) {
            table.dropForeign([column.fk.columnName], column.fk.constraintName);
        }
        if (column.indexes.length > 0 && !diff.sameIndex) {
            table.dropIndex(column.indexes.map(index => index.columnName));
        }
        if (column.fk && !diff.sameIndex && equalDefinition) {
            return this.createForeignKey(table, meta, prop, diff);
        }
        this.createTableColumn(table, meta, prop, diff).alter();
    }
    dropTableColumn(table, column) {
        if (column.fk) {
            table.dropForeign([column.fk.columnName], column.fk.constraintName);
        }
        column.indexes.forEach(i => table.dropIndex([i.columnName], i.keyName));
        table.dropColumn(column.name);
    }
    configureColumn(meta, prop, col, alter) {
        const nullable = (alter && this.platform.requiresNullableForAlteringColumn()) || prop.nullable;
        const indexed = 'index' in prop ? prop.index : (prop.reference !== __1.ReferenceType.SCALAR && this.helper.indexForeignKeys());
        const index = indexed && !(alter && alter.sameIndex);
        const indexName = __1.Utils.isString(prop.index) ? prop.index : undefined;
        const uniqueName = __1.Utils.isString(prop.unique) ? prop.unique : undefined;
        const hasDefault = typeof prop.default !== 'undefined'; // support falsy default values like `0`, `false` or empty string
        __1.Utils.runIfNotEmpty(() => col.nullable(), nullable);
        __1.Utils.runIfNotEmpty(() => col.notNullable(), !nullable);
        __1.Utils.runIfNotEmpty(() => col.primary(), prop.primary && !meta.compositePK);
        __1.Utils.runIfNotEmpty(() => col.unsigned(), prop.unsigned);
        __1.Utils.runIfNotEmpty(() => col.index(indexName), index);
        __1.Utils.runIfNotEmpty(() => col.unique(uniqueName), prop.unique);
        __1.Utils.runIfNotEmpty(() => col.defaultTo(this.knex.raw('' + prop.default)), hasDefault);
        return col;
    }
    createForeignKeys(table, meta) {
        Object.values(meta.properties)
            .filter(prop => prop.reference === __1.ReferenceType.MANY_TO_ONE || (prop.reference === __1.ReferenceType.ONE_TO_ONE && prop.owner))
            .forEach(prop => this.createForeignKey(table, meta, prop));
    }
    createForeignKey(table, meta, prop, diff = {}) {
        if (this.helper.supportsSchemaConstraints()) {
            this.createForeignKeyReference(table.foreign(prop.fieldName), prop);
            return;
        }
        this.createTableColumn(table, meta, prop, diff);
        // knex does not allow adding new columns with FK in sqlite
        // @see https://github.com/knex/knex/issues/3351
        // const col = this.createTableColumn(table, meta, prop, true);
        // this.createForeignKeyReference(col, prop);
    }
    createForeignKeyReference(col, prop) {
        const meta2 = this.metadata.get(prop.type);
        const pk2 = meta2.properties[meta2.primaryKey];
        col.references(pk2.fieldName).inTable(meta2.collection);
        const cascade = prop.cascade.includes(__1.Cascade.REMOVE) || prop.cascade.includes(__1.Cascade.ALL);
        if (cascade || prop.nullable) {
            col.onDelete(cascade ? 'cascade' : 'set null');
        }
        if (prop.cascade.includes(__1.Cascade.PERSIST) || prop.cascade.includes(__1.Cascade.ALL)) {
            col.onUpdate('cascade');
        }
    }
    findRenamedColumns(create, remove) {
        const renamed = [];
        for (const prop of create) {
            const match = remove.find(column => {
                const copy = __1.Utils.copy(column);
                copy.name = prop.fieldName;
                return this.helper.isSame(prop, copy).all;
            });
            if (match) {
                renamed.push({ from: match, to: prop });
            }
        }
        renamed.forEach(prop => {
            create.splice(create.indexOf(prop.to), 1);
            remove.splice(remove.indexOf(prop.from), 1);
        });
        return renamed;
    }
    dump(builder, append = '\n\n') {
        const sql = builder.toQuery();
        return sql.length > 0 ? `${sql};${append}` : '';
    }
}
exports.SchemaGenerator = SchemaGenerator;
