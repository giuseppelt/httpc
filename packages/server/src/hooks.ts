import { useContext } from "./context";


export type HeaderName =
    | "accept"
    | "accept-language"
    | "accept-patch"
    | "accept-ranges"
    | "access-control-allow-credentials"
    | "access-control-allow-headers"
    | "access-control-allow-methods"
    | "access-control-allow-origin"
    | "access-control-expose-headers"
    | "access-control-max-age"
    | "access-control-request-headers"
    | "access-control-request-method"
    | "age"
    | "allow"
    | "alt-svc"
    | "authorization"
    | "cache-control"
    | "connection"
    | "content-disposition"
    | "content-encoding"
    | "content-language"
    | "content-length"
    | "content-location"
    | "content-range"
    | "content-type"
    | "cookie"
    | "date"
    | "etag"
    | "expect"
    | "expires"
    | "forwarded"
    | "from"
    | "host"
    | "if-match"
    | "if-modified-since"
    | "if-none-match"
    | "if-unmodified-since"
    | "last-modified"
    | "location"
    | "origin"
    | "pragma"
    | "proxy-authenticate"
    | "proxy-authorization"
    | "public-key-pins"
    | "range"
    | "referer"
    | "retry-after"
    | "sec-websocket-accept"
    | "sec-websocket-extensions"
    | "sec-websocket-key"
    | "sec-websocket-protocol"
    | "sec-websocket-version"
    | "set-cookie"
    | "strict-transport-security"
    | "tk"
    | "trailer"
    | "transfer-encoding"
    | "upgrade"
    | "user-agent"
    | "vary"
    | "via"
    | "warning"
    | "www-authenticate"


export function useRequestHeader(header: HeaderName | (string & {})) {
    const { request } = useContext();

    return request.headers.get(header) || undefined;
}


export function useResponseHeader(header: HeaderName | (string & {}), value: string) {
    const context = useContext();
    const responseHeaders = context.responseHeaders ??= {};

    return responseHeaders[header] = value;
}
