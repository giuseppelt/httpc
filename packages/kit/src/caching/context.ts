import { RESOLVE, useContainer } from "../di";
import { ICache } from "./types";


export function useCache(key: string): ICache {
    const container = useContainer();
    const caching = RESOLVE(container, "ICachingService");

    return caching.getCache(key);
}
