import type { HttpCServerOptions } from "../processor";
import { createHttpCNodeServer } from "./server";
import { createIncomingMessageMock, IncomingMessageMockParams, createServerResponseMock } from "../node/mocks";


export type HttpCServerTesterOptions = HttpCServerOptions & {
}

export type HttpCServerTester = ReturnType<typeof createHttpCServerTester>

export function createHttpCServerTester(options: HttpCServerTesterOptions) {
    options = {
        log: false,
        ...options,
    };

    const server = createHttpCNodeServer(options);
    const processor = server.requestProcessor;

    return {
        async process(request: IncomingMessageMockParams) {
            await processor(createIncomingMessageMock(request), createServerResponseMock());
        }
    };
}
