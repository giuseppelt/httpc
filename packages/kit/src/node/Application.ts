import assert from "node:assert";
import { Server } from "node:http";
import { createHttpCNodeServer } from "@httpc/server";
import { Application, ApplicationOptions } from "../Application";


export type NodeApplicationOptions = ApplicationOptions & {
    port?: number
}

export class NodeApplication extends Application {
    protected _server?: Server = undefined;
    protected readonly options!: NodeApplicationOptions; // retype

    constructor(options: NodeApplicationOptions) {
        super(options);
    }

    override async initialize(): Promise<true | void> {
        await super.initialize();

        this._server = createHttpCNodeServer(this);
    }

    start(port?: number) {
        const server = this._server;
        assert(server, "Server not initialized");
        assert(this._isInitialized === true, "Application not initialized");

        return new Promise<void>(resolve => {
            server.listen(port ?? this.options.port, resolve);

            const address = server.address();
            const listening = typeof address === "string" ? address : address?.port;
            this.logger.info("Started: listening on %s", listening);
        });
    }

    async stop(waitPending = false) {
        const server = this._server;
        assert(server, "Server not initialized");

        await new Promise<void>((resolve, reject) => {
            if (waitPending) {
                this.logger.verbose("Stopping: wait for pending connection");
                server.once("close", resolve);
            }

            server.close(err => {
                if (err) reject(err);
                else if (!waitPending) {
                    resolve();
                }
            });
        });

        this.logger.info("Stopped");
    }
}
