import { performance } from "perf_hooks";
import { HttpCall, HttpCServerMiddleware, useContext } from "@httpc/server";
import { useLogger } from "./context";
import { ILogger } from "./types";


export type RequestLoggerParts = {
    logBegin?: boolean
    logRequestId?: boolean
    logParameters?: boolean
    logResult?: boolean
}

export type RequestLoggerMiddlewareOptions = RequestLoggerParts & Readonly<{
}>

const PRESET: Record<string, RequestLoggerParts> = {
    defaults: {
        logBegin: true,
        logParameters: false,
        logRequestId: false,
        logResult: false,
    },
    development: {
        logBegin: true,
        logParameters: true,
        logRequestId: false,
        logResult: false,
    },
    production: {
        logBegin: false,
        logParameters: false,
        logRequestId: false,
        logResult: false,
    }
};

export function RequestLoggerMiddleware(options?: RequestLoggerMiddlewareOptions): HttpCServerMiddleware {
    const preset = PRESET[process.env.NODE_ENV || ""] || PRESET.defaults;

    const {
        logBegin,
        logParameters,
        logRequestId,
        logResult,
    } = { ...preset, ...options };


    function writeBegin(logger: ILogger, requestId: string, call: HttpCall) {
        requestId = logRequestId ? `(${requestId})` : "";

        logger.verbose("Request%s:begin > /%s", requestId, call.path);
        if (logParameters) {
            logger.debug("Request%s:params > /%s %o", requestId, call.path, call.params);
        }
    }

    function writeEnd(logger: ILogger, requestId: string, call: HttpCall, begin: number, result: any) {
        requestId = logRequestId ? `(${requestId})` : "";
        const duration = (performance.now() - begin).toFixed(0);
        const level = result && result instanceof Error ? "error" : "info";

        if (level === "info") {
            logger.info("Request%s:end > /%s(%dms)", requestId, call.path, duration);
            if (logResult) {
                logger.debug(level, "Request%s:result > /%s(%dms) %o", requestId, call.path, duration, result);
            }
        } else if (level === "error") {
            logger.error("Request%s:end > /%s(%dms) %o", requestId, call.path, duration, result);
        }
    }

    return async (call, next) => {
        const { requestId } = useContext();
        const logger = useLogger();

        const timestamp = performance.now();

        if (logBegin) {
            writeBegin(logger, requestId, call);
        }

        return await next(call).then(
            result => {
                writeEnd(logger, requestId, call, timestamp, result);
                return result;
            },
            error => {
                writeEnd(logger, requestId, call, timestamp, error);
                throw error;
            }
        );
    }
}

