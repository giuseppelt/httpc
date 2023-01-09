import { ILogger } from "../logging";
import { ICache } from "./types";


export class LogCacheDecorator<V = any> implements ICache<V> {
    constructor(
        readonly name: string,
        readonly logger: ILogger,
        readonly provider: ICache<V>
    ) {
    }

    keys() {
        return this.provider.keys();
    }

    has(key: string): boolean {
        return this.provider.has(key);
    }

    get<T extends V = V>(key: string): T | undefined {
        const value = this.provider.get<T>(key);
        this.logger.debug("Cache(%s) %s: %s", this.name, key, value === undefined ? "miss" : "hit");
        return value;
    }

    set<T extends V = V>(key: string, value: T): void {
        this.logger.debug("Cache(%s) %s: set", this.name, key);
        return this.provider.set(key, value);
    }

    delete(key: string): void {
        this.logger.debug("Cache(%s) %s: deleted", this.name, key);
        return this.provider.delete(key);
    }

    clear(): void {
        this.logger.debug("Cache(%s) cleared", this.name);
        this.provider.clear();
    }
}
