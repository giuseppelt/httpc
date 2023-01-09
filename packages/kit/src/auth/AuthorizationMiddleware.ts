import { container } from "tsyringe";
import { HttpCServerMiddleware, PassthroughMiddleware } from "@httpc/server";
import { KEY, RESOLVE, useContainer } from "../di";
import { Authorization, PermissionsModel } from "../permissions";
import { useAuthorization, useUser } from "./context";
import { PermissionsAuthorizationService, PermissionsAuthorizationServiceOptions } from "./PermissionsAuthorizationService";


export type AuthorizationMiddlewareOptions = {
    model?: PermissionsModel
    onAuthorize(user: IUser): string | Authorization | Promise<string | Authorization>
}


export function AuthorizationMiddleware(options?: AuthorizationMiddlewareOptions | AuthorizationMiddlewareOptions["onAuthorize"]): HttpCServerMiddleware {
    const authorize = typeof options === "function" ? options : options?.onAuthorize || onAuthorize;

    if (typeof options === "object" && options.model) {
        container.registerSingleton(KEY("IAuthorizationService"), PermissionsAuthorizationService);
        container.registerInstance<PermissionsAuthorizationServiceOptions>(KEY("OPTIONS", PermissionsAuthorizationService), {
            model: options.model,
            authorize: options.onAuthorize
        });
    }

    return PassthroughMiddleware(async () => {
        const user = useUser("optional");
        if (user) {
            useAuthorization(await authorize(user));
        }
    });
}


async function onAuthorize(user: IUser): Promise<string | Authorization> {
    const container = useContainer();
    const auth = RESOLVE(container, "IAuthorizationService");

    return await auth.authorize(user);
}
