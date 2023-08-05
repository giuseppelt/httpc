import { HttpCServerOptions, IHttpCServer, createHttpCServerHandler } from "../server";

type HttpCServerTesterOptions = HttpCServerOptions

export function createHttpCServerTester(options: HttpCServerTesterOptions): IHttpCServer {
    options = {
        log: false,
        ...options,
    };

    const handler = createHttpCServerHandler(options);

    return {
        fetch: handler
    };
}
