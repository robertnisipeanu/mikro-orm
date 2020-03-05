import { IPrimaryKey } from '../typings';
export declare class EntityIdentifier {
    private value?;
    constructor(value?: string | number | {
        toHexString(): string;
    } | undefined);
    setValue(value: IPrimaryKey): void;
    getValue<T extends IPrimaryKey = IPrimaryKey>(): T;
}
