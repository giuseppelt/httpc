import "reflect-metadata";
import { container as globalContainer } from "tsyringe";
import { testContext } from "@httpc/server";
import { ValidationService, NativeTypeValidator, ApplicationTester, ContainerMiddleware, useInjected, Validate, ValidationError, NullLogger, OptionalSchema } from "../../src";


describe("ValidationService", () => {

    const logger = new NullLogger();

    test("can validate optional schemas", () => {
        const service = new ValidationService(logger, [new NativeTypeValidator()]);

        expect(service.validate(undefined, OptionalSchema(String))).toMatchObject({ success: true });
        expect(service.validate("value", OptionalSchema(String))).toMatchObject({ success: true, object: "value" });
        expect(service.validate(1, OptionalSchema(String))).toMatchObject({ success: false });
    });

    test("validation of 'undefined' value fails", () => {
        const service = new ValidationService(logger, [new NativeTypeValidator()]);

        expect(service.validate(undefined, String)).toMatchObject({ success: false });
        expect(service.validate(null, String)).toMatchObject({ success: false });
    });

    describe("in pipeline", () => {
        const container = globalContainer;
        container.register(ValidationService, {
            useFactory: () => {
                return new ValidationService(logger, [new NativeTypeValidator()])
            }
        });

        const app = new ApplicationTester({
            middlewares: [
                ContainerMiddleware("request"),
            ]
        });

        beforeAll(async () => {
            await app.initialize();
        });

        beforeEach(() => {
            testContext.clear()
        });


        const call = app.createCall(
            Validate(Number),
            async (arg: number) => arg
        );

        test("check unique validator", async () => {
            await app.runCall(() => {
                const validation = useInjected(ValidationService);
                expect(validation.validators.length).toBe(1);
                expect(validation.validators[0]).toBeInstanceOf(NativeTypeValidator);
            });
        });


        test("validation pass", async () => {
            for (const a of [0, 1, -2]) {
                await expect(call(a)).resolves.toBe(a);
            }
        });

        test("validation failed", async () => {
            for (const a of ["", null, undefined]) {
                await expect(call(a as any)).rejects.toBeInstanceOf(ValidationError);
            }
        });
    });
});

