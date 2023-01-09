import http from "http";
import { BadRequestError, HttpCServerError } from "../errors";
import Parser from "./Parser";
import type { HttpCServerCallParser } from "../server";


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

    function paramsFromQuery(req: http.IncomingMessage): any[] {
        const url = new URL(req.url!, `http://${req.headers.host}`);

        if (mode === "loose" && !url.searchParams.has("$p")) {
            return [Parser.queryStringToObject(url.searchParams)];
        }

        const p = url.searchParams.get("$p");
        if (p === undefined || p === null) {
            return [];
        }

        try {
            return JSON.parse(p);
        } catch (err) {
            throw new BadRequestError();
        }
    }

    async function paramsFromBody(req: http.IncomingMessage): Promise<any[]> {
        const contentType = req.headers["content-type"];
        if (contentType && Parser.contentType(contentType).mediaType !== "application/json") {
            throw new HttpCServerError("unsupportedMediaType", `Content type '${req.headers["content-type"]}' not supported`);
        }

        const json = await Parser.readBodyAsString(req, maxDataSize);

        // no content body
        if (json === "") return [];

        return JSON.parse(json);
    }

    function getCallPath(req: http.IncomingMessage): string {
        const url = new URL(req.url!, `http://${req.headers.host}`);
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
