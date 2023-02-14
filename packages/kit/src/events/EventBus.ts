import EventEmitter from "events";
import { singleton } from "tsyringe";
import type { EventData, EventName, EventType, IEvent, IEventBus } from "./types";
import type { ILogger } from "../logging";
import { logger } from "../logging";
import { alias, KEY, noInject } from "../di";
import { BaseService, ITransactionService } from "../services";
import { createEvent } from "./factory";


@singleton()
@alias(KEY("IEventBus"))
export class EventBus extends BaseService() implements IEventBus {
    protected _isHold = false;
    protected _holdEvents: IEvent[] = [];


    constructor(
        @logger() logger: ILogger,
        @noInject() protected readonly emitter: EventEmitter = new EventEmitter(),
    ) {
        //@ts-expect-error
        super(...arguments);
    }


    inTransaction(data: ITransactionService) {
        const bus = new EventBus(
            this.logger,
            this.emitter,
        );

        bus.hold();
        data.on("afterTransaction", () => bus.flush());

        return bus as this;
    }

    createEvent<E extends EventName>(event: E, data: EventData<EventType<E>>): EventType<E> {
        return createEvent(event, data);
    }

    addListener<E extends EventName>(event: E, handler: (event: EventType<E>) => void) {
        this.emitter.addListener(event, handler);
        return () => this.emitter.removeListener(event, handler);
    }

    publish(event: IEvent): void;
    publish<E extends EventName>(event: E, data: EventData<EventType<E>>): void;
    publish(event: string | IEvent, data?: object): void {
        if (typeof event === "string") {
            event = this.createEvent(event, data || {});
        }

        this.logger.verbose("Emitted%s %s(%j)", this._isHold ? "(hold)" : "", event.$eventName, event);

        if (this._isHold) {
            this._holdEvents.push(event);
            return;
        }

        this.emitter.emit(event.$eventName, event);
    }

    hold(): void {
        this._isHold = true;
    }

    flush(): void {
        this._isHold = false;

        const events = this._holdEvents.splice(0, this._holdEvents.length);
        for (const event of events) {
            this.publish(event);
        }
    }
}
