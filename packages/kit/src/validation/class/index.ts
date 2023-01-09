import { singleton } from "tsyringe";
import { plainToInstance } from "class-transformer";
import { validateSync, ValidatorOptions } from "class-validator";
import { alias, KEY, options } from "../../di";
import { IValidator, ValidationResult } from "../types";
import { isClass } from "../utils";


export type ClassValidatorOptions = ValidatorOptions;

const DEFAULT_OPTIONS: ClassValidatorOptions = {
    whitelist: true,
};


@singleton()
@alias(KEY("IValidator"))
export class ClassValidator implements IValidator {
    constructor(
        @options(undefined) protected options: ClassValidatorOptions = DEFAULT_OPTIONS
    ) {
    }

    canValidate(object: any, schema: any, options?: any): boolean {
        //TODO: try to get from Reflect metadata params if not disabled
        // if ((!paramTypes || paramTypes.length === 0) && call.metadata?.["validate:paramtypes"] !== false) {
        //     paramTypes = call.metadata?.["design:paramtypes"];
        // }

        return !!schema && isClass(schema) && !isNativeType(schema);
    }

    validate(object: any, schema: any, options?: any): ValidationResult {
        if (object === undefined || object === null) {
            return {
                success: false,
                errors: ["Required value"]
            };
        }

        if (typeof object !== "object") {
            return {
                success: false,
                errors: ["Wrong type"]
            };
        }

        const data = plainToInstance(schema, object);
        const result = validateSync(data as object, options ?? this.options);

        if (result.length > 0) {
            return {
                success: false,
                errors: result.map(x => x.toString())
            }
        }

        return {
            success: true,
            object: data,
        }
    }
}


function isNativeType(schema: any) {
    if (!schema) return false;

    return (
        schema === String ||
        schema === Number ||
        schema === Boolean ||
        schema === Object ||
        schema === Date ||
        schema === Array
    );
}
