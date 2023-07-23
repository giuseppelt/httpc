import type { HttpCServerRenderer } from "../processor";
import { BinaryResponse } from "../responses";


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
