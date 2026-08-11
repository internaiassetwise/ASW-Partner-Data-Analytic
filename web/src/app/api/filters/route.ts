import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

interface FilterDims {
  zone?: string;
  type?: string;
  province?: string;
  projectId?: string;
}

function buildConditions(exclude: string, f: FilterDims) {
  const conditions: string[] = ["lat IS NOT NULL"];
  const params: string[] = [];
  let pi = 1;

  const dims: Record<string, { col: string; key: keyof FilterDims }> = {
    zone: { col: "admin_zone", key: "zone" },
    type: { col: "entity_type", key: "type" },
    province: { col: "province", key: "province" },
    projectId: { col: "project_id", key: "projectId" },
  };

  for (const [dim, { col, key }] of Object.entries(dims)) {
    if (dim === exclude) continue;
    const val = f[key];
    if (val) {
      params.push(val);
      conditions.push(`${col} = $${pi++}`);
    }
  }

  return { where: conditions.join(" AND "), params };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const f: FilterDims = {
    zone: searchParams.get("zone") || undefined,
    type: searchParams.get("type") || undefined,
    province: searchParams.get("province") || undefined,
    projectId: searchParams.get("projectId") || undefined,
  };

  const client = await pool.connect();
  try {
    // For each dimension: apply OTHER filters, return distinct values
    const [zoneRes, typeRes, provRes, projRes] = await Promise.all([
      // Zones (exclude zone filter itself)
      (async () => {
        const { where, params } = buildConditions("zone", f);
        const r = await client.query(
          `SELECT DISTINCT admin_zone FROM partners WHERE ${where}
           AND admin_zone IS NOT NULL ORDER BY admin_zone`,
          params
        );
        return r.rows.map((row) => row.admin_zone);
      })(),
      // Types (exclude type filter itself)
      (async () => {
        const { where, params } = buildConditions("type", f);
        const r = await client.query(
          `SELECT entity_type, count(*) FROM partners WHERE ${where}
           GROUP BY entity_type ORDER BY count DESC`,
          params
        );
        return r.rows.map((row) => ({
          value: row.entity_type,
          count: parseInt(row.count),
        }));
      })(),
      // Provinces (exclude province filter itself)
      (async () => {
        const { where, params } = buildConditions("province", f);
        const r = await client.query(
          `SELECT DISTINCT province FROM partners WHERE ${where}
           AND province IS NOT NULL ORDER BY province`,
          params
        );
        return r.rows.map((row) => row.province);
      })(),
      // Projects (always show all — project list comes from projects table)
      client.query("SELECT id, name FROM projects ORDER BY name"),
    ]);

    return NextResponse.json({
      zones: zoneRes,
      types: typeRes,
      provinces: provRes,
      projects: projRes.rows.map((r) => ({ id: r.id, name: r.name })),
    });
  } finally {
    client.release();
  }
}
