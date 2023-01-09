import { BadRequestError, HttpCServerMiddleware } from "@httpc/server";
import { useInjected } from "../di";
import { useLogger } from "../logging";
import { ValidationService } from "./ValidationService";


export class ValidationError extends BadRequestError {
    constructor(readonly errors: object) {
        super("validation_error", errors);
    }
}

export function Validate(...schemas: any[]): HttpCServerMiddleware {
    return async (call, next) => {

        const logger = useLogger();
        if (schemas.length === 0) {
            logger.warn("Validation skipped for call(%s): missing schema", call.path);
            return await next(call);
        }

        const validator = useInjected(ValidationService);

        // validate all call parameters
        const params = call.params.map((param, idx) => {
            const schema = schemas[idx];
            if (!schema) {
                logger.warn("Validation skipped for call(%s, argument#%d): missing schema", call.path, idx);
                return param;
            }

            const result = validator.validate(param, schema);
            if (!result.success) {
                throw new ValidationError(result.errors);
            }

            return result.object;
        });

        // validate the rest of schemas with undefined if there's any
        for (let idx = call.params.length; idx < schemas.length; idx++) {
            const schema = schemas[idx];
            if (!schema) continue;

            const result = validator.validate(undefined, schema);
            if (!result.success) {
                throw new ValidationError(result.errors);
            }
        }

        return await next({ ...call, params });
    };
}

