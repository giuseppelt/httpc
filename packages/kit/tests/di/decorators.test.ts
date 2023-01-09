import "reflect-metadata";
import { container as globalContainer, injectable } from "tsyringe";
import { KEY, options, optionsOf } from "../../src/di";
import { random } from "../utils";


describe("di", () => {
    describe("options decorator", () => {
        type ServiceOptions = { param: string };


        let container = globalContainer.createChildContainer();

        beforeEach(() => {
            globalContainer.reset();
            container = globalContainer.createChildContainer();
        });

        test("injection", () => {
            const param = random.string();

            @injectable()
            class Service {
                constructor(
                    @options() public readonly options: ServiceOptions
                ) { }
            }

            container.registerInstance<ServiceOptions>(KEY("OPTIONS", Service), { param });


            const instance = container.resolve(Service);
            expect(instance.options).toBeDefined();
            expect(instance.options.param).toBe(param);
        });

        test("injection w/fallback", () => {
            const param = random.string();

            @injectable()
            class Service {
                constructor(
                    @options({ param: "failed" }) public readonly options: ServiceOptions
                ) { }
            }

            container.registerInstance<ServiceOptions>(KEY("OPTIONS", Service), { param });


            const instance = container.resolve(Service);
            expect(instance.options).toBeDefined();
            expect(instance.options.param).toBe(param);
        });

        test("injection w/fallback undefined", () => {
            const param = random.string();

            @injectable()
            class Service {
                constructor(
                    @options(undefined) public readonly options: ServiceOptions
                ) { }
            }

            container.registerInstance<ServiceOptions>(KEY("OPTIONS", Service), { param });


            const instance = container.resolve(Service);
            expect(instance.options).toBeDefined();
            expect(instance.options.param).toBe(param);
        });

        test("injection optional", () => {

            @injectable()
            class Service {
                constructor(
                    @options(undefined) public readonly options?: ServiceOptions
                ) { }
            }

            const instance = container.resolve(Service);
            expect(instance.options).toBeUndefined();
        });

        test("injection optional w/default", () => {
            const param = random.string();

            @injectable()
            class Service {
                constructor(
                    @options({ param }) public readonly options?: ServiceOptions
                ) { }
            }

            const instance = container.resolve(Service);
            expect(instance.options).toBeDefined();
            expect(instance.options!.param).toBe(param);
        });

        test("injection optional w/fallback", () => {
            const param = random.string();

            @injectable()
            class Service {
                constructor(
                    @options({ param: "failed" }) public readonly options?: ServiceOptions
                ) { }
            }

            container.registerInstance<ServiceOptions>(KEY("OPTIONS", Service), { param });

            const instance = container.resolve(Service);
            expect(instance.options).toBeDefined();
            expect(instance.options!.param).toBe(param);
        });

        test("injection optional w/fallback undefined", () => {
            const param = random.string();

            @injectable()
            class Service {
                constructor(
                    @options(undefined) public readonly options?: ServiceOptions
                ) { }
            }

            container.registerInstance<ServiceOptions>(KEY("OPTIONS", Service), { param });

            const instance = container.resolve(Service);
            expect(instance.options).toBeDefined();
            expect(instance.options!.param).toBe(param);
        });

        test("injection via optionsOf", () => {
            const param = random.string();

            @injectable()
            class Service {
                constructor(
                    @options() public readonly options: ServiceOptions
                ) { }
            }

            @optionsOf(Service)
            class Options implements ServiceOptions {
                param = param;
            }

            const instance = container.resolve(Service);
            expect(instance.options).toBeDefined();
            expect(instance.options.param).toBe(param);
        });


        test("injection via optionsOf w/fallback", () => {
            const param = random.string();

            @injectable()
            class Service {
                constructor(
                    @options({ param: "failed" }) public readonly options: ServiceOptions
                ) { }
            }

            @optionsOf(Service)
            class Options implements ServiceOptions {
                param = param;
            }

            const instance = container.resolve(Service);
            expect(instance.options).toBeDefined();
            expect(instance.options.param).toBe(param);
        });

        test("injection via optionsOf w/fallback undefined", () => {
            const param = random.string();

            @injectable()
            class Service {
                constructor(
                    @options(undefined) public readonly options: ServiceOptions
                ) { }
            }

            @optionsOf(Service)
            class Options implements ServiceOptions {
                param = param;
            }

            const instance = container.resolve(Service);
            expect(instance.options).toBeDefined();
            expect(instance.options.param).toBe(param);
        });
    });
});
