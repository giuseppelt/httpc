import { createServer, IncomingMessage, RequestListener, Server, ServerResponse } from "node:http";
import { HttpCServerOptions } from "../server";
import { createHttpCServer, IHttpCServer } from "../server";


export type HttpCServerNodeOptions = HttpCServerOptions & {
}

export function createHttpCNodeServer(options: HttpCServerNodeOptions | IHttpCServer): Server & { readonly requestProcessor: RequestListener } {
    const httpc = "fetch" in options
        ? options
        : createHttpCServer(options);

    const processor = async (req: IncomingMessage, res: ServerResponse) => {
        const request = createRequestFromNode(req);
        const response = await httpc.fetch(request).catch(() => {
            return new Response(undefined, { status: 500 });
        });

        await writeResponseToNode(res, response);
    };

    const server = createServer({}, async (req, res) => {
        try {
            await processor(req, res);
        } catch (err) {
            console.error(err);

            if (!res.headersSent) {
                res.writeHead(500);
            }

            res.end();
        }
    });

    return Object.assign(server, { requestProcessor: processor });
}


export function createRequestFromNode(req: IncomingMessage): Request {
    const url = `http://${req.headers.host}${req.url}`;
    const method = req.method || "GET";

    return new Request(url, {
        method,
        headers: req.headers as Record<string, string>,
        duplex: "half", // required by node
        body: method !== "GET" && method !== "HEAD" ? new ReadableStream({
            async start(controller) {
                for await (const chunk of req) {
                    controller.enqueue(chunk);
                }

                controller.close();
            }
        }) : undefined
    } as RequestInit);
}

export async function writeResponseToNode(res: ServerResponse, response: Response) {
    res.writeHead(response.status, response.statusText, Object.fromEntries(response.headers.entries()));
    if (!response.body) {
        res.end();
        return;
    }

    const reader = response.body.getReader()
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        await new Promise<void>((resolve, reject) => res.write(value, err => {
            if (err) reject(err);
            else resolve();
        }));
    }

    res.end();
}

