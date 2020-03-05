import yargs, { Arguments, Argv, CommandModule } from 'yargs';
export declare class SchemaCommandFactory {
    static readonly DESCRIPTIONS: {
        create: string;
        update: string;
        drop: string;
    };
    static readonly SUCCESS_MESSAGES: {
        create: string;
        update: string;
        drop: string;
    };
    static create<U extends Options = Options>(command: 'create' | 'update' | 'drop'): CommandModule<{}, U> & {
        builder: (args: Argv) => Argv<U>;
        handler: (args: Arguments<U>) => Promise<void>;
    };
    static configureSchemaCommand(args: Argv, command: 'create' | 'update' | 'drop'): yargs.Argv<{}>;
    static handleSchemaCommand(args: Arguments<Options>, method: 'create' | 'update' | 'drop', successMessage: string): Promise<void>;
}
export declare type Options = {
    dump: boolean;
    run: boolean;
    fkChecks: boolean;
    dropMigrationsTable: boolean;
    dropDb: boolean;
};