import { createClient } from "@httpc/client";
import metadata from "./types/metadata.json";

export { AuthHeader, Header, QueryParam, HttpCClientError } from "@httpc/client";
export default function (options) {
    return createClient({ ...options, metadata });
};
