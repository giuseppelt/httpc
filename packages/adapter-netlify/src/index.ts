import { Readable, Writable } from "stream";
import type { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from "http";
import { HttpCServerOptions, createHttpCServer } from "@httpc/server";
import type { Handler, HandlerEvent } from "@netlify/functions";


export type HttpCNetlifyAdapterOptions = Pick<HttpCServerOptions,
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


let handler: ((req: IncomingMessage, res: ServerResponse) => void | Promise<void>) | undefined;
let initialized = false;
let initializing: Promise<void> | undefined;

export function createHttpCNetlifyHandler(options: HttpCNetlifyAdapterOptions): Handler {
    if (!handler || options.refresh) {
        const server = createHttpCServer(options);
        handler = server.getHttpCRequestProcessor();
    }

    return async (event, context) => {
        if (options.kit && !initialized) {
            if (!initializing) {
                initializing = Promise.resolve().then(async () => {
                    const lib = "@httpc/kit";
                    const { initializeContainer } = await import(lib);
                    await initializeContainer();

                    initialized = true;
                    initializing = undefined;
                });
            }

            await initializing;
        }

        const request = createRequest(event);
        const response = createResponse();

        await Promise.allSettled([
            handler!(request, response),
            new Promise((resolve, reject) => {
                response.on("close", resolve);
                response.on("error", reject);
            })
        ]);

        const buffer = response.getBuffer();

        return {
            statusCode: response.statusCode,
            headers: response.getHeaders() as any,
            body: buffer?.toString("utf8")
        };
    };
}


function createRequest(event: HandlerEvent): IncomingMessage {
    let body: Readable;

    if (event.body) {
        if (typeof event.body === "string") {
            body = Readable.from(Buffer.from(event.body, event.isBase64Encoded ? "base64" : "utf8"));
        } else {
            console.warn("Body (%s): %s", typeof event.body, (event.body as any)?.toString());
            throw new Error("Unknown body type");
        }
    } else {
        body = Readable.from([]);
    }

    return Object.assign(body, {
        url: event.rawUrl,
        method: event.httpMethod,
        headers: event.headers,
    } as IncomingMessage);
}

function createResponse() {
    const writable = new BufferedWritable();

    let _statusCode = 200;
    let _headers: OutgoingHttpHeaders = {};

    return Object.assign(writable, {
        get statusCode() { return _statusCode },
        set statusCode(value: number) { _statusCode = value },

        getHeaders() {
            return _headers;
        },

        setHeader(name, value) {
            _headers[name] = value as any;
        },

        writeHead(statusCode, headers: any) {
            _statusCode = statusCode;
            _headers = { ..._headers, ...headers };
            return this;
        }
    } as ServerResponse);
}

class BufferedWritable extends Writable {
    protected _buffer?: Buffer | undefined;

    getBuffer() {
        return this._buffer;
    }

    _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        const newChunk = Buffer.from(chunk, encoding);
        if (!this._buffer) {
            this._buffer = chunk;
        } else {
            this._buffer = Buffer.concat([this._buffer, newChunk]);
        }

        callback();
    }
}
