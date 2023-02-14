import { EventData, EventName, EventType } from "./types";


export function createEvent<E extends EventName>(event: E, data: EventData<EventType<E>>): EventType<E> {
    return { $eventName: event, ...data } as any;
}
