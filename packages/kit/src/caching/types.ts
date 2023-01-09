

export type CachingGetOptions = {
    prefix?: string
    [key: string]: any
}

export interface ICachingService {
    getCache<V>(key: CacheKey, options?: CachingGetOptions): ICache<V>
    register(key: string, factory: () => ICache): void
}

export interface ICache<V = any> {
    keys(): IterableIterator<string>
    has(key: string): boolean
    get<T extends V = V>(key: string): T | undefined
    set<T extends V = V>(key: string, value: T): void
    delete(key: string): void
    clear(): void
}


export type CacheKeyStrict = keyof CacheTypes;
export type CacheKey = CacheKeyStrict | (string & {})
