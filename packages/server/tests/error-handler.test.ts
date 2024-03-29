import { HttpCServerOptions, PassthroughMiddleware, createHttpCServerTester } from "../src";
import { createRequest } from "./utils";


type ErrorHandler = NonNullable<HttpCServerOptions["onError"]>;
type ErrorHandlerLevel = Parameters<ErrorHandler>[0];

describe("Global error handling", () => {
    const calls = {
        test: () => { }
    };

    test("No error, error handler not called", async () => {
        const handler = jest.fn(() => Promise.resolve());

        const server = createHttpCServerTester({
            calls,
            onError: handler
        });

        await server.fetch(createRequest({ path: "/test", method: "GET" }));

        expect(handler).not.toBeCalled();
    });

    test("When a call returns an Error, the error handler invoked with 'call' level", async () => {
        const handler = jest.fn(() => Promise.resolve());

        const server = createHttpCServerTester({
            calls: {
                test: () => { return new Error(); }
            },
            onError: handler
        });

        await server.fetch(createRequest({ path: "/test", method: "GET" }));

        expect(handler).toBeCalledTimes(1);
        expect(handler).toBeCalledWith<[ErrorHandlerLevel, Error]>("call", expect.any(Error));
    });

    test("When a call throws an Error, the error handler invoked with 'pipeline' level", async () => {
        const handler = jest.fn(() => Promise.resolve());

        const server = createHttpCServerTester({
            calls: {
                test: () => { throw new Error(); }
            },
            onError: handler
        });

        await server.fetch(createRequest({ path: "/test", method: "GET" }));

        expect(handler).toBeCalledTimes(1);
        expect(handler).toBeCalledWith<[ErrorHandlerLevel, Error]>("pipeline", expect.any(Error));
    });

    test("When a middleware throws an Error, the error handler invoked with 'pipeline' level", async () => {
        const handler = jest.fn(() => Promise.resolve());

        const server = createHttpCServerTester({
            middlewares: [
                PassthroughMiddleware(() => { throw new Error() })
            ],
            calls,
            onError: handler
        });

        await server.fetch(createRequest({ path: "/test", method: "GET" }));

        expect(handler).toBeCalledTimes(1);
        expect(handler).toBeCalledWith<[ErrorHandlerLevel, Error]>("pipeline", expect.any(Error));
    });

    test("When a parser throws an Error, the error handler invoked with 'pipeline' level", async () => {
        const handler = jest.fn(() => Promise.resolve());

        const server = createHttpCServerTester({
            parsers: [
                () => { throw new Error(); }
            ],
            calls,
            onError: handler
        });

        await server.fetch(createRequest({ path: "/test", method: "GET" }));

        expect(handler).toBeCalledTimes(1);
        expect(handler).toBeCalledWith<[ErrorHandlerLevel, Error]>("pipeline", expect.any(Error));
    });

    test("When a requestMiddlewares throws an Error, the error handler invoked with 'server' level", async () => {
        const handler = jest.fn(() => Promise.resolve());

        const server = createHttpCServerTester({
            requestMiddlewares: [
                () => { throw new Error(); }
            ],
            calls,
            onError: handler
        });

        await server.fetch(createRequest({ path: "/test", method: "GET" }));

        expect(handler).toBeCalledTimes(1);
        expect(handler).toBeCalledWith<[ErrorHandlerLevel, Error]>("server", expect.any(Error));
    });
});
