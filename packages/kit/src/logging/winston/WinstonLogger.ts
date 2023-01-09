import { Logger as ProviderLogger } from "winston";
import { LogLevel, ILogger } from "../types";


export class WinstonLogger implements ILogger {
    constructor(
        private readonly logger: ProviderLogger
    ) {
    }

    error(message: string | Error, ...args: any[]) {
        if (typeof message === "string") {
            this.log("error", message, ...args);
        } else {
            this.logger.error(message.stack || message.message);
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
        this.logger.log(level, message, ...args);
    }

    isLevelEnabled(level: LogLevel): boolean {
        return this.logger.isLevelEnabled(level);
    }
}
