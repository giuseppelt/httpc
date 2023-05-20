import { IncomingMessage } from "http";

declare global {
    interface IHttpCContext {
        readonly requestId: string
        readonly request: IncomingMessage
        readonly startedAt: number
    }
}
