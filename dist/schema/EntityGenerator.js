"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts_morph_1 = require("ts-morph");
const fs_extra_1 = require("fs-extra");
const __1 = require("..");
class EntityGenerator {
    constructor(driver, config) {
        this.driver = driver;
        this.config = config;
        this.platform = this.driver.getPlatform();
        this.helper = this.platform.getSchemaHelper();
        this.connection = this.driver.getConnection();
        this.namingStrategy = this.config.getNamingStrategy();
        this.project = new ts_morph_1.Project();
        this.sources = [];
        this.project.manipulationSettings.set({ quoteKind: ts_morph_1.QuoteKind.Single, indentationText: ts_morph_1.IndentationText.TwoSpaces });
    }
    async generate(options = {}) {
        const baseDir = __1.Utils.normalizePath(options.baseDir || this.config.get('baseDir') + '/generated-entities');
        const schema = await __1.DatabaseSchema.create(this.connection, this.helper, this.config);
        for (const table of schema.getTables()) {
            await this.createEntity(table);
        }
        this.sources.forEach(entity => {
            entity.fixMissingImports();
            entity.fixUnusedIdentifiers();
            entity.organizeImports();
        });
        if (options.save) {
            await fs_extra_1.ensureDir(baseDir);
            await Promise.all(this.sources.map(e => fs_extra_1.writeFile(baseDir + '/' + e.getBaseName(), e.getFullText())));
        }
        return this.sources.map(e => e.getFullText());
    }
    async createEntity(table) {
        const entity = this.project.createSourceFile(this.namingStrategy.getClassName(table.name, '_') + '.ts', writer => {
            writer.writeLine(`import { Entity, PrimaryKey, Property, ManyToOne, OneToMany, OneToOne, ManyToMany, Cascade } from 'mikro-orm';`);
            writer.blankLine();
            writer.writeLine('@Entity()');
            writer.write(`export class ${this.namingStrategy.getClassName(table.name, '_')}`);
            writer.block(() => table.getColumns().forEach(column => this.createProperty(writer, column)));
            writer.write('');
        });
        this.sources.push(entity);
    }
    createProperty(writer, column) {
        const prop = this.getPropertyName(column);
        const type = this.getPropertyType(column);
        const columnType = this.getPropertyType(column, '__false') === '__false' ? column.type : undefined;
        const defaultValue = this.getPropertyDefaultValue(column, type);
        const decorator = this.getPropertyDecorator(prop, column, type, defaultValue, columnType);
        const definition = this.getPropertyDefinition(column, prop, type, defaultValue);
        writer.blankLineIfLastNot();
        writer.writeLine(decorator);
        writer.writeLine(definition);
        writer.blankLine();
    }
    getPropertyDefinition(column, prop, type, defaultValue) {
        // string defaults are usually things like SQL functions
        const useDefault = defaultValue && typeof defaultValue !== 'string';
        const optional = column.nullable ? '?' : (useDefault ? '' : '!');
        const ret = `${prop}${optional}: ${type}`;
        if (!useDefault) {
            return ret + ';';
        }
        return `${ret} = ${defaultValue};`;
    }
    getPropertyDecorator(prop, column, type, defaultValue, columnType) {
        const options = {};
        const decorator = this.getDecoratorType(column);
        if (column.fk) {
            this.getForeignKeyDecoratorOptions(options, column, prop);
        }
        else {
            this.getScalarPropertyDecoratorOptions(type, column, options, prop, columnType);
        }
        this.getCommonDecoratorOptions(column, options, defaultValue, columnType);
        if (Object.keys(options).length === 0) {
            return decorator + '()';
        }
        return `${decorator}({ ${Object.entries(options).map(([opt, val]) => `${opt}: ${val}`).join(', ')} })`;
    }
    getCommonDecoratorOptions(column, options, defaultValue, columnType) {
        if (columnType) {
            options.columnType = `'${columnType}'`;
        }
        if (column.nullable) {
            options.nullable = true;
        }
        if (defaultValue && typeof defaultValue === 'string') {
            options.default = `\`${defaultValue}\``;
        }
    }
    getScalarPropertyDecoratorOptions(type, column, options, prop, columnType) {
        const defaultColumnType = this.helper.getTypeDefinition({
            type,
            length: column.maxLength,
        }).replace(/\(\d+\)/, '');
        if (column.type !== defaultColumnType && column.type !== columnType) {
            options.type = `'${column.type}'`;
        }
        if (column.name !== this.namingStrategy.propertyToColumnName(prop)) {
            options.fieldName = `'${column.name}'`;
        }
        if (column.maxLength && column.type !== 'enum') {
            options.length = column.maxLength;
        }
    }
    getForeignKeyDecoratorOptions(options, column, prop) {
        options.entity = `() => ${this.namingStrategy.getClassName(column.fk.referencedTableName, '_')}`;
        if (column.name !== this.namingStrategy.joinKeyColumnName(prop, column.fk.referencedColumnName)) {
            options.fieldName = `'${column.name}'`;
        }
        const cascade = ['Cascade.MERGE'];
        if (column.fk.updateRule.toLowerCase() === 'cascade') {
            cascade.push('Cascade.PERSIST');
        }
        if (column.fk.deleteRule.toLowerCase() === 'cascade') {
            cascade.push('Cascade.REMOVE');
        }
        if (cascade.length === 3) {
            cascade.length = 0;
            cascade.push('Cascade.ALL');
        }
        if (!(cascade.length === 2 && cascade.includes('Cascade.PERSIST') && cascade.includes('Cascade.MERGE'))) {
            options.cascade = `[${cascade.sort().join(', ')}]`;
        }
        if (column.primary) {
            options.primary = true;
        }
    }
    getDecoratorType(column) {
        if (column.fk && column.unique) {
            return '@OneToOne';
        }
        if (column.fk) {
            return '@ManyToOne';
        }
        if (column.primary) {
            return '@PrimaryKey';
        }
        return '@Property';
    }
    getPropertyName(column) {
        let field = column.name;
        if (column.fk) {
            field = field.replace(new RegExp(`_${column.fk.referencedColumnName}$`), '');
        }
        return field.replace(/_(\w)/g, m => m[1].toUpperCase()).replace(/_+/g, '');
    }
    getPropertyType(column, defaultType = 'string') {
        if (column.fk) {
            return this.namingStrategy.getClassName(column.fk.referencedTableName, '_');
        }
        return this.helper.getTypeFromDefinition(column.type, defaultType);
    }
    getPropertyDefaultValue(column, propType) {
        if (!column.defaultValue) {
            return;
        }
        const val = this.helper.normalizeDefaultValue(column.defaultValue, column.maxLength);
        if (column.nullable && val === 'null') {
            return;
        }
        if (propType === 'boolean') {
            return !!column.defaultValue;
        }
        if (propType === 'number') {
            return +column.defaultValue;
        }
        return '' + val;
    }
}
exports.EntityGenerator = EntityGenerator;
