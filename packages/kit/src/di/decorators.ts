import { inject, InjectionToken, registry, container, injectWithTransform, DependencyContainer } from "tsyringe";
import { assert } from "../internal";
import { Constructor, CONTAINER_KEY, KEY } from "./keys";


export function combine<T extends (...args: any[]) => any>(...decorators: T[]): T {
    return function (this: any) {
        for (const d of decorators) {
            //@ts-ignore
            d.apply(this, arguments);
        }
    } as any;
}

export function noInject() {
    return injectWithTransform(CONTAINER_KEY, NoInjectTransform);
}


class NoInjectTransform {
    transform(container: DependencyContainer) {
        return undefined;
    }
}


export function alias(token: InjectionToken): ClassDecorator {
    return (target: any) => registry([{ token, useFactory: container => container.resolve(target) }])(target);
}

export function initializer(): ClassDecorator {
    return alias(KEY("IInitialize"));
}

export function env(variableName: string, defaultValue?: any): ParameterDecorator {
    const key = KEY("ENV", variableName);
    const isOptional = arguments.length === 2;

    if (!container.isRegistered(key)) {
        container.register(key, {
            useFactory: () => {
                const value = process.env[variableName] ?? defaultValue;

                if (typeof value === "undefined" && !isOptional) {
                    throw new Error(`Missing ENV variable '${variableName}'`);
                }

                return value;
            }
        });
    }

    return inject(key);
}

export function optionsOf(target: string | Constructor): ClassDecorator {
    return alias(KEY("OPTIONS", target));
}

export function options(defaultValue?: any): ParameterDecorator {
    const isOptional = arguments.length === 1;

    return (target, property, index) => {
        assert(typeof target === "function", "options decorator must be used on a class constructor parameter");

        const token = KEY("OPTIONS", target as Constructor);
        const decorator = isOptional ? optional(token, defaultValue) : inject(token);

        return decorator(target, property, index);
    };

}

export function optional(token: string | Constructor, defaultValue?: any): ParameterDecorator {
    return injectWithTransform(CONTAINER_KEY, OptionalTransform, token, defaultValue);
}

class OptionalTransform {
    transform(container: DependencyContainer, token: InjectionToken, defaultValue?: undefined) {
        return container.isRegistered(token, true) ? container.resolve(token) : defaultValue;
    }
}
