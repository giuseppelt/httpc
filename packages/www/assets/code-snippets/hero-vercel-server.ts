import { httpCall, Validate } from "@httpc/kit";
import db from "./db";


async function getLatest() {
    return db.select("posts").take(10)
        .orderBy("created_at", "desc");
}

const addLike = httpCall(
    Validate(String),
    async (postId: string) => {
        return db.update("posts").where("id", postId)
            .increase("likes", 1);
    }
);

export default {
    posts: {
        getLatest,
        addLike,
    }
}
