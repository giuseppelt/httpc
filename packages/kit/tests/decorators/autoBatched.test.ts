import "reflect-metadata";
import { container as globalContainer, injectable } from "tsyringe";
import { KEY, BaseService, ILogger, logger, NullLoggerService, autoBatched } from "../../src";
import { promises } from "../utils";

describe("decorators", () => {

    describe("autoBatched", () => {

        @injectable()
        class Service extends BaseService() {

            constructor(
                @logger() logger: ILogger,
            ) {
                //@ts-ignore
                super(...arguments);
            }

            @autoBatched<Service>({
                batch(input) { return this.doubleBatch(input) },
                delay: 100,
            })
            async double(input: number) {
                return this.doubleSingle(input);
            }

            async doubleSingle(input: number) {
                await promises.delay(10);
                return input * 2;
            }

            async doubleBatch(input: number[]) {
                await promises.delay(10);
                return new Map(input.map(x => [x, x * 2]));
            }
        }

        let container = globalContainer.createChildContainer();

        beforeEach(() => {
            globalContainer.reset();
            globalContainer.register(KEY("ILogService"), NullLoggerService);
            container = globalContainer.createChildContainer();
        });


        test("single run", async () => {
            const service = container.resolve(Service);
            const doubleSingle = jest.spyOn(service, "doubleSingle");
            const doubleBatch = jest.spyOn(service, "doubleBatch");

            const result = await service.double(2);
            expect(result).toBe(4);
            expect(doubleSingle).toBeCalledTimes(1);
            expect(doubleSingle).toBeCalledWith(2);
            expect(doubleBatch).toBeCalledTimes(0);
        });

        test("single run w/multiple because out of window", async () => {
            const service = container.resolve(Service);
            const doubleSingle = jest.spyOn(service, "doubleSingle");
            const doubleBatch = jest.spyOn(service, "doubleBatch");

            const results = await Promise.all([
                (async () => {
                    return await service.double(2);
                })(),
                (async () => {
                    await promises.delay(300); // more than the window
                    return await service.double(3);
                })(),
            ]);

            expect(results).toEqual([4, 6]);
            expect(doubleSingle).toBeCalledTimes(2);
            expect(doubleBatch).toBeCalledTimes(0);
        });

        test("batch run", async () => {
            const service = container.resolve(Service);
            const doubleSingle = jest.spyOn(service, "doubleSingle");
            const doubleBatch = jest.spyOn(service, "doubleBatch");

            const results = await Promise.all([1, 2, 3, 4].map(x => service.double(x)));
            expect(results).toEqual([2, 4, 6, 8]);
            expect(doubleSingle).toBeCalledTimes(0);
            expect(doubleBatch).toBeCalledTimes(1);
            expect(doubleBatch).toBeCalledWith([1, 2, 3, 4]);
        });

        test("batch run w/multiple in window", async () => {
            const service = container.resolve(Service);
            const doubleSingle = jest.spyOn(service, "doubleSingle");
            const doubleBatch = jest.spyOn(service, "doubleBatch");

            const results = await Promise.all([
                (async () => {
                    return await service.double(2);
                })(),
                (async () => {
                    await promises.delay(20); // within the window
                    return await service.double(3);
                })(),
                (async () => {
                    await promises.delay(40); // within the window
                    return await service.double(4);
                })(),
            ]);

            expect(results).toEqual([4, 6, 8]);
            expect(doubleSingle).toBeCalledTimes(0);
            expect(doubleBatch).toBeCalledTimes(1);
            expect(doubleBatch).toBeCalledWith([2, 3, 4]);
        });

        test("sequence (single, batch, single)", async () => {
            const service = container.resolve(Service);
            const doubleSingle = jest.spyOn(service, "doubleSingle");
            const doubleBatch = jest.spyOn(service, "doubleBatch");

            const results = await Promise.all([
                (async () => {
                    return await service.double(2);
                })(),
                (async () => {
                    await promises.delay(300); // more than the window
                    return await service.double(3);
                })(),
                (async () => {
                    await promises.delay(320); // within the window
                    return await service.double(4);
                })(),
                (async () => {
                    await promises.delay(340); // within the window
                    return await service.double(5);
                })(),
                (async () => {
                    await promises.delay(600); // more than the window
                    return await service.double(6);
                })(),
            ]);

            expect(results).toEqual([4, 6, 8, 10, 12]);
            expect(doubleSingle).toBeCalledTimes(2);
            expect(doubleSingle).toBeCalledWith(2);
            expect(doubleSingle).toBeCalledWith(6);
            expect(doubleBatch).toBeCalledTimes(1);
            expect(doubleBatch).toBeCalledWith([3, 4, 5]);
        });

        test("sequence (batch, batch, single)", async () => {
            const service = container.resolve(Service);
            const doubleSingle = jest.spyOn(service, "doubleSingle");
            const doubleBatch = jest.spyOn(service, "doubleBatch");

            const results = await Promise.all([
                (async () => {
                    return await service.double(2);
                })(),
                (async () => {
                    await promises.delay(20); // within the window
                    return await service.double(3);
                })(),
                (async () => {
                    await promises.delay(300); // more than the window
                    return await service.double(4);
                })(),
                (async () => {
                    await promises.delay(320); // within the window
                    return await service.double(5);
                })(),
                (async () => {
                    await promises.delay(340); // within the window
                    return await service.double(6);
                })(),
                (async () => {
                    await promises.delay(600); // more than the window
                    return await service.double(7);
                })(),
            ]);

            expect(results).toEqual([4, 6, 8, 10, 12, 14]);
            expect(doubleSingle).toBeCalledTimes(1);
            expect(doubleSingle).toBeCalledWith(7);
            expect(doubleBatch).toBeCalledTimes(2);
            expect(doubleBatch).toBeCalledWith([2, 3]);
            expect(doubleBatch).toBeCalledWith([4, 5, 6]);
        });

        test("duplicate input -> single", async () => {
            const service = container.resolve(Service);
            const doubleSingle = jest.spyOn(service, "doubleSingle");
            const doubleBatch = jest.spyOn(service, "doubleBatch");

            const results = await Promise.all([2, 2, 2].map(x => service.double(x)));
            expect(results).toEqual([4, 4, 4]);
            expect(doubleSingle).toBeCalledTimes(1);
            expect(doubleSingle).toBeCalledWith(2);
            expect(doubleBatch).toBeCalledTimes(0);
        });

        test("duplicate input -> batch", async () => {
            const service = container.resolve(Service);
            const doubleSingle = jest.spyOn(service, "doubleSingle");
            const doubleBatch = jest.spyOn(service, "doubleBatch");

            const results = await Promise.all([2, 3, 2].map(x => service.double(x)));
            expect(results).toEqual([4, 6, 4]);
            expect(doubleSingle).toBeCalledTimes(0);
            expect(doubleBatch).toBeCalledTimes(1);
            expect(doubleBatch).toBeCalledWith([2, 3]);
        });
    });

});
