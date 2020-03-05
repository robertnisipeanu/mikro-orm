export declare class DatabaseTable {
    readonly name: string;
    readonly schema?: string | undefined;
    private columns;
    private indexes;
    private foreignKeys;
    constructor(name: string, schema?: string | undefined);
    getColumns(): Column[];
    getColumn(name: string): Column | undefined;
    init(cols: Column[], indexes: Record<string, Index[]>, pks: string[], fks: Record<string, ForeignKey>): void;
}
export interface Column {
    name: string;
    type: string;
    fk: ForeignKey;
    indexes: Index[];
    primary: boolean;
    unique: boolean;
    nullable: boolean;
    maxLength: number;
    defaultValue: string;
}
export interface ForeignKey {
    columnName: string;
    constraintName: string;
    referencedTableName: string;
    referencedColumnName: string;
    updateRule: string;
    deleteRule: string;
}
export interface Index {
    columnName: string;
    keyName: string;
    unique: boolean;
    primary: boolean;
}
