import { CodeBlockWriter } from 'ts-morph';
import { AbstractSqlDriver, Configuration } from '..';
import { Column, DatabaseTable } from './DatabaseTable';
export declare class EntityGenerator {
    private readonly driver;
    private readonly config;
    private readonly platform;
    private readonly helper;
    private readonly connection;
    private readonly namingStrategy;
    private readonly project;
    private readonly sources;
    constructor(driver: AbstractSqlDriver, config: Configuration);
    generate(options?: {
        baseDir?: string;
        save?: boolean;
    }): Promise<string[]>;
    createEntity(table: DatabaseTable): Promise<void>;
    createProperty(writer: CodeBlockWriter, column: Column): void;
    private getPropertyDefinition;
    private getPropertyDecorator;
    private getCommonDecoratorOptions;
    private getScalarPropertyDecoratorOptions;
    private getForeignKeyDecoratorOptions;
    private getDecoratorType;
    private getPropertyName;
    private getPropertyType;
    private getPropertyDefaultValue;
}
