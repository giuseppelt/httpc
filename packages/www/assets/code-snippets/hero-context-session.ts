import { useContext, useContextProperty, PassThroughMiddleware } from "@httpc/kit";
import { sessionManager } from "./services";


export function SessionMiddleware() {
    return PassThroughMiddleware(async () => {
        const { user } = useContext();
        if (!user) {
            return;
        }

        const session = await sessionManager.retrieve(user.id);

        useContextProperty("sessionId", session.id);
        useContextProperty("changes", session.changes);
    });
}
