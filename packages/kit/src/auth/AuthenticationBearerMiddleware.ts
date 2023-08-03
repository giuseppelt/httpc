import { container } from "tsyringe";
import { HttpCServerMiddleware, PassthroughMiddleware, useContext } from "@httpc/server";
import { KEY, RESOLVE, useContainer } from "../di";
import { JwtPayload } from "./JwtService";
import { catchLogAndThrowUnauthorized } from "../services";
import { useLogger } from "../logging";
import { useAuthentication } from "./context";
import { BearerAuthenticationService, BearerAuthenticationServiceOptions } from "./BearerAuthenticationService";


export type AuthenticationBearerMiddlewareOptions = {
    jwtSecret?: string
    validation?: BearerAuthenticationServiceOptions["validations"]
    onAuthenticate?: (token: string) => Promise<IUser>
    onDecode?: (payload: JwtPayload) => IUser | Promise<IUser>
}

export function AuthenticationBearerMiddleware(options?: AuthenticationBearerMiddlewareOptions): HttpCServerMiddleware {
    const authenticate = options?.onAuthenticate || onAuthenticate;

    if (options?.jwtSecret || options?.onDecode || options?.validation) {
        container.register(KEY("OPTIONS", BearerAuthenticationService), {
            useFactory: container => {
                const jwtSecret = options?.jwtSecret || process.env.JWT_SECRET;
                if (!jwtSecret) {
                    throw new Error("Missing configuration: JWT_SECRET");
                }

                return {
                    jwtSecret,
                    validations: options?.validation,
                    onDecodePayload: options?.onDecode,
                } satisfies BearerAuthenticationServiceOptions;
            },
        });
    }


    return PassthroughMiddleware(async () => {
        const { request, user } = useContext();

        if (!user) {
            const [schema, token] = request.headers.get("authorization")?.split(" ") || [];
            if (schema?.toUpperCase() === "BEARER") {
                useLogger().debug("BearerMiddleware: received jwt %s", token);

                useAuthentication(await authenticate(token || "")
                    .catch(catchLogAndThrowUnauthorized("BearerMiddleware"))
                );
            }
        }
    });
}


async function onAuthenticate(token: string): Promise<IUser> {
    const container = useContainer();
    const auth = RESOLVE(container, "BearerAuthentication");

    return await auth.authenticate(token);
}
