import { httpCall, httpGroup, useUser, useContextProperty, Authenticated } from "@httpc/kit";
import { SessionMiddleware } from "./middlewares";
import { sessionManager, editor } from "./services";


const commit = httpCall(async () => {
    const user = useUser();
    const changes = useContextProperty("changes");

    if (changes) {
        await editor.persist(changes);
        useContextProperty("changes", []);
    }

    await sessionManager.clear(user.id);
});

export default httpGroup(
    Authenticated(),
    SessionMiddleware(),
    {
        edit,
        undo,
        commit,
    }
)
