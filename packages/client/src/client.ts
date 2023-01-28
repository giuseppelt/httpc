import { fetch, Request, Response, Headers } from "./fetch";



type ErrorBody = {
    error: string
    message?: string
    data?: any
}

export class HttpCClientError extends Error {
    constructor(
        public readonly status: number,
        public readonly body?: ErrorBody
    ) {
        const message = body?.message || `[HTTP-${status}]`;
        super(message);
    }

    get error() {
        return this.body?.error;
    }
    get data() {
        return this.body?.data;
    }
}



export type HttpCClientOptions = {
    endpoint?: string
    middlewares?: readonly (HttpCClientMiddleware | HttpCClientMiddlewareEntry)[]
}

export type HttpCClientMiddlewareEntry = {
    key: string
    value: HttpCClientMiddleware
}

export type HttpCClientRequest = {
    method: string
    endpoint?: string
    path?: string
    query: URLSearchParams
    headers: InstanceType<typeof Headers>
    body?: any
    metadata?: Record<string, any>
}

export type HttpCClientResponse = InstanceType<typeof Response>;

type HttpCClientFetch = (request: HttpCClientRequest) => Promise<HttpCClientResponse>;
export type HttpCClientMiddleware = (request: HttpCClientRequest, next: HttpCClientFetch) => Promise<HttpCClientResponse>;


export class HttpCClient {
    protected _middlewares: HttpCClientMiddlewareEntry[] = [];
    private _pipeline: HttpCClientFetch = this._fetch.bind(this);

    constructor(options?: HttpCClientOptions) {
        this.endpoint = options?.endpoint;
        options?.middlewares?.forEach(x => {
            if (typeof x === "function") {
                this.use(x);
            } else {
                this.use(x.key, x.value);
            }
        });
    }

    public endpoint: string | undefined;

    use(middleware: HttpCClientMiddleware): this;
    use(key: string, middleware: HttpCClientMiddleware | null): this;
    use(key: string | HttpCClientMiddleware, middleware?: HttpCClientMiddleware | null) {
        if (typeof key !== "string") {
            middleware = key;
            key = this._middlewares.length.toString();
        } else {
            middleware = middleware!;
        }

        const idx = this._middlewares.findIndex(x => x.key === key);
        if (idx >= 0) {
            this._middlewares[idx].value = middleware;
        } else {
            this._middlewares.push({ key, value: middleware });
        }

        this._pipeline = this._middlewares.slice().reverse()
            .filter(x => !!x.value)
            .reduce<HttpCClientFetch>((chain, entry) => {
                return request => entry.value(request, chain);
            }, this._fetch.bind(this));

        return this;
    }

    call<T>(operation: string, ...args: any[]): Promise<T> {
        return this.write<T>(operation, ...args);
    }

    read<T>(operation: string, ...args: any[]): Promise<T> {
        const query = args.length > 0 ? `?$p=${JSON.stringify(args)}` : "";
        return this._send<T>(this._createRequest("GET", `${operation}${query}`));
    }

    write<T>(operation: string, ...args: any[]): Promise<T> {
        return this._send<T>(this._createRequest("POST", operation, args));
    }


    protected async _send<TRes>(request: HttpCClientRequest): Promise<TRes> {
        const response = await this._pipeline(request);

        let body: TRes | undefined = undefined;
        if (response.headers.get("content-type")?.includes("application/json")) {
            // needed because the same response can be read multiple times        
            body = await response.clone().json() as TRes;
        }

        if (response.status >= 400) {
            this._raiseHttpError(response.status, body);
        }

        return body as TRes;
    }

    protected _createRequest(method: string, pathAndQuery: string, data?: any): HttpCClientRequest {
        let endpoint = this.endpoint || "";
        if (endpoint && !endpoint.startsWith("http") && !endpoint.startsWith("/")) endpoint = `https://${endpoint}`
        if (endpoint && !endpoint.endsWith("/")) endpoint += "/";

        let [path, qs] = pathAndQuery ? pathAndQuery.split("?") : [];
        if (path.startsWith("/")) path = path.substring(1);

        const request: HttpCClientRequest = {
            method,
            query: new URLSearchParams(qs),
            headers: new Headers(),
            endpoint,
            path,
            body: data,
        };

        if (typeof data !== undefined && ["POST", "PUT", "PATCH"].includes(method)) {
            request.headers.set("Content-Type", "application/json");
            request.body = JSON.stringify(data);
        }

        return request;
    }

    protected _fetch(request: HttpCClientRequest): Promise<HttpCClientResponse> {
        const qs = request.query.toString();
        const url = `${request.endpoint ?? ""}${request.path ?? ""}${qs ? `?${qs}` : ""}`

        return fetch(url, {
            method: request.method,
            headers: request.headers,
            body: request.body,
        });
    }


    protected _raiseHttpError(status: number, body?: any): never {
        throw new HttpCClientError(status, body);
    }
}
