import createClient, { AuthHeader } from "@your-service/api-client";

const client = createClient({
    endpoint: "https://api.your-service.com",
    middlewares: [
        AuthHeader("Bearer", localStorage.getItem("accessToken"))
    ]
});


const offers = await client.offers.getLatest();
const order = await client.orders.create({
    product: {
        id: offers.product.id,
        quantity: 1
    }
});
