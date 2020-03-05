import { TableBuilder } from 'knex';
import { Dictionary, EntityProperty } from '../typings';
import { AbstractSqlConnection } from '../connections/AbstractSqlConnection';
import { Column, Index } from './DatabaseTable';
import { Connection } from '../connections';
export declare abstract class SchemaHelper {
    getSchemaBeginning(): string;
    getSchemaEnd(): string;
    finalizeTable(table: TableBuilder): void;
    getTypeDefinition(prop: EntityProperty, types?: Record<string, string[]>, lengths?: Record<string, number>, allowZero?: boolean): string;
    isSame(prop: EntityProperty, column: Column, types?: Record<string, string[]>, defaultValues?: Record<string, string[]>): IsSame;
    supportsSchemaConstraints(): boolean;
    indexForeignKeys(): boolean;
    getTypeFromDefinition(type: string, defaultType: string, types?: Record<string, string[]>): string;
    getPrimaryKeys(connection: AbstractSqlConnection, indexes: Record<string, Index[]>, tableName: string, schemaName?: string): Promise<string[]>;
    getForeignKeys(connection: AbstractSqlConnection, tableName: string, schemaName?: string): Promise<Dictionary>;
    getListTablesSQL(): string;
    getRenameColumnSQL(tableName: string, from: Column, to: EntityProperty, quote?: string): string;
    getColumns(connection: AbstractSqlConnection, tableName: string, schemaName?: string): Promise<any[]>;
    getIndexes(connection: AbstractSqlConnection, tableName: string, schemaName?: string): Promise<Record<string, any[]>>;
    getForeignKeysSQL(tableName: string, schemaName?: string): string;
    mapForeignKeys(fks: any[]): Dictionary;
    private processTypeWildCard;
    supportsColumnAlter(): boolean;
    normalizeDefaultValue(defaultValue: string, length: number, defaultValues?: Record<string, string[]>): string | number;
    getCreateDatabaseSQL(name: string): string;
    getDropDatabaseSQL(name: string): string;
    getDatabaseExistsSQL(name: string): string;
    getDatabaseNotExistsError(dbName: string): string;
    getManagementDbName(): string;
    databaseExists(connection: Connection, name: string): Promise<boolean>;
    private hasSameType;
    private hasSameDefaultValue;
    private hasSameIndex;
}
export interface IsSame {
    all?: boolean;
    sameTypes?: boolean;
    sameNullable?: boolean;
    sameDefault?: boolean;
    sameIndex?: boolean;
}
