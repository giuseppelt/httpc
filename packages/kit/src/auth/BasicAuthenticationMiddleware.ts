import { HttpCServerMiddleware, PassthroughMiddleware, UnauthorizedError, useContext } from "@httpc/server";
import { RESOLVE, useContainer } from "../di";
import { useAuthentication } from "./context";
import { catchLogAndThrowUnauthorized } from "../services";
import { useLogger } from "../logging";


export type BasicCredential = {
    username: string
    password: string
}

export type BasicAuthenticationMiddlewareOptions = {
    onAuthenticate?: (credentials: BasicCredential) => Promise<IUser>
}

export function BasicAuthenticationMiddleware(options?: BasicAuthenticationMiddlewareOptions): HttpCServerMiddleware {
    const authenticate = options?.onAuthenticate || onAuthenticate;

    function hashToCredentials(hash: string): BasicCredential | undefined {
        let value: string;

        try {
            value = Buffer.from(hash, "base64").toString("utf8");
        } catch (ex) {
            useLogger().error("BasicAuthenticationMiddleware: Cannot parse authorization header", ex);
            return;
        }

        const [username, password] = value.split(":");

        return {
            username,
            password,
        };
    }

    return PassthroughMiddleware(async () => {
        const { request, user } = useContext();

        if (!user) {
            const [schema, hash] = request.headers.get("authorization")?.split(" ") || [];
            if (schema?.toUpperCase() === "BASIC") {

                const credentials = hashToCredentials(hash);
                if (!credentials || !credentials.username || !credentials.password) {
                    throw new UnauthorizedError();
                }

                useAuthentication(await authenticate(credentials)
                    .catch(catchLogAndThrowUnauthorized("BasicAuthenticationMiddleware"))
                );
            }
        }
    });
}


async function onAuthenticate(credentials: BasicCredential): Promise<IUser> {
    const container = useContainer();
    const auth = RESOLVE(container, "BasicAuthentication");

    return await auth.authenticate(credentials);
}
