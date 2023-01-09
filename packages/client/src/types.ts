
export type ClientDef<T> = T extends Record<string, any>
    ? { [k in keyof T]: ClientCall<T[k]> }
    : never

type ClientCall<T> = T extends (...args: any[]) => any
    ? (...args: CallParams<Parameters<T>>) => Promise<Awaited<ReturnType<T>>>
    : T extends CallPipeline<infer P>
    ? (...args: CallParams<Parameters<P>>) => Promise<Awaited<ReturnType<P>>>
    : T extends Record<string, any>
    ? ClientDef<T>
    : never

type CallParams<P> = P;

type CallPipeline<T extends (...args: any[]) => any> = {
    $type?: T
    access: string
    execute: (...args: any) => any
}

export type JsonSafeType<T> =
    T extends Function ? never :
    T extends Promise<any> ? never :
    T extends number | string | boolean | undefined | null ? T :
    T extends Date | BigInt ? string :
    T extends [infer H, ...infer R] ? (
        H extends never ? [] :
        R extends never[] ? [H] :
        [JsonSafeType<H>, ...JsonSafeType<R>]) :
    T extends Array<infer E> ? JsonSafeType<E>[] :
    T extends Record<string | number, any> ? { [k in keyof T]: JsonSafeType<T[k]> } :
    never
