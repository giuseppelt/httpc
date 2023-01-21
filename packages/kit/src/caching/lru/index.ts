import { CacheSetOptions, ICacheSync } from "../types";
import LRU from "lru-cache";

/**
 * Configure the LruCache
 */
export type LruCacheOptions = {
    /**
     * Set the max count of items the cache can hold
     * @default 100
     */
    size?: number

    /**
     * Set the expiration of items in milliseconds, use 0 to have no expiration
     * @default 0
     */
    ttl?: number
}

export class LruCache implements ICacheSync {

    constructor(options?: LruCacheOptions) {
        const {
            size = 100,
            ttl = 0
        } = options || {};

        this.provider = new LRU({
            max: size,
            ttl,
        });
    }

    readonly provider: InstanceType<typeof LRU<string, any>>;

    keys() {
        return this.provider.keys();
    }

    has(key: string): boolean {
        return this.provider.has(key);
    }

    get<T extends any = any>(key: string): T | undefined {
        return this.provider.get<T>(key);
    }

    set<T extends any = any>(key: string, value: T, options?: CacheSetOptions): void {
        this.provider.set(key, value, options && {
            ttl: options.ttl
        });
    }

    delete(key: string): void {
        this.provider.delete(key);
    }

    clear(): void {
        this.provider.clear();
    }
}
