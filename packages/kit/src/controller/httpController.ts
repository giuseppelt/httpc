import { HttpCServerError, HttpCallPipelineDefinition, httpCall, Metadata, CallHandler } from "@httpc/server";
import { Constructor, useInjected } from "../di";


export type HttpControllerCalls<T> = {
    [k in keyof T]: T[k] extends CallHandler ? HttpCallPipelineDefinition<T[k]> : never
}

export function httpController<T>(constructor: Constructor<T>): HttpControllerCalls<T> {

    function createMethodCall(methodName: string) {
        return (...args: any) => {
            const instance = useInjected<any>(constructor);
            const method = instance[methodName];
            if (!method) {
                throw new HttpCServerError("callNotFound");
            }

            return method.apply(instance, args);
        }
    }

    const {
        CALL_MIDDLEWARE: CLASS_MIDDLEWARE = [],
        ...controllerMetadata
    } = getAllMetadata(constructor);

    const calls = new Map<string, HttpCallPipelineDefinition>();

    for (const methodName of getMethods(constructor)) {
        const {
            CALL_ACCESS = "write",
            CALL_MIDDLEWARE = [],
            ...callMetadata
        } = getAllMetadata(constructor, methodName);

        if (!CALL_ACCESS) continue;

        calls.set(methodName, httpCall(
            CALL_ACCESS,
            Metadata({ ...controllerMetadata, ...callMetadata }),
            ...CLASS_MIDDLEWARE,
            ...CALL_MIDDLEWARE,
            createMethodCall(methodName)
        ));
    }

    return Object.fromEntries(calls) as any;
}


function getMethods(constructor: Constructor): string[] {
    const methods = Object.entries(Object.getOwnPropertyDescriptors(constructor.prototype))
        .filter(([key, descriptor]) => {
            if (key === "constructor") return false;
            if (typeof descriptor.value !== "function") return false;

            const access = Reflect.getMetadata("CALL_ACCESS", constructor.prototype, key) || "write";
            if (!access) return false;

            return true;
        });

    return methods.map(([key]) => key);
}

function getAllMetadata(target: Constructor, property?: string): Record<string, any> {
    const metadata = property
        ? Reflect.getMetadataKeys(target.prototype, property)
            .map(key => [key, Reflect.getMetadata(key, target.prototype, property)])
        : Reflect.getMetadataKeys(target.prototype)
            .map(key => [key, Reflect.getMetadata(key, target.prototype)])


    return Object.fromEntries(metadata);
}
