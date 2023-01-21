import { HttpCServerMiddleware, HttpCallMetadata, HttpCallAccess, httpPipelineTester, httpCall, HttpCServerTester, createHttpCServerTester } from "@httpc/server"
import { initializeContainer } from "../di";


export type ApplicationTesterOptions = {
    middlewares?: HttpCServerMiddleware[]
}

export class ApplicationTester {
    protected server!: HttpCServerTester;
    protected _middlewares?: HttpCServerMiddleware[] | undefined;

    constructor(protected options?: ApplicationTesterOptions) {
        this.server = createHttpCServerTester(options);
    }

    setMiddlewares(middlewares: HttpCServerMiddleware[] | undefined | null) {
        if (middlewares) {
            this._middlewares = middlewares;
        } else {
            this._middlewares = undefined;
        }
    }

    async initialize() {
        await initializeContainer();
    }

    newCall() {
        return this.server.newCall;
    }

    createCall<T extends (...args: any) => any>(...pipeline: [...(HttpCServerMiddleware | HttpCallMetadata)[], T]): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
    createCall<T extends (...args: any) => any>(access: HttpCallAccess, ...pipeline: [...(HttpCServerMiddleware | HttpCallMetadata)[], T]): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
    createCall(...pipeline: any[]) {
        const middlewares = this._middlewares || this.options?.middlewares;
        return httpPipelineTester(middlewares, httpCall(...pipeline as any));
    }

    runCall<T extends () => (any | Promise<any>)>(...pipeline: [...(HttpCServerMiddleware | HttpCallMetadata)[], T]): Promise<Awaited<ReturnType<T>>> {
        return this.createCall(...pipeline as any)();
    }
}
