import http from "http";
import { randomUUID } from "crypto";
import { useContextProperty } from "../context";
import { httpCall, HttpCallMetadata } from "../pipeline";
import { HttpCall, HttpCServerCallParser, HttpCServerMiddleware, HttpCServerRenderer } from "../server";
import { httpPipelineTester } from "./pipeline";
import { PassthroughMiddleware } from "../middlewares";
import { testContext } from "./context";


export type HttpCServerTesterOptions = {
    middlewares?: HttpCServerMiddleware[]
    parsers?: HttpCServerCallParser[]
    renders?: HttpCServerRenderer[]
}

export type HttpCServerTester = ReturnType<typeof createHttpCServerTester>

export function createHttpCServerTester(options?: HttpCServerTesterOptions) {
    return {
        get newCall() {
            return new CallBuilder(options);
        }
    };
}

export class CallBuilder {
    protected _headers = {};
    protected _url: string | undefined;
    protected _context = {};

    constructor(private options?: HttpCServerTesterOptions) {
    }

    withHeaders(headers: Record<string, string | number>): this {
        this._headers = { ...this._headers, ...headers };
        return this;
    }

    withUrl(url: string): this {
        this._url = url;
        return this;
    }

    withContext(context: Record<string, any>): this {
        this._context = { ...this._context, ...context };
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
            ...this.options?.middlewares || []
        ], call);
    }

    run<T extends () => (any | Promise<any>)>(...pipeline: [...(HttpCServerMiddleware | HttpCallMetadata)[], T]): Promise<Awaited<ReturnType<T>>>;
    run(): Promise<void>;
    run<T extends () => (any | Promise<any>)>(...pipeline: [...(HttpCServerMiddleware | HttpCallMetadata)[], T]): Promise<Awaited<ReturnType<T>>> {
        if (pipeline.length === 0) {
            pipeline.push(() => { }); // empty function
        }

        return this.create(...pipeline as any)();
    }


    private _buildRequest(): http.IncomingMessage {
        return {
            headers: normalizeHeaders(this._headers) as any,
            url: this._url,
        } as http.IncomingMessage;
    }
}


function normalizeHeaders(headers?: Record<string, number>) {
    if (!headers) return {};
    return Object.fromEntries(
        Object.entries(headers || {}).map(([key, value]) => [key.toLowerCase(), value])
    );
}
