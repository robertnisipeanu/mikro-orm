export declare function Index(options?: IndexOptions): Function;
export declare function Unique(options?: UniqueOptions): Function;
export interface UniqueOptions {
    name?: string;
    properties?: string | string[];
}
export interface IndexOptions extends UniqueOptions {
    type?: string;
}