import { useContext, httpGroup, httpCallTester, httpCall, PassthroughMiddleware } from "../src";

describe("httpGroup", () => {
    test("shape w/void", () => {
        const group = httpGroup({
            call1: httpCall(() => { }),
            call2: httpCall(() => { })
        });

        expect(group).toStrictEqual({ call1: expect.anything(), call2: expect.anything() });
    });

    test("shape w/middleware", () => {
        const group = httpGroup(
            PassthroughMiddleware(() => { }),
            {
                call1: httpCall(() => { }),
                call2: httpCall(() => { })
            }
        );

        expect(group).toStrictEqual({ call1: expect.anything(), call2: expect.anything() });
    });

    test("shape w/metadata", () => {
        const group = httpGroup(
            PassthroughMiddleware(() => { }),
            { metadata: 1 },
            {
                call1: httpCall(() => { }),
                call2: httpCall(() => { })
            }
        );

        expect(group).toStrictEqual({ call1: expect.anything(), call2: expect.anything() });
    });


    test("metadata merge", () => {
        const group = httpGroup(
            { key1: 1 },
            {
                call1: httpCall({ key2: 2 }, () => { })
            }
        );

        expect(group).toStrictEqual({ call1: expect.anything() });
        expect(group.call1.metadata).toStrictEqual({ key1: 1, key2: 2 });
    });

    test("metadata overwrite", () => {
        const group = httpGroup(
            { key1: 1, key2: 2 },
            {
                call1: httpCall({ key1: "overwrite" }, () => { })
            }
        );

        expect(group).toStrictEqual({ call1: expect.anything() });
        expect(group.call1.metadata).toStrictEqual({ key1: "overwrite", key2: 2 });
    })
});
