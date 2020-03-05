"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const utils_1 = require("../utils");
const enums_1 = require("./enums");
const entity_1 = require("../entity");
const unit_of_work_1 = require("../unit-of-work");
class QueryBuilderHelper {
    constructor(entityName, alias, aliasMap, metadata, knex, platform) {
        this.entityName = entityName;
        this.alias = alias;
        this.aliasMap = aliasMap;
        this.metadata = metadata;
        this.knex = knex;
        this.platform = platform;
    }
    mapper(field, type = enums_1.QueryType.SELECT, value, alias) {
        let ret = field;
        const customExpression = QueryBuilderHelper.isCustomExpression(field);
        // do not wrap custom expressions
        if (!customExpression) {
            ret = this.prefix(field);
        }
        if (alias) {
            ret += ' as ' + alias;
        }
        if (customExpression) {
            return this.knex.raw(ret, value);
        }
        if (![enums_1.QueryType.SELECT, enums_1.QueryType.COUNT].includes(type) || this.isPrefixed(ret)) {
            return ret;
        }
        return this.alias + '.' + ret;
    }
    processData(data) {
        data = Object.assign({}, data); // copy first
        const meta = this.metadata.get(this.entityName, false, false);
        Object.keys(data).forEach(k => {
            if (meta && meta.properties[k]) {
                const prop = meta.properties[k];
                if (Array.isArray(data[k]) || (utils_1.Utils.isObject(data[k]) && !(data[k] instanceof Date))) {
                    data[k] = JSON.stringify(data[k]);
                }
                if (prop.fieldName) {
                    utils_1.Utils.renameKey(data, k, prop.fieldName);
                }
            }
        });
        return data;
    }
    joinOneToReference(prop, ownerAlias, alias, type, cond = {}) {
        const meta = this.metadata.get(prop.type);
        const prop2 = meta.properties[prop.mappedBy || prop.inversedBy];
        return {
            prop, type, cond, ownerAlias, alias,
            table: this.getTableName(prop.type),
            joinColumn: prop.owner ? meta.primaryKey : prop2.fieldName,
            inverseJoinColumn: prop.owner ? meta.primaryKey : prop.referenceColumnName,
            primaryKey: prop.owner ? prop.joinColumn : prop2.referenceColumnName,
        };
    }
    joinManyToOneReference(prop, ownerAlias, alias, type, cond = {}) {
        return {
            prop, type, cond, ownerAlias, alias,
            table: this.getTableName(prop.type),
            joinColumn: prop.referenceColumnName,
            primaryKey: prop.fieldName,
        };
    }
    joinManyToManyReference(prop, ownerAlias, alias, pivotAlias, type, cond) {
        const join = {
            prop, type, cond, ownerAlias,
            alias: pivotAlias,
            inverseAlias: alias,
            joinColumn: prop.joinColumn,
            inverseJoinColumn: prop.inverseJoinColumn,
            primaryKey: prop.referenceColumnName,
        };
        const name = `${ownerAlias}.${prop.name}`;
        const ret = {};
        if (prop.owner) {
            ret[name] = Object.assign(join, { table: prop.pivotTable });
        }
        else {
            const meta = this.metadata.get(prop.type);
            const prop2 = meta.properties[prop.mappedBy];
            ret[name] = Object.assign(join, { table: prop2.pivotTable });
        }
        if (type === 'pivotJoin') {
            return ret;
        }
        const prop2 = this.metadata.get(prop.pivotTable).properties[prop.type + (prop.owner ? '_inverse' : '_owner')];
        ret[`${pivotAlias}.${prop2.name}`] = this.joinManyToOneReference(prop2, pivotAlias, alias, type);
        return ret;
    }
    joinPivotTable(field, prop, ownerAlias, alias, type, cond = {}) {
        const prop2 = this.metadata.get(field).properties[prop.mappedBy || prop.inversedBy];
        return {
            prop, type, cond, ownerAlias, alias,
            table: this.metadata.get(field).collection,
            joinColumn: prop.joinColumn,
            inverseJoinColumn: prop2.joinColumn,
            primaryKey: prop.referenceColumnName,
        };
    }
    processJoins(qb, joins) {
        Object.values(joins).forEach(join => {
            const table = `${join.table} as ${join.alias}`;
            const left = `${join.ownerAlias}.${join.primaryKey}`;
            const right = `${join.alias}.${join.joinColumn}`;
            const method = join.type === 'pivotJoin' ? 'leftJoin' : join.type;
            return qb[method](table, inner => {
                inner.on(left, right);
                this.appendJoinClause(inner, join.cond);
            });
        });
    }
    mapJoinColumns(type, join) {
        if (join.prop && join.prop.reference === entity_1.ReferenceType.ONE_TO_ONE && !join.prop.owner) {
            return [this.mapper(`${join.alias}.${join.inverseJoinColumn}`, type, undefined, join.prop.fieldName)];
        }
        return [
            this.mapper(`${join.alias}.${join.joinColumn}`, type),
            this.mapper(`${join.alias}.${join.inverseJoinColumn}`, type),
        ];
    }
    isOneToOneInverse(field) {
        const meta = this.metadata.get(this.entityName);
        const prop = meta && meta.properties[field];
        return prop && prop.reference === entity_1.ReferenceType.ONE_TO_ONE && !prop.owner;
    }
    getTableName(entityName) {
        const meta = this.metadata.get(entityName, false, false);
        return meta ? meta.collection : entityName;
    }
    /**
     * Checks whether the RE can be rewritten to simple LIKE query
     */
    isSimpleRegExp(re) {
        if (!(re instanceof RegExp)) {
            return false;
        }
        // when including the opening bracket/paren we consider it complex
        return !re.source.match(/[{\[(]/);
    }
    getRegExpParam(re) {
        const value = re.source
            .replace(/\.\*/g, '%') // .* -> %
            .replace(/\./g, '_') // .  -> _
            .replace(/\\_/g, '.') // \. -> .
            .replace(/^\^/g, '') // remove ^ from start
            .replace(/\$$/g, ''); // remove $ from end
        if (re.source.startsWith('^') && re.source.endsWith('$')) {
            return value;
        }
        if (re.source.startsWith('^')) {
            return value + '%';
        }
        if (re.source.endsWith('$')) {
            return '%' + value;
        }
        return `%${value}%`;
    }
    appendQueryCondition(type, cond, qb, operator, method = 'where') {
        Object.keys(cond).forEach(k => {
            if (k === '$and' || k === '$or') {
                if (operator === '$or' && k === '$and') {
                    return qb.orWhere(inner => this.appendGroupCondition(type, inner, k, method, cond[k]));
                }
                return this.appendGroupCondition(type, qb, k, method, cond[k]);
            }
            if (k === '$not') {
                const m = operator === '$or' ? 'orWhereNot' : 'whereNot';
                return qb[m](inner => this.appendQueryCondition(type, cond[k], inner));
            }
            this.appendQuerySubCondition(qb, type, method, cond, k, operator);
        });
    }
    appendQuerySubCondition(qb, type, method, cond, key, operator) {
        const m = operator === '$or' ? 'orWhere' : method;
        if (this.isSimpleRegExp(cond[key])) {
            return void qb[m](this.mapper(key, type), 'like', this.getRegExpParam(cond[key]));
        }
        if (utils_1.Utils.isObject(cond[key]) && !(cond[key] instanceof Date)) {
            return this.processObjectSubCondition(cond, key, qb, method, m, type);
        }
        if (QueryBuilderHelper.isCustomExpression(key)) {
            return this.processCustomExpression(qb, m, key, cond, type);
        }
        const op = cond[key] === null ? 'is' : '=';
        qb[m](this.mapper(key, type, cond[key]), op, cond[key]);
    }
    processCustomExpression(clause, m, key, cond, type = enums_1.QueryType.SELECT) {
        // unwind parameters when ? found in field name
        const count = key.concat('?').match(/\?/g).length - 1;
        const value = utils_1.Utils.asArray(cond[key]);
        const params1 = value.slice(0, count).map((c) => utils_1.Utils.isObject(c) ? JSON.stringify(c) : c);
        const params2 = value.slice(count);
        const k = this.mapper(key, type, params1);
        if (params2.length > 0) {
            return void clause[m](k, this.knex.raw('?', params2));
        }
        clause[m](k);
    }
    processObjectSubCondition(cond, key, qb, method, m, type) {
        // grouped condition for one field
        let value = cond[key];
        if (Object.keys(value).length > 1) {
            const subCondition = Object.entries(value).map(([subKey, subValue]) => ({ [key]: { [subKey]: subValue } }));
            return void subCondition.forEach(sub => this.appendQueryCondition(type, sub, qb, '$and', method));
        }
        if (value instanceof RegExp) {
            value = { $re: value.source };
        }
        // operators
        const op = Object.keys(QueryBuilderHelper.OPERATORS).find(op => op in value);
        if (!op) {
            throw new Error(`Invalid query condition: ${util_1.inspect(cond)}`);
        }
        const replacement = this.getOperatorReplacement(op, value);
        if (key === op) { // substitute top level operators with PK
            const meta = this.metadata.get(this.entityName);
            key = meta.properties[meta.primaryKey].fieldName;
        }
        qb[m](this.mapper(key, type), replacement, value[op]);
    }
    getOperatorReplacement(op, value) {
        let replacement = QueryBuilderHelper.OPERATORS[op];
        if (value[op] === null && ['$eq', '$ne'].includes(op)) {
            replacement = op === '$eq' ? 'is' : 'is not';
        }
        if (op === '$re') {
            replacement = this.platform.getRegExpOperator();
        }
        return replacement;
    }
    appendJoinClause(clause, cond, operator) {
        Object.keys(cond).forEach(k => {
            if (k === '$and' || k === '$or') {
                const method = operator === '$or' ? 'orOn' : 'andOn';
                const m = k === '$or' ? 'orOn' : 'andOn';
                return clause[method](outer => cond[k].forEach((sub) => {
                    if (Object.keys(sub).length === 1) {
                        return this.appendJoinClause(outer, sub, k);
                    }
                    outer[m](inner => this.appendJoinClause(inner, sub, '$and'));
                }));
            }
            this.appendJoinSubClause(clause, cond, k, operator);
        });
    }
    appendJoinSubClause(clause, cond, key, operator) {
        const m = operator === '$or' ? 'orOn' : 'andOn';
        if (cond[key] instanceof RegExp) {
            return void clause[m](this.mapper(key), 'like', this.knex.raw('?', this.getRegExpParam(cond[key])));
        }
        if (utils_1.Utils.isObject(cond[key]) && !(cond[key] instanceof Date)) {
            return this.processObjectSubClause(cond, key, clause, m);
        }
        if (QueryBuilderHelper.isCustomExpression(key)) {
            return this.processCustomExpression(clause, m, key, cond);
        }
        const op = cond[key] === null ? 'is' : '=';
        clause[m](this.knex.raw(`${this.knex.ref(this.mapper(key, enums_1.QueryType.SELECT, cond[key]))} ${op} ?`, cond[key]));
    }
    processObjectSubClause(cond, key, clause, m) {
        // grouped condition for one field
        if (Object.keys(cond[key]).length > 1) {
            const subCondition = Object.entries(cond[key]).map(([subKey, subValue]) => ({ [key]: { [subKey]: subValue } }));
            return void clause[m](inner => subCondition.map(sub => this.appendJoinClause(inner, sub, '$and')));
        }
        // operators
        for (const [op, replacement] of Object.entries(QueryBuilderHelper.OPERATORS)) {
            if (!(op in cond[key])) {
                continue;
            }
            clause[m](this.mapper(key), replacement, this.knex.raw('?', cond[key][op]));
            break;
        }
    }
    getQueryOrder(type, orderBy, populate) {
        return Object.keys(orderBy).map(k => {
            // tslint:disable-next-line:prefer-const
            let [alias, field] = this.splitField(k);
            alias = populate[alias] || alias;
            const direction = orderBy[k];
            const order = utils_1.Utils.isNumber(direction) ? enums_1.QueryOrderNumeric[direction] : direction;
            return { column: this.mapper(`${alias}.${field}`, type), order: order.toLowerCase() };
        });
    }
    finalize(type, qb, meta) {
        const useReturningStatement = type === enums_1.QueryType.INSERT && this.platform.usesReturningStatement() && meta && !meta.compositePK;
        if (useReturningStatement) {
            const returningProps = Object.values(meta.properties).filter(prop => prop.primary || prop.default);
            qb.returning(returningProps.map(prop => prop.fieldName));
        }
    }
    splitField(field) {
        const [a, b] = field.split('.');
        const fromAlias = b ? a : this.alias;
        const fromField = b || a;
        return [fromAlias, fromField];
    }
    getLockSQL(qb, lockMode) {
        if (lockMode === unit_of_work_1.LockMode.PESSIMISTIC_READ) {
            return void qb.forShare();
        }
        if (lockMode === unit_of_work_1.LockMode.PESSIMISTIC_WRITE) {
            return void qb.forUpdate();
        }
        const meta = this.metadata.get(this.entityName, false, false);
        if (lockMode === unit_of_work_1.LockMode.OPTIMISTIC && meta && !meta.versionProperty) {
            throw utils_1.ValidationError.lockFailed(this.entityName);
        }
    }
    updateVersionProperty(qb) {
        const meta = this.metadata.get(this.entityName, false, false);
        if (!meta || !meta.versionProperty) {
            return;
        }
        const versionProperty = meta.properties[meta.versionProperty];
        let sql = versionProperty.fieldName + ' + 1';
        if (versionProperty.type.toLowerCase() === 'date') {
            sql = this.platform.getCurrentTimestampSQL(versionProperty.length);
        }
        qb.update(versionProperty.fieldName, this.knex.raw(sql));
    }
    static isOperator(key, includeGroupOperators = true) {
        if (!includeGroupOperators) {
            return !!QueryBuilderHelper.OPERATORS[key];
        }
        return !!QueryBuilderHelper.GROUP_OPERATORS[key] || !!QueryBuilderHelper.OPERATORS[key];
    }
    static isCustomExpression(field) {
        return !!field.match(/[ ?<>=()]|^\d/);
    }
    prefix(field) {
        if (!this.isPrefixed(field)) {
            return this.fieldName(field, this.alias);
        }
        const [a, f] = field.split('.');
        return a + '.' + this.fieldName(f, a);
    }
    appendGroupCondition(type, qb, operator, method, subCondition) {
        if (subCondition.length === 1) {
            return this.appendQueryCondition(type, subCondition[0], qb, operator, method);
        }
        if (operator === '$and') {
            return subCondition.forEach(sub => this.appendQueryCondition(type, sub, qb, operator));
        }
        qb[method](outer => subCondition.forEach(sub => {
            if (Object.keys(sub).length === 1) {
                return this.appendQueryCondition(type, sub, outer, operator);
            }
            outer.orWhere(inner => this.appendQueryCondition(type, sub, inner, '$and'));
        }));
    }
    isPrefixed(field) {
        return !!field.match(/\w+\./);
    }
    fieldName(field, alias) {
        const entityName = this.aliasMap[alias] || this.entityName;
        const meta = this.metadata.get(entityName, false, false);
        const prop = meta ? meta.properties[field] : false;
        return prop ? prop.fieldName : field;
    }
}
exports.QueryBuilderHelper = QueryBuilderHelper;
QueryBuilderHelper.GROUP_OPERATORS = {
    $and: 'and',
    $or: 'or',
};
QueryBuilderHelper.OPERATORS = {
    $eq: '=',
    $in: 'in',
    $nin: 'not in',
    $gt: '>',
    $gte: '>=',
    $lt: '<',
    $lte: '<=',
    $ne: '!=',
    $not: 'not',
    $like: 'like',
    $re: 'regexp',
};
