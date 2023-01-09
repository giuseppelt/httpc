import { IncomingMessage } from "http";

global {
    interface IHttpCContext {
        readonly requestId: string
        readonly request: IncomingMessage
        readonly startedAt: number
    }
}
