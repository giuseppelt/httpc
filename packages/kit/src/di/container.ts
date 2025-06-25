import { container as globalContainer, DependencyContainer } from "tsyringe";
import { runInContext } from "@httpc/server";
import type { IInitialize } from "../services";
import { ConsoleLogService, ILogger } from "../logging";
import { KEY, RESOLVE, RESOLVE_ALL } from "./keys";


export async function initializeContainer(container: DependencyContainer = globalContainer) {
    if (!container.isRegistered(KEY("ILogService"))) {
        container.register(KEY("ILogService"), ConsoleLogService);
    }

    if (!container.isRegistered(KEY("ApplicationLogger"))) {
        const logger = RESOLVE(container, "ILogService").createLogger("Application");
        container.registerInstance(KEY("ApplicationLogger"), logger);
    }

    if (container.isRegistered(KEY("IInitialize"))) {
        const initializers = RESOLVE_ALL(container, "IInitialize");

        await runInContext({ container }, () =>
            Promise.all(initializers.map(async service => {
                if ((service as IInitialize).initialize) {
                    await service.initialize();

                    if ("logger" in service) {
                        ((service as any).logger as ILogger).verbose("Initialized");
                    }
                }
            }))
        );
    }
}
