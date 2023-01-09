import { httpCall } from "@httpc/kit";


const echo = httpCall(async (message: string) => {
    return message;
});

export default {
    echo,
}
