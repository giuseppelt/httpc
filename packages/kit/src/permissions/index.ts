import Parser from "./Parser";
import * as Token from "./Token";
import Serializer from "./Serializer";
import { PermissionsModel } from "./model";
import type { ICacheSync } from "../caching";
import { assert } from "../internal";

export { Token as PermissionToken }
export { Parser as PermissionParser }
export * from "./Parser";
export { Serializer as PermissionSerializer }
export * from "./Serializer";
export * from "./model";


export type TokenClaim = string | readonly string[]

export type AuthClaim = Readonly<{
    token: TokenClaim
    scope?: TokenClaim
}>

export type AssertionClaim = AuthClaim & Readonly<{
    negative?: boolean
}>

export type GrantClaim = AuthClaim & Readonly<{
    subject: TokenClaim
}>


export class InvalidClaim extends Error {
    constructor(readonly claim: string, message?: string) {
        super(message || "Invalid claim")
    }
}


export class AuthorizationBuilder {
    protected _claims: AuthClaim[];

    constructor(extend: Authorization | AuthorizationBuilder | AuthClaim[] | AuthClaim | string);
    constructor();
    constructor(extend?: Authorization | AuthorizationBuilder | AuthClaim[] | AuthClaim | string) {
        this._claims = [];

        if (extend) {
            this.add(extend);
        }
    }

    add(claim: AuthClaim | AuthClaim[] | AuthorizationBuilder | Authorization | string) {
        if (typeof claim === "string") {
            Parser.parseAuthorization(claim).forEach(x => this.add(x));
            return this;
        }
        if (Array.isArray(claim)) {
            claim.forEach(x => this.add(x));
            return this;
        }
        if (claim instanceof AuthorizationBuilder) {
            claim._claims.forEach(x => this.add(x));
            return this;
        }
        if (claim instanceof Authorization) {
            claim.claims.forEach(x => this.add(x));
            return this;
        }

        this._claims.push({
            token: Array.isArray(claim.token) ? claim.token.slice() : claim.token,
            scope: Array.isArray(claim.scope) ? claim.scope.slice() : claim.scope,
        });

        return this;
    }

    build(): Authorization {
        return new Authorization(this._claims);
    }
}

export class Authorization {
    constructor(readonly claims: AuthClaim[]) {
    }

    protected *[Symbol.iterator]() {
        yield* this.claims;
    }

    merge(auth: string | Authorization): Authorization {
        return new AuthorizationBuilder(this).add(auth).build();
    }

    toString() {
        return Serializer.serialize(this);
    }

    static parse(claims: string): Authorization {
        return new AuthorizationBuilder(claims).build();
    }
}


export class AssertionBuilder {
    protected _claims: AssertionClaim[];

    constructor(extend: Assertion | AssertionBuilder | AssertionClaim[] | AssertionClaim | string);
    constructor();
    constructor(extend?: Assertion | AssertionBuilder | AssertionClaim[] | AssertionClaim | string) {
        this._claims = [];

        if (extend) {
            this.add(extend);
        }
    }

    add(claim: AssertionClaim | AssertionClaim[] | AssertionBuilder | Assertion | string) {
        if (typeof claim === "string") {
            Parser.parseAssertion(claim).forEach(x => this.add(x));
            return this;
        }
        if (Array.isArray(claim)) {
            claim.forEach(x => this.add(x));
            return this;
        }
        if (claim instanceof AssertionBuilder) {
            claim._claims.forEach(x => this.add(x));
            return this;
        }
        if (claim instanceof Assertion) {
            claim.claims.forEach(x => this.add(x));
            return this;
        }

        this._claims.push({
            token: Array.isArray(claim.token) ? claim.token.slice() : claim.token,
            scope: Array.isArray(claim.scope) ? claim.scope.slice() : claim.scope,
            negative: claim.negative,
        });

        return this;
    }

    build(): Assertion {
        return new Assertion(this._claims);
    }
}

export class Assertion {
    constructor(readonly claims: AssertionClaim[]) {
    }

    protected *[Symbol.iterator]() {
        yield* this.claims;
    }

    toString() {
        return Serializer.serialize(this);
    }

    test(auth: Authorization): AssertResult {
        if (this.claims.length === 0) return { success: true };

        for (const assertion of this.claims) {
            let isPass = false;

            for (const claim of auth) {
                const isTokenPass = Token.match(claim.token, assertion.token);
                const isScopePass = assertion.scope ? claim.scope ? Token.match(claim.scope, assertion.scope) : false : true;

                if (isTokenPass && isScopePass) {
                    isPass = true;
                    break;
                }
            }

            isPass = isPass !== assertion.negative;
            if (!isPass) {
                return { success: false, failed: assertion };
            }
        }

        return { success: true }
    }

    static parse(claims: string): Assertion {
        return new AssertionBuilder(claims).build();
    }
}

type AssertResult =
    | Readonly<{ success: true }>
    | Readonly<{ success: false, failed: AuthClaim }>


export class PermissionsChecker {
    protected _cache?: ICacheSync<[item: any, validated: boolean]>;
    protected _model?: PermissionsModel;

    constructor(options?: {
        model?: PermissionsModel
        cache?: false | true | ICacheSync
    }) {
        this._model = options?.model;
        this._cache = options?.cache === true ? new Map() : options?.cache || undefined;
    }

    can(authorization: string | Authorization, assertion: string | Assertion): boolean {
        return this.test(authorization, assertion).success;
    }

