import { ExpandedKeys } from "../env";
import { IService } from "../services";
import { Plain } from "../types";


export interface IEvent {
    readonly $eventName: string
}

export type EventData<T extends IEvent> = Omit<T, "$eventName">

export type EventName = ExpandedKeys<EventTypes>
export type EventType<K extends EventName> = EventTypes extends { [k in K]: object }
    ? Plain<Readonly<{ $eventName: K } & EventTypes[K]>>
    : IEvent


export interface IEventBus extends IService {
    addListener<E extends EventName>(event: E, handler: (payload: EventType<E>) => void): () => void
    publish(event: IEvent): void
}
