import { singleton, injectAll } from "tsyringe";
import { KEY, options } from "../di";
import { logger } from "../logging";
import type { ILogger } from "../logging";
import { BaseService } from "../services";
import { cleanUndefined } from "../utils";
import { IValidator, ValidationResult } from "./types";
import { isArraySchema, isOptionalSchema } from "./utils";



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
        let isOptional = false;
        let isArray = false;
        if (isOptionalSchema(schema)) {
            schema = schema.schema;
            isOptional = true;
        }
        if (isArraySchema(schema)) {
            schema = schema.schema;
            isArray = true;
        }

        if (object === undefined || object === null) {
            return isOptional
                ? { success: true, object }
                : { success: false, errors: ["Required value"] };
        }
        if (isArray && !Array.isArray(object)) {
            return { success: false, errors: ["Expected array"] };
        }

        const validator = this.validators.find(v => v.canValidate(object, schema));
        if (!validator) {
            if (this.options.onMissingValidator === "throw") {
                this._raiseError("misconfiguration", "Missing validator");
            }

            this.logger.debug("No validator for: %o");

            return {
                success: true,
                object
            };
        }

        let result: ValidationResult;

        if (!isArray) {
            result = validator.validate(object, schema);
        } else {
            const results = (object as []).map((x: any) => validator.validate(x, schema));
            if (results.every(x => x.success)) {
                result = { success: true, object: results.map(r => r.object) };
            } else {
                result = { success: false, errors: results.flatMap(r => r.success ? [""] : (r.errors || ["Invalid"])) }
            }
        }

        this.logger.debug("Validation %s(%s) for: %o", result.success ? "pass" : "failed", validator.constructor?.name, object);

        return result;
    }
}
