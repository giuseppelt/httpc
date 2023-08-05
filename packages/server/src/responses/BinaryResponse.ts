import { HttpCServerResponse } from "./HttpCServerResponse";


type BinaryResponseType =
    | ArrayBufferLike
    | Uint8Array

type BinaryResponseOptions = {
    contentType?: string
    contentDisposition?: string
    contentDispositionFilename?: string
    /** Caching time in seconds. This translates to Cache-Control: max-age=x  */
    cache?: number
}


export class BinaryResponse extends HttpCServerResponse {

    protected options?: BinaryResponseOptions = undefined;

    constructor(data: BinaryResponseType, options?: BinaryResponseOptions);
    constructor(statusCode: number, data: BinaryResponseType, options?: BinaryResponseOptions);
    constructor(status: number | BinaryResponseType, data?: BinaryResponseType | BinaryResponseOptions, options?: BinaryResponseOptions) {
        if (typeof status !== "number") {
            options = data as any;
            data = status;
            status = 200;
        }

        super({
            statusCode: status as number || 200,
            body: data,
        });

        this.options = options;
    }

    override render() {
        let body = this.body;
        let bodyLength = 0;
        if (body instanceof Uint8Array) {
            bodyLength = body.byteLength;
        } else if (body instanceof ArrayBuffer) {
            bodyLength = body.byteLength;
        } else {
            throw new Error("Binary type not supported: " + this.body?.constructor?.name);
        }


        const status = this.statusCode || 200;
        const headers = {
            ...this.getHeaders(),
            ...bodyLength !== undefined ? {
                "Content-Length": bodyLength.toString()
            } : undefined,
            "Content-Type": this.options?.contentType || "application/octet-stream",
            ...this.options?.contentDispositionFilename ? {
                "Content-Disposition": `attachment; filename="${this.options.contentDispositionFilename}"`,
            } : undefined,
            ...this.options?.contentDisposition ? {
                "Content-Disposition": this.options.contentDisposition,
            } : undefined,
            ...this.options?.cache ? {
                "Cache-Control": `max-age=${Math.max(0, this.options.cache || 0)}`
            } : undefined,
        };

        return new Response(body, {
            status,
            headers,
        });
    }
}
