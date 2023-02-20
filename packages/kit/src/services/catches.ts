import { BadRequestError, ErrorInfo, ForbiddenError, HttpCallError, isErrorOf, NotFoundError, UnauthorizedError, UnprocessableRequestError } from "@httpc/server";
import { useLogger } from "../logging";
import { ServiceError } from "./error";


export function catchError(error: string | { new(): Error }): () => Promise<undefined>;
export function catchError<T>(error: string | { new(): Error }, func: (err: Error) => T): () => Promise<T>;
export function catchError<T>(error: string | { new(): Error }, func?: (err: Error) => T) {
    return (err: any) => {
        if (isErrorOf(
            typeof error === "string" ? error : undefined,
            typeof error === "string" ? undefined : error,
            err,
        )) {
            return func?.(err);
        }

        throw err;
    }
}

export function catchLogAndThrowUnauthorized(log?: string, message?: string) {
    return (err: any) => {
        const logger = useLogger();

        if (log) {
            logger.error(log, err);
        } else {
            logger.error(err);
        }

        throw new UnauthorizedError(message);
    };
}


interface ErrorRethrow {
    (rethrows: (error: HttpCallError) => HttpCallError): (err: unknown) => never
}

interface ErrorRethrowFactory {
    (message?: string | undefined, data?: object | undefined): (err: HttpCallError) => never
    (info: "$inherit"): (err: HttpCallError) => never
}

function createRethrows(rethrows: ErrorRethrow, constructor: { new(info?: Partial<ErrorInfo>): HttpCallError }): ErrorRethrowFactory {
    return (...[message, data]) => rethrows(err => {
        if (message === "$inherit") {
            message = err.message;
            data = err.data;
        }

        return (message || data)
            ? new constructor({ message, data })
            : new constructor();
    });
}



export function catchNotFound<T>(func: (err: ServiceError) => T) {
    return (err: any) => {
        if (isErrorOf("not_found", NotFoundError, err)) {
            return func(err);
        }

        throw err;
    };
}

const catchNotFoundThrows = catchNotFound.throws = (error: (err: HttpCallError) => HttpCallError) => {
    return (err: any) => {
        if (isErrorOf("not_found", NotFoundError, err)) {
            throw error(err);
        }

        throw err;
    };
}

catchNotFound.throwUnauthorized = createRethrows(catchNotFoundThrows, UnauthorizedError);
catchNotFound.throwForbidden = createRethrows(catchNotFoundThrows, ForbiddenError);
catchNotFound.throwNotFound = createRethrows(catchNotFoundThrows, NotFoundError);
catchNotFound.throwBadRequest = createRethrows(catchNotFoundThrows, BadRequestError);
catchNotFound.throwUnprocessable = createRethrows(catchNotFoundThrows, UnprocessableRequestError);
