import { HttpCServerError } from "@httpc/server";
import { singleton } from "tsyringe";
import { ZodType } from "zod";
import { alias, KEY } from "../../di";
import { IValidator, ValidationResult } from "../types";


@singleton()
@alias(KEY("IValidator"))
export class ZodValidator implements IValidator {
    canValidate(object: any, schema: any, options?: any): boolean {
        return !!schema && schema instanceof ZodType;
    }

    validate(object: any, schema: ZodType, options?: any): ValidationResult {
        if (!this.canValidate(object, schema, object)) {
            throw new HttpCServerError("invalidState");
        }

        const result = schema.safeParse(object);
        if (!result.success) {
            return {
                success: false,
                errors: result.error.errors.map(x => x.message),
            };
        }

        return {
            success: true,
            object: result.data,
        };
    }
}
