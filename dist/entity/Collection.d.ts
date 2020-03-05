import { FilterQuery, QueryOrderMap } from '..';
import { AnyEntity } from '../typings';
import { ArrayCollection } from './ArrayCollection';
export declare class Collection<T extends AnyEntity<T>> extends ArrayCollection<T> {
    private initialized;
    private dirty;
    private _populated;
    constructor(owner: AnyEntity, items?: T[], initialized?: boolean);
    /**
     * Initializes the collection and returns the items
     */
    loadItems(): Promise<T[]>;
    /**
     * Returns the items (the collection must be initialized)
     */
    getItems(): T[];
    add(...items: T[]): void;
    set(items: T[]): void;
    /**
     * @internal
     */
    hydrate(items: T[], validate?: boolean): void;
    remove(...items: T[]): void;
    contains(item: T): boolean;
    count(): number;
    isInitialized(fully?: boolean): boolean;
    shouldPopulate(): boolean;
    populated(populated?: boolean): void;
    isDirty(): boolean;
    setDirty(dirty?: boolean): void;
    init(options?: InitOptions<T>): Promise<this>;
    init(populate?: string[], where?: FilterQuery<T>, orderBy?: QueryOrderMap): Promise<this>;
    private createCondition;
    private createOrderBy;
    private createManyToManyCondition;
    private modify;
    private checkInitialized;
    /**
     * re-orders items after searching with `$in` operator
     */
    private reorderItems;
    private cancelOrphanRemoval;
    private validateItemType;
    private validateModification;
}
export interface InitOptions<T> {
    populate?: string[];
    orderBy?: QueryOrderMap;
    where?: FilterQuery<T>;
}
