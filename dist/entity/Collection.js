"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __1 = require("..");
const ArrayCollection_1 = require("./ArrayCollection");
const enums_1 = require("./enums");
const utils_1 = require("../utils");
class Collection extends ArrayCollection_1.ArrayCollection {
    constructor(owner, items, initialized = true) {
        super(owner, items);
        this.initialized = false;
        this.dirty = false;
        this._populated = false;
        this.initialized = !!items || initialized;
        Object.defineProperty(this, '_populated', { enumerable: false });
    }
    /**
     * Initializes the collection and returns the items
     */
    async loadItems() {
        if (!this.isInitialized(true)) {
            await this.init();
        }
        return super.getItems();
    }
    /**
     * Returns the items (the collection must be initialized)
     */
    getItems() {
        this.checkInitialized();
        return super.getItems();
    }
    add(...items) {
        items.map(item => this.validateItemType(item));
        this.modify('add', items);
        this.cancelOrphanRemoval(items);
    }
    set(items) {
        items.map(item => this.validateItemType(item));
        this.validateModification(items);
        super.set(items);
        this.setDirty();
        this.cancelOrphanRemoval(items);
    }
    /**
     * @internal
     */
    hydrate(items, validate = false) {
        if (validate) {
            this.validateModification(items);
        }
        this.initialized = true;
        this.dirty = false;
        super.hydrate(items);
    }
    remove(...items) {
        this.modify('remove', items);
        const em = __1.wrap(this.owner).__em;
        if (this.property.orphanRemoval && em) {
            for (const item of items) {
                em.getUnitOfWork().scheduleOrphanRemoval(item);
            }
        }
    }
    contains(item) {
        this.checkInitialized();
        return super.contains(item);
    }
    count() {
        this.checkInitialized();
        return super.count();
    }
    isInitialized(fully = false) {
        if (fully) {
            return this.initialized && this.items.every(item => __1.wrap(item).isInitialized());
        }
        return this.initialized;
    }
    shouldPopulate() {
        return this._populated;
    }
    populated(populated = true) {
        this._populated = populated;
    }
    isDirty() {
        return this.dirty;
    }
    setDirty(dirty = true) {
        this.dirty = dirty && !!this.property.owner; // set dirty flag only to owning side
    }
    async init(populate = [], where, orderBy) {
        const options = __1.Utils.isObject(populate) ? populate : { populate, where, orderBy };
        const em = __1.wrap(this.owner).__em;
        if (!em) {
            throw utils_1.ValidationError.entityNotManaged(this.owner);
        }
        if (!this.initialized && this.property.reference === enums_1.ReferenceType.MANY_TO_MANY && em.getDriver().getPlatform().usesPivotTable()) {
            const map = await em.getDriver().loadFromPivotTable(this.property, [__1.wrap(this.owner).__primaryKey], options.where, options.orderBy);
            this.hydrate(map[__1.wrap(this.owner).__primaryKey].map(item => em.merge(this.property.type, item)));
            return this;
        }
        // do not make db call if we know we will get no results
        if (this.property.reference === enums_1.ReferenceType.MANY_TO_MANY && (this.property.owner || em.getDriver().getPlatform().usesPivotTable()) && this.length === 0) {
            this.initialized = true;
            this.dirty = false;
            this.populated();
            return this;
        }
        where = this.createCondition(options.where);
        const order = [...this.items]; // copy order of references
        const customOrder = !!options.orderBy;
        orderBy = this.createOrderBy(options.orderBy);
        const items = await em.find(this.property.type, where, options.populate, orderBy);
        if (!customOrder) {
            this.reorderItems(items, order);
        }
        this.items.length = 0;
        this.items.push(...items);
        Object.assign(this, items);
        this.initialized = true;
        this.dirty = false;
        this.populated();
        return this;
    }
    createCondition(cond = {}) {
        if (this.property.reference === enums_1.ReferenceType.ONE_TO_MANY) {
            cond[this.property.mappedBy] = __1.wrap(this.owner).__primaryKey;
        }
        else { // MANY_TO_MANY
            this.createManyToManyCondition(cond);
        }
        return cond;
    }
    createOrderBy(orderBy = {}) {
        if (__1.Utils.isEmpty(orderBy) && this.property.reference === enums_1.ReferenceType.ONE_TO_MANY) {
            orderBy = this.property.orderBy || { [this.property.referenceColumnName]: __1.QueryOrder.ASC };
        }
        return orderBy;
    }
    createManyToManyCondition(cond) {
        if (this.property.owner || __1.wrap(this.owner).__internal.platform.usesPivotTable()) {
            const pk = __1.wrap(this.items[0]).__meta.primaryKey; // we know there is at least one item as it was checked in load method
            cond[pk] = { $in: this.items.map(item => __1.wrap(item).__primaryKey) };
        }
        else {
            cond[this.property.mappedBy] = __1.wrap(this.owner).__primaryKey;
        }
    }
    modify(method, items) {
        this.checkInitialized();
        this.validateModification(items);
        super[method](...items);
        this.setDirty();
    }
    checkInitialized() {
        if (!this.isInitialized()) {
            throw new Error(`Collection<${this.property.type}> of entity ${this.owner.constructor.name}[${__1.wrap(this.owner).__primaryKey}] not initialized`);
        }
    }
    /**
     * re-orders items after searching with `$in` operator
     */
    reorderItems(items, order) {
        if (this.property.reference === enums_1.ReferenceType.MANY_TO_MANY && this.property.owner) {
            items.sort((a, b) => order.indexOf(a) - order.indexOf(b));
        }
    }
    cancelOrphanRemoval(items) {
        const em = __1.wrap(this.owner).__em;
        if (!em) {
            return;
        }
        for (const item of items) {
            em.getUnitOfWork().cancelOrphanRemoval(item);
        }
    }
    validateItemType(item) {
        if (!__1.Utils.isEntity(item)) {
            throw utils_1.ValidationError.notEntity(this.owner, this.property, item);
        }
    }
    validateModification(items) {
        // throw if we are modifying inverse side of M:N collection when owning side is initialized (would be ignored when persisting)
        const manyToManyInverse = this.property.reference === enums_1.ReferenceType.MANY_TO_MANY && this.property.mappedBy;
        if (manyToManyInverse && items.find(item => !item[this.property.mappedBy] || !item[this.property.mappedBy].isInitialized())) {
            throw utils_1.ValidationError.cannotModifyInverseCollection(this.owner, this.property);
        }
    }
}
exports.Collection = Collection;
