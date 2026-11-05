import "dotenv/config";
import { createApp } from "./app.js";
import type { AppDatabase } from "./database.js";

// The distributable lab defaults to loopback. Cloud Preview can explicitly
// override this to 0.0.0.0 in its isolated sandbox; never set that for Kali.
const host = process.env.BOLAGUARD_HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 3000);
const jwtSecret = process.env.BOLAGUARD_JWT_SECRET;

if (host !== "127.0.0.1" && host !== "0.0.0.0") {
  throw new Error("BOLAGUARD_HOST must be 127.0.0.1 or the isolated Preview value 0.0.0.0");
}
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("PORT must be an integer from 1024 through 65535");
}
if (!jwtSecret || Buffer.byteLength(jwtSecret, "utf8") < 32) {
  throw new Error("Set BOLAGUARD_JWT_SECRET to at least 32 characters in .env; see README.md.");
}

const app = createApp({
  jwtSecret,
  databasePath: process.env.DATABASE_PATH ?? "data/bolaguard.sqlite",
});
const database = app.locals.database as AppDatabase;
const server = app.listen(port, host, () => {
  const localAddress = host === "0.0.0.0" ? "127.0.0.1" : host;
  console.log(`BOLA Guard Lab listening locally at http://${localAddress}:${port}`);
  console.log("SQLite demo data is synthetic; do not expose this service publicly.");
});

function stopServer() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.once("SIGINT", stopServer);
process.once("SIGTERM", stopServer);
