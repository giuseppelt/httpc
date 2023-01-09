import { createClient, ClientDef } from "@httpc/client";
import type calls from "../pages/api/_calls";


const client = createClient<ClientDef<typeof calls>>({
    endpoint: "/api"
});

export default client;
