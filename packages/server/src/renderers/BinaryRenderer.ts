import type { HttpCServerCallRenderer } from "../requests";
import { BinaryResponse } from "../responses";


export function BinaryRenderer(): HttpCServerCallRenderer {
    return async result => {

        if (result && (
            result instanceof Uint8Array ||
            result instanceof ArrayBuffer
        )) {
            return new BinaryResponse(result);
        }
    }
}
