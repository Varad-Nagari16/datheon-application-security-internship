import { createApp } from "./app.js";

// Intentionally fixed to loopback: do not expose this training API to a network.
const host = "127.0.0.1";
const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("PORT must be an integer from 1024 through 65535");
}

const app = createApp();
app.listen(port, host, () => {
  console.log(`BOLA Guard Lab listening locally at http://${host}:${port}`);
  console.log("Training-only data and demo session tokens; do not expose publicly.");
});
