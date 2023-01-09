import { Authorization } from "../permissions"


export interface IAuthenticationService<T = any> {
    authenticate(arg: T): Promise<IUser>
}

export interface IAuthorizationService<T = Authorization> {
    authorize(user: IUser): Promise<T>
    createAuthorization(authorization: string | T): T
    assert(authorization: T, assertion: any): void
    check(authorization: T, assertion: any): boolean
}
