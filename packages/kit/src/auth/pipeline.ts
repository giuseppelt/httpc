import { HttpCall, HttpCServerMiddleware, UnauthorizedError, useContext } from "@httpc/server";
import { useAuthorize } from "./context";


export function Authenticated(permissions?: string | ((...args: any[]) => string)): HttpCServerMiddleware {
    return (call, next) => {
        const { user } = useContext();
        if (!user) {
            throw new UnauthorizedError();
        }

        if (permissions) {
            checkAuthorization(call, permissions);
        }

        return next(call);
    };
}

export function Authorized(permissions: string | ((...args: any[]) => string)): HttpCServerMiddleware {
    return (call, next) => {
        checkAuthorization(call, permissions);
        return next(call);
    }
}

function checkAuthorization(call: HttpCall, permissions: string | ((...args: any[]) => string)) {
    if (typeof permissions === "function") {
        permissions = permissions(...call.params);
    }

    useAuthorize(permissions);
}
