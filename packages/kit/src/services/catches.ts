import { ForbiddenError, HttpCallError, isErrorOf, NotFoundError, UnauthorizedError } from "@httpc/server";
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

export function catchNotFound<T>(func: (err: ServiceError) => T) {
    return (err: any) => {
        if (isErrorOf("not_found", NotFoundError, err)) {
            return func(err);
        }

        throw err;
    };
}

export function catchNotFoundThrows(error: () => HttpCallError) {
    return (err: any) => {
        if (isErrorOf("not_found", NotFoundError, err)) {
            throw error();
        }

        throw err;
    };
}

export function catchNotFoundThrowUnauthorized(message?: string) {
    return catchNotFoundThrows(() => new UnauthorizedError(message));
}

export function catchNotFoundThrowForbidden(message?: string) {
    return catchNotFoundThrows(() => new ForbiddenError(message));
}

export function catchNotFoundThrowNotFound(message?: string) {
    return catchNotFoundThrows(() => new NotFoundError(message));
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
