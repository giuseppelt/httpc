import { ErrorResponse, JsonResponse } from "../responses";
import type { HttpCServerRenderer } from "../server";


export function JsonRenderer(): HttpCServerRenderer {
    return async result => new JsonResponse(result);
}
