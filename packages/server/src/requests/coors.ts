import type { HttpCServerRequestMiddleware } from "./types";
import { useResponseHeader } from "../hooks";
import { EmptyResponse } from "../responses";


export type CoorsRequestProcessorOptions = {
    maxAge?: number
}

export function CoorsRequestMiddleware(options?: CoorsRequestProcessorOptions): HttpCServerRequestMiddleware {
    const {
        maxAge = 86400 // 1 day
    } = options || {};

    return (req, next) => {
        if (req.method === "OPTIONS") {
            return new EmptyResponse({
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Max-Age": maxAge.toString(),
                "Content-Length": "0",
            });
        }

        useResponseHeader("access-control-allow-origin", "*");

        return next(req);
    };
}
