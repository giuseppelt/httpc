import { HttpCServerError, useContext } from "@httpc/server";
import { container as globalContainer } from "tsyringe";
import type { ILogger } from "../logging";
import type { EventName, IEvent } from "./types";
import { Constructor, KEY, RESOLVE } from "../di";


export function handle(): MethodDecorator;
export function handle(event: Constructor<IEvent>): MethodDecorator;
export function handle(event: EventName): MethodDecorator;
export function handle(event?: string | Constructor<IEvent>): MethodDecorator {
    return (target, property) => {

        // if not specified pick it up from the metadata
        if (!event) {
            event = Reflect.getMetadata("design:paramtypes", target, property)?.[0];
        }


        let eventName: string;
        if (typeof event === "string") {
            eventName = event;
        } else if (typeof event === "function") {
            eventName = new event().$eventName;
            if (!eventName) {
                throw new Error("[handle] Invalid event specified: must be a concrete class implementing IEvent");
            }
        } else {
            throw new Error("[handle] Invalid event specified: must be a concrete class or a string");
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

                    execute(() => instance[property].call(instance, payload), instance);
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

function execute(func: () => any, service?: any) {
    setImmediate(async () => {
        try {
            await func();
        } catch (err) {
            getLogger(service)?.error(err);
        }
    });
}
