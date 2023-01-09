import { container as globalContainer, DependencyContainer } from "tsyringe";
import { CONTAINER_KEY } from "./keys";


/*
 * Add extra functionality to tsyringe container
 * - self registration, so it can resolve itself
 */


// self register
patchSelfRegister(globalContainer);

function patchSelfRegister(container: DependencyContainer) {
    registerSelf(container);

    // self register on child
    patch(container, "createChildContainer", function (original) {
        const value = original.call(this);
        patchSelfRegister(value);
        return value;
    });

    patch(container, "reset", function (original) {
        original.call(this);
        registerSelf(this);
    });


    function registerSelf(container: DependencyContainer) {
        container.registerInstance(CONTAINER_KEY, container);
    }
}


function patch<T, K extends keyof T>(instance: T, method: K, body: (this: T, base: T[K], ...args: Parameters<T[K] extends (...args: any) => any ? T[K] : never>) => ReturnType<T[K] extends (...args: any) => any ? T[K] : never>) {
    const oldMethod = instance[method];
    instance[method] = function (this: T) {
        return body.apply(this, [oldMethod, ...arguments] as any);
    } as any
}
