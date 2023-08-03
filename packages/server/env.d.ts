
interface IHttpCContext {
    readonly requestId: string
    readonly request: Request
    readonly startedAt: number
    responseHeaders?: Record<string, string>;
}
