import "reflect-metadata";
import { createHttpCServer, httpCall, HttpCServerOptions, IHttpCHost } from "@httpc/server";
import { Application } from "@httpc/kit";
import { createHttpCNetlifyHandler } from "../src";


interface CombinedTest {
    name: string
    config: () => HttpCServerOptions
    test: (host: IHttpCHost) => (void | Promise<void>)
}

const TESTS: CombinedTest[] = [];

function combinedTest(name: string, config: () => HttpCServerOptions, test: (host: IHttpCHost) => (void | Promise<void>)) {
    return TESTS.push({
        name,
        config,
        test
    });
}

function runCombinedTest() {
    describe("for httpc/server", () => {
        for (const entry of TESTS) {
            test(entry.name, () => {
                const host = createHttpCServer(entry.config());
                return entry.test(host) as any;
            });
        }
    });

    describe("for httpc/app", () => {
        for (const entry of TESTS) {
            test(entry.name, async () => {
                const host = new Application(entry.config());
                await host.initialize();
                return entry.test(host) as any;
            });
        }
    });
}



describe("createHttpCNetlifyHandler", () => {

    combinedTest("return a valid handler",
        () => ({
            calls: {}
        }),
        host => {
            expect(createHttpCNetlifyHandler(host)).toBeInstanceOf(Function);
        }
    );

    combinedTest("simple call",
        () => ({
            calls: {
                simple: httpCall(() => ({ result: "hello" }))
            }
        }),

        async host => {

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

        async host => {

        }
    );

    combinedTest("parameter call",
        () => ({
            calls: {
                echo: httpCall((message: string) => ({ result: message }))
            }
        }),

        async host => {

        }
    );


    combinedTest("not found call",
        () => ({
            calls: {
                simple: httpCall(() => ({ result: "hello" }))
            }
        }),

        async host => {

        }
    );

    runCombinedTest();
});
