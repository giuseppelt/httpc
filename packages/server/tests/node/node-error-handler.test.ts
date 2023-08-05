import { createHttpCNodeServerTester, HttpCServerOptions, PassthroughMiddleware } from "../../src";


type ErrorHandler = NonNullable<HttpCServerOptions["onError"]>;
type ErrorHandlerLevel = Parameters<ErrorHandler>[0];

describe("Global error handling", () => {
    const calls = {
        test: () => { }
    };

    test("No error, error handler not called", async () => {
        const handler = jest.fn(() => Promise.resolve());

        const server = createHttpCNodeServerTester({
            calls,
            onError: handler
        });

        await server.process({ path: "/test", method: "GET" });

        expect(handler).not.toBeCalled();
    });

    test("When a call returns an Error, the error handler invoked with 'call' level", async () => {
        const handler = jest.fn(() => Promise.resolve());

        const server = createHttpCNodeServerTester({
            calls: {
                test: () => { return new Error(); }
            },
            onError: handler
        });

        await server.process({ path: "/test", method: "GET" });

        expect(handler).toBeCalledTimes(1);
        expect(handler).toBeCalledWith<[ErrorHandlerLevel, Error]>("call", expect.any(Error));
    });

    test("When a call throws an Error, the error handler invoked with 'pipeline' level", async () => {
        const handler = jest.fn(() => Promise.resolve());

        const server = createHttpCNodeServerTester({
            calls: {
                test: () => { throw new Error(); }
            },
            onError: handler
        });

        await server.process({ path: "/test", method: "GET" });

        expect(handler).toBeCalledTimes(1);
        expect(handler).toBeCalledWith<[ErrorHandlerLevel, Error]>("pipeline", expect.any(Error));
    });

    test("When a middleware throws an Error, the error handler invoked with 'pipeline' level", async () => {
        const handler = jest.fn(() => Promise.resolve());

        const server = createHttpCNodeServerTester({
            middlewares: [
                PassthroughMiddleware(() => { throw new Error() })
            ],
            calls,
            onError: handler
        });

        await server.process({ path: "/test", method: "GET" });

        expect(handler).toBeCalledTimes(1);
        expect(handler).toBeCalledWith<[ErrorHandlerLevel, Error]>("pipeline", expect.any(Error));
    });

    test("When a parser throws an Error, the error handler invoked with 'pipeline' level", async () => {
        const handler = jest.fn(() => Promise.resolve());

        const server = createHttpCNodeServerTester({
            parsers: [
                () => { throw new Error(); }
            ],
            calls,
            onError: handler
        });

        await server.process({ path: "/test", method: "GET" });

        expect(handler).toBeCalledTimes(1);
        expect(handler).toBeCalledWith<[ErrorHandlerLevel, Error]>("pipeline", expect.any(Error));
    });

    test("When a requestMiddlewares throws an Error, the error handler invoked with 'server' level", async () => {
        const handler = jest.fn(() => Promise.resolve());

        const server = createHttpCNodeServerTester({
            requestMiddlewares: [
                () => { throw new Error(); }
            ],
            calls,
            onError: handler
        });

        await server.process({ path: "/test", method: "GET" });

        expect(handler).toBeCalledTimes(1);
        expect(handler).toBeCalledWith<[ErrorHandlerLevel, Error]>("server", expect.any(Error));
    });
});
