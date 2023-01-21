import { ICacheSync } from "./types";


export type InMemoryCacheOptions = {

}

export class InMemoryCache extends Map<string, any> implements ICacheSync {
    constructor(options?: InMemoryCacheOptions) {
        super();
    }
}
