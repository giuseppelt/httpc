import { injectable } from "tsyringe";
import { options } from "../../di";
import { ILogger, ILogService, LogLevel } from "../types";
import { ConsoleLogger } from "./Logger";


export type ConsoleLogServiceOptions = {
    level?: LogLevel | ((label: string) => LogLevel)
}

@injectable()
export class ConsoleLogService implements ILogService {
    constructor(
        @options(undefined) protected readonly options?: ConsoleLogServiceOptions
    ) {

    }

    createLogger(label: string, properties?: { level?: string }): ILogger {
        let level = properties?.level;

        if (!level && this.options?.level) {
            if (typeof this.options.level === "string") {
                level = this.options.level;
            } else {
                level = this.options.level(label);
            }
        }

        if (!level) {
            level = process.env.NODE_ENV === "production" ? "info" : "debug";
        }

        return new ConsoleLogger(label, level);
    }
}
