import type { Nominal } from "../types";
import Parser from "./Parser";
import Token from "./Token";
import Serializer from "./PermissionSerializer";
import { PermissionsChecker } from "./PermissionChecker";


export type PermissionAtomToken = Nominal<string, "AtomToken">
export type PermissionCompositeToken = Nominal<readonly [string, string], "CompositeToken">

export const PERMISSION_TOKEN_WILDCARD = "*";
export type PermissionTokenWildcard = typeof PERMISSION_TOKEN_WILDCARD;

export type PermissionToken =
    | PermissionAtomToken
    | PermissionCompositeToken

export type PermissionTokenRawValue =
    | string
    | readonly [string, string]
    | readonly string[]

export type AuthClaim = Readonly<{
    token: PermissionToken
    scope?: PermissionToken
}>

export type AssertionClaim = AuthClaim & Readonly<{
    negative?: boolean
}>

export type GrantClaim = AuthClaim & Readonly<{
    subject: PermissionToken
}>


export class Authorization {
    constructor(readonly claims: AuthClaim[]) {
    }

    protected *[Symbol.iterator]() {
        yield* this.claims;
    }

    merge(auth: string | Authorization): Authorization {
        return new Authorization.Builder(this).add(auth).build();
    }

    toString() {
        return Serializer.serialize(this);
    }

    static parse(claims: string): Authorization {
        return new Authorization.Builder(claims).build();
    }
}

export namespace Authorization {
    export class Builder {
        protected _claims: AuthClaim[];

        constructor(extend: Authorization | Builder | AuthClaim[] | AuthClaim | string);
        constructor();
        constructor(extend?: Authorization | Builder | AuthClaim[] | AuthClaim | string) {
            this._claims = [];

            if (extend) {
                this.add(extend);
            }
        }

        add(claim: AuthClaim | AuthClaim[] | Builder | Authorization | string): Builder {
            if (typeof claim === "string") {
                claim = Parser.parseAuthorization(claim);
            }

            if (Array.isArray(claim)) {
                claim.forEach(x => this.add(x));
                return this;
            }
            if (claim instanceof Builder) {
                return this.add(claim._claims);
            }
            if (claim instanceof Authorization) {
                return this.add(claim.claims);
            }

            this._claims.push({
                token: Token.clone(claim.token),
                scope: Token.clone(claim.scope),
            });

            return this;
        }

        build(): Authorization {
            return new Authorization(this._claims);
        }
    }
}



export type AssertionResult =
    | Readonly<{ success: true }>
    | Readonly<{ success: false, failed: AssertionClaim }>


export class Assertion {
    constructor(readonly claims: AssertionClaim[]) {
    }

    protected *[Symbol.iterator]() {
        yield* this.claims;
    }

    test(auth: Authorization): AssertionResult {
        return PermissionsChecker.DEFAULT.test(auth, this);
    }

    toString() {
        return Serializer.serialize(this);
    }

    static parse(claims: string): Assertion {
        return new Assertion.Builder(claims).build();
    }
}

export namespace Assertion {
    export class Builder {
        protected _claims: AssertionClaim[];

        constructor(extend: Assertion | Builder | AssertionClaim[] | AssertionClaim | string);
        constructor();
        constructor(extend?: Assertion | Builder | AssertionClaim[] | AssertionClaim | string) {
            this._claims = [];

            if (extend) {
                this.add(extend);
            }
        }

        add(claim: AssertionClaim | AssertionClaim[] | Builder | Assertion | string): Builder {
            if (typeof claim === "string") {
                claim = Parser.parseAssertion(claim)
            }

            if (Array.isArray(claim)) {
                claim.forEach(x => this.add(x));
                return this;
            }
            if (claim instanceof Builder) {
                return this.add(claim._claims);
            }
            if (claim instanceof Assertion) {
                return this.add(claim.claims);
            }

            this._claims.push({
                token: Token.clone(claim.token),
                scope: Token.clone(claim.scope),
                negative: claim.negative,
            });

            return this;
        }

        build(): Assertion {
            return new Assertion(this._claims);
        }
    }
}
