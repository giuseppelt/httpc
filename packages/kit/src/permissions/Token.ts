import type { PermissionTokenRawValue, PermissionToken, PermissionAtomToken, PermissionCompositeToken, PermissionTokenWildcard } from "./models";
import { PERMISSION_TOKEN_WILDCARD } from "./models";
import Parser from "./Parser";


function parse(token: PermissionTokenRawValue) {
    return Parser.parseToken(token);
}

function isAtom(token: PermissionToken): token is PermissionAtomToken {
    return typeof token === "string";
}

function isComposite(token: PermissionToken): token is PermissionCompositeToken {
    return typeof token !== "string";
}

function clone(token: PermissionToken): PermissionToken;
function clone(token: PermissionToken | undefined): PermissionToken | undefined;
function clone(token: PermissionToken | undefined): PermissionToken | undefined {
    if (!token) return;

    return typeof token === "string"
        ? token
        : token.slice() as any as PermissionToken;
}

function matchAtom(source: PermissionAtomToken, target: PermissionAtomToken | PermissionTokenWildcard): boolean {
    return source === target || target === PERMISSION_TOKEN_WILDCARD;
}

function match(source: PermissionToken, target: PermissionToken): boolean {
    if (source === target) {
        return true;
    }

    if (isAtom(source) && isAtom(target)) {
        return matchAtom(source, target);
    }

    if (isComposite(source) && isComposite(target)) {
        return (
            matchAtom(source[0] as PermissionAtomToken, target[0] as PermissionAtomToken) &&
            matchAtom(source[1] as PermissionAtomToken, target[1] as PermissionAtomToken)
        );
    }

    return false;
}

function equals(t1: PermissionToken, t2: PermissionToken) {
    // this matches:
    // - both atoms
    // - same composite instances
    if (t1 === t2) return true;

    // needs only to match composite here
    if (isComposite(t1) && isComposite(t2)) {
        return t1[0] == t2[0] && t1[1] === t2[1];
    }

    return false;
}


export default {
    isAtom,
    isComposite,
    parse,
    clone,
    match,
    equals,
}
