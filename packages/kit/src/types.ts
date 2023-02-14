
export type Plain<T> = T extends any ? { [k in keyof T]: T[k] } : never

export type Factorable<T> = T | (() => T)
