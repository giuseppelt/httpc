import { HttpCallError } from "../errors";
import { JsonResponse } from "./JsonResponse";


export class ErrorResponse extends JsonResponse {
    constructor(error: Error);
    constructor(statusCode: number, error: Error);
    constructor(status: number | Error, error?: Error) {
        if (arguments.length === 1) {
            error = status as Error;
            status = 0;
        }

        status = (status as number) || (error instanceof HttpCallError ? error.status : 500);
        super(status, error);
    }

    override render() {
        const error = this.body as Error;
        let { message, stack, data } = error as any;
        let errorCode = error instanceof HttpCallError ?
            error.errorCode :
            "internal_error";

        const body = this.body = {
            error: errorCode,
            message: message || undefined,
            stack,
            data,
        };

        if (process.env.NODE_ENV === "production") {
            body.stack = undefined;

            if (!(error instanceof HttpCallError)) {
                errorCode = "internal_error";
                body.message = undefined;
            }
        }

        return super.render();
    }
}
