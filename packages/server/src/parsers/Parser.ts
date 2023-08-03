import { HttpCServerError } from "../errors";
import { MayBeArray } from "../internal";


async function readBodyAsBytes(req: Request, maxBufferSize = 0) {
    if (!req.body) {
        return [];
    }
    if (req.bodyUsed) {
        throw new HttpCServerError("invalidState", "Request body already consumed");
    }

    const chunks: Uint8Array[] = [];
    let length = 0;

    const reader = req.body.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        length += value.length;

        if (maxBufferSize > 0 && length > maxBufferSize) {
            throw new HttpCServerError("requestToLarge");
        }
    }

    if (chunks.length === 0) return [];
    if (chunks.length === 1) return chunks[0];

    const content = new Uint8Array(length);
    let offset = 0;
    for (var a = 0; a < chunks.length; a++) {
        let chunk = chunks[a];
        content.set(chunk, offset);
        offset += chunk.length;
    }

    return content;
}

async function readBodyAsString(req: Request, maxBufferSize = 0) {
    //TODO: limit buffer size
    return req.text();
}

async function readBodyAsJson(req: Request, maxBufferSize = 0) {
    //TODO: limit buffer size
    return await req.json();
}

export type QueryStringParsingOptions = {
    undefinedIfEmpty?: boolean
    numbers?: boolean
    booleans?: boolean
    arrays?: boolean
}

const DEFAULT_QUERY_PARSING_OPTIONS: Required<QueryStringParsingOptions> = {
    numbers: true,
    booleans: true,
    arrays: true,
    undefinedIfEmpty: false,
}

function queryStringToObject(qs: string | URLSearchParams): Record<string, string>;
function queryStringToObject<T extends QueryStringParsingOptions>(qs: string | URLSearchParams, options: T): Record<string, MayBeArray<string | number | boolean>> | (T extends { undefinedIfEmpty: true } ? undefined : never);
function queryStringToObject(qs: string | URLSearchParams, options: QueryStringParsingOptions = DEFAULT_QUERY_PARSING_OPTIONS): Record<string, string> | undefined {
    // fast paths
    if (!qs || qs === "") {
        return options.undefinedIfEmpty ? undefined : {};
    }

    const search = typeof qs === "string" ? new URLSearchParams(qs) : qs;
    const entries = [...search] as [string, any][];

    // fast path
    if (entries.length === 0) {
        return options.undefinedIfEmpty ? undefined : {};
    }

    for (const entry of entries) {
        entry[1] = parseParam(entry[1], options);
    }

    return Object.fromEntries(entries);
}

function parseParam(value: string, options: QueryStringParsingOptions): string | number | boolean | any[] {
    const {
        numbers = true,
        booleans = true,
        arrays = true,
    } = options;


    if (numbers && !isNaN(value as any)) {
        return Number(value);
    }

    if (booleans && (value === "false" || value === "true")) {
        return value === "true";
    }

    if (arrays && value.startsWith("[") && value.endsWith("]")) {
        return value.substring(1, value.length - 1).split(",")
            .map(x => parseParam(x, options));
    }

    return value;
}




export type HeaderContentType = {
    mediaType: string
    charset?: string
    boundary?: string
}

function contentType(contentType: string): HeaderContentType {
    if (!contentType) {
        throw new Error("Invalid contentType: no value provided");
    }

    let mediaType: string;
    let charset: string | undefined;
    let boundary: string | undefined;

    const idx = contentType.indexOf(";")
    if (idx < 0) {
        mediaType = contentType;
    } else {
        let [_mediaType, param] = contentType.split(";")
        mediaType = _mediaType;

        param = param?.trim();
        if (param) {
            let [key, value] = param.split("=");
            key = key.trim().toLowerCase();
            if (key === "charset") {
                charset = value.trim();
            } else if (key === "boundary") {
                boundary = value.trim();
                if (
                    (boundary.startsWith("\"") && boundary.endsWith("\"")) ||
                    (boundary.startsWith("\"") && boundary.endsWith("\""))
                ) {
                    boundary = boundary.substring(1, boundary.length - 1);
                }
            }
        }
    }

    mediaType = mediaType.trim();
    if (!mediaType) {
        throw new Error("Invalid contentType: invalid media-type");
    }


    return {
        mediaType: mediaType.toLowerCase(),
        charset: charset?.toLowerCase(),
        boundary,
    };
}


export default {
    readBodyAsString,
    readBodyAsBytes,
    readBodyAsJson,
    queryStringToObject,
    contentType,
};
