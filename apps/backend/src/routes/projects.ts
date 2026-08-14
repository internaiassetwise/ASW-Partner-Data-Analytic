import type { FastifyInstance } from "fastify";
import type { GeoJSON, LinkedPartner, ProjectProperties } from "@asw/shared";
import { pool } from "../db.js";

interface ProjectsQuery {
  id?: string;
}

export async function projectsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: ProjectsQuery }>("/api/projects", async (request) => {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, name, status, zone, address, lat, lng, province, admin_zone,
                google_map_url, bu
         FROM projects
         WHERE lat IS NOT NULL
         ORDER BY name`,
      );

      const features: GeoJSON<ProjectProperties>["features"] = result.rows.map((row) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [Number(row.lng), Number(row.lat)] },
        properties: {
          id: row.id,
          name: row.name,
          status: row.status || "",
          zone: row.zone || "",
          province: row.province || "",
          admin_zone: row.admin_zone || "",
          address: row.address || "",
          google_map_url: row.google_map_url || "",
          bu: row.bu || "",
          lat: Number(row.lat),
          lng: Number(row.lng),
          isProject: true,
        },
      }));

      if (request.query.id) {
        const partners = await client.query<LinkedPartner>(
          `SELECT id, name, entity_type, phone, email, admin_zone
           FROM partners WHERE project_id = $1 ORDER BY name`,
          [request.query.id],
        );
        return { type: "FeatureCollection" as const, features, linkedPartners: partners.rows };
      }

      return { type: "FeatureCollection" as const, features };
    } finally {
      client.release();
    }
  });
}
