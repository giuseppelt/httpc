
export type LoggerOptions = {
    level?: LogLevel
    ansi?: boolean
}

export type LogLevel =
    | "debug"
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
    debug: 5,
    info: 4,
    success: 3,
    warn: 2,
    error: 1,
    critical: 0,
};

export function createLogger(options?: LoggerOptions): Logger {
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
        } else if (level === "debug") {
            console.log(`${gray("DEBUG")} ${gray(message)}`, ...args);
        } else {
            console.log(`${red("INFO")} ${message}`, ...args);
        }
    }
}
