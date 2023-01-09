import "reflect-metadata";
import { ServerResponse } from "http";
import { EventEmitter } from "events";
import httpMocks, { RequestOptions } from "node-mocks-http";
import { createHttpCServer, httpCall, HttpCServerOptions, IHttpCHost } from "@httpc/server";
import { Application } from "@httpc/kit";
import { createHttpCVercelAdapter } from "../src";


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
                const host = createHttpCServer({ log: false, ...entry.config() });
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



describe("createHttpCVercelAdapter", () => {

    combinedTest("return a valid handler",
        () => ({
            calls: {}
        }),
        host => {
            expect(createHttpCVercelAdapter(host)).toBeInstanceOf(Function);
        }
    );

    combinedTest("simple call",
        () => ({
            calls: {
                simple: httpCall(() => ({ result: "hello" }))
            }
        }),

        async host => {
            const adapter = createHttpCVercelAdapter(host);

            const { req, res } = createMockRequest({
                method: "GET",
                path: "/simple"
            });

            adapter(req, res);

            await waitResponse(res);

            expect(res._getStatusCode()).toBe(200);
            expect(res._getHeaders()["content-type"]).toMatch("application/json");
            expect(res._getJSONData()).toStrictEqual({ result: "hello" });
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
            const adapter = createHttpCVercelAdapter(host);

            const { req, res } = createMockRequest({
                method: "GET",
                path: "/parent/child"
            });

            adapter(req, res);

            await waitResponse(res);

            expect(res._getStatusCode()).toBe(200);
            expect(res._getHeaders()["content-type"]).toMatch("application/json");
            expect(res._getJSONData()).toStrictEqual({ result: "child" });
        }
    );

    combinedTest("parameter call",
        () => ({
            calls: {
                echo: httpCall((message: string) => ({ result: message }))
            }
        }),

        async host => {
            const adapter = createHttpCVercelAdapter(host);

            const { req, res } = createMockRequest({
                method: "GET",
                path: "/echo",
                params: ["hello world"]
            });

            adapter(req, res);

            await waitResponse(res);

            expect(res._getStatusCode()).toBe(200);
            expect(res._getHeaders()["content-type"]).toMatch("application/json");
            expect(res._getJSONData()).toStrictEqual({ result: "hello world" });
        }
    );


    combinedTest("not found call",
        () => ({
            calls: {
                simple: httpCall(() => ({ result: "hello" }))
            }
        }),

        async host => {
            const adapter = createHttpCVercelAdapter(host);

            const { req, res } = createMockRequest({
                method: "GET",
                path: "/not-found"
            });

            adapter(req, res);

            await waitResponse(res);

            expect(res._getStatusCode()).toBe(404);
        }
    );

    runCombinedTest();
});


function createMockRequest(options: RequestOptions) {
    if (!options.path!.startsWith("/")) {
        options.path = "/" + options.path;
    }

    let url = `http://localhost${options.path}`;
    if (options.params) {
        url += `?$p=${JSON.stringify(options.params)}`;
    }

    const { req, res } = httpMocks.createMocks({
        ...options,
        url,
    }, {
        eventEmitter: EventEmitter
    });

    // patch bad json parsing
    res._getJSONData = () => {
        return JSON.parse(res._getBuffer().toString("utf8"));
    }

    return { req, res };
}

function waitResponse(res: ServerResponse) {
    return new Promise((resolve, reject) => {
        res.on("end", resolve);
        res.on("error", reject);
    });
}
