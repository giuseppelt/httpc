import { HttpCallMetadata, httpCall, httpPipeline } from "../pipeline";
import { HttpCallPipelineDefinition, HttpCServerMiddleware, HttpCallAccess } from "../server";
import { runInTestContext } from "./context";


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
