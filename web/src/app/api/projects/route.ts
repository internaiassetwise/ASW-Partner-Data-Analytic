import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT id, name, status, zone, address, lat, lng, province, admin_zone,
              google_map_url, bu
       FROM projects
       WHERE lat IS NOT NULL
       ORDER BY name`
    );

    const features = res.rows.map((r) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [parseFloat(r.lng), parseFloat(r.lat)] },
      properties: {
        id: r.id,
        name: r.name,
        status: r.status || "",
        zone: r.zone || "",
        province: r.province || "",
        admin_zone: r.admin_zone || "",
        address: r.address || "",
        google_map_url: r.google_map_url || "",
        bu: r.bu || "",
        isProject: true,
      },
    }));

    // If id specified, also return linked partners
    if (id) {
      const partners = await client.query(
        `SELECT name, entity_type, phone, email, admin_zone
         FROM partners WHERE project_id = $1 ORDER BY name`,
        [id]
      );
      return NextResponse.json({
        type: "FeatureCollection",
        features,
        linkedPartners: partners.rows,
      });
    }

    return NextResponse.json({ type: "FeatureCollection", features });
  } finally {
    client.release();
  }
}
