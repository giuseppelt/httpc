import assert from "assert";
import { useInjected } from "../di"
import { IService } from "./types";



type ServiceConstructor<T extends IService = IService> = new (...args: any) => T

type Instances<T extends (ServiceConstructor | IService)[]> = {
    [k in keyof T]: T[k] extends ServiceConstructor<infer I> ? I
    : T[k] extends IService ? T[k]
    : never
}

export function useTransaction<T extends ServiceConstructor, R>(type: T, func: (service: InstanceType<T>) => Promise<R>): Promise<R>
export function useTransaction<T extends IService, R>(type: T, func: (service: T) => Promise<R>): Promise<R>
export function useTransaction<T extends (ServiceConstructor | IService)[], R>(...services: [...T, (...instances: Instances<T>) => Promise<R>]): Promise<R>
export function useTransaction(...args: any[]) {
    const func = args.pop();
    assert(typeof func === "function", "last argument must be a function");
    assert(args.length > 0, "you mys specify at least a service");

    const data = useInjected("IDbService");
    const instances = args.map(x => typeof x === "object" ? x : useInjected(x));

    return data.startTransaction(data => func(...instances.map(x => x.inTransaction?.(data) || x)));
}
