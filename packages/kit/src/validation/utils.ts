
export function isClass(func: Function): boolean {
    return typeof func === "function" && func.prototype && !Object.getOwnPropertyDescriptor(func, "prototype")?.writable || false;
}


export function OptionalSchema<T>(schema: T): T {
    return new MetaSchema(schema, "optional") as any as T;
}

export function ArraySchema<T>(schema: T): T {
    return new MetaSchema(schema, "array") as any as T;
}

class MetaSchema {
    constructor(readonly schema: any, readonly type: "optional" | "array") { }
}

export function isOptionalSchema(schema: any): schema is MetaSchema {
    return schema && schema instanceof MetaSchema && schema.type === "optional";
}

export function isArraySchema(schema: any): schema is MetaSchema {
    return schema && schema instanceof MetaSchema && schema.type === "array";
}
