import { Dictionary, EntityProperty, AnyEntity, IPrimaryKey, Primary } from '../typings';
import { Collection } from './Collection';
export declare class ArrayCollection<T extends AnyEntity<T>> {
    readonly owner: AnyEntity;
    [k: number]: T;
    protected readonly items: T[];
    private _property?;
    constructor(owner: AnyEntity, items?: T[]);
    getItems(): T[];
    toArray(): Dictionary[];
    getIdentifiers<U extends IPrimaryKey = Primary<T> & IPrimaryKey>(field?: string): U[];
    add(...items: T[]): void;
    set(items: T[]): void;
    hydrate(items: T[]): void;
    remove(...items: T[]): void;
    removeAll(): void;
    contains(item: T): boolean;
    count(): number;
    readonly length: number;
    [Symbol.iterator](): IterableIterator<T>;
    /**
     * @internal
     */
    readonly property: EntityProperty<any>;
    protected propagate(item: T, method: 'add' | 'remove'): void;
    protected propagateToInverseSide(item: T, method: 'add' | 'remove'): void;
    protected propagateToOwningSide(item: T, method: 'add' | 'remove'): void;
    protected shouldPropagateToCollection(collection: Collection<T>, method: 'add' | 'remove'): boolean;
}
