import { UnauthorizedError } from "@httpc/server";
import { singleton } from "tsyringe";
import { options, optionsOf, env, alias, KEY } from "../di";
import type { ILogger } from "../logging";
import { logger } from "../logging";
import { BaseService, ServiceErrorPreset } from "../services";
import { cleanNotDefined } from "../utils";
import { JwtPayload, JwtService, JWT_CLAIMS } from "./JwtService";
import { IAuthenticationService } from "./types";



export type BearerAuthenticationServiceOptions = {
    jwtSecret: string
    onDecodePayload?: (payload: JwtPayload) => Promise<IUser>
}


const BearerAuthenticationServiceErrors = ServiceErrorPreset
    .add("expired", { status: 401 })

@singleton()
@alias(KEY("BearerAuthentication"))
export class BearerAuthenticationService extends BaseService(BearerAuthenticationServiceErrors) implements IAuthenticationService<string> {
    constructor(
        @logger() logger: ILogger,
        protected readonly jwt: JwtService,
        @options() protected readonly options: BearerAuthenticationServiceOptions,
    ) {
        //@ts-expect-error
        super(...arguments);
    }

    async authenticate(token: string): Promise<IUser> {
        if (!this.options.jwtSecret) {
            this._raiseError("misconfiguration", "No jwtSecret configured");
        }

        const result = this.jwt.validate(token, {
            secret: this.options.jwtSecret
        });

        if (!result.success) {
            if (result.error === "expired") {
                this._raiseError("expired");
            } else {
                this._raiseError("unauthorized");
            }
        }

        return await this.onDecode(result.payload);
    }

    protected async onDecode(payload: JwtPayload): Promise<IUser> {
        if (this.options.onDecodePayload) {
            return await this.options.onDecodePayload(payload);
        }

        if (typeof payload.sub !== "string" || !payload.sub) {
            throw new UnauthorizedError("Missing auth data (sub claim)");
        }

        const props = Object.fromEntries(
            Object.entries(payload)
                .filter(([key]) => !JWT_CLAIMS.includes(key))
        );

        return {
            id: payload.sub,
            ...cleanNotDefined(props),
        };
    }
}

@optionsOf(BearerAuthenticationService)
@singleton()
export class DefaultBearerAuthenticationServiceOptions implements BearerAuthenticationServiceOptions {
    constructor(
        @env("JWT_SECRET") public readonly jwtSecret: string,
        @env("JWT_DECODE", undefined) public readonly onDecodePayload?: (payload: JwtPayload) => Promise<IUser>
    ) {
    }
}
