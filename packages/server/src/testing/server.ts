import type { HttpCServerOptions } from "../processor";
import { createHttpCServer } from "../server";
import { createIncomingMessageMock, IncomingMessageMockParams, createServerResponseMock } from "./mocks";


export type HttpCServerTesterOptions = HttpCServerOptions & {
}

export type HttpCServerTester = ReturnType<typeof createHttpCServerTester>

export function createHttpCServerTester(options: HttpCServerTesterOptions) {
    options = {
        log: false,
        ...options,
    };

    const server = createHttpCServer(options);
    const processor = server.getHttpCRequestProcessor();

    return {
        async process(request: IncomingMessageMockParams) {
            await processor(createIncomingMessageMock(request), createServerResponseMock());
        }
    };
}
