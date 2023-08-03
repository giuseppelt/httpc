import type { HttpCServerCallParser } from "../processor";
import { BadRequestError, HttpCServerError } from "../errors";
import Parser from "./Parser";


export type HttpCCallParserOptions = {
    mode?: "loose" | "strict"
    basePath?: string
    maxDataSize?: number
}

export function HttpCCallParser(options: HttpCCallParserOptions): HttpCServerCallParser {
    const {
        mode = "loose",
        maxDataSize = (2 ** 20) * 5, // 5MB
    } = options;

    function paramsFromQuery(req: Request): any[] {
        const url = new URL(req.url);

        if (mode === "loose" && !url.searchParams.has("$p")) {
            const arg1 = Parser.queryStringToObject(url.searchParams, { undefinedIfEmpty: true });
            return arg1 ? [arg1] : [];
        }

        const p = url.searchParams.get("$p");
        if (p === undefined || p === null) {
            return [];
        }

        try {
            return JSON.parse(p);
        } catch (err) {
            throw new BadRequestError("Malformed params(expected a valid JSON encoded into '$p' query param)");
        }
    }

    async function paramsFromBody(req: Request): Promise<any[]> {
        const contentType = req.headers.get("content-type");
        if (contentType && Parser.contentType(contentType).mediaType !== "application/json") {
            throw new HttpCServerError("unsupportedMediaType", `Content type '${contentType}' not supported`);
        }

        try {
            return await Parser.readBodyAsJson(req, maxDataSize);
        } catch (err) {
            throw new BadRequestError("Malformed body(expected valid JSON)");
        }
    }

    function getCallPath(req: Request): string {
        const url = new URL(req.url);
        let path = url.pathname;

        // query string override
        const c = url.searchParams.get("$c");
        if (c) {
            path = c.trim();
            if (!path.startsWith("/")) path = "/" + path;
        }

        return path;
    }


    return async req => {
        if (req.method !== "GET" && req.method !== "POST") {
            throw new HttpCServerError("methodNotAllowed");
        }


        const path = getCallPath(req);
        const access = req.method === "GET" ? "read" : "write";
        let params = access === "read" ? paramsFromQuery(req) : await paramsFromBody(req);

        // in loose mode, gracefully wrap params as array when single value is provided
        if (mode === "loose" && !Array.isArray(params)) {
            params = [params];
        }
        if (!Array.isArray(params)) {
            throw new BadRequestError();
        }


        return {
            path,
            access,
            params,
        };
    };
}
