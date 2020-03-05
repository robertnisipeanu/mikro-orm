/// <reference types="node" />
import { EntityManager } from '../EntityManager';
declare module 'domain' {
    type ORMDomain = Domain & {
        __mikro_orm_context?: RequestContext;
    };
    const active: ORMDomain;
    function create(): ORMDomain;
}
export declare class RequestContext {
    readonly em: EntityManager;
    readonly id: string;
    constructor(em: EntityManager);
    /**
     * Creates new RequestContext instance and runs the code inside its domain.
     */
    static create(em: EntityManager, next: (...args: any[]) => void): void;
    /**
     * Returns current RequestContext (if available).
     */
    static currentRequestContext(): RequestContext | undefined;
    /**
     * Returns current EntityManager (if available).
     */
    static getEntityManager(): EntityManager | undefined;
}
