import { container as globalContainer } from "tsyringe";
import { createHttpCServerHandler, HttpCServerError, HttpCServerHandler, HttpCServerOptions, HttpCServerRequestMiddleware, IHttpCServer, useContextProperty } from "@httpc/server";
import { EnvVariableKey, initializeContainer, KEY, RESOLVE } from "./di";
import { ILogger } from "./logging";
import { assert } from "./internal";


export type ApplicationOptions = HttpCServerOptions & {
    autoInitialize?: boolean
    container?: "global" | "request"
}

export class Application implements IHttpCServer {
    protected _isInitialized: boolean | Promise<void> = false;
    protected _httpc?: HttpCServerHandler = undefined;
    protected _logger?: ILogger = undefined;

    constructor(protected readonly options: ApplicationOptions) {
    }

    fetch: IHttpCServer["fetch"] = async (req, context) => {
        if (!this.options.autoInitialize) {
            throw new HttpCServerError("invalidState", "Application not initialized");
        }

        await this.initialize();

        return await this._httpc!(req, context);
    }

    get logger(): ILogger {
        assert(this._logger, "Application not initialized");
        return this._logger;
    }

    async initialize() {
        if (this._isInitialized) {
            return this._isInitialized;
        }

        const initialize = async () => {
            this._httpc = this._createHandler();
            await initializeContainer();
            this._logger = RESOLVE(globalContainer, "ApplicationLogger");
            this._isInitialized = true;
        }

        return this._isInitialized = initialize().then(() => {
            this._isInitialized = true;
            this.fetch = this._httpc!;
        });
    }

    registerEnv(filter?: (name: string) => boolean): void;
    registerEnv(definitions: Partial<Record<EnvVariableKey, "optional" | "required">>): void;
    registerEnv(): void;
    registerEnv(filterOrDef?: ((name: string) => boolean) | Partial<Record<string, "optional" | "required">>): void {
        let vars: [string, string | undefined][];

        if (typeof filterOrDef === "object") {
            vars = [];

            for (const [name, opt] of Object.entries(filterOrDef)) {
                const value = process.env[name] ?? undefined;
                if (value === undefined && opt === "required") {
                    throw new Error("Missing required environment variable: " + name);
                }

                vars.push([name, value]);
            }
        } else {
            vars = Object.entries(process.env);

            if (typeof filterOrDef === "function") {
                vars = vars.filter(([name]) => filterOrDef(name));
            }
        }


        for (const [name, value] of vars) {
            globalContainer.registerInstance(KEY("ENV", name), value);
        }
    }

    protected _createHandler() {
        return createHttpCServerHandler({
            ...this.options,
            requestMiddlewares: [
                ContainerRequestMiddleware(this.options.container),
                ...this.options.requestMiddlewares || [],
            ],
            log: false, // disable server logging, as it's handled by application services
        });
    }
}


function ContainerRequestMiddleware(mode?: "global" | "request"): HttpCServerRequestMiddleware {
    return (req, next) => {
        let container = globalContainer;

        if (mode === "request") {
            container = globalContainer.createChildContainer();
        }

        useContextProperty("container", container);

        return next(req);
    };
}
