import { createServer, Server } from "node:http";
import { createHttpCServerProcessor, HttpCServerOptions, HttpCServerRequestProcessor } from "./processor";


export interface IHttpCHost {
    getHttpCRequestProcessor(): HttpCServerRequestProcessor;
}

export type HttpCServer = Server & IHttpCHost;


export function createHttpCServer(options: HttpCServerOptions): HttpCServer {
    const processor = createHttpCServerProcessor(options);
    const server = createServer(processor) as HttpCServer;
    server.getHttpCRequestProcessor = function () {
        return processor;
    }

    return server;
}
