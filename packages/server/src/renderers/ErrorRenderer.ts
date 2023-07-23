import type { HttpCServerRenderer } from "../processor";
import { ErrorResponse, JsonResponse } from "../responses";


export function ErrorRenderer(): HttpCServerRenderer {
    return async result => {
        if (!result || !(result instanceof Error)) {
            return;
        }

        return new ErrorResponse(result);
    }
}
