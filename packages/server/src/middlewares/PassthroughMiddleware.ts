import type { HttpCServerMiddleware } from "../processor";


export function PassthroughMiddleware(func: () => Promise<any> | void): HttpCServerMiddleware {
    return async (call, next) => {
        await func();
        return await next(call);
    };
}
