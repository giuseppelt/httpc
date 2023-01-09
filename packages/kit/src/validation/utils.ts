
export function isClass(func: Function): boolean {
    return typeof func === "function" && func.prototype && !Object.getOwnPropertyDescriptor(func, "prototype")?.writable || false;
}


export function OptionalSchema<T>(schema: T): T {
    return new Optional(schema) as any as T;
}

class Optional {
    constructor(readonly schema: any) { }
}

export function isOptionalSchema(schema: any): schema is Optional {
    return schema && schema instanceof Optional;
}
