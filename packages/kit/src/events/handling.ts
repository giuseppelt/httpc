import { HttpCServerError, useContext } from "@httpc/server";
import { container as globalContainer } from "tsyringe";
import type { ILogger } from "../logging";
import type { IEvent } from "./types";
import { Constructor, KEY, RESOLVE } from "../di";


export function handle(): MethodDecorator;
export function handle(event: Constructor<IEvent>): MethodDecorator;
export function handle(event?: Constructor<IEvent>): MethodDecorator {
    return (target, property) => {
        if (!event) {
            event = Reflect.getMetadata("design:paramtypes", target, property)?.[0];
        }

        const eventName = event && new event().$event_name;
        if (!eventName) {
            throw new Error("Invalid EventConstructor");
        }


        globalContainer.registerInstance(KEY("IInitialize"), {
            initialize() {
                const bus = RESOLVE(globalContainer, "IEventBus");
                bus.addListener(eventName, (payload: any) => {
                    let instance: any;
                    try {
                        instance = resolveInContext(target.constructor as any);
                    } catch (err) {
                        getLogger(instance)?.error(err);
                        return;
                    }

                    execute(() => instance[property].call(instance, payload));
                });

                getLogger()?.verbose("Registered %s(%s.%s)", eventName, target.constructor.name, property);
            }
        });
    }
}


let logger: ILogger;
function getLogger(service?: any): ILogger | undefined {
    if (service && service.logger && typeof service.logger.log === "function") {
        return service.logger;
    }

    if (!logger) {
        try {
            logger = RESOLVE(globalContainer, "ILogService").createLogger("Handlers");
        } catch { }
    }
    return logger;
}


function resolveInContext(target: Constructor) {
    const container = useContext("optional")?.container || globalContainer;
    if (!container) {
        throw new HttpCServerError("invalidState", "Missing container");
    }

    return container.resolve(target);
}

function execute(func: () => any) {
    async function wrap() {
        try {
            await func();
        } catch (err) {
            getLogger()?.error(err);
        }
    }

    return setImmediate(wrap);
}
