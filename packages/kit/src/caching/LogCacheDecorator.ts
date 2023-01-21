import { ILogger } from "../logging";
import { ICache, ICacheSync } from "./types";
import { createProxy, isPromise } from "../utils";


export function LogCacheDecorator<T extends ICache | ICacheSync>(name: string, logger: ILogger, cache: T): T {
    return createProxy(cache as ICacheSync, {
        get(key: string) {
            function log(value: any) {
                logger.debug("Cache(%s) %s: %s", name, key, value === undefined ? "miss" : "hit");
                return value;
            };

            const value = cache.get<T>(key);
            return isPromise(value)
                ? value.then(log)
                : log(value);
        },
        set(key: string, value: any) {
            logger.debug("Cache(%s) %s: set", name, key);
            return cache.set(key, value);
        },
        delete(key: string) {
            logger.debug("Cache(%s) %s: deleted", name, key);
            return cache.delete(key);
        },
        clear() {
            logger.debug("Cache(%s) cleared", name);
            return cache.clear();
        }
    }) as T;
}
