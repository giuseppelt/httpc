import assert from "assert";
import { container as globalContainer } from "tsyringe";
import { createHttpCServer, HttpCServer, HttpCServerOptions, HttpCServerRequestProcessor, IHttpCHost, useContextProperty } from "@httpc/server";
import { EnvVariableKey, initializeContainer, KEY, RESOLVE } from "./di";
import { ILogger } from "./logging";


export type ApplicationOptions = HttpCServerOptions & {
    port?: number
    container?: "global" | "request"
}

export class Application implements IHttpCHost {
    protected _isInitialized = false;
    protected _server?: HttpCServer = undefined;
    protected _logger?: ILogger = undefined;

    constructor(protected readonly options: ApplicationOptions) {

    }

    get server(): HttpCServer {
        assert(this._server, "Application not initialized");
        return this._server;
    }
    get logger(): ILogger {
        assert(this._logger, "Application not initialized");
        return this._logger;
    }

    async initialize() {
        this._server = this._createServer();
        await initializeContainer();
        this._logger = RESOLVE(globalContainer, "ApplicationLogger");
        this._isInitialized = true;
    }

    getHttpCRequestProcessor() {
        return this.server.getHttpCRequestProcessor();
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

    start(port?: number) {
        assert(this._isInitialized, "Application not initialized");

        return new Promise<void>(resolve => {
            this.server.listen(port ?? this.options.port, resolve);

            const address = this.server.address();
            const listening = typeof address === "string" ? address : address?.port;
            this.logger.info("Started: listening on %s", listening);
        });
    }

    async stop(waitPending = false) {
        await new Promise<void>((resolve, reject) => {
            if (waitPending) {
                this.logger.verbose("Stopping: wait for pending connection");
                this.server.once("close", resolve);
            }

            this.server.close(err => {
                if (err) reject(err);
                else if (!waitPending) {
                    resolve();
                }
            });
        });

        this.logger.info("Stopped");
    }

    protected _createServer(): HttpCServer {
        return createHttpCServer({
            ...this.options,
            preProcessors: [
                ContainerRequestProcessor(this.options.container),
                ...this.options.preProcessors || [],
            ],
            log: false, // disable server logging, as it's handled by application services
        });
    }
}


function ContainerRequestProcessor(mode?: "global" | "request"): HttpCServerRequestProcessor {
    return async () => {
        let container = globalContainer;

        if (mode === "request") {
            container = globalContainer.createChildContainer();
        }

        useContextProperty("container", container);
    }
}
