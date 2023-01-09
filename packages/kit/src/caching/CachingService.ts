import { singleton } from "tsyringe";
import { alias, KEY, options } from "../di";
import { logger } from "../logging";
import type { ILogger } from "../logging";
import { BaseService } from "../services";
import { CacheKey, CachingGetOptions, ICache, ICachingService } from "./types";
import { LogCacheDecorator } from "./LogCacheDecorator";
import { PrefixCacheDecorator } from "./PrefixCacheDecorator";


type CacheFactory = (service: CachingService) => ICache

export type CachingServiceOptions = {
    log?: boolean
    caches?: Record<CacheKey, CacheFactory>
}


@singleton()
@alias(KEY("ICachingService"))
export class CachingService extends BaseService() implements ICachingService {
    protected readonly factories = new Map<string, CacheFactory>();
    protected readonly caches = new Map<string, ICache>();

    constructor(
        @logger() logger: ILogger,
        @options(undefined) protected readonly options?: CachingServiceOptions
    ) {
        //@ts-expect-error
        super(...arguments);

        if (options?.caches) {
            for (const key in options.caches) {
                this.register(key, options.caches[key]);
            }
        }
    }

    getCache<V>(key: CacheKey, options?: CachingGetOptions): ICache<V> {
        let cache = this.caches.get(key);
        if (!cache) {
            cache = this._instantiateCache(key);
            this.caches.set(key, cache);
        } else {
            this.logger.verbose("Cache(%s) active", key);
        }
        if (!cache) {
            this._raiseError("not_found", { cache: key });
        }

        if (this.options?.log) {
            cache = new LogCacheDecorator(key, this.logger, cache);
            this.logger.verbose("Decorated cache(%s) with LogDecorator", key);
        }

        if (options?.prefix) {
            cache = new PrefixCacheDecorator(options.prefix, cache);
            this.logger.verbose("Decorated cache(%s) with PrefixDecorator(prefix=%s)", key, options.prefix);
        }

        return cache;
    }

    removeCache(key: CacheKey) {
        this.caches.delete(key);
        this.logger.info("Cache(%s) removed", key);
    }

    register(key: string, factory: CacheFactory) {
        this.factories.set(key, factory);
        this.logger.info("Registered cache(%s)", key);
    }

    protected _instantiateCache(key: string) {
        const factory = this.factories.get(key);
        if (!factory) {
            this._raiseError("not_found", { cache: key });
        }

        const instance = factory(this);
        this.logger.info("Cache(%s) instantiated", key);
        return instance;
    }
}
