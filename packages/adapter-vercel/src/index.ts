import type { IncomingMessage, ServerResponse } from "http";
import { HttpCServerOptions, createHttpCServer } from "@httpc/server";


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


let handler: ((req: IncomingMessage, res: ServerResponse) => void | Promise<void>) | undefined;
let initialized = false;
let initializing: Promise<void> | undefined;

export function createHttpCVercelAdapter(options: HttpCVercelAdapterOptions) {
    if (!handler || options.refresh) {
        const server = createHttpCServer({
            path: "api",
            ...options
        });

        handler = server.getHttpCRequestProcessor();
    }

    if (!options.kit || initialized) {
        return handler;
    }

    return async (req: IncomingMessage, res: ServerResponse) => {

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

        await handler!(req, res);
    }
}
