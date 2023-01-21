import { RESOLVE, useContainer } from "../di";
import { CacheItemKey, CacheItemType, CacheKey, CacheType, ICache } from "./types";


export function useCache(): ICache;
export function useCache<K extends CacheKey>(key: K): CacheType<K>;
export function useCache<K extends CacheKey>(key?: K): CacheType<K> | ICache {
    const container = useContainer();
    const caching = RESOLVE(container, "ICachingService");

    return key
        ? caching.getCache(key)
        : caching.getDefaultCache();
}


export type useCachedOptions = {
    cache: CacheKey
}

export type useCachedSetOptions = Partial<useCachedOptions> & {
    /**
     * Specify the expiration in milliseconds
     * NB: not all providers support this options
     */
    ttl?: number
}

export async function useCached<K extends CacheItemKey>(key: K, options?: useCachedOptions): Promise<CacheItemType<K>>;
export async function useCached<K extends CacheItemKey>(key: K, value: CacheItemType<K>, options?: useCachedSetOptions): Promise<CacheItemType<K>>;
export async function useCached<K extends CacheItemKey>(key: K, optionsOrValue?: any, options?: useCachedSetOptions): Promise<unknown> {
    let mode: "get" | "set" = "get";
    let value: any;

    if (arguments.length === 3) {
        mode = "set";
        value = optionsOrValue;
    } else if (arguments.length === 2) {
        if (typeof optionsOrValue === "object" && optionsOrValue && "cache" in optionsOrValue) {
            mode = "get";
            options = optionsOrValue;
        } else {
            mode = "set";
            value = optionsOrValue;
        }
    }

    const cache = options?.cache
        ? useCache(options.cache)
        : useCache();


    if (mode === "get") {
        value = await cache.get(key);
    } else {
        await cache.set(key, value, options?.ttl && {
            ttl: options.ttl
        } || undefined);
    }

    return value;
}
