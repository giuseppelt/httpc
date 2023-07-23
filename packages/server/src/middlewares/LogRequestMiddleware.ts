import type { HttpCServerMiddleware } from "../processor";
import { useContext } from "../context";
import { createConsoleColors, createLogger, Logger, LogLevel } from "../logger";

type LogRequestMiddlewareOptions = {
    ansi?: boolean
    level?: LogLevel
    logger?: Logger
}

export function LogRequestMiddleware(options?: LogRequestMiddlewareOptions): HttpCServerMiddleware {

    const {
        ansi = true,
        logger = createLogger(options),
    } = options || {}

    const {
        gray,
    } = createConsoleColors(ansi);


    return async (call, next) => {
        const result = await next(call);

        const elapsed = Date.now() - useContext().startedAt;
        if (result && result instanceof Error) {
            logger("error", `${gray(call.access)}\t${call.path} ${gray(`(${elapsed}ms)`)}`);
        } else {
            logger("success", `${gray(call.access)}\t${call.path} ${gray(`(${elapsed}ms)`)}`);
        }

        return result;
    };
}
