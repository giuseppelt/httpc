import type { ServerResponse } from "http";
import { HttpCServerResponse } from "./HttpCServerResponse";


export class EmptyResponse extends HttpCServerResponse {
    constructor(statusCode: number, headers?: Record<string, string>) {
        super({ statusCode, headers });
    }

    protected override write(response: ServerResponse) {
        response.writeHead(this.statusCode, this.headers).end();
    }
}
