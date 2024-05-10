import { ICacheSync } from "../caching";
import { assert } from "../internal";
import { PermissionsModel } from "./PermissionModel";
import Serializer from "./PermissionSerializer";
import Token from "./Token";
import { Authorization, Assertion, PermissionToken, AuthClaim, AssertionClaim, GrantClaim, AssertionResult, PERMISSION_TOKEN_WILDCARD } from "./models";



export class InvalidClaim extends Error {
    constructor(readonly claim: string, message?: string) {
        super(message || "Invalid claim")
    }
}


export class PermissionsChecker {
    public static readonly DEFAULT = new PermissionsChecker();
    private static readonly RESULT_SUCCESS: AssertionResult = Object.freeze({ success: true });

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

    test(authorization: string | Authorization, assertion: string | Assertion): AssertionResult {
        [authorization] = this._getAuthorization(authorization);
        authorization = this.validate(authorization);

        [assertion] = this._getAssertion(assertion);
        assertion = this.validate(assertion);

        if (assertion.claims.length === 0) {
            return PermissionsChecker.RESULT_SUCCESS;
        }

        const model = this._model;

        for (const assertClaim of assertion) {
            let isPass = false;

            for (const authClaim of authorization) {
                const isTokenPass = tokenMatch(model, authClaim.token, assertClaim.token);
                const isScopePass = (assertClaim.scope && authClaim.scope)
                    ? tokenMatch(model, authClaim.scope, assertClaim.scope)
                    : (!assertClaim.scope && !authClaim.scope)
                        ? true
                        : false;

                if (isTokenPass && isScopePass) {
                    isPass = true;
                    break;
                }
            }

            isPass = isPass !== !!assertClaim.negative;
            if (!isPass) {
                return { success: false, failed: assertClaim };
            }
        }

        return PermissionsChecker.RESULT_SUCCESS;


        function tokenMatch(model: PermissionsModel | undefined, source: PermissionToken, target: PermissionToken): boolean {
            if (Token.match(source, target)) {
                return true;
            }

            if (!model) {
                return false;
            }

            const def = model.find(source);
            // must be defined, because it already passed validation, if error -> this is a bug
            assert(def, "token definition not found");
            // must be an atom def (either atom, or composite-childe), as auth claims cannot contain wildcards
            assert(def.kind === "atom", "token definition unexpected");

            if (def.includes && def.includes.length > 0) {
                for (const include of def.includes) {
                    if (tokenMatch(model, include, target)) {
                        return true;
                    }
                }
            }

            return false;
        }
    }

    supports(authorization: string | Authorization): boolean {
        const model = this._model;
        if (!model) {
            return true;
        }

        if (authorization === PERMISSION_TOKEN_WILDCARD) {
            return model.hasAtoms;
        }

        [authorization] = this._getAuthorization(authorization);

        for (const { token } of authorization) {
            if (!model.find(token, "claim")) {
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
        if (!model) {
            return what;
        }

        for (const claim of what) {
            if (!model.find(claim.token, "claim")) {
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
        if (!(
            what instanceof Authorization ||
            what instanceof Assertion
        )) {
            throw new Error("Invalid param: authorization or assertion required");
        }

        // try to reduce the instance
        // - alias substitution (model only)
        // - eliminating duplicates and includes

        let isConsolidated = false;
        let claims: AuthClaim[] | AssertionClaim[] = [];

        // 1. de-alias
        for (let claim of what) {
            const deAliased = this._deAliasClaim(claim);
            isConsolidated ||= deAliased !== claim;

            claims.push(deAliased);
        }

        // 2. remove included/inherited
        claims = this._deIncludeClaims(claims);
        isConsolidated ||= claims.length !== what.claims.length;

        // if not modified, just return the same instance
        if (!isConsolidated) {
            return what;
        }

        const ctor = what.constructor as { new(claims: any[]): any };
        assert(ctor, "constructor");

        return new ctor(claims);
    }

    private _deAliasClaim(claim: AuthClaim | AssertionClaim | GrantClaim) {
        const model = this._model;
        if (!model) {
            return claim;
        }

        const token = deAlias(claim.token)!;
        const scope = deAlias(claim.scope);
        const subject = (claim as GrantClaim).subject ? deAlias((claim as GrantClaim).subject) : undefined;

        if (subject) {
            // this is a grant claim
            return (
                token === claim.token &&
                scope === claim.scope &&
                (claim as GrantClaim).subject === subject
            )
                ? claim
                : { token, scope, subject } satisfies GrantClaim;
        }

        if ((claim as AssertionClaim).negative) {
            return (
                token === claim.token &&
                scope === claim.scope
            )
                ? claim
                : { token, scope, negative: (claim as AssertionClaim).negative } satisfies AssertionClaim;
        }

        return (
            token === claim.token &&
            scope === claim.scope
        )
            ? claim
            : { token, scope } satisfies AuthClaim;


        function deAlias(token: PermissionToken | undefined) {
            if (!token) return;

            const def = model!.find(token, "claim");
            // must be defined, because it already passed validation, if error -> this is a bug
            assert(def, "token definition not found");

            return Token.equals(token, def.token)
                ? token
                : def.token;
        }
    }

    private _deIncludeClaims(claims: AuthClaim[] | AssertionClaim[] | GrantClaim[]) {
        if (claims.length < 2) {
            return claims;
        }

        /**
         * N.B.
         * deIncludeClaims assumes passed claims are already de-aliased
         */

        // starts from the tail
        let clone = claims.slice().reverse();
        let idx = 0;
        while (idx < clone.length) {
            let included = false;

            // check all other claims
            for (let a = 0; a < clone.length; a++) {
                if (a === idx) continue; // exclude itself

                if (isClaimIncluded(this._model, clone[idx], clone[a])) {
                    included = true;
                    break;
                }
            }

            if (included) {
                clone.splice(idx, 1);
            } else {
                idx++;
            }
        }

        return clone.length === claims.length ? claims : clone.reverse();


        function isClaimIncluded<T extends AuthClaim | AssertionClaim | GrantClaim>(model: PermissionsModel | undefined, source: T, target: T) {
            // check if is a grant
            if ((source as GrantClaim).subject) {
                if (!(target as GrantClaim).subject || !isTokenIncluded(model, (source as GrantClaim).subject, (target as GrantClaim).subject)) {
                    return false;
                }
            }

            // check if is an assertion
            if (typeof (source as AssertionClaim).negative === "boolean") {
                if ((source as AssertionClaim).negative !== (target as AssertionClaim).negative) {
                    return false;
                }
            }

            if (!isTokenIncluded(model, source.token, target.token)) {
                return false;
            }

            if ((source.scope === undefined) !== (target.scope === undefined)) {
                return false;
            }
            if (source.scope && target.scope && !isTokenIncluded(model, source.scope, target.scope)) {
                return false;
            }

            return true;
        }

        function isTokenIncluded(model: PermissionsModel | undefined, source: PermissionToken, target: PermissionToken) {
            if (Token.match(source, target)) {
                return true;
            }

            if (model) {
                const def = model.find(target, "claim");
                // must be defined, because it already passed validation, if error -> this is a bug
                assert(def, "token definition not found");

                if (def.kind === "atom" && def.includes) {
                    for (let include of def.includes) {
                        if (isTokenIncluded(model, source, include)) {
                            return true;
                        }
                    }
                }
            }

            return false;
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
