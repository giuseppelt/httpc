import { httpCall, useUser, useTransaction } from "@httpc/kit";
import { OrderService, Inventory } from "./services";
import { OrderCreateSchema } from "./data";

const createOrder = httpCall(
    Authenticated(),
    Validate(OrderCreateSchema),
    async (orderData: OrderCreateSchema) => {
        const user = useUser();

        const order = useTransaction(OrderService, Inventory,
            async (orders, inventory) => {
                await inventory.reserve(order.product.id, order.product.quantity);

                return await orders.create({
                    userId: user.id,
                    productId: order.product.id,
                    quantity: order.product.quantity,
                });
            }
        );

        return order;
    }
);

export default {
    orders: {
        create: createOrder
    }
}
