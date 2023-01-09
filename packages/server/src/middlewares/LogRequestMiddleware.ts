import { useContext } from "../context";
import { HttpCServerMiddleware } from "../server";


type LogRequestMiddlewareOptions = {
    ansi?: boolean
}

export function LogRequestMiddleware(options?: LogRequestMiddlewareOptions): HttpCServerMiddleware {

    const {
        ansi = true,
    } = options || {}


    const escape = (start: number, end: number, text: string) => `\x1b[${start}m${text}\x1b[${end}m`;
    const identity = (x: string) => x;

    const gray = ansi ? escape.bind(null, 90, 39) : identity;
    const red = ansi ? escape.bind(null, 31, 39) : identity;
    const green = ansi ? escape.bind(null, 32, 49) : identity;


    return async (call, next) => {
        const result = await next(call);

        const elapsed = Date.now() - useContext().startedAt;
        if (result && result instanceof Error) {
            console.log(`${red("ERROR")} ${gray(call.access)}\t${call.path} ${gray(`(${elapsed}ms)`)}`);
        } else {
            console.log(`${green("SUCCESS")} ${gray(call.access)}\t${call.path} ${gray(`(${elapsed}ms)`)}`);
        }

        return result;
    };
}
