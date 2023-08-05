import type { HttpCServerCallRenderer } from "../requests";
import { ErrorResponse, JsonResponse } from "../responses";


export function ErrorRenderer(): HttpCServerCallRenderer {
    return async result => {
        if (!result || !(result instanceof Error)) {
            return;
        }

        return new ErrorResponse(result);
    }
}
