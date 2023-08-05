import { HttpCServerError } from "@httpc/server";
import { singleton } from "tsyringe";
import { alias, KEY } from "../../di";
import { IValidator, ValidationResult } from "../types";
import { BaseSchema, safeParse } from "valibot";


@singleton()
@alias(KEY("IValidator"))
export class ValibotValidator implements IValidator {
    canValidate(object: any, schema: any, options?: any): boolean {
        if (!schema || typeof schema !== "object") {
            return false;
        }

        const s = schema as BaseSchema & { schema: string };
        if (!s.schema || !s.parse) {
            return false;
        }

        // async not supported
        if (s.async) {
            throw new HttpCServerError("notSupported", "Valibot async validation is not supported");
        }

        return true;
    }

    validate(object: any, schema: BaseSchema, options?: any): ValidationResult {
        const result = safeParse(schema, object);
        if (!result.success) {
            return {
                success: false,
                errors: result.error.issues.map(x => x.message),
            };
        }

        return {
            success: true,
            object: result.data,
        };
    }
}
