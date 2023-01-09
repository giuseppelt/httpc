import { runInContext } from "../context";

const testContextData = new Map<string | symbol, any>();

export const testContext = {
    get<T = any>(key: string | symbol): T | undefined {
        return testContextData.get(key);
    },
    set(key: string | symbol, value: any) {
        testContextData.set(key, value);
    },
    assign(context: object) {
        for (const [key, value] of Object.entries(context)) {
            if (value !== undefined && value !== null) {
                testContext.set(key, value);
            }
        }
    },
    clear() {
        testContextData.clear();
    },
};

const testContextProxy = new Proxy(testContext, {
    get(target, property) {
        return target.get(property);
    },
    set(target, property, value) {
        target.set(property, value);
        return true;
    },
});


export function runInTestContext<T>(func: () => T) {
    return runInContext(testContextProxy, func);
}
