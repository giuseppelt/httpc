import { useContextProperty } from "../context";


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

    private headers?: Record<string, string | number>
    statusCode: number
    body?: unknown

    setHeader(name: string, value: string | number) {
        (this.headers ??= {})[name] = value;
    }

    abstract render(): Response

    protected getHeaders(): Record<string, string> | undefined {
        let headers = this.headers as {};

        const contextHeaders = useContextProperty("responseHeaders");
        if (contextHeaders) {
            headers = { ...headers, ...contextHeaders };
        }

        return headers;
    }
}
