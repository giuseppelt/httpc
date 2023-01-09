import type { AuthClaim, AssertionClaim, GrantClaim, TokenClaim } from ".";


export class ClaimParserError extends Error {
    constructor(readonly claim: string) {
        super(`Fail to parse claim: ${claim}`);
    }
}


function parseToken(token: string): TokenClaim {
    return token.includes(":") ? token.split(":") : token;
}

function parseAuthSingle(claim: string): AuthClaim {
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

    return claim.split(" ").map(parseAuthSingle);
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

    return { ...parseAuthSingle(assertion), negative };
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
        ...parseAuthSingle(grant.substring(subjectIdx + 1)),
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
