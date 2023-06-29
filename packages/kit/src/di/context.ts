import { HttpCServerError, useContext } from "@httpc/server";
import { DependencyContainer, container as globalContainer } from "tsyringe";
import { Constructor, EnvVariableKey, RESOLVE_MANY, ServiceInjectToken, ServiceInstance, ServiceInstances, ServiceKey } from "./keys";


export function useContainer(): DependencyContainer;
export function useContainer(scope: "global"): DependencyContainer;
export function useContainer(scope?: string): DependencyContainer {
    if (scope === "global") {
        return globalContainer;
    }

    const { container } = useContext();
    if (!container) {
        throw new HttpCServerError("missingContextData", "missing container");
    }

    return container;
}

export function useInjected<T extends Constructor>(type: T): ServiceInstance<T>;
export function useInjected<T extends ServiceKey>(type: T): ServiceInstance<T>;
export function useInjected<T extends `ENV:${EnvVariableKey}`>(type: T): ServiceInstance<T>;
export function useInjected<T extends `ENV:${string}`>(type: T): ServiceInstance<T>;
export function useInjected<T>(type: string): T;
export function useInjected<T extends ServiceInjectToken[]>(...types: T): ServiceInstances<T>;
export function useInjected(...tokens: any[]) {
    const container = useContainer();
    const instances = RESOLVE_MANY(container, ...tokens);

    return tokens.length === 1
        ? instances[0]
        : instances;
}
