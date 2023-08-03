
export abstract class HttpCServerResponse {
    constructor(params: {
        statusCode: number
        headers?: Record<string, string>
        body?: unknown
    }) {
        this.statusCode = params.statusCode;
        this.headers = params.headers;
        this.body = params.body;
    }

    statusCode: number
    headers?: Record<string, string>
    body?: unknown

    abstract render(): Response
}
