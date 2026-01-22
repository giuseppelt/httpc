import { singleton } from "tsyringe";
import winston, { format, transport } from "winston";
import { alias, KEY, options } from "../../di";
import { ILogger, ILogService, LogLevel } from "../types";
import { WinstonLogger } from "./WinstonLogger";


type WinstonProperties = {
    [key: string]: any
}

type FactoryOption<T> = T | ((properties?: WinstonProperties) => T)

export type WinstonLogServiceOptions = {
    level?: LogLevel
    properties?: FactoryOption<WinstonProperties>
    transports?: FactoryOption<transport | transport[]>
}

@singleton()
@alias(KEY("ILogService"))
export class WinstonLogService implements ILogService {
    protected readonly _rootLogger: winston.Logger;

    constructor(
        @options(undefined) protected options?: WinstonLogServiceOptions
    ) {
        this._rootLogger = this._createRoot(options);
    }

    createLogger(label: string, properties?: WinstonProperties): ILogger {
        const commonProperties = typeof this.options?.properties === "function"
            ? this.options!.properties!()
            : this.options?.properties;


        return new WinstonLogger(this._rootLogger.child({
            label,
            ...commonProperties,
            ...properties
        }));
    }

    protected _createRoot(options?: WinstonLogServiceOptions): winston.Logger {
        let {
            level,
            properties,
            transports,
        } = options || {};

        if (!level) {
            level = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "silly") as any;
        }

        if (typeof transports === "function") {
            transports = transports(options?.properties);
        }

        if (!transports) {
            transports = new winston.transports.Console({
                format: format.combine(
                    process.env.NODE_ENV === "production" ? format.combine() /* noop in production */ : format.colorize(),
                    this._createConsoleFormat(properties),
                )
            })
        }

        return winston.createLogger({
            defaultMeta: properties,
            level,
            transports
        });
    }

    protected _createConsoleFormat(properties?: FactoryOption<WinstonProperties>) {
        return format.combine(
            format.timestamp(),
            format.splat(),
            format.printf(info => {
                const { level, timestamp, label, message, ...meta } = info;

                if (properties) {
                    Object.assign(meta, typeof properties === "function" ? properties() : properties, meta);
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
