import jws from "jws";
import { singleton } from "tsyringe";
import type { ILogger } from "../logging";
import { logger } from "../logging";
import { env, options, optionsOf } from "../di";
import { BaseService } from "../services";
import { cleanNotDefined } from "../utils";



export type JwtPayload = {
    aud?: string
    exp?: number
    iss?: string
    sub?: string
    iat?: number
    nbf?: number
    [key: string]: string | number | undefined
}

export type JwtTokenOptions = {
    expireIn?: number
    expireAt?: number
    notBefore?: true | number
    audience?: string
    subject?: string
    issuer?: string
    issuedAt?: true | number
    secret?: string
}

const JWT_CLAIMS_MAP: Partial<Record<keyof JwtTokenOptions, string>> = {
    audience: "aud",
    expireAt: "exp",
    issuer: "iss",
    subject: "sub",
    notBefore: "nbf",
    issuedAt: "iat",
};

export const JWT_CLAIMS = [
    "sub",
    "aud",
    "iss",
    "exp",
    "nbf",
    "jti",
    "iat"
] as const;

export type JwtDecodeOptions = {
    secret?: string
}

export type JwtValidateOptions = {
    algorithm?: string
    secret?: string
    notBefore?: boolean | "required"
    issuedAt?: boolean | "required"
    expired?: boolean | "required"
    audience?: string
    issuer?: string
}

export type JwtValidationResult<T = any> =
    | JwtValidationSuccess<T>
    | JwtValidationError

export type JwtValidationSuccess<T = any> = {
    success: true
    payload: T
}

export type JwtValidationError<T = any> = {
    success: false
    error: "invalid" | "malformed" | "expired"
    claim?: typeof JWT_CLAIMS[number] | (string & {})
    payload?: T
}

export type JwtServiceOptions = {
    secret?: string
    defaultDuration?: number
}


@singleton()
export class JwtService extends BaseService() {

    constructor(
        @logger() logger: ILogger,
        @options(undefined) readonly options: JwtServiceOptions = {},
    ) {
        //@ts-expect-error
        super(...arguments);

        if (!options.secret) {
            this.logger.warn("No JwtSecret set");
        }
    }

    createToken(payload: JwtPayload, options?: JwtTokenOptions): string {
        const {
            secret = this.options?.secret,
            expireIn = this.options.defaultDuration,
            ...jwtProps
        } = options || {};


        if (!secret) {
            this._raiseError("misconfiguration", "Missing jwt-secret configuration");
        }


        payload = { ...payload }; // clone it because 

        if (!payload.exp && expireIn && expireIn > 0) {
            jwtProps.expireAt = Math.floor(Date.now() / 1000) + expireIn;
        }
        if (jwtProps.notBefore === true) {
            jwtProps.notBefore = Math.floor(Date.now() / 1000);
        }
        if (jwtProps.issuedAt === true) {
            jwtProps.issuedAt = Math.floor(Date.now() / 1000);
        }

        // map options to props ( expireAt -> exp, audience -> aud, ... )
        for (const key in JWT_CLAIMS_MAP) {
            if (key in jwtProps) {
                payload[(JWT_CLAIMS_MAP as any)[key]] = (jwtProps as any)[key];
            }
        }


        return this.sign(payload, {
            secret
        });
    }

    decode<T = JwtPayload>(token: string, options?: JwtDecodeOptions): { header: jws.Header, payload: T } | undefined {
        const secret = options?.secret || this.options.secret;
        if (!secret) {
            this._raiseError("misconfiguration", "Missing jwt-secret configuration");
        }

        const { header, payload } = jws.decode(token);

        if (!jws.verify(token, header.alg, secret)) {
            return;
        }

        return { header, payload };
    }

    validate<T = JwtPayload>(token: string, options?: JwtValidateOptions): JwtValidationResult<T> {
        const {
            notBefore = true,
            issuedAt = true,
            expired = true,
            algorithm = "HS256",
            audience,
            issuer,
            secret,
        } = options || {};

        let header: jws.Header | undefined;
        let payload: T | undefined;

        try {
            ({ header, payload } = this.decode<T>(token, { secret }) || {});
        } catch (err) {
            this.logger.warn("JwtToken malformed", err);
            return { success: false, error: "malformed" };
        }

        if (!payload || !header) {
            return { success: false, error: "invalid" };
        }

        if (header.alg !== algorithm) {
            return { success: false, error: "invalid" };
        }

        const {
            exp,
            nbf,
            iat,
            iss,
            aud,
        } = payload as JwtPayload;

        const now = Math.floor(Date.now() / 1000);

        if ((expired === "required" && !exp) || (exp && exp <= now)) {
            return { success: false, error: "expired", claim: "exp", payload };
        }
        if (issuer && iss !== issuer) {
            return { success: false, error: "invalid", claim: "iss", payload };
        }
        if (audience && aud !== audience) {
            return { success: false, error: "invalid", claim: "aud", payload };
        }
        if ((notBefore === "required" && !nbf) || (nbf && (nbf < 0 || nbf > now))) {
            return { success: false, error: "invalid", claim: "nbf", payload };
        }
        if ((issuedAt === "required" && !iat) || (iat && (iat < 0 || iat > now))) {
            return { success: false, error: "invalid", claim: "iat", payload };
        }

        return { success: true, payload };
    }


    protected sign(payload: object, options?: { secret?: string }): string {
        const secret = options?.secret || this.options.secret;
        if (!secret) {
            this._raiseError("misconfiguration", "Missing jwt-secret configuration");
        }

        return jws.sign({
            header: { alg: "HS256", typ: "JWT" },
            payload: cleanNotDefined(payload),
            secret,
        });
    }
}


@singleton()
@optionsOf(JwtService)
class DefaultJwtServiceOptions implements JwtServiceOptions {
    constructor(
        @env("JWT_SECRET", undefined) readonly secret?: string,
    ) {
    }
}
