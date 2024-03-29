import { HttpCServerMiddleware, PassthroughMiddleware, useContext } from "@httpc/server";
import { RESOLVE, useContainer } from "../di";
import { useLogger } from "../logging";
import { catchLogAndThrowUnauthorized } from "../services";
import { useAuthentication } from "./context";
//cspell: ignore apikey


export type AuthenticationApiKeyMiddlewareOptions = {
    extractKey?: (request: Request) => string | undefined
    onAuthenticate?: (apiKey: string) => Promise<IUser>
}

export function AuthenticationApiKeyMiddleware(options?: AuthenticationApiKeyMiddlewareOptions): HttpCServerMiddleware {
    const authenticate = options?.onAuthenticate || onAuthenticate;
    const extractKey = options?.extractKey || extractApiKey;

    return PassthroughMiddleware(async () => {
        const { request, user } = useContext();

        // try to authenticate if not already present
        if (!user) {
            const apiKey = extractKey(request);
            if (apiKey) {
                useLogger().debug("ApiKeyMiddleware: received key %s", apiKey);

                useAuthentication(await authenticate(apiKey)
                    .catch(catchLogAndThrowUnauthorized("ApiKeyMiddleware"))
                );
            }
        }
    });
}


/**
 * Look for api key in the request in this order
 * 1. apikey or api-key or x-api-key header
 * 2. authorization header with schema APIKEY or API_KEY
 * 3. query string with param apikey or api_key
 */
function extractApiKey(request: Request): string | undefined {
    const apiKey = (
        request.headers.get("apikey") ||
        request.headers.get("api_key") ||
        request.headers.get("api-key") ||
        request.headers.get("x-api-key")
    );

    if (apiKey) {
        return apiKey.trim();
    }

    const authorization = request.headers.get("authorization");
    if (authorization) {
        let [schema, token] = authorization.split(" ");
        schema = schema.toLowerCase();
        if (schema === "api-key" || schema === "api_key" || schema === "apikey") {
            return token.trim() || undefined;
        }
    }

    if (request.url) {
        let qs = new URL(request.url).searchParams;
        // lowercase all param names
        qs = new URLSearchParams([...qs.entries()].map(([key, value]) => [key.toLowerCase(), value] as [string, string]));
        return (qs.get("api_key") || qs.get("api-key") || qs.get("apikey"))?.trim() || undefined;
    }
}


async function onAuthenticate(apiKey: string): Promise<IUser> {
    const container = useContainer();
    const auth = RESOLVE(container, "ApiKeyAuthentication");

    return await auth.authenticate(apiKey);
}
