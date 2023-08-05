import { useContext } from "../context";
import { createConsoleColors, useLog, LogOptions } from "../logger";
import { HttpCServerMiddleware } from "../requests";


export type LogCallMiddlewareOptions = true | LogOptions

export function LogCallMiddleware(options?: LogCallMiddlewareOptions): HttpCServerMiddleware {

    const {
        ansi = true,
    } = (options === true ? undefined : options) || {}

    const {
        gray,
    } = createConsoleColors(ansi);


    return async (call, next) => {
        const result = await next(call);

        const elapsed = Date.now() - useContext().startedAt;
        if (result && result instanceof Error) {
            useLog("error", `${gray(call.access)}\t${call.path} ${gray(`(${elapsed}ms)`)}`);
        } else {
            useLog("success", `${gray(call.access)}\t${call.path} ${gray(`(${elapsed}ms)`)}`);
        }

        return result;
    };
}
