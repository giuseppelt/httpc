import assert from "assert";
import { container as globalContainer, DependencyContainer, InjectionToken, instanceCachingFactory } from "tsyringe";
import { ExpandedKeys } from "../env";


export type Constructor<T = any> = new (...args: any) => T

export type ServiceKey = keyof ServiceTypes
export type EnvVariableKey = ExpandedKeys<EnvVariableTypes>

export type ServiceKeyGroup =
    | "ENV"
    | "OPTIONS"

type ServiceGroups = {
    ENV: EnvVariableTypes
    OPTIONS: string | Constructor
}

type ServiceGroupsKeys<T extends ServiceKeyGroup> = ServiceGroups[T] extends object ? ExpandedKeys<ServiceGroups[T]> : ServiceGroups[T]


export type ServiceInjectToken = Constructor | ServiceKey | `ENV:${EnvVariableKey}`

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



export function REGISTER_INSTANCE<T>(token: InjectionToken, value: T): void
export function REGISTER_INSTANCE<T>(container: DependencyContainer, token: InjectionToken, value: T): void
export function REGISTER_INSTANCE<T>(tokenOrContainer: InjectionToken | DependencyContainer, tokenOrValue: InjectionToken | T, value?: T) {
    let container: DependencyContainer;
    let token: InjectionToken;

    if (arguments.length === 2) {
        container = globalContainer;
        token = tokenOrContainer as any;
        value = tokenOrValue as any;
    } else {
        container = tokenOrContainer as any;
        token = tokenOrValue as any;
    }


    container.register(token, {
        useFactory: instanceCachingFactory(() => value)
    });
}

export function REGISTER_OPTIONS<TOption>(service: Constructor, options: TOption): void;
export function REGISTER_OPTIONS<TOption>(container: DependencyContainer, service: Constructor, options: TOption): void;
export function REGISTER_OPTIONS<TOption>(serviceOrContainer: Constructor | DependencyContainer, serviceOrOptions: Constructor | TOption, options?: TOption) {
    let container: DependencyContainer;
    let service: Constructor;

    if (arguments.length === 2) {
        container = globalContainer;
        service = serviceOrContainer as any;
        options = serviceOrOptions as any;
    } else {
        container = serviceOrContainer as any;
        service = serviceOrOptions as any;

    }

    REGISTER_INSTANCE(container, KEY("OPTIONS", service), options);
}
