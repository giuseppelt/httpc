import { ExpandedKeys } from "../env"


export type CachingGetOptions = {
    prefix?: string
    [key: string]: any
}

export interface ICachingService {
    getDefaultCache(): ICache
    getCache<K extends CacheKey>(key: K, options?: CachingGetOptions): CacheType<K>
    register<K extends CacheKey>(key: K, factory: () => (CacheType<K> | ICache | ICacheSync)): void
}


export type CacheSetOptions = {
    /**
     * Specify the expiration in milliseconds
     * NB: not all providers support this options
     */
    ttl?: number
}

export interface ICacheSync<V = any> {
    keys(): IterableIterator<string>
    has(key: string): boolean
    get<T extends V = V>(key: string): T | undefined
    set<T extends V = V>(key: string, value: T, options?: CacheSetOptions): void
    delete(key: string): void
    clear(): void
}

export interface ICache<V = any> {
    keys(): AsyncIterableIterator<string>
    has(key: string): Promise<boolean>
    get<T extends V = V>(key: string): Promise<T | undefined>
    set<T extends V = V>(key: string, value: T, options?: CacheSetOptions): Promise<void>
    delete(key: string): Promise<void>
    clear(): Promise<void>
}


export type CacheKey = ExpandedKeys<CacheTypes>
export type CacheType<K extends CacheKey> = CacheTypes extends { [k in K]: infer T } ? T : ICache

export type CacheItemKey = ExpandedKeys<CacheItemTypes>
export type CacheItemType<K extends CacheKey> = CacheItemTypes extends { [k in K]: infer T } ? T | undefined : any
