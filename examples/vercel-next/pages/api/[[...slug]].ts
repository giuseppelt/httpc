import { createHttpCVercelAdapter } from "@httpc/adapter-vercel";
import calls from "./_calls";


export default createHttpCVercelAdapter({
  calls,
  log: true,
});


export const config = {
  api: {
    bodyParser: false,
  }
}
