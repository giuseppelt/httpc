import { ICache } from "./types";


export class PrefixCacheDecorator<V = any> implements ICache<V> {
    constructor(
        readonly prefix: string,
        readonly provider: ICache<V>
    ) {
    }

    *keys(): IterableIterator<string> {
        for (const key of this.provider.keys()) {
            yield this._un_prefix(key);
        }
    }

    has(key: string): boolean {
        return this.provider.has(this._prefix(key));
    }

    get<T extends V = V>(key: string): T | undefined {
        return this.provider.get(this._prefix(key));
    }

    set<T extends V = V>(key: string, value: T): void {
        return this.provider.set(this._prefix(key), value);
    }

    delete(key: string): void {
        return this.provider.delete(this._prefix(key));
    }

    clear(): void {
        throw new Error("not-supported");
    }

    protected _prefix(key: string): string {
        return `${this.prefix}:${key}`;
    }
    protected _un_prefix(key: string): string {
        return key.substring(this.prefix.length + 1);
    }
}
