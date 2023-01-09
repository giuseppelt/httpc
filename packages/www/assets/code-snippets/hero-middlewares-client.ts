import createClient, { AuthHeader } from "@your-package/api-client";

const client = createClient({
    endpoint: "http://api.domain.com",
    middleware: [
        AuthHeader("Bearer", localStorage.getItem("access-token"))
    ]
});


const profile = await client.getProfile();

