import { IncomingMessage, METHODS } from "http";
import { Readable } from "stream";
import { HttpCall } from "../src";
import { HttpCCallParser } from "../src/parsers";


describe("httpc call convention", () => {

    describe("strict mode", () => {
        const parser = HttpCCallParser({
            mode: "strict"
        });


        test("only GET or POST accepted", () => {
            const METHODS = [
                "HEAD",
                "PUT",
                "PATCH",
                "DELETE",
                "OPTIONS",
            ];

            for (const method of METHODS) {
                const request = createRequest({ method, path: "/" });
                expect(parser(request)).rejects.toMatchObject({
                    status: 405 // method not allowed
                });
            }
        });

        test("nested call path", async () => {
            const PATHS = [
                "/call",
                "/sub/call",
                "/sub/call/path",
            ];

            for (const path of PATHS) {
                const request = createRequest({
                    method: "GET",
                    path
                });

                const call = await parser(request);
                expect(call).toMatchObject<HttpCall>({
                    access: "read",
                    path,
                    params: []
                });
            }
        });

        test("read operation w/no param", async () => {
            const request = createRequest({
                method: "GET",
                path: "/call"
            });

            const call = await parser(request);
            expect(call).toMatchObject<HttpCall>({
                access: "read",
                path: "/call",
                params: []
            });
        });

        test("read operation w/params", async () => {
            for (const params of TEST_PARAMS) {
                const request = createRequest({
                    method: "GET",
                    path: `/call?$p=${JSON.stringify(params)}`
                });

                const call = await parser(request);
                expect(call).toMatchObject<HttpCall>({
                    access: "read",
                    path: "/call",
                    params,
                });
            }
        });

        test("write operation w/no param", async () => {
            const request = createRequest({
                method: "POST",
                path: "/call"
            });

            const call = await parser(request);
            expect(call).toMatchObject<HttpCall>({
                access: "write",
                path: "/call",
                params: []
            });
        });

        test("write operation w/params", async () => {
            for (const params of TEST_PARAMS) {
                const request = createRequest({
                    method: "POST",
                    path: `/call`,
                    body: params
                });

                const call = await parser(request);
                expect(call).toMatchObject<HttpCall>({
                    access: "write",
                    path: "/call",
                    params,
                });
            }
        });

        test("call path override", async () => {
            const request = createRequest({
                method: "GET",
                path: "/path?$c=override"
            });

            const call = await parser(request);
            expect(call).toMatchObject<HttpCall>({
                access: "read",
                path: "/override",
                params: []
            });
        });
    });
});



const TEST_PARAMS: any[][] = [
    [0],
    [1],
    [0, 1],
    [""],
    ["hello"],
    ["hello", ""],
    [1, "hello", ""],
    [{}],
    [{ key: 1 }],
    [{ key1: 0, key2: "value" }],
    [{ key1: 0, key2: "value", children: { subKey: "value1" } }],
    [0, {}],
    [1, {}, "hello"],
    [[]],
    [[1]],
    [[0, 1, 2]],
    [0, [1], "hello"],
    [1, [1, 2], { key: 1 }]
];


function createRequest({ method, path, headers, body }: {
    method: string
    path: string
    headers?: Record<string, string | number>
    body?: any
}): IncomingMessage {
    method = method.toUpperCase();
    if (!METHODS.includes(method)) {
        throw new Error(`Http method unknown: ${method}`);
    }


    let buffer;
    if (typeof body === "object") {
        buffer = Buffer.from(JSON.stringify(body), "utf8");
        headers = {
            "content-type": "application/json",
            "content-length": buffer.length,
            ...headers,
        }
    }

    const content = Readable.from(buffer || Buffer.from([]));

    return Object.assign(content, {
        url: new URL(path, "http://localhost").toString(),
        method,
        headers: Object.fromEntries(
            Object.entries(headers || {}).map(([key, value]) => [key.toLowerCase(), value])
        ),
    } as IncomingMessage);
}
