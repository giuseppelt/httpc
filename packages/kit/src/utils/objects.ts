
export function cleanUndefined<T extends object>(obj: T): T {
    return cleanObject(obj, [undefined]);
}

export function cleanNotDefined<T extends object>(obj: T): T {
    return cleanObject(obj, [undefined, null]);
}

export function cleanObject<T extends object>(obj: T, values: any[]): T {
    if (!obj) return obj;

    return Object.fromEntries(
        Object.entries(obj).filter(([, value]) => !values.includes(value))
    ) as T;
}


export function isPromise(value: any): value is Promise<any> {
    return value && typeof value === "object" && "then" in value && typeof value["then"] === "function";
}

export function createProxy<T extends object>(target: T, methods: Partial<T>): T {
    return new Proxy(target, {
        get(target, property, receiver) {
            return (methods as any)[property] || Reflect.get(target, property, receiver);
        }
    });
}
