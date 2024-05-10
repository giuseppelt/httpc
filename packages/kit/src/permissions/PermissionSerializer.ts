import { PermissionToken, AuthClaim, AssertionClaim, Authorization, Assertion } from "./models";


function serializeTokenClaim(token: PermissionToken): string {
    return typeof token === "string" ? token : token.join(":");
}

function serializeAuthorizationClaim(claim: AuthClaim): string {
    let str = serializeTokenClaim(claim.token);

    if (claim.scope) {
        str += "@" + serializeTokenClaim(claim.scope);
    }

    return str;
}

function serializeAssertionClaim(assertion: AssertionClaim): string {
    let str = serializeAuthorizationClaim(assertion);

    if (assertion.negative) {
        str = "!" + str;
    }

    return str;
}

function serialize(what: Authorization | Assertion): string {
    const serialize = what instanceof Assertion
        ? serializeAssertionClaim
        : serializeAuthorizationClaim

    return what.claims.map(serialize).join(" ");
}


export default {
    serialize,
    serializeTokenClaim,
    serializeAuthorizationClaim,
    serializeAssertionClaim
}
