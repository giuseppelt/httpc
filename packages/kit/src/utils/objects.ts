
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
