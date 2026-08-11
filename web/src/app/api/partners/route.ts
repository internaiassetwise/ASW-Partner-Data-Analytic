import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const zone = searchParams.get("zone");
  const type = searchParams.get("type");
  const province = searchParams.get("province");
  const projectId = searchParams.get("projectId");

  const conditions: string[] = ["p.lat IS NOT NULL"];
  const params: (string | number)[] = [];
  let pi = 1;

  if (zone) { params.push(zone); conditions.push(`p.admin_zone = $${pi++}`); }
  if (type) { params.push(type); conditions.push(`p.entity_type = $${pi++}`); }
  if (province) { params.push(province); conditions.push(`p.province = $${pi++}`); }
  if (projectId) { params.push(projectId); conditions.push(`p.project_id = $${pi++}`); }

  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT p.id, p.external_id, p.name, p.entity_type, p.email, p.phone,
              p.contact_name, p.street, p.city, p.address_full,
              p.admin_zone, p.subzone, p.province, p.project_zone,
              p.employee_count, p.join_date, p.geo_source, p.project_id,
              p.m_intranet, p.m_edm, p.m_line, p.m_standee,
              p.m_poster, p.m_booth, p.m_leaflet,
              p.remark, p.notes, p.lat, p.lng,
              pr.name as project_name
       FROM partners p
       LEFT JOIN projects pr ON p.project_id = pr.id
       WHERE ${conditions.join(" AND ")}
       ORDER BY p.name`,
      params
    );

    const features = res.rows.map((r) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [parseFloat(r.lng), parseFloat(r.lat)] },
      properties: {
        id: r.id,
        name: r.name,
        entity_type: r.entity_type,
        email: r.email || "",
        phone: r.phone || "",
        contact_name: r.contact_name || "",
        address_full: r.address_full || "",
        admin_zone: r.admin_zone || "",
        subzone: r.subzone || "",
        province: r.province || "",
        project_zone: r.project_zone || "",
        project_name: r.project_name || "",
        project_id: r.project_id,
        employee_count: r.employee_count || "",
        join_date: r.join_date ? String(r.join_date) : "",
        geo_source: r.geo_source || "",
        marketing: {
          intranet: r.m_intranet, edm: r.m_edm, line: r.m_line,
          standee: r.m_standee, poster: r.m_poster, booth: r.m_booth, leaflet: r.m_leaflet,
        },
        remark: r.remark || "",
      },
    }));

    return NextResponse.json({ type: "FeatureCollection", features });
  } finally {
    client.release();
  }
}
