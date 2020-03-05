"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fast_deep_equal_1 = __importDefault(require("fast-deep-equal"));
const clone_1 = __importDefault(require("clone"));
const globby_1 = __importDefault(require("globby"));
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const crypto_1 = require("crypto");
// @ts-ignore
const acorn_loose_1 = require("acorn-loose");
// @ts-ignore
const acorn_walk_1 = require("acorn-walk");
const entity_1 = require("../entity");
class Utils {
    /**
     * Checks if the argument is not undefined
     */
    static isDefined(data) {
        return typeof data !== 'undefined';
    }
    /**
     * Checks if the argument is instance of `Object`. Returns false for arrays.
     * `not` argument allows to blacklist classes that should be considered as not object.
     */
    static isObject(o, not = []) {
        return !!o && typeof o === 'object' && !Array.isArray(o) && !not.some(cls => o instanceof cls);
    }
    /**
     * Checks if the argument is string
     */
    static isString(s) {
        return typeof s === 'string';
    }
    /**
     * Checks if the argument is number
     */
    static isNumber(s) {
        return typeof s === 'number';
    }
    /**
     * Checks if arguments are deeply (but not strictly) equal.
     */
    static equals(a, b) {
        return fast_deep_equal_1.default(a, b);
    }
    /**
     * Gets array without duplicates.
     */
    static unique(items) {
        return [...new Set(items)];
    }
    /**
     * Merges all sources into the target recursively.
     */
    static merge(target, ...sources) {
        if (!sources.length) {
            return target;
        }
        const source = sources.shift();
        if (Utils.isObject(target) && Utils.isObject(source)) {
            Object.entries(source).forEach(([key, value]) => {
                if (Utils.isObject(value, [Date, RegExp, Buffer])) {
                    if (!(key in target)) {
                        Object.assign(target, { [key]: {} });
                    }
                    Utils.merge(target[key], value);
                }
                else {
                    Object.assign(target, { [key]: value });
                }
            });
        }
        return Utils.merge(target, ...sources);
    }
    /**
     * Computes difference between two objects, ignoring items missing in `b`.
     */
    static diff(a, b) {
        const ret = {};
        Object.keys(b).forEach(k => {
            if (Utils.equals(a[k], b[k])) {
                return;
            }
            ret[k] = b[k];
        });
        return ret;
    }
    /**
     * Computes difference between two entities. First calls `prepareEntity` on both, then uses the `diff` method.
     */
    static diffEntities(a, b, metadata, platform) {
        return Utils.diff(Utils.prepareEntity(a, metadata, platform), Utils.prepareEntity(b, metadata, platform));
    }
    /**
     * Removes ORM specific code from entities and prepares it for serializing. Used before change set computation.
     * References will be mapped to primary keys, collections to arrays of primary keys.
     */
    static prepareEntity(entity, metadata, platform) {
        if (entity.__prepared) {
            return entity;
        }
        const meta = metadata.get(entity.constructor.name);
        const ret = {};
        // copy all props, ignore collections and references, process custom types
        Object.values(meta.properties).forEach(prop => {
            if (Utils.shouldIgnoreProperty(metadata, entity, prop)) {
                return;
            }
            if (Utils.isEntity(entity[prop.name], true)) {
                return ret[prop.name] = entity[prop.name][metadata.get(prop.type).primaryKey];
            }
            if (prop.customType) {
                return ret[prop.name] = prop.customType.convertToDatabaseValue(entity[prop.name], platform);
            }
            if (Array.isArray(entity[prop.name]) || Utils.isObject(entity[prop.name])) {
                return ret[prop.name] = Utils.copy(entity[prop.name]);
            }
            ret[prop.name] = entity[prop.name];
        });
        Object.defineProperty(ret, '__prepared', { value: true });
        return ret;
    }
    static shouldIgnoreProperty(metadata, entity, prop) {
        if (!(prop.name in entity)) {
            return true;
        }
        const pk = () => metadata.get(prop.type).primaryKey;
        const collection = entity[prop.name] instanceof entity_1.ArrayCollection;
        const noPkRef = Utils.isEntity(entity[prop.name]) && !entity[prop.name][pk()];
        const noPkProp = prop.primary && !entity[prop.name];
        const inverse = prop.reference === entity_1.ReferenceType.ONE_TO_ONE && !prop.owner;
        // bidirectional 1:1 and m:1 fields are defined as setters, we need to check for `undefined` explicitly
        const isSetter = [entity_1.ReferenceType.ONE_TO_ONE, entity_1.ReferenceType.MANY_TO_ONE].includes(prop.reference) && (prop.inversedBy || prop.mappedBy);
        const emptyRef = isSetter && entity[prop.name] === undefined;
        return collection || noPkProp || noPkRef || inverse || emptyRef || prop.persist === false;
    }
    /**
     * Creates deep copy of given entity.
     */
    static copy(entity) {
        return clone_1.default(entity);
    }
    /**
     * Normalize the argument to always be an array.
     */
    static asArray(data) {
        if (typeof data === 'undefined') {
            return [];
        }
        return Array.isArray(data) ? data : [data];
    }
    /**
     * Renames object key, keeps order of properties.
     */
    static renameKey(payload, from, to) {
        if (Utils.isObject(payload) && from in payload && !(to in payload)) {
            Object.keys(payload).forEach(key => {
                const value = payload[key];
                delete payload[key];
                payload[from === key ? to : key] = value;
            }, payload);
        }
    }
    /**
     * Returns array of functions argument names. Uses `acorn` for source code analysis.
     */
    static getParamNames(func, methodName) {
        const ret = [];
        const parsed = acorn_loose_1.parse(func.toString());
        const checkNode = (node, methodName) => {
            if (methodName && !(node.key && node.key.name === methodName)) {
                return;
            }
            const params = node.value ? node.value.params : node.params;
            ret.push(...params.map((p) => {
                switch (p.type) {
                    case 'AssignmentPattern':
                        return p.left.name;
                    case 'RestElement':
                        return '...' + p.argument.name;
                    default:
                        return p.name;
                }
            }));
        };
        acorn_walk_1.simple(parsed, {
            MethodDefinition: (node) => checkNode(node, methodName),
            FunctionDeclaration: (node) => checkNode(node, methodName),
        });
        return ret;
    }
    /**
     * Checks whether the argument looks like primary key (string, number or ObjectId).
     */
    static isPrimaryKey(key) {
        return Utils.isString(key) || typeof key === 'number' || Utils.isObjectID(key);
    }
    /**
     * Extracts primary key from `data`. Accepts objects or primary keys directly.
     */
    static extractPK(data, meta) {
        if (Utils.isPrimaryKey(data)) {
            return data;
        }
        if (Utils.isObject(data) && meta) {
            return data[meta.primaryKey] || data[meta.serializedPrimaryKey] || null;
        }
        return null;
    }
    /**
     * Checks whether given object is an entity instance.
     */
    static isEntity(data, allowReference = false) {
        if (allowReference && Utils.isReference(data)) {
            return true;
        }
        return Utils.isObject(data) && !!data.__entity;
    }
    /**
     * Checks whether the argument is instance or `Reference` wrapper.
     */
    static isReference(data) {
        return data instanceof entity_1.Reference;
    }
    /**
     * Returns wrapped entity.
     */
    static unwrapReference(ref) {
        return Utils.isReference(ref) ? ref.unwrap() : ref;
    }
    /**
     * Checks whether the argument is ObjectId instance
     */
    static isObjectID(key) {
        return Utils.isObject(key) && key.constructor.name.toLowerCase() === 'objectid';
    }
    /**
     * Checks whether the argument is empty (array without items, object without keys or falsy value).
     */
    static isEmpty(data) {
        if (Array.isArray(data)) {
            return data.length === 0;
        }
        if (Utils.isObject(data)) {
            return Object.keys(data).length === 0;
        }
        return !data;
    }
    /**
     * Gets string name of given class.
     */
    static className(classOrName) {
        if (Utils.isString(classOrName)) {
            return classOrName;
        }
        return classOrName.name;
    }
    /**
     * Tries to detect `ts-node` runtime.
     */
    static detectTsNode() {
        return process.argv[0].endsWith('ts-node') || process.argv.slice(1).some(arg => arg.includes('ts-node')) || !!require.extensions['.ts'];
    }
    /**
     * Uses some dark magic to get source path to caller where decorator is used.
     * Analyses stack trace of error created inside the function call.
     */
    static lookupPathFromDecorator(meta, stack) {
        if (meta.path) {
            return meta.path;
        }
        // use some dark magic to get source path to caller
        stack = stack || new Error().stack.split('\n');
        let line = stack.findIndex(line => line.includes('__decorate'));
        if (line === -1) {
            return meta.path;
        }
        if (Utils.normalizePath(stack[line]).includes('node_modules/tslib/tslib')) {
            line++;
        }
        const re = stack[line].match(/\(.+\)/i) ? /\((.*):\d+:\d+\)/ : /at\s*(.*):\d+:\d+$/;
        meta.path = Utils.normalizePath(stack[line].match(re)[1]);
        return meta.path;
    }
    /**
     * Gets the type of the argument.
     */
    static getObjectType(value) {
        const objectType = Object.prototype.toString.call(value);
        return objectType.match(/\[object (\w+)]/)[1].toLowerCase();
    }
    /**
     * Wraps the entity in a `Reference` wrapper if the property is defined as `wrappedReference`.
     */
    static wrapReference(entity, prop) {
        if (entity && prop.wrappedReference && !Utils.isReference(entity)) {
            return entity_1.Reference.create(entity);
        }
        return entity;
    }
    /**
     * Executes the `cb` promise serially on every element of the `items` array and returns array of resolved values.
     */
    static async runSerial(items, cb) {
        const ret = [];
        for (const item of items) {
            ret.push(await cb(item));
        }
        return ret;
    }
    static isCollection(item, prop, type) {
        if (!(item instanceof entity_1.Collection)) {
            return false;
        }
        return !(prop && type) || prop.reference === type;
    }
    static normalizePath(...parts) {
        let path = parts.join('/').replace(/\\/g, '/').replace(/\/$/, '');
        path = path_1.normalize(path).replace(/\\/g, '/');
        return path.match(/^[/.]|[a-zA-Z]:/) ? path : './' + path;
    }
    static relativePath(path, relativeTo) {
        if (!path) {
            return path;
        }
        path = Utils.normalizePath(path);
        if (path.startsWith('.')) {
            return path;
        }
        path = path_1.relative(relativeTo, path);
        return Utils.normalizePath(path);
    }
    static absolutePath(path, baseDir = process.cwd()) {
        if (!path) {
            return Utils.normalizePath(baseDir);
        }
        if (!path_1.isAbsolute(path)) {
            path = baseDir + '/' + path;
        }
        return Utils.normalizePath(path);
    }
    static hash(data) {
        return crypto_1.createHash('md5').update(data).digest('hex');
    }
    static runIfNotEmpty(clause, data) {
        if (!Utils.isEmpty(data)) {
            clause();
        }
    }
    static defaultValue(prop, option, defaultValue) {
        prop[option] = option in prop ? prop[option] : defaultValue;
    }
    static findDuplicates(items) {
        return items.reduce((acc, v, i, arr) => {
            return arr.indexOf(v) !== i && acc.indexOf(v) === -1 ? acc.concat(v) : acc;
        }, []);
    }
    static randomInt(min, max) {
        return Math.round(Math.random() * (max - min)) + min;
    }
    static async pathExists(path, options = {}) {
        if (globby_1.default.hasMagic(path)) {
            const found = await globby_1.default(path, options);
            return found.length > 0;
        }
        return fs_extra_1.pathExists(path);
    }
    /**
     * Extracts all possible values of a TS enum. Works with both string and numeric enums.
     */
    static extractEnumValues(target) {
        const keys = Object.keys(target);
        const values = Object.values(target);
        const numeric = !!values.find(v => typeof v === 'number');
        if (numeric) {
            return values.filter(val => !keys.includes(val));
        }
        return values;
    }
}
exports.Utils = Utils;
