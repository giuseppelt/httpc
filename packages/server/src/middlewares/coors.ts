import type { HttpCServerHttpMiddleware } from "../server";


export function CoorsHttpMiddleware(): HttpCServerHttpMiddleware {
    return async (req, res, next) => {
        if (req.method === "OPTIONS") {
            return await new Promise(r => {
                res.writeHead(204, {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Max-Age": 86400, // 1day
                    "Content-Length": 0,
                }).end(r);
            });
        }

        res.setHeader("Access-Control-Allow-Origin", "*");
        await next();
    };
}
