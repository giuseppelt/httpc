
export function cleanUndefined<T extends object>(obj: T): T;
export function cleanUndefined<T extends object>(obj?: T, makeUndefinedIfEmpty?: boolean): T;
export function cleanUndefined<T extends object>(obj?: T, makeUndefinedIfEmpty?: boolean): T | undefined {
    return cleanObject(obj, [undefined], makeUndefinedIfEmpty);
}

export function cleanNotDefined<T extends object>(obj: T): T;
export function cleanNotDefined<T extends object>(obj?: T, makeUndefinedIfEmpty?: boolean): T | undefined;
export function cleanNotDefined<T extends object>(obj?: T, makeUndefinedIfEmpty?: boolean): T | undefined {
    return cleanObject(obj, [undefined, null], makeUndefinedIfEmpty);
}

export function cleanObject<T extends object>(obj: T, values: any[]): T;
export function cleanObject<T extends object>(obj: T | undefined, values: any[], makeUndefinedIfEmpty?: boolean): T | undefined;
export function cleanObject<T extends object>(obj: T | undefined, values: any[], makeUndefinedIfEmpty?: boolean): T | undefined {
    if (!obj) return obj;

    const entries = Object.entries(obj).filter(([, value]) => !values.includes(value));
    if (entries.length === 0 && makeUndefinedIfEmpty) {
        return;
    }

    return Object.fromEntries(entries) as T;
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
