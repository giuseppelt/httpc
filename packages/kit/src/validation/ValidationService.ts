import { singleton, injectAll } from "tsyringe";
import { KEY, options } from "../di";
import { logger } from "../logging";
import type { ILogger } from "../logging";
import { BaseService } from "../services";
import { cleanUndefined } from "../utils";
import { IValidator, ValidationResult } from "./types";
import { isOptionalSchema } from "./utils";



export type ValidationServiceOptions = {
    onMissingValidator: "throw" | "skip"
}

@singleton()
export class ValidationService extends BaseService() {
    protected options: ValidationServiceOptions;

    constructor(
        @logger() logger: ILogger,
        @injectAll(KEY("IValidator")) readonly validators: IValidator[],
        @options({}) options: Partial<ValidationServiceOptions> = {},
    ) {
        //@ts-expect-error
        super(...arguments);

        if (validators.length > 0) {
            this.logger.info("Loaded %d validators: %s", validators.length, validators.map(x => x.constructor.name).join(","));
        } else {
            this.logger.warn("No validators loaded");
        }

        this.options = {
            onMissingValidator: "throw",
            ...options ? cleanUndefined(options) : undefined
        };
    }

    validate(object: any, schema: any): ValidationResult {
        for (const validator of this.validators) {
            let isOptional = false;
            if (isOptionalSchema(schema)) {
                schema = schema.schema;
                isOptional = true;
            }

            if (object === undefined || object === null) {
                return isOptional
                    ? { success: true, object }
                    : { success: false, errors: ["Required value"] };
            }


            if (!validator.canValidate(object, schema)) {
                continue;
            }

            const result = validator.validate(object, schema);

            this.logger.debug("Validation %s(%s) for: %o", result.success ? "pass" : "failed", validator.constructor?.name, object);

            return result;
        }

        if (this.options.onMissingValidator === "throw") {
            this._raiseError("misconfiguration", "Missing validator");
        }

        this.logger.debug("No validator for: %o");

        return {
            success: true,
            object
        };
    }
}
