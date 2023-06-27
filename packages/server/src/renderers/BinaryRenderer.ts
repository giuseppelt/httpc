import { BinaryResponse } from "../responses";
import type { HttpCServerRenderer } from "../server";


export function BinaryRenderer(): HttpCServerRenderer {
    return async result => {

        if (result && (
            result instanceof Buffer ||
            result instanceof ArrayBuffer ||
            result instanceof Uint8Array
        )) {
            return new BinaryResponse(result);
        }
    }
}
