import "@httpc/server/env";
import type { DependencyContainer } from "tsyringe";
import type { ILogger, ILogService } from "./logging";
import type { IDbService, IInitialize, ITransactionService } from "./services";
import type { IEventBus } from "./events";
import type { IValidator } from "./validation";
import type { IEmailSender } from "./email";
import type { Authorization } from "./permissions";
import type { BasicCredential, IAuthenticationService, IAuthorizationService } from "./auth";
import type { ICachingService } from "./caching";


export type IsStrict<T> = T extends { $strict: true } ? true : false
export type ExpandedKeys<T> = IsStrict<T> extends true ? Exclude<keyof T, "$strict"> : (Exclude<keyof T, "$strict"> | (string & {}))


declare global {
    interface IHttpCContext {
        container: DependencyContainer
        user?: IUser
        authorization?: Authorization
    }

    interface IUser {

    }

    interface EnvVariableTypes {

    }

    interface ServiceTypes {
        IInitialize: IInitialize
        ILogService: ILogService
        ICachingService: ICachingService
        IEventBus: IEventBus
        IAuthenticationService: IAuthenticationService
        ApiKeyAuthentication: IAuthenticationService<string>
        BearerAuthentication: IAuthenticationService<string>
        BasicAuthentication: IAuthenticationService<BasicCredential>
        IAuthorizationService: IAuthorizationService
        IDbService: IDbService
        ITransactionService: ITransactionService
        IValidator: IValidator
        ApplicationLogger: ILogger
        IEmailSender: IEmailSender
    }

    interface CacheTypes {
        //TODO: add request cache
    }

    interface CacheItemTypes {
    }


    interface EventTypes {

    }
}
