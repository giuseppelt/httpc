import { Assertion, Authorization } from "../permissions";


export interface IAuthenticationService<T = any> {
    authenticate(arg: T): Promise<IUser>
}

export interface IAuthorizationService<Auth = Authorization, Assert = Assertion | string> {
    authorize(user: IUser): Promise<Auth>
    createAuthorization(authorization: string | Auth): Auth
    assert(authorization: Auth, assertion: Assert): void
    check(authorization: Auth, assertion: Assert): boolean
}
