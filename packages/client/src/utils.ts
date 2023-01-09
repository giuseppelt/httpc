import { HttpCallDefinition, HttpCClientMetadata } from "./typed";

export function isCall(value: HttpCClientMetadata[string]): value is HttpCallDefinition {
    return value && typeof value.access === "string";
}

