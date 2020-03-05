import { CreateTableBuilder } from 'knex';
import { IsSame, SchemaHelper } from './SchemaHelper';
import { EntityProperty } from '../typings';
import { AbstractSqlConnection } from '../connections/AbstractSqlConnection';
import { Column } from './DatabaseTable';
export declare class MySqlSchemaHelper extends SchemaHelper {
    static readonly TYPES: {
        boolean: string[];
        number: string[];
        float: string[];
        double: string[];
        tinyint: string[];
        smallint: string[];
        bigint: string[];
        string: string[];
        Date: string[];
        date: string[];
        text: string[];
        object: string[];
        json: string[];
        enum: string[];
    };
    static readonly DEFAULT_TYPE_LENGTHS: {
        number: number;
        string: number;
        date: number;
    };
    static readonly DEFAULT_VALUES: {
        'now()': string[];
        'current_timestamp(?)': string[];
    };
    getSchemaBeginning(): string;
    getSchemaEnd(): string;
    finalizeTable(table: CreateTableBuilder): void;
    getTypeDefinition(prop: EntityProperty): string;
    getTypeFromDefinition(type: string, defaultType: string): string;
    getListTablesSQL(): string;
    getRenameColumnSQL(tableName: string, from: Column, to: EntityProperty): string;
    getForeignKeysSQL(tableName: string, schemaName?: string): string;
    getColumns(connection: AbstractSqlConnection, tableName: string, schemaName?: string): Promise<any[]>;
    getIndexes(connection: AbstractSqlConnection, tableName: string, schemaName?: string): Promise<Record<string, any[]>>;
    isSame(prop: EntityProperty, column: Column): IsSame;
    normalizeDefaultValue(defaultValue: string, length: number): string | number;
}
