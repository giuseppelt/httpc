import assert from "assert";
import { injectWithTransform } from "tsyringe";
import { KEY } from "../di";
import { CacheKey, ICachingService } from "./types";


export function cache(key: CacheKey, options?: any): ParameterDecorator {
    return injectWithTransform(KEY("ICachingService"), GetCacheTransform, key, options);
}

class GetCacheTransform {
    transform(service: ICachingService, key: string, options?: any) {
        const cache = service.getCache(key, options);
        assert(cache, `No cache for key '${key}'`);
        return cache;
    }
}
