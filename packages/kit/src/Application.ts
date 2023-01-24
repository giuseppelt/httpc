import assert from "assert";
import { createHttpCServer, HttpCServer, HttpCServerOptions, HttpCServerRequestProcessor, IHttpCHost, useContextProperty } from "@httpc/server";
import { initializeContainer, RESOLVE } from "./di";
import { ILogger } from "./logging";
import { container as globalContainer } from "tsyringe";


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
