import { ICache } from "./types";


export type WaterfallCacheOptions = {
    providers: ICache[]
}

export class WaterfallCache<V = any> implements ICache<V> {
    readonly providers: ICache[];

    constructor(options: WaterfallCache) {
        this.providers = options.providers;
    }

    keys() {
        return this.providers[0].keys();
    }

    has(key: string): boolean {
        for (const p of this.providers) {
            if (p.has(key)) {
                return true;
            }
        }

        return false;
    }

    get<T extends V = V>(key: string): T | undefined {
        for (const p of this.providers) {
            const value = p.get(key);
            if (value !== null && value !== undefined) {
                return value;
            }
        }
    }

    set<T extends V = V>(key: string, value: T): void {
        for (const p of this.providers) {
            p.set(key, value);
        }
    }

    delete(key: string): void {
        for (const p of this.providers) {
            p.delete(key);
        }
    }

    clear(): void {
        for (const p of this.providers) {
            p.clear();
        }
    }
}
