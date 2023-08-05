import { MayBePromise } from "../internal";
import { HttpCServerResponse } from "../responses";


export type HttpCServerRequestProcessor = (req: Request) => MayBePromise<HttpCServerResponse>
export type HttpCServerRequestMiddleware = (req: Request, next: HttpCServerRequestProcessor) => MayBePromise<HttpCServerResponse>
