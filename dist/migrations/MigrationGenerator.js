"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = require("fs-extra");
const ts_morph_1 = require("ts-morph");
const utils_1 = require("../utils");
class MigrationGenerator {
    constructor(driver, options) {
        this.driver = driver;
        this.options = options;
        this.project = new ts_morph_1.Project();
        this.project.manipulationSettings.set({ quoteKind: ts_morph_1.QuoteKind.Single, indentationText: ts_morph_1.IndentationText.TwoSpaces });
    }
    async generate(diff, path) {
        path = utils_1.Utils.normalizePath(path || this.options.path);
        await fs_extra_1.ensureDir(path);
        const time = new Date().toISOString().replace(/[-T:]|\.\d{3}z$/ig, '');
        const className = `Migration${time}`;
        const fileName = `${className}.${this.options.emit}`;
        const migration = this.project.createSourceFile(path + '/' + fileName, writer => {
            if (this.options.emit === 'js') {
                writer.writeLine(`"use strict";`);
                writer.writeLine(`Object.defineProperty(exports, "__esModule", { value: true });`);
                writer.writeLine(`const Migration = require("mikro-orm").Migration;`);
            }
            else {
                writer.writeLine(`import { Migration } from 'mikro-orm';`);
            }
            writer.blankLine();
            if (this.options.emit === 'ts') {
                writer.write(`export `);
            }
            writer.write(`class ${className} extends Migration`);
            writer.block(() => {
                writer.blankLine();
                writer.write(`async up()`);
                if (this.options.emit === 'ts')
                    writer.write(`: Promise<void>`);
                writer.block(() => diff.forEach(sql => this.createStatement(writer, sql)));
                writer.blankLine();
            });
            if (this.options.emit === 'js') {
                writer.writeLine(`exports.${className} = ${className}`);
            }
            writer.write('');
        });
        const ret = migration.getFullText();
        await fs_extra_1.writeFile(migration.getFilePath(), ret);
        return [ret, fileName];
    }
    createStatement(writer, sql) {
        if (sql) {
            writer.writeLine(`this.addSql('${sql.replace(/'/g, '\\\'')}');`); // lgtm [js/incomplete-sanitization]
        }
        else {
            writer.blankLine();
        }
    }
}
exports.MigrationGenerator = MigrationGenerator;
