import { HttpCServerMiddleware, HttpCServerResponse, randomUUID } from "@httpc/server";
import { humanDuration, HumanDuration } from "../utils";
import { CacheKey } from "./types";
import { useCached } from "./context";
import { useLogger } from "../logging";


type KeyFactory = (params: any[]) => string

export type CacheOption = {
    inMemory?: boolean
    cache?: CacheKey
    key?: KeyFactory
}

export function Cache(ttl: HumanDuration, key?: KeyFactory): HttpCServerMiddleware;
export function Cache(ttl: HumanDuration, options: CacheOption): HttpCServerMiddleware;
export function Cache(ttl: HumanDuration, keyOrOptions?: KeyFactory | CacheOption, options?: CacheOption): HttpCServerMiddleware {
    let keyFactory: KeyFactory = defaultKeyFactory;
    let keyPrefix = "cached_" + randomUUID();

    if (typeof keyOrOptions === "function") {
        keyFactory = keyOrOptions;
    } else if (typeof keyOrOptions === "object") {
        options = keyOrOptions;
        if (keyOrOptions.key) {
            keyFactory = keyOrOptions.key;
        }
    }


    const duration = humanDuration(ttl);

    let lastSet: number = 0;
    let lastValue: any = undefined;

    async function getCachedValue(key: string) {
        // check if expired
        if ((Date.now() - lastSet) > duration) {
            return;
        }

        if (options?.inMemory) {
            return lastValue;
        } else if (options?.cache) {
            return await useCached(key, { cache: options.cache });
        } else {
            return await useCached(key);
        }
    }

    async function setCachedValue(key: string, value: any) {
        lastSet = Date.now();

        if (options?.inMemory) {
            return lastValue = value;
        } else if (options?.cache) {
            return await useCached(key, value, { cache: options.cache });
        } else {
            return await useCached(key, value);
        }
    }

    return async (call, next) => {
        const logger = useLogger();

        const key = generateKey(keyPrefix, keyFactory, call.params);
        logger.debug("Cache(%s): item key = %s", key);

        let value = await getCachedValue(key);
        if (value !== undefined) {
            logger.verbose("Cache(%s): hit", call.path);
            return value;
        }

        value = await next(call);

        if (value instanceof HttpCServerResponse) {
            logger.warn("Cache(%s): cannot cache an HttpCServerResponse", call.path);
        } else if (value === undefined || value === null) {
            logger.verbose("Cache(%s): nothing to cache", call.path);
        } else {
            await setCachedValue(key, value);
            logger.verbose("Cache(%s): set", call.path);
        }

        return value;
    }
}


function defaultKeyFactory(params: any[]): string {
    return params.length > 0
        ? JSON.stringify(params)
        : "";
}

function generateKey(prefix: string, keyFactory: KeyFactory, params: any[]): string {
    let cacheItemKey = keyFactory(params);

    if (prefix) {
        cacheItemKey = prefix + cacheItemKey;
    }

    return cacheItemKey;
}
