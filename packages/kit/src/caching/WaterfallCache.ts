import { ICache, ICacheSync } from "./types";


export type WaterfallCacheOptions = {
    providers: (ICache | ICacheSync)[]
}

export class WaterfallCache<V = any> implements ICache<V> {
    readonly providers: ICache[];

    constructor(options: WaterfallCache) {
        this.providers = options.providers;
    }

    keys() {
        return this.providers[0].keys();
    }

    async has(key: string): Promise<boolean> {
        for (const p of this.providers) {
            if (await p.has(key)) {
                return true;
            }
        }

        return false;
    }

    async get<T extends V = V>(key: string): Promise<T | undefined> {
        for (const p of this.providers) {
            const value = await p.get(key);
            if (value !== null && value !== undefined) {
                return value;
            }
        }
    }

    async set<T extends V = V>(key: string, value: T): Promise<void> {
        for (const p of this.providers) {
            await p.set(key, value);
        }
    }

    async delete(key: string): Promise<void> {
        for (const p of this.providers) {
            await p.delete(key);
        }
    }

    async clear(): Promise<void> {
        for (const p of this.providers) {
            await p.clear();
        }
    }
}
