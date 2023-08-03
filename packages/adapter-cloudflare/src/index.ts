import { HttpCServerOptions, createHttpCServer } from "@httpc/server";


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
}

export function createCloudflareWorker(options: CloudflareWorkerOptions): { fetch: ExportedHandlerFetchHandler<IWorkerEnv> } {

    const httpc = createHttpCServer({
        ...options,
    });

    return {
        fetch(request, env, ctx) {
            return httpc.fetch(request, env);
        }
    };
}
