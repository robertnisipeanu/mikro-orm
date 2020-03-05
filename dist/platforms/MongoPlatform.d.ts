import { ObjectId } from 'mongodb';
import { Platform } from './Platform';
import { NamingStrategy } from '../naming-strategy';
import { IPrimaryKey, Primary } from '../typings';
import { SchemaHelper } from '../schema';
export declare class MongoPlatform extends Platform {
    protected readonly schemaHelper?: SchemaHelper;
    usesPivotTable(): boolean;
    supportsTransactions(): boolean;
    getNamingStrategy(): {
        new (): NamingStrategy;
    };
    normalizePrimaryKey<T = number | string>(data: Primary<T> | IPrimaryKey | ObjectId): T;
    denormalizePrimaryKey(data: number | string): IPrimaryKey;
    getSerializedPrimaryKeyField(field: string): string;
}
