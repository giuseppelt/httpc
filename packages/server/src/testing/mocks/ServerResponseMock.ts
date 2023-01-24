import type { OutgoingHttpHeaders, ServerResponse } from "http";
import { Writable } from "stream";


export type ServerResponseMockParams = {
    onSuccess?: () => void
    onError?: (err: any) => void
}

export function createServerResponseMock(options?: ServerResponseMockParams) {
    const writable = new BufferedWritable();

    let _statusCode = 200;
    let _headers: OutgoingHttpHeaders = {};

    const response = Object.assign(writable, {
        get statusCode() { return _statusCode },
        set statusCode(value: number) { _statusCode = value },

        getHeaders() {
            return _headers;
        },

        setHeader(name, value) {
            _headers[name] = value as any;
        },

        writeHead(statusCode, headers: any) {
            _statusCode = statusCode;
            _headers = { ..._headers, ...headers };
            return this;
        }
    } as ServerResponse);

    if (options) {
        if (options.onSuccess) {
            response.on("close", options.onSuccess);
        }
        if (options.onError) {
            response.on("error", options.onError);
        }
    }

    return response;
}

class BufferedWritable extends Writable {
    protected _buffer?: Buffer | undefined;

    getBuffer() {
        return this._buffer;
    }

    _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        const newChunk = Buffer.from(chunk, encoding);
        if (!this._buffer) {
            this._buffer = chunk;
        } else {
            this._buffer = Buffer.concat([this._buffer, newChunk]);
        }

        callback();
    }
}
