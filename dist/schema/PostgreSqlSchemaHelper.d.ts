import { IsSame, SchemaHelper } from './SchemaHelper';
import { EntityProperty } from '../typings';
import { AbstractSqlConnection } from '../connections/AbstractSqlConnection';
import { Column } from './DatabaseTable';
export declare class PostgreSqlSchemaHelper extends SchemaHelper {
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
        uuid: string[];
        enum: string[];
    };
    static readonly DEFAULT_TYPE_LENGTHS: {
        string: number;
        date: number;
    };
    static readonly DEFAULT_VALUES: {
        'now()': string[];
        'current_timestamp(?)': string[];
        "('now'::text)::timestamp(?) with time zone": string[];
        "('now'::text)::timestamp(?) without time zone": string[];
        'null::character varying': string[];
        'null::timestamp with time zone': string[];
        'null::timestamp without time zone': string[];
    };
    getSchemaBeginning(): string;
    getSchemaEnd(): string;
    getTypeDefinition(prop: EntityProperty): string;
    getTypeFromDefinition(type: string, defaultType: string): string;
    isSame(prop: EntityProperty, column: Column): IsSame;
    indexForeignKeys(): boolean;
    getListTablesSQL(): string;
    getColumns(connection: AbstractSqlConnection, tableName: string, schemaName: string): Promise<any[]>;
    getIndexes(connection: AbstractSqlConnection, tableName: string, schemaName: string): Promise<Record<string, any[]>>;
    getForeignKeysSQL(tableName: string, schemaName: string): string;
    normalizeDefaultValue(defaultValue: string, length: number): string | number;
    getDatabaseExistsSQL(name: string): string;
    getDatabaseNotExistsError(dbName: string): string;
    getManagementDbName(): string;
    private getIndexesSQL;
}
