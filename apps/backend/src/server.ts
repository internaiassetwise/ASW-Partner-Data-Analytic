import { buildApp } from "./app.js";
import { config } from "./config.js";

const app = await buildApp();

const shutdown = async () => {
  await app.close();
  process.exit(0);
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

try {
  await app.listen({ port: config.port, host: config.host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
