"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Migration {
    constructor(driver, config) {
        this.driver = driver;
        this.config = config;
        this.queries = [];
    }
    async down() {
        throw new Error('This migration cannot be reverted');
    }
    isTransactional() {
        return true;
    }
    addSql(sql) {
        this.queries.push(sql);
    }
    reset() {
        this.queries.length = 0;
    }
    getQueries() {
        return this.queries;
    }
}
exports.Migration = Migration;
