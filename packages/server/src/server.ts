import http from "http";
import crypto from "crypto";
import { runInContext } from "./context";
import { HttpCServerError } from "./errors";
import { HttpCServerResponse } from "./responses";
import { ErrorRenderer, JsonRenderer } from "./renders";
import { HttpCCallParser, HttpCCallParserOptions } from "./parsers";
import { CoorsHttpMiddleware } from "./processors";
import { LogRequestMiddleware } from "./middlewares";
import { httpPipeline } from "./pipeline";


type Optional<T> = T | false | undefined;

function filterOptionals<T>(items?: Optional<T>[]): T[] {
    return items?.filter(x => !!x) as T[] || [];
}


export type HttpCServerOptions = {
    calls: HttpCalls
    cors?: boolean
    path?: string
    log?: boolean
    maxDataSize?: number
    parsing?: HttpCCallParserOptions["mode"]
    middlewares?: Optional<HttpCServerMiddleware>[]
    rewriters?: Optional<HttpCServerCallRewriter>[]
    parsers?: Optional<HttpCServerCallParser>[]
    renders?: Optional<HttpCServerRenderer>[]
    preProcessors?: Optional<HttpCServerRequestProcessor>[]
    postProcessors?: Optional<HttpCServerRequestProcessor>[]
    onError?: (level: "call" | "pipeline" | "server", error: Error) => Promise<void>
}

export interface IHttpCHost {
    getHttpCRequestProcessor(): (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>
}

export type HttpCServer = http.Server & IHttpCHost;

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
export type HttpCServerRequestProcessor = (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void | undefined | "stop">

export type HttpCServerCallParser = (request: http.IncomingMessage) => Promise<HttpCall | undefined | void>
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


export function createHttpCServer(options: HttpCServerOptions): HttpCServer {
    // apply defaults
    options = {
        log: true,
        ...options
    };

    const processors = [
        ...filterOptionals([
            ...options.preProcessors || [],
            options.cors && CoorsHttpMiddleware(),
        ]),
        HttpCCallRequestProcessor(options),
        ...filterOptionals(options.postProcessors),
    ];


    async function processRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        const context: IHttpCContext = {
            requestId: crypto.randomUUID(),
            request: req,
            startedAt: Date.now(),
        };

        return await runInContext(context, async () => {
            for (const processor of processors) {
                if (await processor(req, res) === "stop") {
                    return;
                }
            }
        });
    }

    const requestProcessor = (req: http.IncomingMessage, res: http.ServerResponse) => {
        return processRequest(req, res).catch(async err => {
            if (options?.onError) {
                await options.onError("server", err)
                    .catch(() => {/* do nothing, catch all */ });
            }

            //TODO: log error

            if (!res.writableEnded) {
                return new Promise<void>(resolve => {
                    res.writeHead(500).end(resolve);
                });
            }
        });
    }

    const server = http.createServer(requestProcessor) as HttpCServer;
    server.getHttpCRequestProcessor = function () {
        return requestProcessor;
    }

    return server;
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
        JsonRenderer()
    ];

    const middlewares = [
        ...filterOptionals([
            options.log && LogRequestMiddleware(),
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
            throw new HttpCServerError("callNotFound");
        }

        return callDef;
    }

    async function parse(req: http.IncomingMessage): Promise<HttpCall> {
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

    async function render(result: any): Promise<HttpCServerResponse> {
        if (result instanceof HttpCServerResponse) {
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

    return async (req, res) => {
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

        if (options.onError && result instanceof Error) {
            await options.onError(isPipelineError ? "pipeline" : "call", result)
                .catch(() => {/* do nothing, catch all */ });
        }

        const response = await render(result);
        await response.send(res);
    }
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
