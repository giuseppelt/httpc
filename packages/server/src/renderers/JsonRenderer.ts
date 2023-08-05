import type { HttpCServerCallRenderer } from "../requests";
import { JsonResponse } from "../responses";


export function JsonRenderer(): HttpCServerCallRenderer {
    return async result => new JsonResponse(result);
}
