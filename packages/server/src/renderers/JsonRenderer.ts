import type { HttpCServerRenderer } from "../processor";
import { ErrorResponse, JsonResponse } from "../responses";


export function JsonRenderer(): HttpCServerRenderer {
    return async result => new JsonResponse(result);
}
