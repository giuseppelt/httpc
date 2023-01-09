import http from "http";
import { HttpCServerError } from "../errors";


async function readBodyAsBuffer(req: http.IncomingMessage, maxBufferSize = 0) {
    const chunks: Buffer[] = [];
    let length = 0;

    for await (const chunk of req) {
        chunks.push(chunk);
        length += (chunk as Buffer).length;

        if (maxBufferSize > 0 && length > maxBufferSize) {
            throw new HttpCServerError("requestToLarge");
        }
    }

    return Buffer.concat(chunks);
}

async function readBodyAsString(req: http.IncomingMessage, maxBufferSize = 0) {
    return (await readBodyAsBuffer(req, maxBufferSize)).toString("utf8");
}



type MayBeArray<T> = T | T[];

export type QueryStringParsingOptions = {
    numbers?: boolean
    booleans?: boolean
    arrays?: boolean
}

const DEFAULT_QUERY_PARSING_OPTIONS: Required<QueryStringParsingOptions> = {
    numbers: true,
    booleans: true,
    arrays: true,
}

function queryStringToObject(qs: string | URLSearchParams): Record<string, string>;
function queryStringToObject(qs: string | URLSearchParams, options: QueryStringParsingOptions): Record<string, MayBeArray<string | number | boolean>>;
function queryStringToObject(qs: string | URLSearchParams, options: QueryStringParsingOptions = DEFAULT_QUERY_PARSING_OPTIONS): Record<string, string> {
    const entries = [...new URLSearchParams(qs || "").entries()] as [string, any][];

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
    readBodyAsBuffer,
    queryStringToObject,
    contentType,
};
