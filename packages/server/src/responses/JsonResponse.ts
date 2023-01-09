import http from "http";
import { HttpCServerResponse } from "./HttpCServerResponse";


export class JsonResponse extends HttpCServerResponse {
    constructor(data: unknown);
    constructor(statusCode: number, data: unknown);
    constructor(status: unknown, data?: unknown) {
        if (arguments.length === 1) {
            data = status;
            status = 0;
        }

        super({
            statusCode: status as number || 0,
            body: data,
        });
    }

    protected override write(response: http.ServerResponse) {
        const hasBody = typeof this.body !== "undefined";
        const status = this.statusCode || (hasBody ? 200 : 204);
        const body = hasBody ? Buffer.from(this.render()!, "utf-8") : undefined;
        const headers = {
            ...this.headers,
            ...body ? {
                "Content-Type": "application/json; charset=utf-8",
                "Content-Length": body.length
            } : undefined
        };

        response.writeHead(status, headers)
            .end(body)
    }

    protected render(): string | undefined {
        return typeof this.body === "undefined" ? undefined : JSON.stringify(this.body);
    }
}
