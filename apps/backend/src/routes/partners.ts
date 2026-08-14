import type { FastifyInstance } from "fastify";
import type { GeoJSON, PartnerProperties } from "@asw/shared";
import { pool } from "../db.js";

interface PartnersQuery {
  zone?: string;
  type?: string;
  province?: string;
  projectId?: string;
}

export async function partnersRoutes(app: FastifyInstance) {
  app.get<{ Querystring: PartnersQuery }>("/api/partners", async (request) => {
    const { zone, type, province, projectId } = request.query;
    const conditions: string[] = ["p.lat IS NOT NULL"];
    const params: Array<string | number> = [];
    let parameterIndex = 1;

    if (zone) { params.push(zone); conditions.push(`p.admin_zone = $${parameterIndex++}`); }
    if (type) { params.push(type); conditions.push(`p.entity_type = $${parameterIndex++}`); }
    if (province) { params.push(province); conditions.push(`p.province = $${parameterIndex++}`); }
    if (projectId) { params.push(projectId); conditions.push(`p.project_id = $${parameterIndex++}`); }

    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT p.id, p.external_id, p.name, p.entity_type, p.email, p.phone,
                p.contact_name, p.street, p.city, p.address_full,
                p.admin_zone, p.subzone, p.province, p.project_zone,
                p.employee_count, p.join_date, p.geo_source, p.project_id,
                p.m_intranet, p.m_edm, p.m_line, p.m_standee,
                p.m_poster, p.m_booth, p.m_leaflet,
                p.remark, p.notes, p.lat, p.lng,
                pr.name AS project_name
         FROM partners p
         LEFT JOIN projects pr ON p.project_id = pr.id
         WHERE ${conditions.join(" AND ")}
         ORDER BY p.name`,
        params,
      );

      const features: GeoJSON<PartnerProperties>["features"] = result.rows.map((row) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [Number(row.lng), Number(row.lat)] },
        properties: {
          id: row.id,
          name: row.name,
          entity_type: row.entity_type,
          email: row.email || "",
          phone: row.phone || "",
          contact_name: row.contact_name || "",
          address_full: row.address_full || "",
          admin_zone: row.admin_zone || "",
          subzone: row.subzone || "",
          province: row.province || "",
          project_zone: row.project_zone || "",
          project_name: row.project_name || "",
          project_id: row.project_id,
          employee_count: row.employee_count || "",
          join_date: row.join_date ? new Date(row.join_date).toISOString().split("T")[0] : "",
          geo_source: row.geo_source || "",
          marketing: {
            intranet: row.m_intranet,
            edm: row.m_edm,
            line: row.m_line,
            standee: row.m_standee,
            poster: row.m_poster,
            booth: row.m_booth,
            leaflet: row.m_leaflet,
          },
          remark: row.remark || "",
        },
      }));

      return { type: "FeatureCollection" as const, features };
    } finally {
      client.release();
    }
  });
}
