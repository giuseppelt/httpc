import { ICache } from "../types";
import LRU from "lru-cache";


export type LruCacheOptions = {
    size?: number
    ttl?: number
}

export class LruCache implements ICache {

    constructor(options: LruCacheOptions) {
        const {
            size = 100,
            ttl = 0
        } = options;

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

    set<T extends any = any>(key: string, value: T): void {
        this.provider.set(key, value);
    }

    delete(key: string): void {
        this.provider.delete(key);
    }

    clear(): void {
        this.provider.clear();
    }
}
