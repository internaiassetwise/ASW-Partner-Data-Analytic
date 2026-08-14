import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { pool } from "./db.js";
import { filtersRoutes } from "./routes/filters.js";
import { nearbyRoutes } from "./routes/nearby.js";
import { partnersRoutes } from "./routes/partners.js";
import { projectsRoutes } from "./routes/projects.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: config.frontendOrigin,
    methods: ["GET", "HEAD", "OPTIONS"],
  });

  app.get("/health", async () => {
    await pool.query("SELECT 1");
    return { status: "ok" };
  });

  await app.register(projectsRoutes);
  await app.register(partnersRoutes);
  await app.register(nearbyRoutes);
  await app.register(filtersRoutes);

  app.addHook("onClose", async () => {
    await pool.end();
  });

  return app;
}
