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

    override render() {
        const status = this.statusCode || 200;
        // treat undefined as null, as undefined is not a valid json
        const body = JSON.stringify(this.body ?? null);
        const headers = {
            ...this.headers,
            ...body ? {
                "Content-Type": "application/json; charset=utf-8",
                "Content-Length": body.length.toString()
            } : undefined
        };

        return new Response(body, {
            status,
            headers
        });
    }
}
