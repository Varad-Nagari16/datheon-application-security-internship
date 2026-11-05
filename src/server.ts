import { app } from "./app.js";

const host = process.env.TASK4_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.TASK4_PORT ?? "3001", 10);

if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
  throw new Error("TASK4_PORT must be an integer from 1024 to 65535");
}

app.listen(port, host, () => {
  console.log(`Task 4 synthetic API listening at http://${host}:${port}`);
});
