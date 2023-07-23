import { AsyncLocalStorage } from "node:async_hooks";
import { HttpCServerError } from "./errors";


const ContextStorage = new AsyncLocalStorage();

export function runInContext<TC extends object, T>(context: TC | undefined, func: () => T): T;
export function runInContext<T>(func: () => T): T;
export function runInContext(context: object | undefined | (() => any), func?: () => any): any {
    if (typeof context === "function") {
        func = context as any;
        context = undefined;
    }

    let ctx = ContextStorage.getStore();
    if (ctx) {
        if (context) Object.assign(ctx as any, context);
        return func!();
    }

    ctx = context || {};
    return ContextStorage.run(ctx, func!);
}

export function useContext(): IHttpCContext;
export function useContext(mode: "optional"): IHttpCContext | undefined;
export function useContext(mode?: "optional"): IHttpCContext | undefined {
    const context = ContextStorage.getStore() as any;
    if (!context && mode !== "optional") {
        throw new HttpCServerError("noRequestContext");
    }

    return context;
}

export function useContextProperty<K extends keyof IHttpCContext>(key: K): IHttpCContext[K];
export function useContextProperty<K extends keyof IHttpCContext>(key: K, value: IHttpCContext[K]): IHttpCContext[K];
export function useContextProperty<T = any>(key: string): T;
export function useContextProperty<T = any>(key: string, value: T): T;
export function useContextProperty(key: string, value?: any): any {
    const context = useContext();
    if (!context) {
        throw new HttpCServerError("noRequestContext");
    }

    const isSet = arguments.length === 2;
    if (isSet) {
        (context as any)[key] = value;
    } else {
        value = (context as any)[key];
    }


    return value;
}
