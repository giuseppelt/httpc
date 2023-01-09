import { TokenClaim } from ".";


export function simplify(token: TokenClaim) {
    if (typeof token === "string") {
        return token;
    } else if (token.length === 1) {
        return token[0];
    } else {
        return token;
    }
}

function matchSingle(source: string, target: string): boolean {
    return source === target || target === "*";
}

export function match(source: TokenClaim, target: TokenClaim): boolean {
    // simplify first
    source = simplify(source);
    target = simplify(target);

    if (typeof source === "string" && typeof target === "string") {
        return matchSingle(source, target);
    }

    if (Array.isArray(source) && Array.isArray(target)) {
        if (source.length !== target.length) return false;

        for (let a = 0; a < source.length; a++) {
            if (!matchSingle(source[a], target[a])) return false;
        }

        return true;
    }

    return false;
}

export function equals(t1: TokenClaim, t2: TokenClaim) {
    t1 = simplify(t1);
    t2 = simplify(t2);

    if (t1 === t2) return true;

    if (Array.isArray(t1) && Array.isArray(t2) && t1.length === t2.length) {
        for (let a = 0; a < t1.length; a++) {
            if (t1[a] !== t2[a]) return false;
        }
        return true;
    }

    return false;
}
