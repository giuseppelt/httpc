import { HttpCClientMiddleware } from "./client";


export function Header(header: string, value: string | (() => (string | undefined))): HttpCClientMiddleware {
    return (request, next) => {
        const val = typeof value === "function" ? value() : value;
        if (val !== undefined && val !== null) {
            request.headers.set(header, val);
        }

        return next(request);
    };
}

export function AuthHeader(schema: string, value: string | (() => string | undefined)): HttpCClientMiddleware {
    return Header("Authorization", () => {
        const val = typeof value === "function" ? value() : value;
        return val !== undefined && val !== null && val !== "" ? `${schema} ${val}` : undefined;
    });
}

export function QueryParam(key: string, value: string | number | (() => string | number | undefined)): HttpCClientMiddleware {
    return (request, next) => {
        const val = typeof value === "function" ? value() : value;
        if (val !== undefined && val !== null) {
            request.query.set(key, val.toString());
        }

        return next(request);
    };
}
