import { createApp } from "./app";
import { env } from "./config/env";
import { startOrderListener } from "./realtime/orderListener";

// Server bootstrap: build the app, listen, and start the realtime listener.
const app = createApp();

app.listen(env.port, () => {
  console.log(`backend listening on http://localhost:${env.port}`);
  startOrderListener();
});
