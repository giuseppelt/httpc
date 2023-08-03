import { randomUUID } from "./utils";
import { runInContext } from "./context";
import { HttpCServerError } from "./errors";
import { HttpCServerResponse } from "./responses";
import { ErrorRenderer, BinaryRenderer, JsonRenderer } from "./renderers";
import { HttpCCallParser, HttpCCallParserOptions } from "./parsers";
import { CoorsRequestProcessor } from "./processors";
import { LogRequestMiddleware } from "./middlewares";
import { httpPipeline } from "./pipeline";
import { createConsoleColors, createLogger, Logger, LogLevel } from "./logger";


type Optional<T> = T | false | undefined;

function filterOptionals<T>(items?: Optional<T>[]): T[] {
    return items?.filter(x => !!x) as T[] || [];
}


export type HttpCServerOptions = {
    calls: HttpCalls
    cors?: boolean
    path?: string
    log?: boolean | LogLevel | Logger
    maxDataSize?: number
    parsing?: HttpCCallParserOptions["mode"]
    middlewares?: Optional<HttpCServerMiddleware>[]
    rewriters?: Optional<HttpCServerCallRewriter>[]
    parsers?: Optional<HttpCServerCallParser>[]
    renders?: Optional<HttpCServerRenderer>[]
    processors?: Optional<HttpCServerRequestProcessor | HttpCServerRequestProcessorDefinition>[]
    onError?: (level: "call" | "pipeline" | "server", error: Error) => Promise<void>
}

// export type HttpCServerProcessor = (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>

export type HttpCServerPr = (req: Request, context?: Partial<IHttpCContext>) => Promise<Response>

export type HttpCServerRequestProcessor<K extends HttpCServerRequestProcessorDefinition["when"] = "pre"> =
    | ("pre" extends K ? Extract<HttpCServerRequestProcessorDefinition, { when: K }>["processor"] : never)
    | Extract<HttpCServerRequestProcessorDefinition, { when: K }>

export type HttpCServerRequestProcessorDefinition =
    | {
        when: "pre"
        processor: (req: Request) => Promise<Response | HttpCServerResponse | void>
    }


export type CallHandler = (...args: any[]) => any;
export type HttpCallFunctionDefinition<T extends CallHandler = CallHandler> = T
export type HttpCallPipelineDefinition<T extends CallHandler = CallHandler> = {
    $type?: T
    access: HttpCallAccess
    metadata?: Record<string, any>
    execute: HttpCServerCallExecutor<T>
}


export type HttpCallDefinition<T extends CallHandler = CallHandler> =
    | HttpCallFunctionDefinition<T>
    | HttpCallPipelineDefinition<T>

export type HttpCalls = {
    [k: string]: HttpCallDefinition | HttpCalls
}

export type HttpCServerCallExecutor<T extends CallHandler = CallHandler> = (call: HttpCall<Parameters<T>>) => Promise<Awaited<ReturnType<T>>>
export type HttpCServerMiddleware = (call: HttpCall, next: HttpCServerCallExecutor) => Promise<unknown>

export type HttpCServerCallParser = (request: Request) => Promise<HttpCall | undefined | void>
export type HttpCServerCallRewriter = (call: HttpCall) => Promise<HttpCall>
export type HttpCServerRenderer = (result: unknown) => Promise<HttpCServerResponse | undefined | void>

export type HttpCallAccess = "read" | "write";

export type HttpCall<P extends any[] = any[]> = {
    readonly path: string
    readonly access: HttpCallAccess
    metadata?: Record<string, any>
    params: P
}

type CallNode = HttpCallPipelineDefinition | CallTree
type CallTree = Map<string, CallNode>

export function isCallPipeline(obj: any): obj is HttpCallPipelineDefinition {
    return !!obj && typeof obj === "object" && "execute" in obj && typeof obj["execute"] === "function";
}

export function isCallFunction(obj: any): obj is HttpCallFunctionDefinition {
    return !!obj && typeof obj === "function";
}


function assignLogger(log: HttpCServerOptions["log"]) {
    return log === false ? undefined :
        typeof log === "string" ? createLogger({ level: log }) :
            typeof log === "function" ? log :
                createLogger();
}

