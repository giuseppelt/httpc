import { inject, injectWithTransform } from "tsyringe";
import type { ILogService } from "./types";
import { KEY } from "../di";


export function logger(): ParameterDecorator {
    return (target, propertyKey, parameterIndex) => {
        injectWithTransform(KEY("ILogService"), CreateLoggerTransform, (target as Function).name)(target, propertyKey, parameterIndex);
    };
}

class CreateLoggerTransform {
    transform(service: ILogService, label: string) {
        return service.createLogger(label);
    }
}


export function appLogger(): ParameterDecorator {
    return inject(KEY("ApplicationLogger"));
}
