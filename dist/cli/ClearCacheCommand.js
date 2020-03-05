"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const CLIHelper_1 = require("./CLIHelper");
class ClearCacheCommand {
    constructor() {
        this.command = 'cache:clear';
        this.describe = 'Clear metadata cache';
    }
    /**
     * @inheritdoc
     */
    async handler(args) {
        const config = await CLIHelper_1.CLIHelper.getConfiguration(false);
        const cache = config.getCacheAdapter();
        await cache.clear();
        CLIHelper_1.CLIHelper.dump(chalk_1.default.green('Metadata cache was successfully cleared'));
    }
}
exports.ClearCacheCommand = ClearCacheCommand;