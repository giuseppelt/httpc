import { PathMatcher } from "../src";


describe("PathMatcher", () => {

    describe("single path", () => {
        test("exact match", () => {
            const matcher = new PathMatcher("path");
            expect(matcher.match("path")).toBeDefined();
            expect(matcher.match("/path")).toBeDefined();

            expect(matcher.match("paths")).toBeUndefined();
            expect(matcher.match("path/extra")).toBeUndefined();
            expect(matcher.match("/path/extra")).toBeUndefined();
        });

        test("required param match", () => {
            const matcher = new PathMatcher("path/:arg");
            expect(matcher.match("path/value")).toStrictEqual({
                path: "/path/value",
                prefix: undefined,
                base: undefined,
                matches: ["value"]
            });
            expect(matcher.match("path")).toBeUndefined()
        });

        test("optional param match", () => {
            const matcher = new PathMatcher("path/:arg?");
            expect(matcher.match("path/value")).toStrictEqual({
                path: "/path/value",
                prefix: undefined,
                base: undefined,
                matches: ["value"]
            });
            expect(matcher.match("path")).toStrictEqual({
                path: "/path",
                prefix: undefined,
                base: undefined,
                matches: [undefined]
            });
        });

        test("rest match", () => {
            const matcher = new PathMatcher("path/*");
            expect(matcher.match("path")).toBeDefined();
        });

        test("rest match with param", () => {
            const matcher = new PathMatcher("path/*");
            expect(matcher.match("path/any")).toStrictEqual({
                path: "/path/any",
                prefix: undefined,
                base: undefined,
                matches: ["any"]
            })
        });

        test("rest match with multiple param", () => {
            const matcher = new PathMatcher("path/*");
            expect(matcher.match("path/any/some")).toStrictEqual({
                path: "/path/any/some",
                prefix: undefined,
                base: undefined,
                matches: ["any/some"]
            })
        });

        test("excessive doesn't match", () => {
            const matcher = new PathMatcher("path");
            expect(matcher.match("path/hello")).toBeUndefined();
        });

        test("any prefix", () => {
            const matcher = new PathMatcher("*/path");
            expect(matcher.match("any/path")).toStrictEqual({
                path: "/any/path",
                prefix: "any",
                base: undefined,
                matches: []
            })
        });
    });


    describe("base w/wildcard", () => {
        test("any prefix w/required param", () => {
            const matcher = new PathMatcher({ base: "*/base", paths: [":path"] });
            expect(matcher.match("prefix/base/any")).toStrictEqual({
                path: "/prefix/base/any",
                prefix: "prefix",
                base: "/prefix/base",
                matches: ["any"]
            });
            expect(matcher.match("prefix/base")).toBeUndefined();
        });

        test("any prefix w/required param w/repeated match", () => {
            const matcher = new PathMatcher({ base: "*/base", paths: [":flow"] });
            expect(matcher.match("prefix/base/prefix")).toStrictEqual({
                path: "/prefix/base/prefix",
                prefix: "prefix",
                base: "/prefix/base",
                matches: ["prefix"]
            });
        });

        test("any prefix w/optional param", () => {
            const matcher = new PathMatcher({ base: "*/base", paths: [":path?"] });
            expect(matcher.match("prefix/base/any")).toStrictEqual({
                path: "/prefix/base/any",
                prefix: "prefix",
                base: "/prefix/base",
                matches: ["any"]
            });
            expect(matcher.match("prefix/base")).toStrictEqual({
                path: "/prefix/base",
                prefix: "prefix",
                base: "/prefix/base",
                matches: [undefined]
            });
        });

        test("any prefix w/mixed param", () => {
            const matcher = new PathMatcher({ base: "*/base", paths: [":param1/:param2?"] });
            expect(matcher.match("prefix/base/any/some")).toStrictEqual({
                path: "/prefix/base/any/some",
                prefix: "prefix",
                base: "/prefix/base",
                matches: ["any", "some"]
            });
            expect(matcher.match("prefix/base/any")).toStrictEqual({
                path: "/prefix/base/any",
                prefix: "prefix",
                base: "/prefix/base",
                matches: ["any", undefined]
            });
        });

        test("any prefix w/any", () => {
            const matcher = new PathMatcher({ base: "*/base", paths: "*" });
            expect(matcher.match("prefix/base/any")).toStrictEqual({
                path: "/prefix/base/any",
                prefix: "prefix",
                base: "/prefix/base",
                matches: ["any"]
            });
            expect(matcher.match("prefix/base")).toStrictEqual({
                path: "/prefix/base",
                prefix: "prefix",
                base: "/prefix/base",
                matches: [undefined]
            });
        });
    });
});
