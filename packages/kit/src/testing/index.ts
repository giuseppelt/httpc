import { HttpCServerMiddleware, HttpCallMetadata, HttpCallAccess, httpPipelineTester, httpCall, HttpCServerTester, createHttpCServerTester, useContextProperty, PassthroughMiddleware, CallBuilder } from "@httpc/server"
import { container as globalContainer, DependencyContainer } from "tsyringe";
import { initializeContainer } from "../di";


export type ApplicationTesterOptions = {
    middlewares?: HttpCServerMiddleware[]
    container?: DependencyContainer
}

export class ApplicationTester {
    protected server!: HttpCServerTester;
    protected _middlewares?: HttpCServerMiddleware[] | undefined;
    protected _container: DependencyContainer;

    constructor(protected options?: ApplicationTesterOptions) {
        this._container = options?.container || globalContainer;
        this.setMiddlewares(options?.middlewares);
    }

    setMiddlewares(middlewares: HttpCServerMiddleware[] | undefined | null) {
        if (middlewares) {
            this._middlewares = middlewares;
        } else {
            this._middlewares = undefined;
        }

        this._middlewares = [
            SetContainerMiddleware(this._container),
            ...this._middlewares || []
        ];
    }

    async initialize() {
        await initializeContainer(this._container);
    }

    newCall() {
        return new CallBuilder({
            middlewares: this._middlewares
        });
    }

    createCall<T extends (...args: any) => any>(...pipeline: [...(HttpCServerMiddleware | HttpCallMetadata)[], T]): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
    createCall<T extends (...args: any) => any>(access: HttpCallAccess, ...pipeline: [...(HttpCServerMiddleware | HttpCallMetadata)[], T]): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
    createCall(...pipeline: any[]) {
        const handler = pipeline.pop();
        const middlewares = pipeline.filter(x => typeof x === "function");

        return this.newCall()
            .withMiddlewares(middlewares)
            .create(handler);
    }

    async runCall<T extends () => (any | Promise<any>)>(...pipeline: [...(HttpCServerMiddleware | HttpCallMetadata)[], T]): Promise<Awaited<ReturnType<T>>> {
        return await (this.createCall(...pipeline as any)());
    }
}


function SetContainerMiddleware(container: DependencyContainer): HttpCServerMiddleware {
    return PassthroughMiddleware(() => {
        useContextProperty("container", container.createChildContainer());
    });
}
