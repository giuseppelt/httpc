import { decoratorMetadata, decoratorMiddleware } from "../controller";
import { combine } from "../di";
import { Validate } from "./pipeline";


export const validate = (...schema: any[]) => combine(
    decoratorMetadata("validate:paramtypes", schema.length === 0)(),
    decoratorMiddleware(Validate)(...schema),
);
