declare global {
    type HttpCallPipelineDefinition<T> = T
}

import type { HttpCClientOptions, HttpCTypedClient, ClientDef } from "@httpc/client";
export type { HttpCClientMiddleware, JsonSafeType } from "@httpc/client";
export { AuthHeader, Header, QueryParam, HttpCClientError } from "@httpc/client";

import type api from "./types";

export type ClientOptions = HttpCClientOptions;
export type ClientApi = HttpCTypedClient & ClientDef<typeof api>;

export function createClient(options?: ClientOptions): ClientApi;
