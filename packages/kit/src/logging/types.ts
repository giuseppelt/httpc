
export type LogLevel =
    | "error"
    | "warn"
    | "info"
    | "verbose"
    | "debug"

export interface ILogger {
    error(message: string | Error, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    verbose(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    log(level: string, message: string, ...args: any[]): void;
    isLevelEnabled(level: string): boolean;
}

export interface ILogService {
    createLogger(label: string, properties?: Record<string, any>): ILogger;
}
