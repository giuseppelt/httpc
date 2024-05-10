import type { AuthClaim, AssertionClaim, GrantClaim, PermissionToken, PermissionAtomToken, PermissionCompositeToken, PermissionTokenRawValue } from "./models";


export class ClaimParserError extends Error {
    constructor(readonly claim: string) {
        super(`Fail to parse claim: ${claim}`);
    }
}


function parseToken(token: PermissionTokenRawValue): PermissionToken {
    if (typeof token === "string") {
        if (token.includes(":")) {
            return parseToken(token.split(":"));
        }

        return token as PermissionAtomToken;
    }

    if (token.length === 1) {
        return parseToken(token[0]);
    }
    if (token.length !== 2) {
        throw new ClaimParserError(token.join(":"));
    }

    return token as PermissionCompositeToken;
}

function parseAuthorizationSingle(claim: string): AuthClaim {
    if (!claim) {
        throw new ClaimParserError(claim);
    }

    const idxScope = claim.indexOf("@");
    const token = idxScope < 0 ? claim : claim.substring(0, idxScope);
    const scope = idxScope < 0 ? undefined : claim.substring(idxScope + 1);

    return {
        token: parseToken(token),
        scope: scope ? parseToken(scope) : undefined,
    };
}

function parseAuthorization(claim: string): AuthClaim[] {
    if (!claim) return [];

    return claim.split(" ").map(parseAuthorizationSingle);
}


function parseAssertionSingle(assertion: string): AssertionClaim {
    if (!assertion) {
        throw new ClaimParserError(assertion);
    }

    let negative = false;
    if (assertion.charAt(0) === "!") {
        negative = true;
        assertion = assertion.substring(1);
    }

    return { ...parseAuthorizationSingle(assertion), negative };
}

function parseAssertion(assertion: string): AssertionClaim[] {
    if (!assertion) return [];

    return assertion.split(" ").map(parseAssertionSingle);
}


function parseGrantSingle(grant: string): GrantClaim {
    const subjectIdx = grant.indexOf(">");
    if (subjectIdx < 0) {
        throw new ClaimParserError(grant);
    }

    return {
        ...parseAuthorizationSingle(grant.substring(subjectIdx + 1)),
        subject: parseToken(grant.substring(0, subjectIdx)),
    }
}

function parseGrants(grants: string): GrantClaim[] {
    if (!grants) return [];

    return grants.split(" ").map(parseGrantSingle);
}


export default {
    parseToken,
    parseAuthorization,
    parseAssertion,
    parseGrants,
}
