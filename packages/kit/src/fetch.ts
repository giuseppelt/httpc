import type * as nf from "node-fetch";
import type { default as Fetch } from "node-fetch";


let fetch: typeof Fetch;
let Headers: typeof nf.Headers;
let Request: typeof nf.Request;
let Response: typeof nf.Response;

(function (global: any) {
    ({
        fetch,
        Headers,
        Request,
        Response,
    } = global || {});

    //@ts-ignore
}(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : typeof global !== 'undefined' ? global : this));


if (!fetch) {
    throw new Error("Missing fetch API. Be sure fetch is available from the global object or polyfill it (es: with 'cross-fetch' module)");
}

if (!Headers || !Request || !Response) {
    throw new Error("Missing fetch API components. Be sure fetch related classes (Request, Response, ...) are available from the global context");
}

//@ts-ignore
export type { Headers, Request, Response } from "node-fetch";
//@ts-ignore
export { fetch, Headers, Request, Response };
