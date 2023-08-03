import type { HttpCServerCallParser } from "../processor";
import { BadRequestError, HttpCServerError } from "../errors";
import Parser from "./Parser";
import { PathMatcher } from "./PathMatcher";
import { tryParseInt } from "./utils";


export type RawBodyParserOptions = {
    format?: "string" | "bytes"
    maxDataLength?: number
    basePath?: string
    paths?: "*" | string[]
    enforce?: boolean
}

export function RawBodyParser(options?: RawBodyParserOptions): HttpCServerCallParser {
    const {
        format = "string",
        basePath = "/",
        maxDataLength = 0,
        paths = "*",
        enforce = false,
    } = options || {};

    const matcher = new PathMatcher({ base: basePath, paths });

    return async req => {
        if (!req.url) {
            return;
        }
        if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
            return;
        }

        const { pathname } = new URL(req.url);
        const result = matcher.match(pathname);
        if (!result) {
            return;
        }

        const contentLength = tryParseInt(req.headers.get("content-length"));
        if (!contentLength) {
            if (!enforce) return;
            throw new BadRequestError();
        }
        if (maxDataLength > 0 && contentLength > maxDataLength) {
            throw new HttpCServerError("requestToLarge");
        };

        const body = format === "bytes"
            ? await Parser.readBodyAsBytes(req, maxDataLength)
            : await Parser.readBodyAsString(req, maxDataLength);

        return {
            path: result.path,
            access: "write",
            params: [body]
        };
    }
}
