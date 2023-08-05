export type MayBeArray<T> = T | T[];
export type MayBePromise<T> = T | Promise<T>;
export type Optional<T> = T | false | undefined;


export function filterOptionals<T>(items?: Optional<T>[]): T[] {
    return items?.filter(x => !!x) as T[] || [];
}

