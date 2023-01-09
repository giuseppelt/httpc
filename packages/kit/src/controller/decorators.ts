import type from "reflect-metadata";
import { HttpCallAccess, HttpCServerMiddleware } from "@httpc/server";
import { Authenticated } from "../auth";


type Decorator = (target: object, property?: string | symbol, descriptor?: any) => void;

function assertReflectMetadata() {
    if (typeof Reflect.defineMetadata === "undefined") {
        throw new Error("Missing 'reflect-metadata' dependency");
    }
}

function metadataSet(key: string, value: any): Decorator {
    return (target, property) => {
        assertReflectMetadata();

        return property
            ? Reflect.defineMetadata(key, value, target, property)
            : Reflect.defineMetadata(key, value, target);
    };
}

function metadataPush(key: string, item: any): Decorator {
    return (target, property) => {
        assertReflectMetadata();

        const metadata: any[] = (property
            ? Reflect.getMetadata(key, target, property)
            : Reflect.getMetadata(key, target)) || [];

        metadata.push(item);

        return property
            ? Reflect.defineMetadata(key, metadata, target, property)
            : Reflect.defineMetadata(key, metadata, target);
    };
}


export function decoratorMiddleware<T extends (...any: any[]) => HttpCServerMiddleware>(factory: T) {
    return (...args: Parameters<T>) => metadataPush("CALL_MIDDLEWARE", factory(...args));
}

export function decoratorMetadata(key: string, value: any): () => Decorator;
export function decoratorMetadata<T extends (...any: any[]) => { key: string, value: any }>(factory: T): (...args: Parameters<T>) => Decorator;
export function decoratorMetadata(key: string | Function, value?: any): () => Decorator {
    return (...args) => {
        if (typeof key === "function") {
            ({ key, value } = key(...args));
        }

        return metadataSet(key as string, value);
    };
}



export const call = decoratorMetadata((access: HttpCallAccess = "write") => ({ key: "CALL_ACCESS", value: access }));
export const noCall = decoratorMetadata("CALL_ACCESS", false);

export const authenticated = decoratorMiddleware(Authenticated);
