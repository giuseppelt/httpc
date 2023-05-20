import { UnauthorizedError } from "@httpc/server";
import { singleton } from "tsyringe";
import { options, alias, KEY, optionsOf, env } from "../di";
import type { ILogger } from "../logging";
import { logger } from "../logging";
import { BaseService, ServiceErrorPreset } from "../services";
import { cleanNotDefined } from "../utils";
import { Factorable } from "../types";
import { IAuthenticationService } from "./types";
import { JwtPayload, JwtService, JwtValidateOptions, JWT_CLAIMS } from "./JwtService";



export type BearerAuthenticationServiceOptions = {
    jwtSecret: string
    validations?: Factorable<Omit<JwtValidateOptions, "secret" | "algorithm">>
    onDecodePayload?: (payload: JwtPayload) => (Promise<IUser> | IUser)
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

        const validations = this.options?.validations && (typeof this.options.validations === "function"
            ? this.options.validations()
            : this.options.validations
        );

        const result = this.jwt.validate(token, {
            ...validations,
            secret: this.options.jwtSecret
        });

        this.logger.verbose("Jwt validation %o", result);

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
                .filter(([key]) => !(JWT_CLAIMS as readonly string[]).includes(key))
        );

        return {
            id: payload.sub,
            ...cleanNotDefined(props),
        };
    }
}


@optionsOf(BearerAuthenticationService)
@singleton()
class DefaultBearerAuthenticationServiceOptions implements BearerAuthenticationServiceOptions {
    constructor(
        @env("JWT_SECRET") public readonly jwtSecret: string,
    ) {
    }
}
