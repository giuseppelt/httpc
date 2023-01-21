import { container as globalContainer } from "tsyringe";
import { CacheKey, CacheType, ICachingService } from "./types";

export function REGISTER_CACHE<K extends CacheKey>(key: K, factory: (service: ICachingService) => CacheType<K>) {
    const container = globalContainer;

}
