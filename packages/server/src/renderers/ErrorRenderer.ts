import { ErrorResponse, JsonResponse } from "../responses";
import type { HttpCServerRenderer } from "../server";


export function ErrorRenderer(): HttpCServerRenderer {
    return async result => {
        if (!result || !(result instanceof Error)) {
            return;
        }

        return new ErrorResponse(result);
    }
}
