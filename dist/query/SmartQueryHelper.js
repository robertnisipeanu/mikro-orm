"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const QueryBuilderHelper_1 = require("./QueryBuilderHelper");
const entity_1 = require("../entity");
const utils_1 = require("../utils");
class SmartQueryHelper {
    static processParams(params, root) {
        if (params instanceof entity_1.Reference) {
            params = params.unwrap();
        }
        if (utils_1.Utils.isEntity(params)) {
            return SmartQueryHelper.processEntity(params, root);
        }
        if (params === undefined) {
            return null;
        }
        if (Array.isArray(params)) {
            return params.map(item => SmartQueryHelper.processParams(item, true));
        }
        if (utils_1.Utils.isObject(params)) {
            Object.keys(params).forEach(k => {
                params[k] = SmartQueryHelper.processParams(params[k], !!k);
            });
        }
        return params;
    }
    static processWhere(where, entityName, meta) {
        where = SmartQueryHelper.processParams(where) || {};
        const rootPrimaryKey = meta ? meta.primaryKey : entityName;
        if (Array.isArray(where)) {
            return { [rootPrimaryKey]: { $in: where.map(sub => SmartQueryHelper.processWhere(sub, entityName, meta)) } };
        }
        if (!utils_1.Utils.isObject(where) || utils_1.Utils.isPrimaryKey(where)) {
            return where;
        }
        return Object.keys(where).reduce((o, key) => {
            const value = where[key];
            if (key in QueryBuilderHelper_1.QueryBuilderHelper.GROUP_OPERATORS) {
                o[key] = value.map((sub) => SmartQueryHelper.processWhere(sub, entityName, meta));
                return o;
            }
            if (Array.isArray(value) && !SmartQueryHelper.isSupported(key) && !key.includes('?')) {
                o[key] = { $in: value };
                return o;
            }
            if (!SmartQueryHelper.isSupported(key)) {
                o[key] = where[key];
            }
            else if (key.includes(':')) {
                const [k, expr] = key.split(':');
                o[k] = SmartQueryHelper.processExpression(expr, value);
            }
            else {
                const m = key.match(/([\w-]+) ?([<>=!]+)$/);
                o[m[1]] = SmartQueryHelper.processExpression(m[2], value);
            }
            return o;
        }, {});
    }
    static processEntity(entity, root) {
        if (root) {
            return entity.__primaryKey;
        }
        return { [entity.__primaryKeyField]: entity.__primaryKey };
    }
    static processExpression(expr, value) {
        switch (expr) {
            case '>': return { $gt: value };
            case '<': return { $lt: value };
            case '>=': return { $gte: value };
            case '<=': return { $lte: value };
            case '!=': return { $ne: value };
            case '!': return { $not: value };
            default: return { ['$' + expr]: value };
        }
    }
    static isSupported(key) {
        return !!SmartQueryHelper.SUPPORTED_OPERATORS.find(op => key.includes(op));
    }
}
exports.SmartQueryHelper = SmartQueryHelper;
SmartQueryHelper.SUPPORTED_OPERATORS = ['>', '<', '<=', '>=', '!', '!=', ':in', ':nin', ':gt', ':gte', ':lt', ':lte', ':ne', ':not'];
