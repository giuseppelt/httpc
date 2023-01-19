import "reflect-metadata";
import { httpCall } from "@httpc/server";
import { createHttpCNetlifyHandler, HttpCNetlifyAdapterOptions } from "../src";


interface CombinedTest {
    name: string
    config: () => HttpCNetlifyAdapterOptions
    test: (config: HttpCNetlifyAdapterOptions) => (void | Promise<void>)
}

const TESTS: CombinedTest[] = [];

function combinedTest(name: string, config: () => HttpCNetlifyAdapterOptions, test: (config: HttpCNetlifyAdapterOptions) => (void | Promise<void>)) {
    return TESTS.push({
        name,
        config,
        test
    });
}

function runCombinedTest() {
    describe("for httpc/server", () => {
        for (const entry of TESTS) {
            test(entry.name, async () => {
                await entry.test({
                    ...entry.config(),
                    log: false,
                    refresh: true, // force initialization on each call
                });
            });
        }
    });

    describe("for httpc/kit", () => {
        for (const entry of TESTS) {
            test(entry.name, async () => {
                await entry.test({
                    ...entry.config(),
                    kit: true,
                    log: false,
                    refresh: true, // force initialization on each call
                });
            });
        }
    });
}



describe("createHttpCNetlifyHandler", () => {

    combinedTest("return a valid handler",
        () => ({
            calls: {}
        }),
        config => {
            expect(createHttpCNetlifyHandler(config)).toBeInstanceOf(Function);
        }
    );

    combinedTest("simple call",
        () => ({
            calls: {
                simple: httpCall(() => ({ result: "hello" }))
            }
        }),
        async config => {

        }
    );

    combinedTest("nested call",
        () => ({
            calls: {
                parent: {
                    child: httpCall(() => ({ result: "child" }))
                }
            }
        }),
        async config => {

        }
    );

    combinedTest("parameter call",
        () => ({
            calls: {
                echo: httpCall((message: string) => ({ result: message }))
            }
        }),
        async config => {

        }
    );


    combinedTest("not found call",
        () => ({
            calls: {
                simple: httpCall(() => ({ result: "hello" }))
            }
        }),
        async config => {

        }
    );

    runCombinedTest();
});
