import { HttpCClient, HttpCClientMiddleware, HttpCClientOptions } from "./client";
import { isCall } from "./utils";



export type HttpCallDefinition = {
    access: "read" | "write"
    metadata?: Record<string, any>
}

type CallTree = {
    [k: string]: HttpCallDefinition | CallTree
}

export type HttpCClientMetadata = CallTree

export type HttpCTypedClientOptions = HttpCClientOptions & {
    metadata?: HttpCClientMetadata
    mode?: "strict" | "loose"
}


export class HttpCTypedClient {
    protected $metadata?: HttpCClientMetadata;

    constructor(options?: HttpCTypedClientOptions) {
        this.$client = new HttpCClient(options);
        this.$metadata = options?.metadata;

        if (this.$metadata) {
            this.$client.use(CallMetadataMiddleware(this.$metadata));
        }
    }

    readonly $client: HttpCClient;
}

function CallMetadataMiddleware(metadata?: HttpCClientMetadata): HttpCClientMiddleware {
    return (request, next) => {
        if (request.path && metadata) {
            const parts = request.path.split("/");
            if (!parts[0]) parts.shift(); // if empty entry, means path starts with /, remove it

            let call;
            do {
                if (parts.length === 1 && isCall(metadata?.[parts[0]])) {
                    call = metadata[parts[0]];
                    break;
                } else if (parts.length > 1) {
                    metadata = metadata[parts.shift()!] as CallTree;
                } else {
                    break;
                }
            } while (metadata);

            if (call) {
                request.metadata = call.metadata;
            }
        }

        return next(request);
    }
}
