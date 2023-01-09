import { Application } from "@httpc/kit";
import calls from "./calls";


const PORT = Number(process.env.PORT) || 3000;

const app = new Application({
    port: PORT,
    calls,
    coors: true,
    middlewares: [

    ],
});

app.initialize().then(() => {
    app.start();
});
