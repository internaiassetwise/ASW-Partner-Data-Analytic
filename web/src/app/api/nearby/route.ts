import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");
  const requestedRadius = parseFloat(searchParams.get("radius") || "10");
  const radius = Math.min(Math.max(requestedRadius, 0.1), 100);
  const excludeProjectId = Number.parseInt(searchParams.get("excludeProjectId") || "", 10);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radius)) {
    return NextResponse.json({ partners: [] });
  }

  const client = await pool.connect();
  try {
    // Simple bounding box + Pythagorean distance (approx km)
    const latRange = radius / 111.0;
    const lngRange = radius / (111.0 * Math.cos(lat * Math.PI / 180));

    const res = await client.query(
      `SELECT p.id, p.name, p.entity_type, p.phone, p.email, p.contact_name,
          p.address_full, p.admin_zone, p.subzone, p.province, p.project_id,
          pr.name AS project_name, p.lat, p.lng,
          SQRT(POWER(69.1 * (p.lat - $1), 2) + POWER(69.1 * (p.lng - $2) * COS($1 / 57.3), 2)) * 1.609 AS distance_km
       FROM partners p
       LEFT JOIN projects pr ON p.project_id = pr.id
       WHERE p.lat IS NOT NULL
         AND p.lat BETWEEN $1 - $3 AND $1 + $3
         AND p.lng BETWEEN $2 - $4 AND $2 + $4
         AND SQRT(POWER(69.1 * (p.lat - $1), 2) + POWER(69.1 * (p.lng - $2) * COS($1 / 57.3), 2)) * 1.609 <= $5
         AND ($6::int IS NULL OR p.project_id IS DISTINCT FROM $6::int)
       ORDER BY distance_km
       LIMIT 50`,
      [lat, lng, latRange, lngRange, radius, Number.isFinite(excludeProjectId) ? excludeProjectId : null]
    );

    const partners = res.rows.map((row) => ({
      ...row,
      email: row.email || "",
      phone: row.phone || "",
      contact_name: row.contact_name || "",
      address_full: row.address_full || "",
      admin_zone: row.admin_zone || "",
      subzone: row.subzone || "",
      province: row.province || "",
      project_name: row.project_name || "",
      lat: Number(row.lat),
      lng: Number(row.lng),
      distance_km: Math.round(Number(row.distance_km) * 10) / 10,
    }));

    return NextResponse.json({ partners });
  } finally {
    client.release();
  }
}
