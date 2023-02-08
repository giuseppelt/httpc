import { PrefixCacheDecorator } from "../../src/caching/PrefixCacheDecorator";
import { random } from "../utils";


describe("PrefixCacheDecorator", () => {

    const dataPrefix = (() => {
        const base = new Map();
        const prefix = random.string();
        const cache = PrefixCacheDecorator(prefix, base);

        return {
            base,
            prefix,
            cache
        };
    })();

    const dataFactory = (() => {
        const base = new Map();
        const prefix = random.string();
        const cache = PrefixCacheDecorator(() => prefix, base);

        return {
            base,
            prefix,
            cache
        };
    })();



    for (const [name, data] of [
        ["fixed prefix", dataPrefix] as const,
        ["factory prefix", dataFactory] as const,
    ]) {

        test(`${name}: set and get`, () => {
            const { base, cache, prefix } = data;

            for (let a = 0; a < 5; a++) {
                const key = random.string();
                const value = random.string();
                cache.set(key, value);

                expect(cache.get(key)).toBe(value);
                //again
                expect(cache.get(key)).toBe(value);
            }
        });

        test(`${name}: don't get non-prefixed key`, () => {
            const { base, cache, prefix } = data;

            const key = random.string();
            base.set(key, random.string());

            expect(cache.get(key)).toBeUndefined();
        });

        test(`${name}: don't overwrite non-prefixed key`, () => {
            const { base, cache, prefix } = data;

            const key = random.string();
            const baseValue = random.string();
            base.set(key, baseValue);

            const cacheValue = random.string();
            cache.set(key, cacheValue);
            expect(cache.get(key)).toBe(cacheValue);
            expect(base.get(key)).toBe(baseValue);
        });
    }
});
