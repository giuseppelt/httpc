import "reflect-metadata";
import { ValibotValidator } from "../../src/validation/valibot";
import { object } from "valibot";


describe("ValibotValidator", () => {
    const validator = new ValibotValidator();

    const anyArgs = [
        undefined,
        null,
        "",
        "test",
        0,
        1,
        {},
        new Date(),
        [],
    ];


    test("can validate valibot schema", () => {
        const schema = object({});

        anyArgs.forEach(obj => {
            expect(validator.canValidate(obj, schema)).toBe(true);
        });
    });

    test("can not validate others", () => {
        anyArgs.forEach(obj => {
            expect(validator.canValidate(obj, String)).toBe(false);
            expect(validator.canValidate(obj, Number)).toBe(false);
            expect(validator.canValidate(obj, Object)).toBe(false);
            expect(validator.canValidate(obj, Boolean)).toBe(false);
            expect(validator.canValidate(obj, Date)).toBe(false);
            expect(validator.canValidate(obj, Array)).toBe(false);

            expect(validator.canValidate(obj, () => { })).toBe(false);
            expect(validator.canValidate(obj, {})).toBe(false);

            expect(validator.canValidate(obj, class { })).toBe(false);
        });
    });
});
