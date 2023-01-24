import type { HttpCServerRequestProcessor } from "../server";


export function CoorsHttpMiddleware(): HttpCServerRequestProcessor {
    return async (req, res) => {
        if (req.method === "OPTIONS") {
            await new Promise(r => {
                res.writeHead(204, {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Max-Age": 86400, // 1day
                    "Content-Length": 0,
                }).end(r);
            });

            return "stop";
        }

        res.setHeader("Access-Control-Allow-Origin", "*");
    };
}
