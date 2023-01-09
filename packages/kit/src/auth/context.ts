import { ForbiddenError, useContextProperty, UnauthorizedError, useContext } from "@httpc/server";
import { KEY, RESOLVE, useContainer } from "../di";
import { useLogger } from "../logging";
import { Authorization, Assertion } from "../permissions";
import { IAuthorizationService } from "./types";


export function useUser(): IUser;
export function useUser(mode: "optional"): IUser | undefined;
export function useUser(mode?: "optional"): IUser | undefined {
    const { user } = useContext();
    if (!user && mode !== "optional") {
        throw new UnauthorizedError();
    }

    return user;
}


export function useIsAuthenticated(): boolean {
    return !!useUser("optional");
}


export function useAuthentication(user: IUser | undefined): IUser | undefined {
    useContextProperty("user", user || undefined);

    useLogger().verbose("Authentication: %o", user || "Anonymous");

    return user;
}

export function useAuthorization(): Authorization | undefined;
export function useAuthorization(auth: string | Authorization): Authorization;
export function useAuthorization(action: "set" | "merge", auth: string | Authorization): Authorization;
export function useAuthorization(action?: string | Authorization, auth?: string | Authorization) {
    if (arguments.length === 1) {
        auth = action;
        action = "set";
    }

    let { authorization } = useContext();

    if (action && auth) {

        // check if an authz service is registered
        const service = getAuthorizationService();
        if (service) {
            if (action === "merge" && authorization) {
                authorization = authorization.merge(auth);
            }

            authorization = service.createAuthorization(auth);

        } else {

            // no service --> use raw authorization management

            if (action === "merge" && authorization) {
                authorization = authorization.merge(auth);
            } else if (auth instanceof Authorization) {
                authorization = auth;
            } else {
                authorization = Authorization.parse(auth);
            }
        }


        useContextProperty("authorization", authorization);

        const logger = useLogger();
        if (logger.isLevelEnabled("verbose")) {
            logger.verbose("Authorization: %s", authorization.toString());
        }
    }

    return authorization;
}


export function useAuthorize(permissions: string | Assertion): void {
    const logger = useLogger();

    if (!permissions) {
        logger.warn("Authorized: no permission provided");
        return;
    }

    const authorization = useAuthorization();
    if (!authorization) {
        logger.warn("Not Authorized: missing authorization");
        throw new UnauthorizedError();
    }


    // check if an authz service is registered
    const service = getAuthorizationService();
    if (service) {
        service.assert(authorization, permissions);
    } else {
        // no service --> use raw assert
        const assertion = typeof permissions === "string" ? Assertion.parse(permissions) : permissions;
        if (!assertion.test(authorization).success) {
            logger.warn("Not Authorized: %s", assertion);
            throw new ForbiddenError();
        }
    }

    logger.verbose("Authorized: %s", permissions);
}


export function useIsAuthorized(permissions: string | Assertion): boolean {
    const logger = useLogger();

    if (!permissions) {
        logger.warn("IsAuthorized(OK): no permission provided");
        return true;
    }

    const authorization = useAuthorization();
    if (!authorization) {
        logger.warn("IsAuthorized(KO): missing authorization");
        return false;
    }

    let isAuthorized: boolean;

    // check if an authz service is registered
    const service = getAuthorizationService();
    if (service) {
        isAuthorized = service.check(authorization, permissions);
    } else {
        // no service --> use raw assert
        const assertion = typeof permissions === "string" ? Assertion.parse(permissions) : permissions;
        isAuthorized = assertion.test(authorization).success;
    }

    logger.verbose("IsAuthorized(%s): %s", isAuthorized ? "OK" : "KO", permissions);
    return isAuthorized;
}


function getAuthorizationService(): IAuthorizationService | undefined {
    const container = useContainer();
    if (container.isRegistered(KEY("IAuthorizationService"), true)) {
        return RESOLVE(container, "IAuthorizationService");
    }
}
