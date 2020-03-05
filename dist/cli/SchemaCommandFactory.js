"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = __importDefault(require("yargs"));
const chalk_1 = __importDefault(require("chalk"));
const CLIHelper_1 = require("./CLIHelper");
class SchemaCommandFactory {
    static create(command) {
        const successMessage = SchemaCommandFactory.SUCCESS_MESSAGES[command];
        return {
            command: `schema:${command}`,
            describe: SchemaCommandFactory.DESCRIPTIONS[command],
            builder: (args) => SchemaCommandFactory.configureSchemaCommand(args, command),
            handler: (args) => SchemaCommandFactory.handleSchemaCommand(args, command, successMessage),
        };
    }
    static configureSchemaCommand(args, command) {
        args.option('r', {
            alias: 'run',
            type: 'boolean',
            desc: 'Runs queries',
        });
        args.option('d', {
            alias: 'dump',
            type: 'boolean',
            desc: 'Dumps all queries to console',
        });
        args.option('fk-checks', {
            type: 'boolean',
            desc: 'Do not skip foreign key checks',
        });
        if (command === 'drop') {
            args.option('drop-migrations-table', {
                type: 'boolean',
                desc: 'Drop also migrations table',
            });
            args.option('drop-db', {
                type: 'boolean',
                desc: 'Drop the whole database',
            });
        }
        return args;
    }
    static async handleSchemaCommand(args, method, successMessage) {
        if (!args.run && !args.dump) {
            yargs_1.default.showHelp();
            return;
        }
        const orm = await CLIHelper_1.CLIHelper.getORM();
        const generator = orm.getSchemaGenerator();
        if (args.dump) {
            const m = `get${method.substr(0, 1).toUpperCase()}${method.substr(1)}SchemaSQL`;
            const dump = await generator[m](!args.fkChecks, args.dropMigrationsTable);
            CLIHelper_1.CLIHelper.dump(dump, orm.config, 'sql');
        }
        else {
            const m = method + 'Schema';
            await generator[m](!args.fkChecks, args.dropMigrationsTable, args.dropDb);
            CLIHelper_1.CLIHelper.dump(chalk_1.default.green(successMessage));
        }
        await orm.close(true);
    }
}
exports.SchemaCommandFactory = SchemaCommandFactory;
SchemaCommandFactory.DESCRIPTIONS = {
    create: 'Create database schema based on current metadata',
    update: 'Update database schema based on current metadata',
    drop: 'Drop database schema based on current metadata',
};
SchemaCommandFactory.SUCCESS_MESSAGES = {
    create: 'Schema successfully created',
    update: 'Schema successfully updated',
    drop: 'Schema successfully dropped',
};
