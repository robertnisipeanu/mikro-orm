"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
class Hydrator {
    constructor(factory, em) {
        this.factory = factory;
        this.em = em;
    }
    hydrate(entity, meta, data, newEntity) {
        if (data[meta.primaryKey]) {
            __1.wrap(entity).__primaryKey = data[meta.primaryKey];
        }
        // then process user defined properties (ignore not defined keys in `data`)
        Object.values(meta.properties).forEach(prop => {
            const value = data[prop.name];
            this.hydrateProperty(entity, prop, value, newEntity);
        });
    }
}
exports.Hydrator = Hydrator;
