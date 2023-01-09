import { createHttpCVercelAdapter } from "@httpc/adapter-vercel";
import calls from "../calls";


export default createHttpCVercelAdapter({
    calls,
    log: "info"
});
