import { container } from "tsyringe";
import { HttpCServerMiddleware, PassthroughMiddleware, useContext } from "@httpc/server";
import { KEY, RESOLVE, useContainer } from "../di";
import { JwtPayload } from "./JwtService";
import { useAuthentication } from "./context";
import { catchLogAndThrowUnauthorized } from "../services";
import { useLogger } from "../logging";


export type AuthenticationBearerMiddlewareOptions = {
    jwtSecret?: string
    onAuthenticate?: (token: string) => Promise<IUser>
    onDecode?: (payload: JwtPayload) => IUser | Promise<IUser>
}

export function AuthenticationBearerMiddleware(options?: AuthenticationBearerMiddlewareOptions): HttpCServerMiddleware {
    const authenticate = options?.onAuthenticate || onAuthenticate;

    if (options?.jwtSecret && !container.isRegistered(KEY("ENV", "JWT_SECRET"), true)) {
        container.registerInstance(KEY("ENV", "JWT_SECRET"), options.jwtSecret);
    }
    if (options?.onDecode) {
        container.registerInstance(KEY("ENV", "JWT_DECODE"), options.onDecode);
    }


    return PassthroughMiddleware(async () => {
        const { request, user } = useContext();

        if (!user) {
            const [schema, token] = request.headers.authorization?.split(" ") || [];
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
