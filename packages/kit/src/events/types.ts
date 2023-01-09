import { IService } from "../services"

export interface IEvent {
    readonly $event_name: string
}

export type EventData<T extends IEvent> = Omit<T, "$event_name">


export interface IEventBus extends IService {
    addListener(event: string, handler: (payload: any) => void): () => void
    publish(event: IEvent): void
}
