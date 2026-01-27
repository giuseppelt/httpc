import "reflect-metadata";
import { ArraySchema, PredicateValidator, ValidationResult } from "../../src/validation";


describe("PredicateValidator", () => {
    const validator = new PredicateValidator();

    const anyArgs = [
        undefined,
        null,
        "",
        "test",
        0,
        1,
        {},
        new Date(),
        []
    ]

    test("can validate any type with function as schema", () => {
        anyArgs.forEach(obj => {
            expect(validator.canValidate(obj, () => { })).toBe(true);
        });
    });

    test("cannot validate with no function as schema", () => {
        anyArgs.forEach(obj => {
            expect(validator.canValidate(obj, class Schema { })).toBe(false);
            expect(validator.canValidate(obj, {})).toBe(false);
        });
    });

    test("validate with predicate function", () => {
        const schema = (x: any) => typeof x === "number" && x > 0;
        expect(validator.validate(10, schema)).toMatchObject({ success: true, object: 10 });
        expect(validator.validate(-5, schema)).toMatchObject({ success: false });
        expect(validator.validate("test", schema)).toMatchObject({ success: false });
    });

    test("validate with predicate function returning ValidationResult", () => {
        const schema = (x: any): ValidationResult => {
            if (typeof x === "number" && x > 0) {
                return { success: true, object: x };
            } else {
                return { success: false, errors: ["Not a positive number"] };
            }
        };

        expect(validator.validate(15, schema)).toMatchObject({ success: true, object: 15 });
        expect(validator.validate(-3, schema)).toMatchObject({ success: false, errors: ["Not a positive number"] });
        expect(validator.validate("hello", schema)).toMatchObject({ success: false, errors: ["Not a positive number"] });
    });
});
