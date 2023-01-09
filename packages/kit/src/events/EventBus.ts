import EventEmitter from "events";
import { singleton } from "tsyringe";
import type { IEvent, IEventBus } from "./types";
import type { ILogger } from "../logging";
import { logger } from "../logging";
import { alias, KEY } from "../di";
import { BaseService, ITransactionService } from "../services";


@singleton()
@alias(KEY("IEventBus"))
export class EventBus extends BaseService() implements IEventBus {
    protected _isHold = false;
    protected _holdEvents: IEvent[] = [];


    constructor(
        @logger() logger: ILogger,
    ) {
        //@ts-expect-error
        super(...arguments);
    }

    readonly events = new EventEmitter();

    inTransaction(data: ITransactionService) {
        const bus = new EventBus(
            this.logger,
        );

        bus.hold();
        data.on("afterTransaction", () => bus.flush());

        return bus as this;
    }

    addListener<T = object>(event: string, handler: (event: T) => void) {
        this.events.addListener(event, handler);
        return () => this.events.removeListener(event, handler);
    }

    publish(event: IEvent): void {
        this.logger.verbose("Emitted%s %s(%j)", this._isHold ? "(hold)" : "", event.$event_name, event);

        if (this._isHold) {
            this._holdEvents.push(event);
            return;
        }

        this.events.emit(event.$event_name, event);
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
