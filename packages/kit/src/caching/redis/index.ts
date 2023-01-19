import { CacheSetOptions, ICache } from "../types";
import { RedisClientType, createClient, RedisClientOptions } from "@redis/client";


export type RedisCacheOptions = RedisClientOptions | {
    client: RedisClientType
}

export class RedisCache implements ICache {
    constructor(options: RedisCacheOptions) {
        if ("client" in options) {
            this.client = options.client;
        } else {
            this.client = createClient(options) as any;
        }
    }

    readonly client: RedisClientType

    async *keys() {
        await this._ensureClient();
        return await this.client.KEYS("*");
    }

    async has(key: string): Promise<boolean> {
        await this._ensureClient();
        return (await this.client.EXISTS(key)) > 0;
    }

    async get<T extends any = any>(key: string): Promise<T | undefined> {
        await this._ensureClient();
        const value = await this.client.GET(key);
        return value !== undefined && value !== null ? JSON.parse(value) : undefined;
    }

    async set<T extends any = any>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
        await this._ensureClient();
        await this.client.SET(key, JSON.stringify(value), options && {
            PX: options.ttl
        });
    }

    async delete(key: string): Promise<void> {
        await this._ensureClient();
        await this.client.DEL(key);
    }

    async clear(): Promise<void> {
        await this._ensureClient();
        await this.client.FLUSHDB();
    }

    private async _ensureClient() {
        if (!this.client.isReady) {
            await this.client.connect();
        }
    }
}
