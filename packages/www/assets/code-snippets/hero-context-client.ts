import createClient, { QueryParam } from "@your-package/api-client";

const client = createClient({
    endpoint: "http://api.domain.com",
    middleware: [
        QueryParam("api-key", process.env.CLIENT_API_KEY)
    ]
});


await client.createEditSession();
const change1 = await client.edit("#object-id", {
    color: "red"
});
const change2 = await client.edit("#object-id", {
    fontSize: "16px"
});

await client.undo(change2.id);
await client.commit();

