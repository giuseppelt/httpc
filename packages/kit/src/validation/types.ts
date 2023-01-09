

export interface IValidator {
    canValidate(object: any, schema: any, options?: any): boolean
    validate(object: any, schema: any, options?: any): ValidationResult
}

export type ValidationResult =
    | ValidationResultSuccess
    | ValidationResultFailed


export type ValidationResultSuccess = {
    success: true
    object: any
}

export type ValidationResultFailed = {
    success: false
    errors: string[]
}
