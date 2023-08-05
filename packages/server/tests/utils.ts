
export type RequestInfo = {
    path?: string
    method: string
    body?: any
}

export function createRequest(method: string, path?: string, body?: any): Request;
export function createRequest(info: RequestInfo): Request;
export function createRequest(method: string | RequestInfo, path?: string, body?: any) {
    if (typeof method === "object") {
        ({ path, method, body } = method);
    }

    if (body) {
        body = JSON.stringify(body);
    }

    return new Request(new URL(path || "/", "http://localhost"), {
        method,
        headers: body && {
            "content-type": "application/json"
        } || undefined,
        body
    })
};



