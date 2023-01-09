import type * as nf from "node-fetch";
import type { default as Fetch } from "node-fetch";


let fetch: typeof Fetch = undefined!;
let Headers: typeof nf.Headers = undefined!;
let Request: typeof nf.Request = undefined!;
let Response: typeof nf.Response = undefined!;


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


export {
    fetch,
    Headers,
    Request,
    Response,
};
