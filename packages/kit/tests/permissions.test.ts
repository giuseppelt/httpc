import { randomUUID } from "crypto";
import { Assertion, Authorization, PermissionsChecker } from "../src/permissions";
import { permissions } from "../src/permissions/model";


declare global {
    namespace jest {
        interface Matchers<R, T = {}> {
            toStringyEqual<E = any>(expected: E): R;
        }
    }
}

expect.extend({
    toStringyEqual(actual: unknown, expected: unknown) {
        actual = actual?.toString();
        expected = expected?.toString();

        if (actual === expected) {
            return {
                pass: true,
                message: () => `expected ${this.utils.printReceived(actual)} to be equal to ${this.utils.printExpected(expected)}`
            }
        }

        return {
            pass: false,
            message: () => `expected ${this.utils.printReceived(actual)} not to be equal to ${this.utils.printExpected(expected)}`
        };
    }
});


describe("Permissions check", () => {

    const checker = new PermissionsChecker();

    describe("single token", () => {
        test("empty", () => {
            expect(checker.can("", "pass")).toBe(false);
        });

        test("single match one", () => {
            expect(checker.can("pass", "pass")).toBe(true);
        });
        test("single not match", () => {
            expect(checker.can("wrong", "pass")).toBe(false);
        });
        test("single missing one", () => {
            expect(checker.can("pass", "pass key")).toBe(false);
            expect(checker.can("pass", "key pass")).toBe(false);
        });

        test("many match one", () => {
            expect(checker.can("pass key", "pass")).toBe(true);
            expect(checker.can("pass key", "key")).toBe(true);
        });
        test("many not match", () => {
            expect(checker.can("pass key", "scope")).toBe(false);
        });
        test("many match many", () => {
            expect(checker.can("pass key", "pass key")).toBe(true);
            expect(checker.can("pass key", "key pass")).toBe(true);
        });
        test("many missing one", () => {
            expect(checker.can("pass key", "pass scope")).toBe(false);
        });
    });


    describe("multi-token", () => {
        test("empty", () => {
            expect(checker.can("", "role:user")).toBe(false);
            expect(checker.can("", "role:*")).toBe(false);
        });

        test("single match one", () => {
            expect(checker.can("role:user", "role:user")).toBe(true);
        });
        test("single match any", () => {
            expect(checker.can("role:user", "role:*")).toBe(true);
        });
        test("single not match", () => {
            expect(checker.can("role:user", "role:admin")).toBe(false);
        });
        test("single missing one", () => {
            expect(checker.can("role:user", "role:user plan:base")).toBe(false);
            expect(checker.can("role:user", "plan:base role:user")).toBe(false);
        });
        test("single missing any", () => {
            expect(checker.can("role:user", "role:* plan:base")).toBe(false);
            expect(checker.can("role:user", "role:* plan:*")).toBe(false);
        });

        test("many match one", () => {
            expect(checker.can("role:user role:admin", "role:user")).toBe(true);
            expect(checker.can("role:user role:admin", "role:admin")).toBe(true);
        });
        test("many match any", () => {
            expect(checker.can("role:user role:admin", "role:*")).toBe(true);
        });
        test("many not match", () => {
            expect(checker.can("role:user role:tester", "role:admin")).toBe(false);
        });
        test("many match many", () => {
            expect(checker.can("role:user plan:basic", "role:user plan:basic")).toBe(true);
            expect(checker.can("role:user plan:basic", "plan:basic role:user")).toBe(true);
        });
        test("many match many any", () => {
            expect(checker.can("role:user plan:basic", "role:* plan:*")).toBe(true);
            expect(checker.can("role:user plan:basic", "plan:* role:*")).toBe(true);
        });
        test("many missing one", () => {
            expect(checker.can("role:tester", "role:tester role:admin")).toBe(false);
        });
    });
});


