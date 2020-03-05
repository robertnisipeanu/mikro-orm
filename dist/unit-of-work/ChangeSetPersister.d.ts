import { MetadataStorage } from '../metadata';
import { AnyEntity } from '../typings';
import { Collection, EntityIdentifier } from '../entity';
import { ChangeSet } from './ChangeSet';
import { IDatabaseDriver, Transaction } from '..';
export declare class ChangeSetPersister {
    private readonly driver;
    private readonly identifierMap;
    private readonly metadata;
    constructor(driver: IDatabaseDriver, identifierMap: Record<string, EntityIdentifier>, metadata: MetadataStorage);
    persistToDatabase<T extends AnyEntity<T>>(changeSet: ChangeSet<T>, ctx?: Transaction): Promise<void>;
    persistCollectionToDatabase<T extends AnyEntity<T>>(coll: Collection<T>, ctx?: Transaction): Promise<void>;
    private persistEntity;
    private updateEntity;
    private processOptimisticLock;
    private processReference;
    private mapReturnedValues;
}
