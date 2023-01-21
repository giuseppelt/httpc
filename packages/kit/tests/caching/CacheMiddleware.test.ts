import "reflect-metadata";
import { ApplicationTester, ContainerMiddleware, KEY, NullLogger, REGISTER_INSTANCE } from "../../src";
import { Cache, CachingService, CachingServiceOptions, InMemoryCache } from "../../src/caching";
import { random } from "../utils";


describe("CacheMiddleware", () => {

    const server = new ApplicationTester({
        middlewares: [
            ContainerMiddleware("request"),
        ]
    });

    function registerCacheOptions(options: CachingServiceOptions) {
        REGISTER_INSTANCE(KEY("ICachingService"), new CachingService(new NullLogger(), options));
    }


    beforeAll(async () => {
        await server.initialize();
    });

    beforeEach(() => {
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
        jest.clearAllTimers();
    });


    describe("InMemory", () => {
        test("with cached value do not execute again the handler", async () => {
            const value = random.string();
            const handler = jest.fn(() => value);
            const call = server.newCall().create(
                Cache("1m", { inMemory: true }),
                handler,
            );

            expect(await call()).toBe(value);
            expect(handler).toBeCalledTimes(1);

            // repeat call
            expect(await call()).toBe(value);
            // expect to not be called as the cache will return it instead
            expect(handler).toBeCalledTimes(1);
        });

        test("expired value will execute again the handler", async () => {
            jest.useFakeTimers();

            const value = random.string();
            const handler = jest.fn(() => value);
            const call = server.newCall().create(
                Cache("1m", { inMemory: true }),
                handler,
            );

            expect(await call()).toBe(value);
            expect(handler).toBeCalledTimes(1);

            // repeat call
            expect(await call()).toBe(value);
            // expect to not be called as the cache will return it instead
            expect(handler).toBeCalledTimes(1);

            // advance by 30s to have still valid cache
            jest.advanceTimersByTime(30 * 1000);

            // repeat the call
            expect(await call()).toBe(value);
            // expect to not be called as the cache is still valid
            expect(handler).toBeCalledTimes(1);

            // advance by 2min to expire the cache            
            jest.advanceTimersByTime(2 * 60 * 1000);

            // repeat call
            expect(await call()).toBe(value);
            // expect the handler to be called again
            expect(handler).toBeCalledTimes(2);

            // repeat the call
            expect(await call()).toBe(value);
            // expect to not be called as the cache is valid again
            expect(handler).toBeCalledTimes(2);
        });
    });

    describe("Default Cache", () => {
        test("missing default cache throws misconfiguration error", async () => {
            registerCacheOptions({});

            const value = random.string();
            const handler = jest.fn(() => value);
            const call = server.newCall().create(
                Cache("1m"),
                handler,
            );

            await expect(call()).rejects.toMatchObject({
                errorCode: "misconfiguration"
            });
        });

        test("with cached value do not execute again the handler", async () => {
            registerCacheOptions({
                defaultCache: "test",
                caches: {
                    test: () => new InMemoryCache(),
                }
            });

            const value = random.string();
            const handler = jest.fn(() => value);
            const call = server.newCall().create(
                Cache("1m"),
                handler,
            );

            expect(await call()).toBe(value);
            expect(handler).toBeCalledTimes(1);

            // repeat call
            expect(await call()).toBe(value);
            // expect to not be called as the cache will return it instead
            expect(handler).toBeCalledTimes(1);
        });

        test("expired value will execute again the handler", async () => {
            jest.useFakeTimers();
            registerCacheOptions({
                defaultCache: "test",
                caches: {
                    test: () => new InMemoryCache(),
                }
            });

            const value = random.string();
            const handler = jest.fn(() => value);
            const call = server.newCall().create(
                Cache("1m"),
                handler,
            );

            expect(await call()).toBe(value);
            expect(handler).toBeCalledTimes(1);

            // repeat call
            expect(await call()).toBe(value);
            // expect to not be called as the cache will return it instead
            expect(handler).toBeCalledTimes(1);

            // advance by 30s to have still valid cache
            jest.advanceTimersByTime(30 * 1000);

            // repeat the call
            expect(await call()).toBe(value);
            // expect to not be called as the cache is still valid
            expect(handler).toBeCalledTimes(1);

            // advance by 2min to expire the cache            
            jest.advanceTimersByTime(2 * 60 * 1000);

            // repeat call
            expect(await call()).toBe(value);
            // expect the handler to be called again
            expect(handler).toBeCalledTimes(2);

            // repeat the call
            expect(await call()).toBe(value);
            // expect to not be called as the cache is valid again
            expect(handler).toBeCalledTimes(2);
        });
    });
});
