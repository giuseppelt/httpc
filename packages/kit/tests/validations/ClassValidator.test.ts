import "reflect-metadata";
import { ClassValidator } from "../../src/validation/class";


describe("ClassValidator", () => {
    const validator = new ClassValidator();

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


    test("can validate Class schemas", () => {
        class Schema { }

        anyArgs.forEach(obj => {
            expect(validator.canValidate(obj, Schema)).toBe(true);
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
        });
    });
});
