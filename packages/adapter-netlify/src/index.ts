import { HttpCServer, HttpCServerOptions, createHttpCServer } from "@httpc/server";
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


let server: HttpCServer | undefined;

//TODO: add a @httpc/kit solution

export function createHttpCNetlifyHandler(options: HttpCNetlifyAdapterOptions): Handler {
    const handler = (!server || options.refresh)
        ? (server = createHttpCServer(options))
        : server;

    return async (event, context) => {
        const request = createRequest(event);
        const response = await handler.fetch(request, {
            requestId: context.awsRequestId
        });

        return {
            statusCode: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            ...await createResponseBody(response)
        };
    };
}


function createRequest(event: HandlerEvent): Request {
    const url = event.rawUrl;
    const method = event.httpMethod;
    const headers = event.headers as Record<string, string>;
    const body = event.body && method !== "GET" && method !== "HEAD" && (
        event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body
    ) || undefined;

    return new Request(url, {
        method,
        headers,
        body
    });
}


async function createResponseBody(response: Response) {
    if (!response.body) {
        return;
    }

    let chunks: Uint8Array[] = [];
    const reader = response.body.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
    }

    return {
        body: Buffer.concat(chunks).toString("base64"),
        isBase64Encoded: true
    }
}
