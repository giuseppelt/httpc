import { HttpCallDefinition, HttpCClientMetadata, HttpCTypedClient, HttpCTypedClientOptions } from "./typed";
import { isCall } from "./utils";


export function createClient<T extends {}>(options: HttpCTypedClientOptions = {}): T & HttpCTypedClient {
    const client = new HttpCTypedClient(options);
    const {
        metadata,
        mode = metadata ? "strict" : "loose"
    } = options;

    const TARGET = () => { };

    function createMethod(path: string, op: HttpCallDefinition) {
        return function (this: HttpCTypedClient, ...args: any) {
            return op.access === "read"
                ? client.$client.read(path, ...args)
                : client.$client.write(path, ...args);
        };
    }

    function createProxy(path: string, metadata?: HttpCClientMetadata): any {
        return new Proxy(TARGET, {
            get(target, property, receiver) {
                if (path === "" && property in client) {
                    return Reflect.get(client, property, receiver);
                }

                if (metadata && typeof property === "string") {
                    const call = metadata[property];
                    if (call) {
                        // check if it's a call
                        if (isCall(call)) {
                            return createMethod(joinPath(path, property), call);
                        } else {
                            // it's a tree
                            return createProxy(joinPath(path, property), call);
                        }
                    }
                }

                if (mode === "loose" && typeof property === "string") {
                    return createProxy(joinPath(path, property));
                }

                throw new TypeError(`Can't find call '${path}'`);
            },
            apply(target, thisArg, args) {
                if (mode !== "loose") {
                    throw new TypeError(`Can't find call '${path}'`);
                }

                return client.$client.call(path, ...args);
            }
        });
    }


    return createProxy("", metadata);
}

function joinPath(x: string, y: string): string {
    if (!x) return y;
    return x.endsWith("/") ? `${x}${y}` : `${x}/${y}`
}
