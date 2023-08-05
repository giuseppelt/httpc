namespace HttpC {
    type LogLevel =
        | "debug"
        | "verbose"
        | "info"
        | "success"
        | "warn"
        | "error"
        | "critical"

    type Logger = (level: LogLevel, message: string, ...args: any[]) => void;
}


interface IHttpCContext {
    readonly requestId: string
    readonly request: Request
    readonly startedAt: number
    readonly logger?: HttpC.Logger
    responseHeaders?: Record<string, string>;
}
