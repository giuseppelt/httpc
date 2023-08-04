
import { injectWithTransform } from "tsyringe";
import { KEY } from "../di";
import { assert } from "../internal";
import type { CacheKey, ICachingService } from "./types";


export function cache(key: CacheKey, options?: any): ParameterDecorator;
export function cache(): ParameterDecorator;
export function cache(key?: CacheKey, options?: any): ParameterDecorator {
    return injectWithTransform(KEY("ICachingService"), GetCacheTransform, key, options);
}

class GetCacheTransform {
    transform(service: ICachingService, key?: string, options?: any) {
        const cache = key
            ? service.getCache(key, options)
            : service.getDefaultCache();

        assert(cache, key ? `No cache for key '${key}' found to be injected` : "No default cache found to be injected");

        return cache;
    }
}
