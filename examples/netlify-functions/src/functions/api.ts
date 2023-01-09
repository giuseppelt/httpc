import { createHttpCNetlifyHandler } from "@httpc/adapter-netlify";
import calls from "../calls";


export const handler = createHttpCNetlifyHandler({
    path: "api",
    cors: true,
    calls
});
