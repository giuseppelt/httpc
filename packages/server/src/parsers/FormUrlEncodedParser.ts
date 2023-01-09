import { BadRequestError, HttpCServerError } from "../errors";
import Parser from "./Parser";
import { HttpCServerCallParser } from "../server";
import { PathMatcher } from "./PathMatcher";


export type FormUrlEncodedParserOptions = {
    basePath?: string
    maxDataLength?: number
    paths?: "*" | string[]
    enforce?: boolean
}

export function FormUrlEncodedParser(options?: FormUrlEncodedParserOptions): HttpCServerCallParser {
    const {
        basePath = "/",
        maxDataLength = 0,
        paths = [],
        enforce = false,
    } = options || {};

    const matcher = new PathMatcher({ base: basePath, paths });

    return async req => {
        if (!req.url) {
            return;
        }

        const { pathname } = new URL(req.url, `http://${req.headers.origin}`);
        const result = matcher.match(pathname);
        if (!result) {
            return;
        }

        if (req.method !== "POST") {
            if (!enforce) return;
            throw new HttpCServerError("methodNotAllowed");
        }
        if (!req.headers["content-type"] || Parser.contentType(req.headers["content-type"]).mediaType !== "application/x-www-form-urlencoded") {
            if (!enforce) return;
            throw new HttpCServerError("unsupportedMediaType");
        }

        const contentLength = tryParseInt(req.headers["content-length"]);
        if (!contentLength) {
            if (!enforce) return;
            throw new BadRequestError();
        }
        if (maxDataLength > 0 && contentLength > maxDataLength) {
            throw new HttpCServerError("requestToLarge");
        };

        const body = await Parser.readBodyAsString(req, maxDataLength);
        const arg = Parser.queryStringToObject(body);

        return {
            path: result.path,
            access: "write",
            params: [arg]
        };
    }
}


function tryParseInt(value: string | undefined, defaultValue?: number): number {
    if (value) {
        try { return parseInt(value!) }
        catch { }
    }
    return defaultValue || 0;
}
