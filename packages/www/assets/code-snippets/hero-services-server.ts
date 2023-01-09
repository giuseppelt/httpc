import { httpCall, Authenticated, Validate, useUser, useInjected, Optional, NotFoundError } from "@httpc/server";
import { TicketService } from "./services";
import { REASONS } from "./data";

const closeTicket = httpCall(
    Authenticated("role:admin"),
    Validate(
        String,
        Optional(reason => REASONS.include(reason))
    ),
    async (ticketId: string, reason?: "resolved" | "rejected") => {
        const user = useUser();
        const tickets = useInjected(TicketService);

        const ticket = await tickets.get(ticketId);
        if (!ticket) {
            throw new NotFoundError();
        }

        return await tickets.close(ticketId, {
            by: user.id,
            reason: reason || "resolved"
        });
    }
);

export default {
    tickets: {
        close: closeTicket,
        query: // ...
    }
}
