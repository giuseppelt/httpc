import { singleton } from "tsyringe";
import winston, { format, transport } from "winston";
import { alias, KEY, options } from "../../di";
import { ILogger, ILogService, LogLevel } from "../types";
import { WinstonLogger } from "./WinstonLogger";


type WinstonProperties = {
    level?: LogLevel
    [key: string]: any
}

type FactoryOption<T> = T | ((label: string, properties?: WinstonProperties) => T)

export type WinstonLogServiceOptions = {
    level?: FactoryOption<LogLevel>
    properties?: FactoryOption<WinstonProperties>
    transports?: FactoryOption<transport | transport[]>
}

@singleton()
@alias(KEY("ILogService"))
export class WinstonLogService implements ILogService {
    constructor(
        @options(undefined) protected options?: WinstonLogServiceOptions
    ) {
    }

    createLogger(label: string, properties?: WinstonProperties): ILogger {
        let lazyProperties: ((level: string, properties?: WinstonProperties) => any) | undefined;

        if (this.options?.properties) {
            if (typeof this.options.properties === "function") {
                lazyProperties = this.options.properties as any;
                properties = { ...lazyProperties!(label, properties), ...properties };
            } else {
                properties = { ...this.options.properties, ...properties };
            }
        }

        let { level } = properties || {};
        if (!level && this.options?.level) {
            if (typeof this.options.level === "string") {
                level = this.options.level;
            } else {
                level = this.options.level(label, properties);
            }
        }

        if (!level) {
            level = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "silly") as any;
        }

        let transports = typeof this.options?.transports === "function"
            ? this.options.transports(label, properties)
            : this.options?.transports;

        if (!transports) {
            transports = new winston.transports.Console({
                format: format.combine(
                    // this._createContext(),
                    process.env.NODE_ENV === "production" ? format.combine() /* noop in production */ : format.colorize(),
                    this._createConsoleFormat(label, lazyProperties),
                )
            })
        }

        const logger = winston.createLogger({
            defaultMeta: properties,
            level,
            transports
        });

        return new WinstonLogger(logger);
    }


    // protected _createContext() {
    //     return format((info, opts) => Object.assign(info, opts))({
    //         environment: process.env.NODE_ENV || "development"
    //     });
    // }

    protected _createConsoleFormat(label: string, properties?: (label: string) => any) {
        return format.combine(
            format.timestamp(),
            format.label({ label }),
            format.splat(),
            format.printf(info => {
                const { level, timestamp, label, message, ...meta } = info;

                if (properties) {
                    Object.assign(meta, properties(label), meta);
                }

                let extra = JSON.stringify(meta);
                if (extra === "{}") {
                    extra = '';
                } else {
                    extra = " " + extra;
                }

                return `${info.level}\t${info.timestamp}\t[${info.label}]\t${info.message}${extra}`;
            })
        );
    }
}
