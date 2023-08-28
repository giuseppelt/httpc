import { useContext } from "./context";


export type LogOptions = {
    level?: LogLevel
    ansi?: boolean
}

export type LogLevel =
    | "debug"
    | "verbose"
    | "info"
    | "success"
    | "warn"
    | "error"
    | "critical"

export type Logger = (level: LogLevel, message: string, ...args: any[]) => void;


export function createConsoleColors(ansi = true) {
    const escape = (start: number, end: number, text: string) => `\x1b[${start}m${text}\x1b[${end}m`;
    const identity = (x: string) => x;

    return {
        gray: ansi ? escape.bind(null, 90, 39) : identity,
        red: ansi ? escape.bind(null, 31, 39) : identity,
        green: ansi ? escape.bind(null, 32, 39) : identity,
        yellow: ansi ? escape.bind(null, 33, 39) : identity,
    };
}

const LogLevel: Record<LogLevel, number> = {
    debug: 6,
    verbose: 5,
    info: 4,
    success: 3,
    warn: 2,
    error: 1,
    critical: 0,
};

export function createLogger(options?: LogOptions): Logger {
    const {
        ansi = true,
        level: levelEnabled = "info",
    } = options || {}

    const {
        gray,
        green,
        red,
        yellow,
    } = createConsoleColors(ansi);


    return (level, message, ...args) => {

        // check if level is enabled
        if (LogLevel[level] > LogLevel[levelEnabled]) {
            return;
        }

        if (level === "error") {
            console.log(`${red("ERROR")} ${message}`, ...args);
        } else if (level === "critical") {
            console.log(`${red("CRITICAL")} ${message}`, ...args);
        } else if (level === "warn") {
            console.log(`${yellow("WARN")} ${message}`, ...args);
        } else if (level === "success") {
            console.log(`${green("SUCCESS")} ${message}`, ...args);
        } else if (level === "verbose") {
            console.log(`${gray("VERBOSE")} ${gray(message)}`, ...args);
        } else if (level === "debug") {
            console.log(`${gray("DEBUG")} ${gray(message)}`, ...args);
        } else {
            console.log(`${red("INFO")} ${message}`, ...args);
        }
    }
}


export function useLogger(): Logger | undefined {
    return useContext().logger as Logger; // force to avoid circular dependency from IHttpContext definition
}

export function useLog(level: LogLevel, message: string, ...args: any) {
    return (useContext().logger as Logger)?.(level, message, ...args);
}
