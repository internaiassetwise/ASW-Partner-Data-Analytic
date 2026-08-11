import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");
  const radius = parseFloat(searchParams.get("radius") || "10");
  const excludeProjectId = searchParams.get("excludeProjectId");

  if (!lat || !lng) {
    return NextResponse.json({ partners: [] });
  }

  const client = await pool.connect();
  try {
    // Simple bounding box + Pythagorean distance (approx km)
    const latRange = radius / 111.0;
    const lngRange = radius / (111.0 * Math.cos(lat * Math.PI / 180));

    const res = await client.query(
      `SELECT name, entity_type, phone, admin_zone, province,
          SQRT(POWER(69.1 * (lat - $1), 2) + POWER(69.1 * (lng - $2) * COS($1 / 57.3), 2)) * 1.609 AS distance_km
       FROM partners
       WHERE lat IS NOT NULL
         AND lat BETWEEN $1 - $3 AND $1 + $3
         AND lng BETWEEN $2 - $4 AND $2 + $4
         AND SQRT(POWER(69.1 * (lat - $1), 2) + POWER(69.1 * (lng - $2) * COS($1 / 57.3), 2)) * 1.609 <= $5
       ORDER BY distance_km
       LIMIT 50`,
      [lat, lng, latRange, lngRange, radius]
    );

    let partners = res.rows.map((r) => ({ ...r, distance_km: Math.round(r.distance_km * 10) / 10 }));
    if (excludeProjectId) {
      const linkedRes = await client.query(
        `SELECT name FROM partners WHERE project_id = $1`, [excludeProjectId]
      );
      const linkedNames = new Set(linkedRes.rows.map((r) => r.name));
      partners = partners.filter((p) => !linkedNames.has(p.name));
    }

    return NextResponse.json({ partners });
  } finally {
    client.release();
  }
}
