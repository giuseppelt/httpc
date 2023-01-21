import { singleton } from "tsyringe";
import { alias, KEY, options } from "../di";
import { logger } from "../logging";
import type { ILogger } from "../logging";
import { BaseService } from "../services";
import { CacheKey, CacheType, CachingGetOptions, ICache, ICacheSync, ICachingService } from "./types";
import { LogCacheDecorator } from "./LogCacheDecorator";
import { PrefixCacheDecorator } from "./PrefixCacheDecorator";


type CacheFactory<K extends CacheKey = string> = (service: ICachingService) => CacheType<K> | ICache | ICacheSync

export type CachingServiceOptions = {
    log?: boolean
    caches?: Record<CacheKey, CacheFactory>
    defaultCache?: CacheKey
}


@singleton()
@alias(KEY("ICachingService"))
export class CachingService extends BaseService() implements ICachingService {
    protected readonly factories = new Map<string, CacheFactory>();
    protected readonly caches = new Map<string, ICache | ICacheSync>();
    protected readonly _defaultCacheKey: string | undefined;

    constructor(
        @logger() logger: ILogger,
        @options(undefined) protected readonly options?: CachingServiceOptions
    ) {
        //@ts-expect-error
        super(...arguments);

        this._defaultCacheKey = options?.defaultCache;

        if (options?.caches) {
            for (const key in options.caches) {
                this.register(key, options.caches[key]);
            }
        }
    }

    getDefaultCache(): ICache<any> {
        if (!this._defaultCacheKey) {
            this._raiseError("misconfiguration", "Default cache not configured");
        }

        return this.getCache(this._defaultCacheKey);
    }

    getCache<K extends CacheKey>(key: K, options?: CachingGetOptions): CacheType<K> {
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
            cache = LogCacheDecorator(key, this.logger, cache);
            this.logger.verbose("Decorated cache(%s) with LogDecorator", key);
        }

        if (options?.prefix) {
            cache = PrefixCacheDecorator(options.prefix, cache);
            this.logger.verbose("Decorated cache(%s) with PrefixDecorator(prefix=%s)", key, options.prefix);
        }

        return cache as any;
    }

    removeCache(key: CacheKey) {
        this.caches.delete(key);
        this.logger.info("Cache(%s) removed", key);
    }

    register<K extends CacheKey>(key: K, factory: CacheFactory<K>) {
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
