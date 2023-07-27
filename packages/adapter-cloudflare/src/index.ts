import { HttpCServerOptions, createHttpCServerProcessor } from "@httpc/server";
import type { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from "http";
import "./buffer-polyfill";


export type CloudflareWorkerOptions = Pick<HttpCServerOptions,
    | "calls"
    | "path"
    | "cors"
    | "log"
    | "maxDataSize"
    | "middlewares"
    | "parsers"
    | "parsing"
    | "renders"
    | "rewriters"
> & {
    kit?: boolean
    refresh?: boolean
}

export function createCloudflareWorker(options: CloudflareWorkerOptions): { fetch: ExportedHandlerFetchHandler<IWorkerEnv> } {

    const handler = createHttpCServerProcessor({
        ...options,
    });


    return {
        async fetch(request, env, ctx) {
            const req = createRequest(request);
            const res = createResponse();

            await Promise.allSettled([
                new Promise((resolve, reject) => {
                    res.on("close", resolve);
                    res.on("error", reject);
                }),
                handler(req, res, env), // pass env as extra context
            ]);

            const buffer = res.getBuffer();

            return new Response(buffer, {
                status: res.statusCode,
                headers: res.getHeaders() as any,
            })
        }
    };
}


function createRequest(request: Request): IncomingMessage {
    const url = new URL(request.url);
    const pathAndSearch = url.pathname + (url.searchParams.size > 0 ? "?" + url.searchParams.toString() : "");

    const message = request.body || new ReadableStream();
    return Object.assign(message, {
        url: pathAndSearch,
        method: request.method,
        headers: Object.fromEntries(request.headers),
    } as IncomingMessage);
}

function createResponse() {
    let _statusCode = 200;
    let _headers: OutgoingHttpHeaders = {};
    let _buffer: Buffer | undefined = undefined;
    let _listeners: Record<string, (() => void)[]> = {};

    return {
        get statusCode() { return _statusCode },
        set statusCode(value: number) { _statusCode = value },

        getHeaders() {
            return _headers;
        },

        setHeader(name, value) {
            _headers[name] = value as any;
            return this;
        },

        writeHead(statusCode, headers: any) {
            _statusCode = statusCode;
            _headers = { ..._headers, ...headers };
            return this;
        },

        end(buffer) {
            _buffer = buffer;
            _listeners["close"]?.forEach(x => x());
            return this;
        },

        on(event, listener) {
            (_listeners[event as string] ??= []).push(listener as any);
            return this;
        },

        once(event, listener) {
            (_listeners[event as string] ??= []).push(listener as any);
            return this;
        },

        getBuffer() {
            return _buffer;
        },
    } as ServerResponse & { getBuffer(): Buffer | undefined };
}
