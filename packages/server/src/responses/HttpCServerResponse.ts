import type { ServerResponse } from "http";


export abstract class HttpCServerResponse {
    constructor(params: {
        statusCode: number
        headers?: Record<string, string | number>
        body?: unknown
    }) {
        this.statusCode = params.statusCode;
        this.headers = params.headers;
        this.body = params.body;
    }

    statusCode: number
    headers?: Record<string, string | number>
    body?: unknown

    send(response: ServerResponse): Promise<void> {
        return new Promise<void>(resolve => {
            this.write(response
                .once("finish", resolve)
                .once("close", resolve)
                .once("error", error => {
                    console.error(error);
                    resolve();
                })
            );
        });
    }

    protected abstract write(response: ServerResponse): void;
}
