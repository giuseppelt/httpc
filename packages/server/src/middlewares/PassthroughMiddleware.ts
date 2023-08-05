import type { HttpCServerMiddleware } from "../requests";


export function PassthroughMiddleware(func: () => Promise<any> | void): HttpCServerMiddleware {
    return async (call, next) => {
        await func();
        return await next(call);
    };
}
