import { ICache } from "./types";


export type InMemoryCacheOptions = {

}

export class InMemoryCache extends Map<string, any> implements ICache {
    constructor(options?: InMemoryCacheOptions) {
        super();
    }
}
