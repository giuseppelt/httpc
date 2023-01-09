import { injectable } from "tsyringe";
import { options } from "../di";
import { logger } from "../logging";
import type { ILogger } from "../logging";
import { Assertion, Authorization, InvalidClaim, PermissionsChecker, PermissionSerializer, PermissionsModel } from "../permissions";
import { BaseService } from "../services";
import { IAuthorizationService } from "./types";


export type PermissionsAuthorizationServiceOptions = {
    model: PermissionsModel
    authorize(user: IUser): string | Authorization | Promise<string | Authorization>
}

@injectable()
export class PermissionsAuthorizationService extends BaseService() implements IAuthorizationService<Authorization> {
    protected permissions: PermissionsChecker

    constructor(
        @logger() logger: ILogger,
        @options() protected options: PermissionsAuthorizationServiceOptions,
    ) {
        //@ts-expect-error
        super(...arguments);

        this.permissions = new PermissionsChecker({ model: options.model });
    }

    async authorize(user: IUser): Promise<Authorization> {
        let authorization = await this.options.authorize(user);

        if (typeof authorization === "string") {
            authorization = this.createAuthorization(authorization);
        }

        this.logger.verbose("Authorized(%s) %o", authorization, user);

        return authorization;
    }

    createAuthorization(authorization: string | Authorization): Authorization {
        try {
            if (typeof authorization === "string") {
                return this.permissions.parse("authorization", authorization);
            } else {
                return this.permissions.validate(authorization);
            }
        } catch (err) {
            if (err instanceof InvalidClaim) {
                this._raiseError("not_supported", err.message, { claim: err.claim });
            }
            throw err;
        }
    }

    check(authorization: Authorization, assertion: any): boolean {
        assertion = this._getAssertion(assertion);

        const result = this.permissions.test(authorization, assertion);
        this.logger.verbose("Check(%s): %s", result.success ? "OK" : "KO", assertion);

        return result.success;
    }

    assert(authorization: Authorization, assertion: any): void {
        assertion = this._getAssertion(assertion);

        const result = this.permissions.test(authorization, assertion);
        if (!result.success) {
            this._raiseError("forbidden", { claim: PermissionSerializer.serializeAssertionClaim(result.failed) });
        }

        this.logger.verbose("Assertion success: %s", assertion);
    }

    protected _getAssertion(assertion: any): Assertion {
        if (typeof assertion === "string") {
            assertion = Assertion.parse(assertion);
        }
        if (!(assertion instanceof Assertion)) {
            this._raiseError("invalid_param", "Invalid assertion");
        }

        try {
            return this.permissions.validate(assertion);
        } catch (err) {
            if (err instanceof InvalidClaim) {
                this._raiseError("not_supported", err.message, { claim: err.claim });
            }
            throw err;
        }
    }
}
