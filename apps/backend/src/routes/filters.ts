import type { FastifyInstance } from "fastify";
import { pool } from "../db.js";

interface FiltersQuery {
  zone?: string;
  type?: string;
  province?: string;
  projectId?: string;
}

function buildConditions(excludedDimension: keyof FiltersQuery, filters: FiltersQuery) {
  const conditions = ["lat IS NOT NULL"];
  const params: string[] = [];
  const dimensions: Record<keyof FiltersQuery, string> = {
    zone: "admin_zone",
    type: "entity_type",
    province: "province",
    projectId: "project_id",
  };

  for (const [dimension, column] of Object.entries(dimensions) as Array<[keyof FiltersQuery, string]>) {
    if (dimension === excludedDimension || !filters[dimension]) continue;
    params.push(filters[dimension]!);
    conditions.push(`${column} = $${params.length}`);
  }

  return { where: conditions.join(" AND "), params };
}

export async function filtersRoutes(app: FastifyInstance) {
  app.get<{ Querystring: FiltersQuery }>("/api/filters", async (request) => {
    const client = await pool.connect();
    try {
      const [zones, types, provinces, projects] = await Promise.all([
        (async () => {
          const { where, params } = buildConditions("zone", request.query);
          const result = await client.query(
            `SELECT DISTINCT admin_zone FROM partners WHERE ${where}
             AND admin_zone IS NOT NULL ORDER BY admin_zone`,
            params,
          );
          return result.rows.map((row) => row.admin_zone);
        })(),
        (async () => {
          const { where, params } = buildConditions("type", request.query);
          const result = await client.query(
            `SELECT entity_type, count(*) FROM partners WHERE ${where}
             GROUP BY entity_type ORDER BY count DESC`,
            params,
          );
          return result.rows.map((row) => ({ value: row.entity_type, count: Number.parseInt(row.count, 10) }));
        })(),
        (async () => {
          const { where, params } = buildConditions("province", request.query);
          const result = await client.query(
            `SELECT DISTINCT province FROM partners WHERE ${where}
             AND province IS NOT NULL ORDER BY province`,
            params,
          );
          return result.rows.map((row) => row.province);
        })(),
        client.query("SELECT id, name FROM projects ORDER BY name"),
      ]);

      return {
        zones,
        types,
        provinces,
        projects: projects.rows.map((row) => ({ id: row.id, name: row.name })),
      };
    } finally {
      client.release();
    }
  });
}
