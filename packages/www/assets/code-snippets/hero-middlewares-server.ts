import { httpCall, useUser, Authenticated, Cached } from "@httpc/kit";
import db from "./db";

const getProfile = httpCall(
    Authenticated(),
    Cached("1h"),
    async () => {
        const user = useUser();

        return await db.select("profiles")
            .where("userId", user.id);
    }
)

export default {
    getProfile
}
