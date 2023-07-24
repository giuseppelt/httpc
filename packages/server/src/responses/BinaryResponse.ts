import type { ServerResponse } from "http";
import { HttpCServerResponse } from "./HttpCServerResponse";


type BinaryResponseType =
    | Buffer
    | ArrayBufferLike
    | Uint8Array

type BinaryResponseOptions = {
    contentType?: string
    contentDisposition?: string
    contentDispositionFilename?: string
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

    protected override write(response: ServerResponse) {
        const status = this.statusCode || 200;
        const body = this.render();
        const headers = {
            ...this.headers,
            "Content-Length": body.length,
            "Content-Type": this.options?.contentType || "application/octet-stream",
            ...this.options?.contentDispositionFilename ? {
                "Content-Disposition": `attachment; filename="${this.options.contentDispositionFilename}"`,
            } : undefined,
            ...this.options?.contentDisposition ? {
                "Content-Disposition": this.options.contentDisposition,
            } : undefined,
        };

        response.writeHead(status, headers)
            .end(body);
    }

    protected render(): Buffer | Uint8Array {
        const body = this.body;
        if (body instanceof Buffer || body instanceof Uint8Array) {
            return body;
        } else if (body instanceof ArrayBuffer) {
            return Buffer.from(body);
        }

        throw new Error("Binary type not supported: " + this.body?.constructor?.name);
    }
}
