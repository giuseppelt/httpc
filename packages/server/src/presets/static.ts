import { NotFoundError } from "../errors";
import type { HttpCServerCallParser } from "../processor";
import { BinaryResponse } from "../responses";


export type StaticFileParserOptions = {
    path?: string
    autoIndex?: string
    exclude?: string
}

const CALL_INTERNAL_GET_STATIC_FILE = "$getStaticFile";

export function StaticFileParser(options?: StaticFileParserOptions): HttpCServerCallParser {
    const {
        path = "/",
        autoIndex = true,
        exclude,
    } = options || {};

    return async request => {
        if (!request.url) return;
        if (request.method !== "GET" && request.method === "HEAD") {
            return;
        }

        let { pathname } = new URL(request.url, `http://${request.headers.host}`);
        if (!pathname.startsWith(path)) {
            return;
        }

        if (exclude && pathname.startsWith(exclude)) {
            return;
        }

        if (pathname.endsWith("/") && autoIndex) {
            pathname += "index.html"
        }

        return {
            access: "read",
            path: CALL_INTERNAL_GET_STATIC_FILE,
            params: [
                pathname
            ]
        };
    };
}



export type StaticFileDescriptor = {
    path: string
    contentType: string
    contentLength?: number
    data: any
    encoding: "utf8" | "utf16le"
}

export type StaticFileCachingOptions = {
    seconds?: number
}

export type StaticFileCallsOptions = {
    descriptors: StaticFileDescriptor[]
    caching?: true | StaticFileCachingOptions
}


const DEFAULT_CACHING: StaticFileCachingOptions = {
    seconds: 3600 // default 1h
}

export function StaticFileCalls(options: StaticFileCallsOptions) {
    const {
        descriptors,
        caching: _caching,
    } = options;

    const caching = _caching === true ? DEFAULT_CACHING : _caching;

    // validate descriptors
    if (process.env.NODE_ENV !== "production") {
        descriptors.forEach(x => {
            if (!x.data) throw new Error("Missing data for static file: " + x.path);
            if (typeof x.data !== "string") throw new Error("Unsupported data for static file: " + x.path + " - Only utf8 or utf16le encoded string are supported.");
        });
    }

    const getStaticFile = async (path: string) => {
        const desc = descriptors.find(x => x.path === path);
        if (!desc) {
            throw new NotFoundError();
        }

        return new BinaryResponse(Buffer.from(desc.data, desc.encoding || "utf8"), {
            contentType: desc.contentType,
            cache: caching?.seconds
        });
    }

    return {
        [CALL_INTERNAL_GET_STATIC_FILE]: getStaticFile
    };
}
