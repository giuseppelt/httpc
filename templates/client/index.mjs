import { createClient as _createClient } from "@httpc/client";
import metadata from "./types/metadata.json";

export { AuthHeader, Header, QueryParam, HttpCClientError } from "@httpc/client";
export function createClient(options) {
    return _createClient({ ...options, metadata });
}
