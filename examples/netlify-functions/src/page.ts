import { createClient, ClientDef } from "@httpc/client";
import calls from "./calls";


async function page() {
    const client = createClient<ClientDef<typeof calls>>({ endpoint: "/api" });
    await client.greet("Mark");
}
