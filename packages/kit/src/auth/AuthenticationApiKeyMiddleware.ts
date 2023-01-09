import http from "http";
import { HttpCServerMiddleware, PassthroughMiddleware, useContext } from "@httpc/server";
import { RESOLVE, useContainer } from "../di";
import { useAuthentication } from "./context";
import { catchLogAndThrowUnauthorized } from "../services";


export type AuthenticationApiKeyMiddlewareOptions = {
    extractKey?: (request: http.IncomingMessage) => string | undefined
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
function extractApiKey(request: http.IncomingMessage): string | undefined {
    const apiKey = (request.headers["apikey"] || request.headers["api_key"] || request.headers["api-key"] || request.headers["x-api-key"]) as string;
    if (apiKey) {
        return apiKey.trim();
    }

    if (request.headers.authorization) {
        let [schema, token] = request.headers.authorization.split(" ");
        schema = schema.toLowerCase();
        if (schema === "api-key" || schema === "api_key" || schema === "apikey") {
            return token.trim() || undefined;
        }
    }

    if (request.url) {
        let qs = new URL(request.url, `https://${request.headers.host}`).searchParams;
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

//cspell: ignore apikey
