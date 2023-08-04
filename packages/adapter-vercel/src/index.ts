import type { IncomingMessage, ServerResponse } from "http";
import { HttpCServerOptions, IHttpCServer, createHttpCServer } from "@httpc/server";
import { createRequest, writeResponse } from "@httpc/server/node";


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


let server: IHttpCServer | undefined;

//TODO: add a @httpc/kit solution

export function createHttpCVercelAdapter(options: HttpCVercelAdapterOptions) {
    const local = (!server || options.refresh)
        ? (server = createHttpCServer({ path: "api", ...options }))
        : server;

    return async (req: IncomingMessage, res: ServerResponse) => {
        try {
            const request = createRequest(req);
            const response = await local.fetch(request);
            await writeResponse(res, response);
        } catch (err) {
            console.error(err);

            if (!res.headersSent) {
                res.writeHead(500);
            }

            res.end();
        }
    }
}
