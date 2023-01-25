import { HttpCall } from "./server"


export type ErrorInfo = {
    status: number
    errorCode: string
    message?: string
    data?: any
}

export class HttpCallError extends Error {
    constructor(info: ErrorInfo);
    constructor(status: number, errorCode: string, message?: string, data?: any);
    constructor(status: number | ErrorInfo, errorCode?: string, message?: string, data?: any) {
        if (typeof status === "object") {
            message = status.message;
            errorCode = status.errorCode;
            data = status.data;
            status = status.status;
        }

        super(message);
        this.status = status;
        this.errorCode = errorCode!;
        this.data = data;
    }

    readonly status: number;
    readonly errorCode: string;
    readonly data?: any
}


function createError(template: ErrorInfo) {
    return class extends HttpCallError {
        constructor(message?: string, data?: any);
        constructor(info: Partial<ErrorInfo>);
        constructor(info?: string | Partial<ErrorInfo>, data?: any) {
            if (info) {
                if (typeof info === "object") {
                    info = { ...template, ...info };
                } else if (typeof info === "string") {
                    info = { ...template, message: info };
                }
            } else {
                info = { ...template };
            }

            if (data) {
                info = { ...info, data };
            }

            super(info as any);
        }
    }
}

export const BadRequestError = createError({
    status: 400,
    errorCode: "bad_request",
    message: "Bad request",
});

export const UnauthorizedError = createError({
    status: 401,
    errorCode: "unauthorized",
    message: "Unauthorized",
});

export const ForbiddenError = createError({
    status: 403,
    errorCode: "forbidden",
    message: "Forbidden",
});

export const NotFoundError = createError({
    status: 404,
    errorCode: "not_found",
    message: "Not Found",
});

export const ConflictError = createError({
    status: 409,
    errorCode: "conflict",
    message: "Conflict",
});

export const UnprocessableRequestError = createError({
    status: 422,
    errorCode: "unprocessable_entity",
    message: "Can't process request",
});

export const NotSupportedError = createError({
    status: 500,
    errorCode: "not_supported",
    message: "Server error"
});

export const NotImplementedError = createError({
    status: 500,
    errorCode: "not_implemented",
    message: "Server error"
});


export class HttpCServerError extends HttpCallError {
    static ERRORS = {
        callNotFound: 404,
        methodNotAllowed: 405,
        requestToLarge: 413,
        unsupportedMediaType: 415,
        parserNotFound: 500,
        renderNotFound: 500,
        noRequestContext: 500,
        missingContextData: 500,
        invalidState: 500
    };

    constructor(errorCode: keyof typeof HttpCServerError.ERRORS, message?: string, call?: HttpCall);
    constructor(errorCode: keyof typeof HttpCServerError.ERRORS, call?: HttpCall);
    constructor(public readonly errorCode: keyof typeof HttpCServerError.ERRORS, message: string | HttpCall = "ServerError", call?: HttpCall) {
        const statusCode = HttpCServerError.ERRORS[errorCode] || 500;
        if (typeof message === "object") {
            call = message;
            message = "ServerError";
        }

        super(statusCode, errorCode, message);

        this.call = call;
    }

    readonly call: HttpCall | undefined;
}


export function isErrorOf(code: string | undefined, errorClass: { new(): Error } | undefined, err: unknown): err is HttpCallError {
    return !!err && (
        (errorClass && err instanceof errorClass) ||
        (code && err instanceof HttpCallError && err.errorCode === code)
    ) || false;
}
