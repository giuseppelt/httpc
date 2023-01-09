import { singleton } from "tsyringe";
import { alias, KEY } from "../di";
import { IValidator, ValidationResult } from "./types";
import { isClass } from "./utils";


export type PredicateValidate = (params: any) => (boolean | ValidationResult);


@singleton()
@alias(KEY("IValidator"))
export class PredicateValidator implements IValidator {
    canValidate(object: any, schema: any, options?: any): boolean {
        return typeof schema === "function" && !isClass(schema);
    }

    validate(object: any, schema: PredicateValidate, options?: any): ValidationResult {
        if (typeof schema !== "function") {
            throw new Error("Invalid schema: " + schema);
        }

        const result = schema(object);
        if (typeof result === "object") {
            return result;
        }

        return result
            ? { success: true, object }
            : { success: false, errors: ["Invalid"] }
    }
}
