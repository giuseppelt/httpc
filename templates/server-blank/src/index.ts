import { createHttpCServer } from "@httpc/server";
import calls from "./calls";


const PORT = Number(process.env.PORT) || 3000;

const server = createHttpCServer({
    calls
});


server.listen(PORT);
console.log("Server started: http//localhost:%d", PORT);
