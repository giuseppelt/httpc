import { useResponseHeader } from "../hooks";
import type { HttpCServerRequestProcessor } from "../processor";


export type CoorsRequestProcessorOptions = {
    maxAge?: number
}

export function CoorsRequestProcessor(options?: CoorsRequestProcessorOptions): HttpCServerRequestProcessor {
    const {
        maxAge = 86400 // 1 day
    } = options || {};

    return async req => {
        if (req.method === "OPTIONS") {
            return new Response(undefined, {
                status: 204,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Max-Age": maxAge.toString(),
                    "Content-Length": "0",
                }
            });
        }

        useResponseHeader("access-control-allow-origin", "*");
    };
}
