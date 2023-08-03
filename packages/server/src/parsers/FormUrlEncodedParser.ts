import type { HttpCServerCallParser } from "../processor";
import { BadRequestError, HttpCServerError } from "../errors";
import Parser from "./Parser";
import { PathMatcher } from "./PathMatcher";
import { tryParseInt } from "./utils";


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

        const { pathname } = new URL(req.url);
        const result = matcher.match(pathname);
        if (!result) {
            return;
        }

        if (req.method !== "POST") {
            if (!enforce) return;
            throw new HttpCServerError("methodNotAllowed");
        }

        const contentType = req.headers.get("content-type");
        if (contentType && Parser.contentType(contentType).mediaType !== "application/x-www-form-urlencoded") {
            if (!enforce) return;
            throw new HttpCServerError("unsupportedMediaType");
        }

        const contentLength = tryParseInt(req.headers.get("content-length"));
        if (!contentLength) {
            if (!enforce) return;
            throw new BadRequestError();
        }
        if (maxDataLength > 0 && contentLength > maxDataLength) {
            throw new HttpCServerError("requestToLarge");
        };

        const body = await Parser.readBodyAsString(req, maxDataLength);
        const arg = Parser.queryStringToObject(body, { undefinedIfEmpty: true });

        return {
            path: result.path,
            access: "write",
            params: arg ? [arg] : []
        };
    }
}
