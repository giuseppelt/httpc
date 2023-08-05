import { HttpCall, HttpCCallParser } from "../src";
import { createRequest } from "./utils";




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
            ] as const;

            for (const method of METHODS) {
                const request = createRequest(method);
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
                const request = createRequest("GET", path);
                const call = await parser(request);

                expect(call).toMatchObject<HttpCall>({
                    access: "read",
                    path,
                    params: []
                });
            }
        });

        test("read operation w/no param", async () => {
            const request = createRequest("GET", "/call");
            const call = await parser(request);

            expect(call).toMatchObject<HttpCall>({
                access: "read",
                path: "/call",
                params: []
            });
        });

        test("read operation w/params", async () => {
            for (const params of TEST_PARAMS) {
                const request = createRequest("GET", `/call?$p=${JSON.stringify(params)}`);
                const call = await parser(request);

                expect(call).toMatchObject<HttpCall>({
                    access: "read",
                    path: "/call",
                    params,
                });
            }
        });

        test("write operation w/no param", async () => {
            const request = createRequest("POST", "/call");
            const call = await parser(request);

            expect(call).toMatchObject<HttpCall>({
                access: "write",
                path: "/call",
                params: []
            });
        });

        test("write operation w/params", async () => {
            for (const params of TEST_PARAMS) {
                const request = createRequest("POST", "/call", params);
                const call = await parser(request);

                expect(call).toMatchObject<HttpCall>({
                    access: "write",
                    path: "/call",
                    params,
                });
            }
        });

        test("call path override", async () => {
            const request = createRequest("GET", "/path?$c=override");
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
