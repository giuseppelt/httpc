import { HttpCallAccess, HttpCalls, HttpCServerCallExecutor, HttpCServerMiddleware, isCallPipeline, HttpCallPipelineDefinition, CallHandler, HttpCallDefinition, isCallFunction } from "./server";


export type HttpCallMetadata<T extends Record<string, any> = Record<string, any>> = T

export function httpCall<T extends CallHandler>(...pipeline: [...(HttpCServerMiddleware | HttpCallMetadata)[], T]): HttpCallPipelineDefinition<T>;
export function httpCall<T extends CallHandler>(access: HttpCallAccess, ...pipeline: [...(HttpCServerMiddleware | HttpCallMetadata)[], T]): HttpCallPipelineDefinition<T>;
export function httpCall(...pipeline: any[]): HttpCallPipelineDefinition<any> {
    const func = pipeline.pop();
    if (typeof func !== "function") {
        throw new Error("No call function provided");
    }


    const access: HttpCallAccess = typeof pipeline[0] === "string" ? pipeline.shift() : "write";
    const metadata = Object.assign({}, ...pipeline.filter(x => typeof x === "object"));
    const middlewares = pipeline.filter(x => typeof x === "function");

    const execute: HttpCServerCallExecutor = call => {
        return func.apply(null, call.params);
    };

    return {
        access,
        metadata,
        execute: buildCallPipeline(middlewares, execute)
    };
}


export function httpPipeline<T extends CallHandler>(pipeline: (HttpCServerMiddleware | HttpCallMetadata)[] | undefined, call: HttpCallDefinition<T>): HttpCallPipelineDefinition<T> {
    if (isCallFunction(call)) {
        call = httpCall(call);
    }

    if (!pipeline || pipeline.length === 0) {
        return call;
    }

    const metadata = Object.assign({}, ...pipeline.filter(x => typeof x === "object"));
    const middlewares = pipeline.filter(x => typeof x === "function") as HttpCServerMiddleware[];

    return {
        ...call,
        metadata: { ...metadata, ...call.metadata },
        execute: buildCallPipeline(middlewares, call.execute)
    };
}


export function httpGroup<T extends HttpCalls>(...pipeline: [...(HttpCServerMiddleware | HttpCallMetadata)[], T]): T {
    if (pipeline.length === 0) {
        throw new Error("No argument specified");
    }
    if (pipeline.length === 1) {
        return pipeline[0] as T;
    }

    const calls = pipeline.pop() as HttpCalls;
    const middlewares = pipeline as HttpCServerMiddleware[];

    return Object.fromEntries(
        Object.entries(calls).map(([name, call]) => [
            name,
            isCallPipeline(call) || isCallFunction(call)
                ? httpPipeline(middlewares, call)
                : httpGroup(...[...middlewares, call])
        ])
    ) as T;
}


function buildCallPipeline<T extends CallHandler>(middlewares: HttpCServerMiddleware[] | undefined, execute: HttpCServerCallExecutor<T>): HttpCServerCallExecutor<T> {
    // promisify, as the execute can be a sync func
    const base: HttpCServerCallExecutor<T> = async call => {
        return await execute(call) as any;
    };

    if (!middlewares || middlewares.length === 0) {
        return base;
    }

    return middlewares.slice().reverse().reduce<HttpCServerCallExecutor>((next, middleware) => {
        return op => middleware(op, next)
    }, base);
}



export function Metadata(key: string, value: any): {};
export function Metadata(metadata: Record<string, any>): {};
export function Metadata(metadata: string | Record<string, any>, value?: any): {} {
    return typeof metadata === "string"
        ? { [metadata]: value }
        : { ...metadata };
}

export function Hidden() {
    return Metadata("httpc:hidden", true);
}
