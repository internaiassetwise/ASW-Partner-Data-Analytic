import type { FastifyInstance } from "fastify";
import type { NearbyPartner } from "@asw/shared";
import { pool } from "../db.js";

interface NearbyQuery {
  lat?: string;
  lng?: string;
  radius?: string;
  excludeProjectId?: string;
}

export async function nearbyRoutes(app: FastifyInstance) {
  app.get<{ Querystring: NearbyQuery }>("/api/nearby", async (request) => {
    const lat = Number.parseFloat(request.query.lat ?? "");
    const lng = Number.parseFloat(request.query.lng ?? "");
    const requestedRadius = Number.parseFloat(request.query.radius ?? "10");
    const excludeProjectId = Number.parseInt(request.query.excludeProjectId ?? "", 10);

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(requestedRadius)) {
      return { partners: [] as NearbyPartner[] };
    }

    const radius = Math.min(Math.max(requestedRadius, 0.1), 100);
    const latRange = radius / 111;
    const lngRange = radius / (111 * Math.cos(lat * Math.PI / 180));
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT p.id, p.name, p.entity_type, p.phone, p.email, p.contact_name,
                p.address_full, p.admin_zone, p.subzone, p.province, p.project_id,
                pr.name AS project_name, p.lat, p.lng,
                COALESCE(p.geo_precision, 'approximate') AS geo_precision,
                SQRT(POWER(69.1 * (p.lat - $1), 2) + POWER(69.1 * (p.lng - $2) * COS($1 / 57.3), 2)) * 1.609 AS distance_km
         FROM partners p
         LEFT JOIN projects pr ON p.project_id = pr.id
         WHERE p.lat IS NOT NULL
           AND p.lat BETWEEN $1 - $3 AND $1 + $3
           AND p.lng BETWEEN $2 - $4 AND $2 + $4
           AND SQRT(POWER(69.1 * (p.lat - $1), 2) + POWER(69.1 * (p.lng - $2) * COS($1 / 57.3), 2)) * 1.609 <= $5
           AND ($6::int IS NULL OR p.project_id IS DISTINCT FROM $6::int)
         ORDER BY CASE WHEN p.geo_precision = 'precise' THEN 0 ELSE 1 END, distance_km`,
        [lat, lng, latRange, lngRange, radius, Number.isFinite(excludeProjectId) ? excludeProjectId : null],
      );

      const partners: NearbyPartner[] = result.rows.map((row) => ({
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
        project_name: row.project_name || "",
        project_id: row.project_id,
        geo_precision: row.geo_precision,
        lat: Number(row.lat),
        lng: Number(row.lng),
        distance_km: Math.round(Number(row.distance_km) * 10) / 10,
      }));

      return { partners };
    } finally {
      client.release();
    }
  });
}
