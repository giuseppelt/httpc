import type { IncomingMessage, ServerResponse } from "http";
import { HttpCServerOptions, HttpCServerRequestProcessor, createHttpCServerProcessor } from "@httpc/server";


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


let handler: HttpCServerRequestProcessor | undefined;
let initialized = false;
let initializing: Promise<void> | undefined;

export function createHttpCVercelAdapter(options: HttpCVercelAdapterOptions) {
    if (!handler || options.refresh) {
        handler = createHttpCServerProcessor({
            path: "api",
            ...options
        });
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
