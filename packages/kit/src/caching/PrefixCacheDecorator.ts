import { ICache, ICacheSync } from "./types";
import { createProxy, isPromise } from "../utils";


export function PrefixCacheDecorator<T extends ICache | ICacheSync>(prefix: string | (() => string), cache: T): T {
    function _prefix(key: string): string {
        const p = typeof prefix === "function" ? prefix() : prefix;
        return `${p}:${key}`;
    }

    function _un_prefix(key: string): string {
        const p = typeof prefix === "function" ? prefix() : prefix;
        return key.substring(p.length + 1);
    }

    return createProxy(cache as ICacheSync, {
        keys() {
            const base = cache.keys();

            const iterator: IterableIterator<any> = {
                [Symbol.iterator]() {
                    return iterator;
                },
                next(): any {
                    const entry = base.next();
                    if (isPromise(entry)) {
                        return entry.then(processNext);
                    } else {
                        return processNext(entry);
                    }
                }
            };

            function processNext(entry: IteratorResult<any>) {
                if (entry.done) return entry;
                if (!entry.value.startsWith(prefix)) return iterator.next();
                return {
                    done: entry.done,
                    value: _un_prefix(entry.value),
                };
            }

            return iterator;
        },
        has(key: string) {
            return cache.has(_prefix(key)) as any;
        },
        get(key: string) {
            return cache.get(_prefix(key)) as any;
        },
        set(key: string, value: T) {
            return cache.set(_prefix(key), value);
        },
        delete(key: string) {
            return cache.delete(_prefix(key));
        },
        clear(): void {
            throw new Error("not-supported");
        }
    }) as T;
}