    test(authorization: string | Authorization, assertion: string | Assertion): AssertResult {
        [authorization] = this._getAuthorization(authorization);
        authorization = this.validate(authorization);

        [assertion] = this._getAssertion(assertion);
        assertion = this.validate(assertion);

        if (assertion.claims.length === 0) {
            return { success: true };
        }

        const model = this._model;
        if (!model) {
            return assertion.test(authorization);
        }

        for (const assertClaim of assertion) {
            let isPass = false;

            for (const authClaim of authorization) {
                const isTokenPass = tokenMatch(authClaim.token, assertClaim.token);
                const isScopePass = assertClaim.scope ? authClaim.scope ? Token.match(authClaim.scope, assertClaim.scope) : false : true;

                if (isTokenPass && isScopePass) {
                    isPass = true;
                    break;
                }
            }

            isPass = isPass !== assertClaim.negative;
            if (!isPass) {
                return { success: false, failed: assertClaim };
            }
        }

        return { success: true };


        function tokenMatch(source: TokenClaim, target: TokenClaim): boolean {
            assert(model, "model");

            if (Token.match(source, target)) {
                return true;
            }

            const def = model.find(source, "exact");
            // must be defined, because it already passed validation, if error -> this is a bug
            assert(def, "token definition not found");

            if (def.includes && def.includes.length > 0) {
                for (const include of def.includes) {
                    if (tokenMatch(Parser.parseToken(include), target)) {
                        return true;
                    }
                }
            }

            return false;
        }
    }

    supports(authorization: string | Authorization): boolean {
        const model = this._model;
        if (!model) return true;

        [authorization] = this._getAuthorization(authorization);

        for (const { token } of authorization) {
            if (!model.find(token, "exact")) {
                return false;
            }
        }

        return true;
    }

    parse(what: "authorization", value: string): Authorization;
    parse(what: "assertion", value: string): Assertion;
    parse(what: "authorization" | "assertion", value: string): Authorization | Assertion {
        const model = this._model;

        let [instance, validated] = what === "assertion"
            ? this._getAssertion(value)
            : this._getAuthorization(value);

        if (!model || validated) {
            return instance;
        }

        instance = this.validate(instance);

        if (this._cache) {
            const key = this._getCacheKey(what, value);
            this._cache.set(key, [instance, true]);
        }

        return instance;
    }

    validate(authorization: Authorization): Authorization;
    validate(assertion: Assertion): Assertion;
    validate<T extends Authorization | Assertion>(what: T): T;
    validate(what: Authorization | Assertion) {
        const model = this._model;
        if (!model) return what;

        for (const claim of what) {
            if (!model.find(claim.token, "exact")) {
                throw new InvalidClaim(what instanceof Assertion
                    ? Serializer.serializeAssertionClaim(claim)
                    : Serializer.serializeAuthorizationClaim(claim)
                );
            }
        }

        return this.consolidate(what);
    }

    consolidate(authorization: Authorization): Authorization;
    consolidate(assertion: Assertion): Assertion;
    consolidate<T extends Authorization | Assertion>(what: T): T;
    consolidate(what: Authorization | Assertion) {
        const model = this._model;

        // try to reduce the instance
        // - alias substitution (model only)
        // - eliminating duplicate

        if (what instanceof Authorization) {
            let isConsolidated = false;
            let claims: AuthClaim[] = [];

            for (let claim of what) {
                // alias substitution
                const deAliasedToken = replaceAlias(claim);
                if (deAliasedToken) {
                    isConsolidated = true;
                    claim = {
                        token: deAliasedToken,
                        scope: claim.scope,
                    };
                }

                // look for already present
                const existing = claims.find(x => x.scope === claim.scope && Token.equals(x.token, claim.token))
                if (existing) {
                    isConsolidated = true;
                    continue;
                }

                claims.push(claim);
            }

            return isConsolidated ? new Authorization(claims) : what;

        } else if (what instanceof Assertion) {
            let isConsolidated = false;
            let claims: AssertionClaim[] = [];

            for (let claim of what) {
                // alias substitution
                const deAliasedToken = replaceAlias(claim);
                if (deAliasedToken) {
                    isConsolidated = true;
                    claim = {
                        token: deAliasedToken,
                        scope: claim.scope,
                        negative: claim.negative,
                    };
                }

                // look for already present
                const existing = claims.find(x => x.scope === claim.scope && Token.equals(x.token, claim.token) && !!x.negative === !!claim.negative)
                if (existing) {
                    isConsolidated = true;
                    continue;
                }

                claims.push(claim);
            }

            return isConsolidated ? new Assertion(claims) : what;
        }

        throw new Error("Invalid param: authorization or assertion required");



        function replaceAlias(claim: AuthClaim | AssertionClaim | GrantClaim) {
            if (!model) return;

            // find works with alias
            const def = model.find(claim.token, "exact");
            if (!def) {
                throw new InvalidClaim(Serializer.serializeTokenClaim(claim.token));
            }

            // if token are different, it means it matched an alias
            if (!Token.equals(claim.token, def.fullToken)) {
                return Token.simplify(def.fullToken);
            }
        }
    }

    protected _getAuthorization(authorization: string | Authorization): [Authorization, boolean] {
        return this._getCachedOrCreate(authorization, "authorization", authorization => Authorization.parse(authorization));
    }

    protected _getAssertion(assertion: string | Assertion): [Assertion, boolean] {
        return this._getCachedOrCreate(assertion, "assertion", assertion => Assertion.parse(assertion));
    }

    protected _getCachedOrCreate<T>(value: string | T, prefix: string, factory: (value: string) => T): [T, boolean] {
        if (typeof value !== "string") {
            return [value, false];
        }
        if (!this._cache) {
            return [factory(value), false];
        }

        const key = this._getCacheKey(prefix, value);

        let item = this._cache.get(key);
        if (!item) {
            this._cache.set(key, item = [factory(value), false]);
        }

        return item;
    }

    protected _getCacheKey(prefix: string, value: string) {
        return `${prefix}/${value}`;
    }
}
