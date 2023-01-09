import createClient, { AuthHeader } from "@your-service/api-client";

const client = createClient({
    endpoint: "https://api.your-service.com",
    middlewares: [
        AuthHeader("Bearer", localStorage.getItem("accessToken"))
    ]
});


const tickets = await client.tickets.query({ assignedTo: "me" });
let firstTicket = tickets[0];
if (firstTicket) {
    firstTicket = await client.tickets.close(firstTicket.id, "resolved");
}
