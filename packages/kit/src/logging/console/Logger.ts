import { LogLevel, ILogger } from "../types";



export class ConsoleLogger implements ILogger {
    constructor(
        protected label: string,
        protected level = "info",
    ) {

    }

    error(message: string | Error, ...args: any[]) {
        if (typeof message === "string") {
            this.log("error", message, ...args);
        } else {
            console.error(message);
        }
    }

    info(message: string, ...args: any[]) {
        this.log("info", message, ...args);
    }

    warn(message: string, ...args: any[]) {
        this.log("warn", message, ...args);
    }

    debug(message: string, ...args: any[]) {
        this.log("debug", message, ...args);
    }

    verbose(message: string, ...args: any[]) {
        this.log("verbose", message, ...args);
    }


    log(level: string, message: string, ...args: any[]) {
        if (!this.isLevelEnabled(level as any)) return;

        let call: Function;
        switch (level) {
            case "warn": call = console.warn; break;
            case "error": call = console.error; break;
            case "debug": call = console.debug; break;
            case "info":
            case "verbose":
            default: call = console.info; break;
        }

        call.call(console, this.formatMessage(level, message), ...args);
    }

    isLevelEnabled(level: LogLevel): boolean {
        return isLevelEnabled(this.level as any, level);
    }

    protected formatMessage(level: string, message: string): string {
        return `${level} [${this.label}] ${message}`;
    }
}


const LOG_LEVELS: LogLevel[] = [
    "debug",
    "verbose",
    "info",
    "warn",
    "error"
];

function isLevelEnabled(currentLevel: LogLevel, asked: LogLevel): boolean {
    return LOG_LEVELS.indexOf(asked) >= LOG_LEVELS.indexOf(currentLevel);
}
