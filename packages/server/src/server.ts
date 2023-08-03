import { createHttpCServerProcessor, HttpCServerOptions, HttpCServerPr } from "./processor";


export interface IHttpCServer {
    fetch: HttpCServerPr
}

export type HttpCServer = IHttpCServer;


export function createHttpCServer(options: HttpCServerOptions): HttpCServer {
    return { fetch: createHttpCServerProcessor(options) };
}
