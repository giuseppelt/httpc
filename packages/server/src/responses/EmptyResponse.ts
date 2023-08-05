import { HttpCServerResponse } from "./HttpCServerResponse";


export class EmptyResponse extends HttpCServerResponse {
    constructor(headers?: Record<string, string | number>);
    constructor(statusCode: number, headers?: Record<string, string | number>);
    constructor(statusOrHeaders: number | Record<string, string | number> = 204, headers?: Record<string, string | number>) {
        if (typeof statusOrHeaders === "object") {
            super({ statusCode: 204, headers: statusOrHeaders });
        } else {
            super({ statusCode: statusOrHeaders, headers });
        }
    }

    override render() {
        return new Response(undefined, {
            status: this.statusCode ?? 204,
            headers: this.getHeaders()
        });
    }
}
