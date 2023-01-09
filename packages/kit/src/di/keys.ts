import assert from "assert";
import { container as globalContainer, DependencyContainer, InjectionToken, instanceCachingFactory } from "tsyringe";


export type Constructor<T = any> = new (...args: any) => T

export type ServiceKey = keyof ServiceTypes

export type ServiceKeyGroup =
    | "ENV"
    | "OPTIONS"

type ServiceGroups = {
    ENV: IEnvVariables
    OPTIONS: string | Constructor
}

type IsStrict<T> = T extends { $strict: true } ? true : false
type KeysOf<T> = IsStrict<T> extends true ? Exclude<keyof T, "$strict"> : (Exclude<keyof T, "$strict"> | (string & {}))
type ServiceGroupsKeys<T extends ServiceKeyGroup> = ServiceGroups[T] extends object ? KeysOf<ServiceGroups[T]> : ServiceGroups[T]


export type ServiceInjectToken = Constructor | ServiceKey | `ENV:${string}`

export type ServiceInstance<T extends ServiceInjectToken> =
    T extends Constructor<infer I>
    ? I
    : T extends ServiceKey
    ? ServiceTypes[T]
    : T extends `ENV:${string}`
    ? string
    : unknown

export type ServiceInstances<T extends ServiceInjectToken[]> = {
    [k in keyof T]: ServiceInstance<T[k]>
}


export const CONTAINER_KEY = "$CONTAINER";

export function KEY<T extends ServiceKey>(service: T): T;
export function KEY<T extends ServiceKeyGroup>(group: T, key: ServiceGroupsKeys<T>): `${T}:${string}`;
export function KEY(serviceOrGroup: string, service?: string | Constructor): string {
    if (typeof service === "function") {
        assert(service.name, "Invalid constructor " + service);
        service = service.name;
    }

    if (service) {
        serviceOrGroup = `${serviceOrGroup}:${service}`;
    }

    return serviceOrGroup;
}

export function RESOLVE<T extends ServiceInjectToken>(container: DependencyContainer, service: T): ServiceInstance<T> {
    return container.resolve(service);
}

export function RESOLVE_ALL<T extends ServiceInjectToken>(container: DependencyContainer, service: T): ServiceInstance<T>[] {
    return container.resolveAll(service);
}

export function RESOLVE_MANY<T extends ServiceInjectToken[]>(container: DependencyContainer, ...types: T): ServiceInstances<T> {
    return types.map(x => container.resolve(x)) as any;
}



export function REGISTER_INSTANCE<T>(token: InjectionToken, value: T) {
    globalContainer.register(token, {
        useFactory: instanceCachingFactory(() => value)
    });
}

export function REGISTER_OPTIONS<TOption>(service: Constructor, options: TOption) {
    REGISTER_INSTANCE(KEY("OPTIONS", service), options);
}
