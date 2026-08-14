import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required. Copy .env.example to .env and configure it.");
}

const parsedPort = Number.parseInt(process.env.PORT ?? "4000", 10);

export const config = {
  databaseUrl,
  port: Number.isFinite(parsedPort) ? parsedPort : 4000,
  host: process.env.HOST?.trim() || "0.0.0.0",
  frontendOrigin: process.env.FRONTEND_ORIGIN?.trim() || "http://localhost:3000",
};
