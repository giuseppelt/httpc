import { randomUUID } from "./utils";
import { runInContext, useContextProperty } from "./context";
import { HttpCServerError } from "./errors";
import { CoorsRequestMiddleware, HttpCCallRequestMiddleware, HttpCCallRequestMiddlewareOptions, HttpCServerRequestMiddleware, HttpCServerRequestProcessor } from "./requests";
import { createConsoleColors, createLogger, Logger, LogLevel, LogOptions } from "./logger";
import { Optional, filterOptionals } from "./internal";


export type HttpCServerHandler = (req: Request, context?: Partial<IHttpCContext>) => Promise<Response>

export interface IHttpCServer {
    fetch: HttpCServerHandler
}

export type HttpCServerOptions = Omit<HttpCCallRequestMiddlewareOptions, "log"> & {
    cors?: boolean
    log?: boolean | LogLevel | Logger | LogOptions
    requestMiddlewares?: Optional<HttpCServerRequestMiddleware>[]
}

export function createHttpCServer(options: HttpCServerOptions): IHttpCServer {
    return { fetch: createHttpCServerHandler(options) };
}

export function createHttpCServerHandler(options: HttpCServerOptions): HttpCServerHandler {
    const {
        log = true,
        onError,
        ...rest
    } = options;

    const logger = getLogger(log);
    const ansiLog = log === true || (typeof log === "object" && (log.ansi ?? true));
    const colors = createConsoleColors(ansiLog);

    const middlewares = filterOptionals([
        ...options.requestMiddlewares || [],
        options.cors && CoorsRequestMiddleware(),
        HttpCCallRequestMiddleware({ ...rest, log: !!log, onError })
    ]);

    const pipeline = middlewares.reverse().reduce<HttpCServerRequestProcessor>((next, middleware) => {
        return op => middleware(op, next)
    }, undefined!);


    async function processRequest(req: Request, context?: Partial<IHttpCContext>) {
        context = {
            requestId: randomUUID(),
            request: req,
            startedAt: Date.now(),
            logger,
            ...context,
        };

        return await runInContext(context, async () => {
            const response = await pipeline(req);
            if (!response) {
                throw new HttpCServerError("missingResponse");
            }


            if (response instanceof Response) {
                let r = response as Response;

                // merge response headers if there are in context
                const headers = useContextProperty("responseHeaders");
                if (headers && Object.keys(headers).length > 0) {
                    r = new Response(r.body, {
                        status: r.status,
                        statusText: r.statusText,
                        headers: { ...r.headers, ...headers },
                    });
                }

                return r;
            }

            return response.render();
        });
    }

    return (req: Request, context?: Partial<IHttpCContext>) => {
        return processRequest(req, context).catch(async err => {
            if (options?.onError) {
                await options.onError("server", err)
                    .catch(() => {/* do nothing, catch all */ });
            }

            logger?.("critical", `${colors.gray("%s")}\t%s %s`, req.method!, req.url!, err?.message);

            return new Response(undefined, { status: 500 });
        });
    }
}


function getLogger(log: HttpCServerOptions["log"]): Logger | undefined {
    return log === false ? undefined :
        typeof log === "string" ? createLogger({ level: log }) :
            typeof log === "function" ? log :
                createLogger();
}
