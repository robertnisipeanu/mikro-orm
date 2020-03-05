import { Cascade } from '../entity';
import { EntityName, AnyEntity } from '../typings';
export declare function Property(options?: PropertyOptions): Function;
export declare type PropertyOptions = {
    name?: string;
    fieldName?: string;
    columnType?: string;
    type?: any;
    length?: any;
    onCreate?: () => any;
    onUpdate?: () => any;
    default?: any;
    nullable?: boolean;
    unsigned?: boolean;
    persist?: boolean;
    hidden?: boolean;
    version?: boolean;
    index?: boolean | string;
    unique?: boolean | string;
    primary?: boolean;
    serializedPrimaryKey?: boolean;
};
export interface ReferenceOptions<T extends AnyEntity<T>> extends PropertyOptions {
    entity?: string | (() => EntityName<T>);
    cascade?: Cascade[];
    eager?: boolean;
}
