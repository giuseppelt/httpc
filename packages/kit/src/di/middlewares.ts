import { HttpCServerMiddleware, useContextProperty } from "@httpc/server";
import { container as globalContainer } from "tsyringe";
import { CONTAINER_KEY } from "./keys";


export function ContainerMiddleware(mode: "request" | "global" = "request"): HttpCServerMiddleware {
    return (call, next) => {
        let container = globalContainer;

        if (mode === "request") {
            container = globalContainer.createChildContainer();
            container.registerInstance(CONTAINER_KEY, container);
        }

        useContextProperty("container", container);

        return next(call);
    };
}
