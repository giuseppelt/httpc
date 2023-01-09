import { useContext } from "../src";
import { httpCallTester, testContext } from "../src/testing";

describe("httpCall", () => {

    beforeEach(() => {
        testContext.clear();
    });

    test("void", async () => {
        const call = httpCallTester(() => { });
        await expect(call()).resolves.toBeUndefined();
    });

    test("w/value", async () => {
        const call = httpCallTester(() => 1);
        await expect(call()).resolves.toBe(1);
    });

    test("w/param", async () => {
        const call = httpCallTester((arg: number) => arg);

        const params = [0, 1, -2];
        for (const p of params) {
            await expect(call(p)).resolves.toBe(p);
        }
    });

    test("async w/param", async () => {
        const call = httpCallTester(async (arg: number) => Promise.resolve(arg));

        const params = [0, 1, -2];
        for (const p of params) {
            await expect(call(p)).resolves.toBe(p);
        }
    });

    test("throw error", async () => {
        const call = httpCallTester(async () => { throw new Error(); });
        await expect(call()).rejects.toBeInstanceOf(Error);
    })

    test("rejected promise", async () => {
        const call = httpCallTester(async () => Promise.reject(new Error()));
        await expect(call()).rejects.toBeInstanceOf(Error);
    });

    test("context presence", async () => {
        const call = httpCallTester(() => {
            const context = useContext();
        });

        await expect(call()).resolves.toBeUndefined();
    });

    test("context w/empty value", async () => {
        const call = httpCallTester(() => {
            return (useContext() as any)["key"];
        });

        await expect(call()).resolves.toBeUndefined();
    });

    test("context w/preset value", async () => {
        testContext.set("key", "value");

        const call = httpCallTester(() => {
            return (useContext() as any)["key"];
        });

        await expect(call()).resolves.toBe("value");
    });
});
