import { singleton } from "tsyringe";
import { alias, KEY, options } from "../di";
import { IValidator, ValidationResult } from "./types";


export type NativeTypeValidatorOptions = {
    disableParsing?: boolean
}

const DEFAULT_OPTIONS: NativeTypeValidatorOptions = {
}


@singleton()
@alias(KEY("IValidator"))
export class NativeTypeValidator implements IValidator {
    constructor(
        @options(undefined) readonly options: NativeTypeValidatorOptions = DEFAULT_OPTIONS,
    ) {

    }

    canValidate(object: any, schema: any, options?: any): boolean {
        return (
            schema === String ||
            schema === Number ||
            schema === Boolean ||
            schema === Object ||
            schema === Date ||
            schema === Array
        );
    }

    validate(object: any, schema: any, options?: any): ValidationResult {
        const { disableParsing } = this.options;

        if (schema === String) {
            if (typeof object !== "string") {
                return this.validationFailed(String);
            }
        } else if (schema === Number) {
            if (typeof object !== "number") {
                if (!disableParsing && typeof object === "string" && object !== "" && !isNaN(object as any)) {
                    object = Number(object);
                } else {
                    return this.validationFailed(Number);
                }
            }
        } else if (schema === Boolean) {
            if (typeof object !== "boolean") {
                let lowercase: string | undefined;

                if (!disableParsing && typeof object === "string" &&
                    (lowercase = object.toLowerCase()) && (
                        lowercase === "true" ||
                        lowercase === "false"
                    )
                ) {
                    object = lowercase === "true";
                } else {
                    return this.validationFailed(Boolean);
                }
            }
        } else if (schema === Date) {
            if (typeof object !== "object" || !(object instanceof Date)) {
                let parsed: Date | undefined;
                if (!disableParsing && typeof object === "string" &&
                    (parsed = new Date(object)) &&
                    !isNaN(parsed.getTime()) // is a valid date
                ) {
                    object = parsed;
                } else {
                    return this.validationFailed(Date);
                }
            }
        } else if (schema === Array) {
            if (!Array.isArray(object)) {
                return this.validationFailed(Array);
            }
        } else if (schema === Object) {
            if (typeof object !== "object" || object === null || object instanceof Date || Array.isArray(object)) {
                return this.validationFailed(Object);
            }
        } else {
            throw new Error("Invalid schema: " + schema);
        }

        return {
            success: true,
            object
        };
    }

    protected validationFailed(schema: any): ValidationResult {
        return {
            success: false,
            errors: ["Not valid " + schema.name]
        }
    }
}
