import type { HttpCallPipelineDefinition, HttpCServerMiddleware, HttpCallAccess } from "../requests";
import { randomUUID } from "../utils";
import { useContextProperty } from "../context";
import { PassthroughMiddleware } from "../middlewares";
import { HttpCallMetadata, httpCall, httpPipeline } from "../pipeline";
import { runInTestContext, testContext } from "./context";


export function httpCallTester<T extends HttpCallPipelineDefinition<any>>(call: T): T["execute"];
export function httpCallTester<T extends (...args: any) => any>(...pipeline: [...(HttpCServerMiddleware | HttpCallMetadata)[], T]): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
export function httpCallTester<T extends (...args: any) => any>(access: HttpCallAccess, ...pipeline: [...(HttpCServerMiddleware | HttpCallMetadata)[], T]): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>;
export function httpCallTester(...pipeline: any[]) {
    // check is an http call
    const pipe: HttpCallPipelineDefinition = arguments.length === 1 && arguments[0] && "execute" in arguments[0]
        ? arguments[0]
        : httpCall(...pipeline as any);


    return async (...args: any[]) =>
        await runInTestContext(async () => await pipe.execute({
            access: pipe.access,
            metadata: pipe.metadata,
            path: "/",
            params: args
        }));
}



export function httpPipelineTester<T extends HttpCallPipelineDefinition<any>>(call: T): T extends HttpCallPipelineDefinition<infer F> ? F extends (...args: any) => void ? F : never : never;
export function httpPipelineTester<T extends HttpCallPipelineDefinition<any>>(middlewares: HttpCServerMiddleware[] | undefined, call: T): T extends HttpCallPipelineDefinition<infer F> ? F extends (...args: any) => void ? F : never : never;
export function httpPipelineTester<T extends HttpCallPipelineDefinition<any>>(middlewareOrCall: HttpCServerMiddleware[] | T | undefined, call?: T): T extends HttpCallPipelineDefinition<infer F> ? F extends (...args: any) => void ? F : never : never {
    let middlewares: any[] | undefined = undefined;

    if (Array.isArray(middlewareOrCall)) {
        middlewares = middlewareOrCall;
    } else if (middlewareOrCall && typeof middlewareOrCall === "object") {
        call = middlewareOrCall as T;
    }

    if (!call || typeof call !== "object" || typeof call["execute"] !== "function") {
        throw new Error("Invalid parameter: call invalid");
    }


    const pipeline = httpPipeline(middlewares, call);

    return (async (...args: any[]) =>
        await runInTestContext(async () => await pipeline.execute({
            access: pipeline.access,
            metadata: pipeline.metadata,
            path: "/",
            params: args
        }))) as any;
}



export type CallBuilderOptions = {
    middlewares?: HttpCServerMiddleware[]
}

export class CallBuilder {
    protected _headers = {};
    protected _url: string = "http://localhost";
    protected _context = {};
    protected _middlewares: HttpCServerMiddleware[];

    constructor(options?: CallBuilderOptions) {
        this._middlewares = options?.middlewares || [];
    }

    withHeaders(headers: Record<string, string | number>): this {
        this._headers = { ...this._headers, ...headers };
        return this;
    }

    withUrl(url: string): this {
        this._url = url || "http://localhost";
        return this;
    }

    withQuery(queryString: string | URLSearchParams): this {
        if (typeof queryString !== "string") queryString = queryString.toString();
        if (queryString.startsWith("?")) queryString = queryString.substring(1);

        this._url = new URL("?" + queryString, "http://localhost").toString();

        return this;
    }

    withPath(path: string): this {
        this._url = new URL(path, "http://localhost").toString();
        return this;
    }

    withContext(context: Record<string, any>): this {
        this._context = { ...this._context, ...context };
        return this;
    }

    withMiddlewares(middlewares: HttpCServerMiddleware[], mode: "join" | "set" = "join"): this {
        if (mode === "set") {
            this._middlewares = middlewares;
        } else {
            this._middlewares = [...this._middlewares || [], ...middlewares];
        }
        return this;
    }

    create<T extends () => (any | Promise<any>)>(...pipeline: [...(HttpCServerMiddleware | HttpCallMetadata)[], T]): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
        const call = httpCall(...pipeline as any);
        return httpPipelineTester([
            PassthroughMiddleware(() => {
                testContext.clear();
                useContextProperty("requestId", randomUUID());
                useContextProperty("request", this._buildRequest());
                Object.entries(this._context).forEach(([key, value]) => {
                    useContextProperty(key, value);
                });
            }),
            ...this._middlewares
        ], call);
    }

    async run<T extends () => any>(handler: () => any): Promise<Awaited<ReturnType<T>>>;
    async run(): Promise<void>;
    async run<T extends () => any>(handler?: () => any): Promise<Awaited<ReturnType<T>>> {
        return await this.create(handler || (() => { }))();
    }

    private _buildRequest(): Request {
        return {
            headers: new Headers(this._headers),
            url: this._url
        } as Request;
    }
}


// function normalizeHeaders(headers?: Record<string, number>) {
//     if (!headers) return {};
//     return Object.fromEntries(
//         Object.entries(headers || {}).map(([key, value]) => [key.toLowerCase(), value])
//     );
// }
