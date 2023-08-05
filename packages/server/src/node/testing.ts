import type { HttpCServerOptions } from "../server";
import { createHttpCNodeServer } from "./server";
import { createIncomingMessageMock, IncomingMessageMockParams, createServerResponseMock } from "../node/mocks";


export type HttpCNodeServerTesterOptions = HttpCServerOptions

export type HttpCNodeServerTester = ReturnType<typeof createHttpCNodeServerTester>

export function createHttpCNodeServerTester(options: HttpCNodeServerTesterOptions) {
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
