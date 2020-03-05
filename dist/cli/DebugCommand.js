"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const CLIHelper_1 = require("./CLIHelper");
const utils_1 = require("../utils");
class DebugCommand {
    constructor() {
        this.command = 'debug';
        this.describe = 'Debug CLI configuration';
    }
    /**
     * @inheritdoc
     */
    async handler(args) {
        CLIHelper_1.CLIHelper.dump(`Current ${chalk_1.default.cyan('MikroORM')} CLI configuration`);
        await CLIHelper_1.CLIHelper.dumpDependencies();
        const settings = await CLIHelper_1.CLIHelper.getSettings();
        if (settings.useTsNode) {
            CLIHelper_1.CLIHelper.dump(' - ts-node ' + chalk_1.default.green('enabled'));
        }
        const configPaths = await CLIHelper_1.CLIHelper.getConfigPaths();
        CLIHelper_1.CLIHelper.dump(' - searched config paths:');
        await DebugCommand.checkPaths(configPaths, 'yellow');
        try {
            const config = await CLIHelper_1.CLIHelper.getConfiguration();
            CLIHelper_1.CLIHelper.dump(` - configuration ${chalk_1.default.green('found')}`);
            const length = config.get('entities', []).length;
            if (length > 0) {
                CLIHelper_1.CLIHelper.dump(` - will use \`entities\` array (contains ${length} items)`);
            }
            else if (config.get('entitiesDirs', []).length > 0) {
                CLIHelper_1.CLIHelper.dump(' - will use `entitiesDirs` paths:');
                await DebugCommand.checkPaths(config.get('entitiesDirs'), 'red', true);
            }
        }
        catch (e) {
            CLIHelper_1.CLIHelper.dump(`- configuration ${chalk_1.default.red('not found')} ${chalk_1.default.red(`(${e.message})`)}`);
        }
    }
    static async checkPaths(paths, failedColor, onlyDirectories = false) {
        for (let path of paths) {
            path = utils_1.Utils.absolutePath(path);
            path = utils_1.Utils.normalizePath(path);
            const found = await utils_1.Utils.pathExists(path, { onlyDirectories });
            if (found) {
                CLIHelper_1.CLIHelper.dump(`   - ${path} (${chalk_1.default.green('found')})`);
            }
            else {
                CLIHelper_1.CLIHelper.dump(`   - ${path} (${chalk_1.default[failedColor]('not found')})`);
            }
        }
    }
}
exports.DebugCommand = DebugCommand;