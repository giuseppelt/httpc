import { IncomingMessage, METHODS } from "node:http";
import { Readable } from "node:stream";


export type IncomingMessageMockParams = {
    method?: "GET" | "HEAD" | "OPTIONS" | "POST" | "PUT" | "PATCH" | "DELETE"
    path: string
    headers?: Record<string, string | number>
    body?: any
}

export function createIncomingMessageMock(params: IncomingMessageMockParams): IncomingMessage {
    let {
        method = "POST",
        headers,
        body,
        path,
    } = params;

    if (!METHODS.includes(method)) {
        throw new Error(`Http method unknown: ${method}`);
    }


    let buffer;
    if (typeof body === "object") {
        buffer = Buffer.from(JSON.stringify(body), "utf8");
        headers = {
            "content-type": "application/json",
            "content-length": buffer.length,
            ...headers,
        }
    }

    const content = Readable.from(buffer || []);

    return Object.assign(content, {
        url: path,
        method,
        headers: normalizeHeaders(headers),
    }) as unknown as IncomingMessage;
}


function normalizeHeaders(headers?: Record<string, string | number>) {
    if (!headers) return {};
    return Object.fromEntries(
        Object.entries(headers || {}).map(([key, value]) => [key.toLowerCase(), value])
    );
}
