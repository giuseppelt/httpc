import type { ILogger } from "../logging";


export function Catch(defaultValue?: any): MethodDecorator {
    return (target, key, descriptor: TypedPropertyDescriptor<any>) => {
        const original = descriptor.value;

        descriptor.value = async function (this: { logger?: ILogger }, ...args: any[]) {
            try {
                return await original.apply(this, args);
            } catch (ex: any) {
                this.logger?.error(`Catch ${target.constructor.name}.${key.toString()}\n%s\nArguments: %o`, ex.stack || (`(${ex.name}) ${ex.message}`), args);
                return defaultValue;
            }
        };

        return descriptor;
    }
}
