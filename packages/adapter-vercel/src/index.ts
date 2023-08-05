import type { IncomingMessage, ServerResponse } from "node:http";
import { HttpCServerHandler, HttpCServerOptions, createHttpCServerHandler } from "@httpc/server";
import { createRequestFromNode, writeResponseToNode } from "@httpc/server/node";


export type HttpCVercelAdapterOptions = Pick<HttpCServerOptions,
    | "calls"
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


let server: HttpCServerHandler | undefined;

//TODO: add a @httpc/kit solution

export function createHttpCVercelAdapter(options: HttpCVercelAdapterOptions) {
    const handler = (!server || options.refresh)
        ? (server = createHttpCServerHandler({ path: "api", ...options }))
        : server;

    return async (req: IncomingMessage, res: ServerResponse) => {
        try {
            const request = createRequestFromNode(req);
            const response = await handler(request);
            await writeResponseToNode(res, response);
        } catch (err) {
            console.error(err);

            if (!res.headersSent) {
                res.writeHead(500);
            }

            res.end();
        }
    }
}
