import "@httpc/server/env";
import { DependencyContainer } from "tsyringe";
import { ILogger, ILogService } from "./logging";
import { IDbService, IInitialize, ITransactionService } from "./services";
import { IEventBus } from "./events";
import { IValidator } from "./validation";
import { IEmailSender } from "./email";
import { Authorization } from "./permissions";
import { BasicCredential, IAuthenticationService, IAuthorizationService } from "./auth";
import { ICache, ICachingService } from "./caching";


declare global {
    interface IHttpCContext {
        container: DependencyContainer
        user?: IUser
        authorization?: Authorization
    }

    interface IUser {

    }

    interface IEnvVariables {

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
        // request: ICache
    }
}