export function createHttpCServerProcessor(options: HttpCServerOptions): HttpCServerPr {
    const logger = assignLogger(options.log ?? true);
    const colors = createConsoleColors();

    const processors = [
        ...filterOptionals([
            //     ...options.preProcessors || [],
            options.cors && CoorsRequestProcessor(),
        ]),
        HttpCCallRequestProcessor(options),
        // ...filterOptionals(options.postProcessors),
    ].map(x => {
        if (typeof x === "function") {
            return {
                when: "pre",
                processor: x
            };
        }

        return x;
    });


    async function processRequest(req: Request, context?: Partial<IHttpCContext>) {
        context = {
            ...context,
            requestId: randomUUID(),
            request: req,
            startedAt: Date.now(),
        };

        return await runInContext(context, async () => {
            let response: Response | HttpCServerResponse | undefined;

            for (const { when, processor } of processors) {
                if (when === "pre") {
                    const result = await processor(req);
                    if (result) {
                        response = result;
                        break;
                    }
                }
            }

            if (!response) {
                throw new HttpCServerError("callNotFound");
            }


            if (response instanceof HttpCServerResponse) {
                response = response.render();
            }

            return response;
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


function HttpCCallRequestProcessor(options: HttpCServerOptions): HttpCServerRequestProcessor {
    const parsers = [
        ...filterOptionals(options.parsers),
        HttpCCallParser({
            basePath: options.path,
            maxDataSize: options.maxDataSize,
            mode: options.parsing,
        })
    ];

    const rewriters = filterOptionals([
        !!options.path && RewriteCallPath(options.path),
        ...options.rewriters || []
    ]);

    const renderers = [
        ...filterOptionals(options.renders),
        ErrorRenderer(),
        BinaryRenderer(),
        JsonRenderer()
    ];

    const logger = assignLogger(options.log ?? true);
    const colors = createConsoleColors();

    const middlewares = [
        ...filterOptionals([
            logger && LogRequestMiddleware({ logger }),
            ...options.middlewares || []
        ])
    ];

    const callTree = buildCallTree(middlewares, options.calls);

    function selectCall(tree: CallTree, call: HttpCall) {
        // the call/path is case invariant
        const parts = call.path.toLowerCase().split("/");

        // remove empty first entry if path start with /         
        if (!parts[0]) parts.shift();

        let callDef: HttpCallPipelineDefinition | undefined;

        do {
            const partName = parts.shift();
            if (!partName) break;

            const node = tree.get(partName);
            if (!node) break;

            // if it's the last path part, it must be a call
            if (parts.length === 0) {
                if (isCallPipeline(node)) {
                    callDef = node;
                };
                break;
            }

            // must be a group
            if (isCallPipeline(node)) {
                break;
            }

            tree = node;
        } while (tree);

        if (!callDef) {
            throw new HttpCServerError("callNotFound", call);
        }

        return callDef;
    }

    async function parse(req: Request): Promise<HttpCall> {
        for (const parser of parsers) {
            const call = await parser(req);
            if (call) {
                return call;
            }
        }

        throw new HttpCServerError("parserNotFound");
    }

    async function rewrite(call: HttpCall): Promise<HttpCall> {
        if (rewriters.length === 0) {
            return call;
        }

        for (const rewriter of rewriters) {
            call = await rewriter(call);
        }

        return call;
    }

    async function render(result: any): Promise<HttpCServerResponse | Response> {
        if (result instanceof HttpCServerResponse || result instanceof Response) {
            return result;
        }

        for (const render of renderers) {
            const response = await render(result);
            if (response) {
                return response;
            }
        }

        throw new HttpCServerError("renderNotFound");
    }

    async function execute(call: HttpCall) {
        const pipeline = selectCall(callTree, call);

        if (call.metadata || pipeline.metadata) {
            call.metadata = { ...pipeline.metadata, ...call.metadata };
        }

        return await pipeline.execute(call);
    }

    return {
        when: "pre",
        async processor(req) {
            let result;
            let isPipelineError = false;

            try {
                let call = await parse(req);
                call = await rewrite(call);
                result = await execute(call);
            } catch (err) {
                result = err;
                isPipelineError = true;
            }

            if (result instanceof Error) {
                if (logger) {
                    const call = result instanceof HttpCServerError && result.call;
                    if (call) {
                        logger("error", `${colors.gray("%s")}\t%s %s`, call.access, call.path, result.message);
                    } else {
                        logger("error", `${colors.gray("%s")}\t%s %s`, req.method!, req.url!, result.message);
                    }
                }

                if (options.onError) {
                    await options.onError(isPipelineError ? "pipeline" : "call", result)
                        .catch(() => {/* do nothing, catch all */ });
                }
            }

            return await render(result);
        }
    };
}

function buildCallTree(middlewares: HttpCServerMiddleware[], def: HttpCalls): CallTree {
    const tree = new Map<string, CallNode>();

    for (const [key, value] of Object.entries(def)) {
        const callName = key.toLowerCase();
        if (tree.has(callName)) {
            throw new Error(`Call name collision '${callName}': multiple call with the same name`);
        }

        if (isCallPipeline(value) || isCallFunction(value)) {
            tree.set(callName, httpPipeline(middlewares, value));
        } else {
            tree.set(callName, buildCallTree(middlewares, value))
        }
    }

    return tree;
}


function RewriteCallPath(prefix: string): HttpCServerCallRewriter {
    if (!prefix.startsWith("/")) prefix = "/" + prefix;

    return async call => {
        if (call.path.startsWith(prefix)) {
            let path = call.path.substring(prefix.length);
            if (!path.startsWith("/")) path = "/" + path;

            call = { ...call, path };
        }

        return call;
    };
}
