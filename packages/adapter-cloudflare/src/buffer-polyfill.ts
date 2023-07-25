/**
 * Until Cloudflare Buffer exists from experimental
 *
 * import { Buffer } from "node:buffer";
 *
 */

type Encoding =
    | "utf8"
    | "utf-8"
    | "utf16le"
    | "base64"


//@ts-ignore    
class BufferShim extends Uint8Array {
    static from(value: any, encoding?: Encoding): BufferShim {
        if (typeof value === "string") {
            if (!encoding) encoding = "utf8";

            if (encoding === "base64") {
                value === atob(value);
                encoding = "utf8";
            }

            if (encoding === "utf8" || encoding === "utf-8") {
                return new BufferShim(new TextEncoder().encode(value));
            }

            if (encoding === "utf16le") {
                const buff = new Uint8Array(value.length * 2);
                for (let i = 0; i < value.length; i++) {
                    const char = value.charCodeAt(i);
                    const bytes = [char & 0xff, (char & 0xff00) >> 8];
                    buff.set(bytes, i * 2);
                }
                return new BufferShim(buff);
            }

            throw new Error("Buffer.from: unsupported encoding " + encoding);
        }

        if (value instanceof BufferShim) {
            return new BufferShim(value);
        }

        if (value instanceof Uint8Array) {
            return new BufferShim(value);
        }

        if (value instanceof ArrayBuffer) {
            return new BufferShim(new Uint8Array(value));
        }

        throw new Error(`Buffer.from: unsupported value ${value}`);
    }

    static concat(items: BufferShim[]): BufferShim {
        if (items.length === 0) {
            return new BufferShim(new Uint8Array());
        } else if (items.length === 1) {
            return new BufferShim(items[0]);
        }

        const length = items.reduce((r, x) => r + x.length, 0);
        const buff = new Uint8Array(length);
        let pos = 0;

        for (let i = 0; i < items.length; i++) {
            buff.set(items[i], pos);
            pos += items[i].length;
        }

        return new BufferShim(buff);
    }

    constructor(buff: Uint8Array) {
        if (buff && !(buff instanceof Uint8Array)) {
            throw new Error(`Buffer constructor: unsupported value(${buff})`);
        }
        super(buff);
    }


    toString(encoding?: Encoding): string {
        if (!encoding || encoding === "utf8" || encoding === "utf-8") {
            return new TextDecoder("utf-8").decode(this);
        } else if (encoding === "base64") {
            return btoa(new TextDecoder("utf-8").decode(this));
        }
        throw new Error("Unsupported encoding: " + encoding);
    }
}



(globalThis as any).Buffer = BufferShim;