describe("Permissions model", () => {

    test("typescript autocomplete", () => {
        const model = permissions(p => p
            .token("role", t => t
                .alias("r")
                .token("viewer")
                .token("editor", t => t
                    .includes("role:viewer")
                )
            )
            .token("owner", t => t
                .alias("o")
                .includes([
                    "role:viewer",
                    "role:editor"
                ])
            )
            .token("admin")
            .token("super-admin", t => t
                .includes("admin")
            )
        );
    });

    describe("supports", () => {
        test("without model, always support", () => {
            const checker = new PermissionsChecker();
            for (let a = 0; a < 5; a++) {
                expect(checker.supports(randomUUID())).toBe(true);
            }
        });

        test("support defined token (invariant case)", () => {
            const model = permissions(p => p
                .token("Defined")
            );
            const checker = new PermissionsChecker({ model });

            expect(checker.supports("Defined")).toBe(true);
            expect(checker.supports("defined")).toBe(true);
        });

        test("support alias token (invariant case)", () => {
            const model = permissions(p => p
                .token("Defined", t => t
                    .alias("def")
                )
            );
            const checker = new PermissionsChecker({ model });

            expect(checker.supports("def")).toBe(true);
            expect(checker.supports("Def")).toBe(true);
        });

        test("support multiple alias token (invariant case)", () => {
            const model = permissions(p => p
                .token("Defined", t => t
                    .alias("def")
                    .alias("d")
                )
            );
            const checker = new PermissionsChecker({ model });

            expect(checker.supports("def")).toBe(true);
            expect(checker.supports("Def")).toBe(true);
            expect(checker.supports("d")).toBe(true);
            expect(checker.supports("D")).toBe(true);
        });

        test("support composite token (invariant case)", () => {
            const model = permissions(p => p
                .token("Defined", t => t
                    .token("child1")
                    .token("child2")
                )
            );

            const checker = new PermissionsChecker({ model });

            expect(checker.supports("Defined:child1")).toBe(true);
            expect(checker.supports("Defined:Child1")).toBe(true);
            expect(checker.supports("Defined:child2")).toBe(true);
            expect(checker.supports("Defined:CHILD2")).toBe(true);
        });

        test("support composite aliased token (invariant case)", () => {
            const model = permissions(p => p
                .token("Defined", t => t
                    .alias("d")
                    .token("child1")
                    .token("child2")
                )
            );

            const checker = new PermissionsChecker({ model });

            expect(checker.supports("d:child1")).toBe(true);
            expect(checker.supports("D:Child1")).toBe(true);
            expect(checker.supports("d:child2")).toBe(true);
            expect(checker.supports("D:CHILD2")).toBe(true);
        });

        test("support composite aliased-child token (invariant case)", () => {
            const model = permissions(p => p
                .token("Defined", t => t
                    .alias("d")
                    .token("child1", t => t
                        .alias("c1")
                    )
                    .token("child2")
                )
            );

            const checker = new PermissionsChecker({ model });

            expect(checker.supports("defined:c1")).toBe(true);
            expect(checker.supports("Defined:C1")).toBe(true);
            expect(checker.supports("d:c1")).toBe(true);
            expect(checker.supports("d:C1")).toBe(true);
        });

        test("support root wildcard", () => {
            const model = permissions(p => p
                .token("Defined")
            );
            const checker = new PermissionsChecker({ model });

            expect(checker.supports("*")).toBe(true);
        });

        test("support composite wildcard", () => {
            const model = permissions(p => p
                .token("Defined", t => t
                    .alias("d")
                    .token("child1")
                    .token("child2")
                )
            );
            const checker = new PermissionsChecker({ model });

            expect(checker.supports("Defined:*")).toBe(true);
        });

        test("no support for single token when composite", () => {
            const model = permissions(p => p
                .token("Defined", t => t
                    .token("child1")
                    .token("child2")
                )
            );

            const checker = new PermissionsChecker({ model });

            expect(checker.supports("defined")).toBe(false);
            expect(checker.supports("Defined")).toBe(false);
        });

        test("no support for not defined token", () => {
            const model = permissions(p => p
                .token("Defined")
            );
            const checker = new PermissionsChecker({ model });

            expect(checker.supports("another")).toBe(false);
        });

        test("no support for different level token", () => {
            const model = permissions(p => p
                .token("Defined")
            );
            const checker = new PermissionsChecker({ model });

            expect(checker.supports("Defined:sub")).toBe(false);
            expect(checker.supports("defined:sub")).toBe(false);
        });


        test("must support all claims when multiple", () => {
            const model = permissions(p => p
                .token("claim1")
                .token("claim2")
            );
            const checker = new PermissionsChecker({ model });

            expect(checker.supports("claim1")).toBe(true);
            expect(checker.supports("claim2")).toBe(true);
            expect(checker.supports("claim2 claim1")).toBe(true);
            expect(checker.supports("claim1 claim2")).toBe(true);
        });

        test("no support when a claim is missing", () => {
            const model = permissions(p => p
                .token("claim1")
                .token("claim2")
            );
            const checker = new PermissionsChecker({ model });

            expect(checker.supports("claim1")).toBe(true);
            expect(checker.supports("claim2")).toBe(true);
            expect(checker.supports("claim3")).toBe(false);
            expect(checker.supports("claim2 claim3")).toBe(false);
            expect(checker.supports("claim3 claim1 claim2")).toBe(false);
        });
    });

    describe("consolidate", () => {
        test("without model -> no consolidation", () => {
            const checker = new PermissionsChecker();

            const what = [
                Authorization.parse("claim1"),
                Authorization.parse("claim1 claim2"),
                Authorization.parse("claim:sub1"),
                Authorization.parse("claim:sub1 claim:sub2"),
                Assertion.parse("claim1"),
                Assertion.parse("claim1 claim2"),
                Assertion.parse("!claim1"),
                Assertion.parse("!claim1 claim2"),
            ];

            for (const item of what) {
                expect(checker.consolidate(item)).toBe(item);
            }
        });

        test("without model -> deduplication", () => {
            const checker = new PermissionsChecker();

            expect(checker.consolidate(Authorization.parse("claim1 claim1"))).toStringyEqual(Authorization.parse("claim1"));
            expect(checker.consolidate(Authorization.parse("claim1 claim1 claim1"))).toStringyEqual(Authorization.parse("claim1"));
            expect(checker.consolidate(Authorization.parse("claim1 claim2 claim1"))).toStringyEqual(Authorization.parse("claim1 claim2"));
            expect(checker.consolidate(Authorization.parse("claim1 claim2 claim2 claim1"))).toStringyEqual(Authorization.parse("claim1 claim2"));
            expect(checker.consolidate(Authorization.parse("claim:sub1 claim:sub1"))).toStringyEqual(Authorization.parse("claim:sub1"));
            expect(checker.consolidate(Authorization.parse("claim:sub1 claim2 claim:sub1"))).toStringyEqual(Authorization.parse("claim:sub1 claim2"));

            expect(checker.consolidate(Assertion.parse("claim1 claim1"))).toStringyEqual(Assertion.parse("claim1"));
            expect(checker.consolidate(Assertion.parse("!claim1 !claim1"))).toStringyEqual(Assertion.parse("!claim1"));
            expect(checker.consolidate(Assertion.parse("claim1 claim1 claim1"))).toStringyEqual(Assertion.parse("claim1"));
            expect(checker.consolidate(Assertion.parse("!claim1 !claim1 !claim1"))).toStringyEqual(Assertion.parse("!claim1"));
            expect(checker.consolidate(Assertion.parse("claim1 claim2 claim1"))).toStringyEqual(Assertion.parse("claim1 claim2"));
            expect(checker.consolidate(Assertion.parse("!claim1 claim2 !claim1"))).toStringyEqual(Assertion.parse("!claim1 claim2"));
            expect(checker.consolidate(Assertion.parse("claim1 claim2 claim2 claim1"))).toStringyEqual(Assertion.parse("claim1 claim2"));
            expect(checker.consolidate(Assertion.parse("!claim1 !claim2 !claim2 !claim1"))).toStringyEqual(Assertion.parse("!claim1 !claim2"));
            expect(checker.consolidate(Assertion.parse("claim:sub1 claim:sub1"))).toStringyEqual(Assertion.parse("claim:sub1"));
            expect(checker.consolidate(Assertion.parse("!claim:sub1 !claim:sub1"))).toStringyEqual(Assertion.parse("!claim:sub1"));
            expect(checker.consolidate(Assertion.parse("claim:sub1 claim2 claim:sub1"))).toStringyEqual(Assertion.parse("claim:sub1 claim2"));
            expect(checker.consolidate(Assertion.parse("!claim:sub1 claim2 !claim:sub1"))).toStringyEqual(Assertion.parse("!claim:sub1 claim2"));
        });

        test("simple token", () => {
            const model = permissions(p => p
                .token("claim")
                .token("another")
            );

            const checker = new PermissionsChecker({ model });

            expect(checker.consolidate(Authorization.parse("claim"))).toStringyEqual(Authorization.parse("claim"));
            expect(checker.consolidate(Authorization.parse("another"))).toStringyEqual(Authorization.parse("another"));

            // de-duplication
            expect(checker.consolidate(Authorization.parse("claim claim"))).toStringyEqual(Authorization.parse("claim"));
            expect(checker.consolidate(Authorization.parse("claim another"))).toStringyEqual(Authorization.parse("claim another"));
            expect(checker.consolidate(Authorization.parse("claim another claim"))).toStringyEqual(Authorization.parse("claim another"));
            expect(checker.consolidate(Authorization.parse("claim another another claim"))).toStringyEqual(Authorization.parse("claim another"));
        });


        test("simple token w/alias", () => {
            const model = permissions(p => p
                .token("claim", t => t
                    .alias("c")
                )
                .token("another")
            );

            const checker = new PermissionsChecker({ model });

            expect(checker.consolidate(Authorization.parse("claim"))).toStringyEqual(Authorization.parse("claim"));
            expect(checker.consolidate(Authorization.parse("another"))).toStringyEqual(Authorization.parse("another"));

            // de-aliasing
            expect(checker.consolidate(Authorization.parse("c"))).toStringyEqual(Authorization.parse("claim"));

            // de-duplication, de-aliasing
            expect(checker.consolidate(Authorization.parse("c c"))).toStringyEqual(Authorization.parse("claim"));
            expect(checker.consolidate(Authorization.parse("claim c"))).toStringyEqual(Authorization.parse("claim"));
            expect(checker.consolidate(Authorization.parse("c another"))).toStringyEqual(Authorization.parse("claim another"));
            expect(checker.consolidate(Authorization.parse("c another claim"))).toStringyEqual(Authorization.parse("claim another"));
            expect(checker.consolidate(Authorization.parse("c another another claim"))).toStringyEqual(Authorization.parse("claim another"));
        });


        test("multi-token", () => {
            const model = permissions(p => p
                .token("claim")
                .token("parent", t => t
                    .token("child1")
                    .token("child2")
                )
            );

            const checker = new PermissionsChecker({ model });

            expect(checker.consolidate(Authorization.parse("claim"))).toStringyEqual(Authorization.parse("claim"));
            expect(checker.consolidate(Authorization.parse("parent:child1"))).toStringyEqual(Authorization.parse("parent:child1"));
            expect(checker.consolidate(Authorization.parse("parent:child2"))).toStringyEqual(Authorization.parse("parent:child2"));
            expect(checker.consolidate(Authorization.parse("claim parent:child1"))).toStringyEqual(Authorization.parse("claim parent:child1"));
            expect(checker.consolidate(Authorization.parse("claim parent:child2"))).toStringyEqual(Authorization.parse("claim parent:child2"));
            expect(checker.consolidate(Authorization.parse("claim parent:child2 parent:child1"))).toStringyEqual(Authorization.parse("claim parent:child2 parent:child1"));
        });
    });

    describe("authorize", () => {
        test("empty do not pass", () => {
            const model = permissions(p => p
                .token("claim")
            );

            const checker = new PermissionsChecker({ model });

            expect(checker.can("", "claim")).toBe(false);
        });

        test("single token", () => {
            const model = permissions(p => p
                .token("claim")
            );

            const checker = new PermissionsChecker({ model });

            expect(checker.can("claim", "claim")).toBe(true);
        });

        test("single token w/alias", () => {
            const model = permissions(p => p
                .token("claim", t => t
                    .alias("c")
                )
            );

            const checker = new PermissionsChecker({ model });

            expect(checker.can("c", "claim")).toBe(true);
            expect(checker.can("c", "c")).toBe(true);
            expect(checker.can("claim", "c")).toBe(true);
        });

        test("single token w/include", () => {
            const model = permissions(p => p
                .token("base", t => t
                    .alias("b")
                )
                .token("top1", t => t
                    .includes("base")
                    .alias("t1")
                )
                .token("top2", t => t
                    .alias("t2")
                )
            );

            const checker = new PermissionsChecker({ model });

            expect(checker.can("top1", "base")).toBe(true);
            expect(checker.can("top1", "b")).toBe(true);
            expect(checker.can("t1", "base")).toBe(true);
            expect(checker.can("t1", "b")).toBe(true);

            expect(checker.can("top2", "base")).toBe(false);
            expect(checker.can("top2", "b")).toBe(false);
            expect(checker.can("t2", "base")).toBe(false);
            expect(checker.can("t2", "b")).toBe(false);

            expect(checker.can("base", "top1")).toBe(false);
            expect(checker.can("b", "t1")).toBe(false);
            expect(checker.can("base", "top2")).toBe(false);
            expect(checker.can("b", "t2")).toBe(false);
        });

        test("single token w/nested-include", () => {
            const model = permissions(p => p
                .token("base", t => t
                    .alias("b")
                )
                .token("middle", t => t
                    .includes("base")
                    .alias("m")
                )
                .token("top1", t => t
                    .includes("middle")
                    .alias("t1")
                )
                .token("top2", t => t
                    .includes("base")
                    .alias("t2")
                )
                .token("top3", t => t
                    .alias("t3")
                )
            );

            const checker = new PermissionsChecker({ model });

            expect(checker.can("top1", "middle")).toBe(true);
            expect(checker.can("top1", "m")).toBe(true);
            expect(checker.can("t1", "middle")).toBe(true);
            expect(checker.can("t1", "m")).toBe(true);

            expect(checker.can("top1", "base")).toBe(true);
            expect(checker.can("top1", "b")).toBe(true);
            expect(checker.can("t1", "base")).toBe(true);
            expect(checker.can("t1", "b")).toBe(true);

            expect(checker.can("top2", "base")).toBe(true);
            expect(checker.can("top2", "b")).toBe(true);
            expect(checker.can("t2", "base")).toBe(true);
            expect(checker.can("t2", "b")).toBe(true);

            expect(checker.can("top2", "middle")).toBe(false);
            expect(checker.can("top2", "m")).toBe(false);
            expect(checker.can("t2", "middle")).toBe(false);
            expect(checker.can("t2", "m")).toBe(false);

            expect(checker.can("top3", "base")).toBe(false);
            expect(checker.can("top3", "b")).toBe(false);
            expect(checker.can("t3", "base")).toBe(false);
            expect(checker.can("t3", "b")).toBe(false);

            expect(checker.can("top3", "middle")).toBe(false);
            expect(checker.can("top3", "m")).toBe(false);
            expect(checker.can("t3", "middle")).toBe(false);
            expect(checker.can("t3", "m")).toBe(false);

            expect(checker.can("base", "top1")).toBe(false);
            expect(checker.can("b", "t1")).toBe(false);
            expect(checker.can("base", "top2")).toBe(false);
            expect(checker.can("b", "t2")).toBe(false);
            expect(checker.can("base", "top3")).toBe(false);
            expect(checker.can("b", "t3")).toBe(false);
        });

        test("multi-token w/include", () => {
            const model = permissions(p => p
                .token("parent", t => t
                    .token("child1")
                    .token("child2", t => t
                        .includes("parent:child1")
                    )
                )
            );

            const checker = new PermissionsChecker({ model });

            expect(checker.can("parent:child1", "parent:child1")).toBe(true);
            expect(checker.can("parent:child2", "parent:child2")).toBe(true);
            expect(checker.can("parent:child2", "parent:child1")).toBe(true);
            expect(checker.can("parent:child1", "parent:child2")).toBe(false);
        });
    });
});
