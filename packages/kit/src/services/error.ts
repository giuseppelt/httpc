import { HttpCallError, ErrorInfo } from "@httpc/server";


export class ServiceError extends HttpCallError {
    constructor(errorCode: string, data?: Record<string, any>);
    constructor(errorCode: string, message?: string, data?: Record<string, any>);
    constructor(errorInfo: ErrorInfo);
    constructor(
        error: string | ErrorInfo,
        message?: string | Record<string, any>,
        data?: Record<string, any>
    ) {
        const isInfo = typeof error === "object";
        const status = isInfo && error.status || 400;
        const errorCode = isInfo ? error.errorCode : error;
        data = isInfo ? error.data : typeof message === "string" ? data : message;
        message = isInfo ? error.message : typeof message === "string" ? message : undefined;

        super({
            status,
            errorCode,
            message,
            data,
        });
    }
}

export class ServiceErrorPresets<T extends string = ""> {
    constructor(
        protected readonly map = new Map<string, ErrorInfo>()
    ) {
    }

    add<E extends string>(errorCode: E, errorInfo?: Omit<ErrorInfo, "errorCode">) {
        const map = new Map(this.map);
        map.set(errorCode, { status: 500, ...errorInfo, errorCode });
        return new ServiceErrorPresets<T | E>(map);
    }

    get(errorCode: T): ErrorInfo | undefined;
    get(errorCode: string): ErrorInfo | undefined;
    get(errorCode: string): ErrorInfo | undefined {
        return this.map.get(errorCode);
    }
}

export type ServiceErrors<T extends ServiceErrorPresets> = T extends ServiceErrorPresets<infer U> ? Exclude<U, ""> : never;
