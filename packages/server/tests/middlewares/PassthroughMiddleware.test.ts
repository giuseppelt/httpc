import { randomUUID } from "crypto";
import { PassthroughMiddleware, httpCallTester } from "../../src";


describe("PassthroughMiddleware", () => {
    test("call result value goes through", async () => {
        const result = randomUUID();

        const call = httpCallTester(
            PassthroughMiddleware(() => { /* noop */ }),
            () => result
        );

        expect(await call()).toBe(result);
    });

    test("call params gets passed", async () => {
        const arg1 = randomUUID();
        const arg2 = randomUUID();

        const handler = jest.fn<any, any>(() => { /** does nothing */ });

        const call = httpCallTester(
            PassthroughMiddleware(() => { /* noop */ }),
            handler
        );

        await call(arg1, arg2);

        expect(handler).toBeCalledWith(arg1, arg2);
    });
})
