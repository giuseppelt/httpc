import "reflect-metadata";
import { NativeTypeValidator } from "../../src/validation";


describe("NativeTypeValidator", () => {
    const validator = new NativeTypeValidator();

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

    test("can validate native types", () => {
        anyArgs.forEach(obj => {
            expect(validator.canValidate(obj, String)).toBe(true);
            expect(validator.canValidate(obj, Number)).toBe(true);
            expect(validator.canValidate(obj, Object)).toBe(true);
            expect(validator.canValidate(obj, Boolean)).toBe(true);
            expect(validator.canValidate(obj, Date)).toBe(true);
            expect(validator.canValidate(obj, Array)).toBe(true);
        });
    });

    test("cannot validate others", () => {
        // cannot validate
        // - classes
        // - functions
        // - objects
        anyArgs.forEach(obj => {
            expect(validator.canValidate(obj, class Schema { })).toBe(false);
            expect(validator.canValidate(obj, () => { })).toBe(false);
            expect(validator.canValidate(obj, {})).toBe(false);
        });
    });


    test("validate native values w/o parsing", () => {
        const items = [
            [String, "test", ""],
            [Number, 0, 1, -10],
            [Boolean, true, false],
            [Date, new Date()],
            [Object, {}],
            [Array, [], [12], [,]],
        ];

        const validator = new NativeTypeValidator({
            disableParsing: true
        });

        for (const [schema] of items) {
            for (const [otherSchema, ...values] of items) {
                for (const value of values) {
                    if (schema === otherSchema) {
                        expect(validator.validate(value, schema)).toMatchObject({ success: true, object: value });
                    } else {
                        expect(validator.validate(value, schema)).toMatchObject({ success: false });
                    }
                }
            }
        }
    });

    test("validate native values w/parsing", () => {
        const items = [
            [Number, ["0", 0], ["-1", -1], ["2", 2]],
            [Boolean, ["true", true], ["false", false]],
            [Date, ["2017-05-24T10:22:00Z", new Date("2017-05-24T10:22:00Z")]],
        ];

        const validator = new NativeTypeValidator({
            disableParsing: false
        });

        for (const [schema, ...values] of items) {
            for (const [value, target] of values as [any, any]) {
                expect(validator.validate(value, schema)).toMatchObject({ success: true, object: target });
            }
        }
    });

    test("reject native parsable-values w/o parsing", () => {
        const items = [
            [Number, "", "0", "-1"],
            [Boolean, "true", "false"],
            [Date, "2017-05-24T10:22:00Z"],
        ];

        const validator = new NativeTypeValidator({
            disableParsing: true
        });

        for (const [schema, ...values] of items) {
            for (const value of values) {
                expect(validator.validate(value, schema)).toMatchObject({ success: false });
            }
        }
    });

    test("reject native non-parsable values w/parsing", () => {
        const items = [
            [Number, "", "hello", true, {}],
            [Boolean, "", "test", {}, [], 0, 1],
            [Date, "Z2017", "hello", {}, 0, 1],
        ];

        const validator = new NativeTypeValidator({
            disableParsing: false
        });

        for (const [schema, ...values] of items) {
            for (const value of values) {
                expect(validator.validate(value, schema)).toMatchObject({ success: false });
            }
        }
    });
});
