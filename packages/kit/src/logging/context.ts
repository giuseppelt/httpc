import { KEY, RESOLVE, useContainer, useInjected } from "../di";
import { ILogger } from "./types";


export function useLogger(label?: string): ILogger {
    if (!label) {
        return useInjected(KEY("ApplicationLogger"));
    }

    const container = useContainer();
    const log = RESOLVE(container, "ILogService");

    return log.createLogger(label);
}
