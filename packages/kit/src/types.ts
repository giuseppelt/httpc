
export type Plain<T> = T extends any ? { [k in keyof T]: T[k] } : never

export type Factorable<T> = T | (() => T)


declare const __nominal: unique symbol;

export type Nominal<Type, Name> = Type & {
    readonly [__nominal]: Name;
};
