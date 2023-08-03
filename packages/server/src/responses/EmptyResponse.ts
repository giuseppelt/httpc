import { HttpCServerResponse } from "./HttpCServerResponse";


export class EmptyResponse extends HttpCServerResponse {
    constructor(statusCode = 204, headers?: Record<string, string>) {
        super({ statusCode, headers });
    }

    override render() {
        return new Response(undefined, {
            status: this.statusCode ?? 204,
            headers: this.headers
        });
    }
}
