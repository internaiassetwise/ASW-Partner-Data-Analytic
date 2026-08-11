"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });
const DetailPanel = dynamic(() => import("@/components/DetailPanel"), { ssr: false });

interface Feature {
  geometry: { coordinates: [number, number] };
  properties: Record<string, unknown>;
}

interface GeoJSON {
  type: string;
  features: Feature[];
}

interface FilterOptions {
  zones: string[];
  types: { value: string; count: number }[];
  provinces: string[];
  projects: { id: number; name: string }[];
}

const TYPE_LABELS: Record<string, string> = {
  partner: "ASW Partner",
  sponsor: "Sponsor",
  bank: "Bank",
  external_org: "องค์กรภายนอก",
  partner_2026: "พาร์ทเนอร์ 2026",
  gov_bkk: "หน่วยงาน กทม.",
  gov_district: "สำนักงานเขต",
};

const TYPE_COLORS: Record<string, string> = {
  partner: "#378ADD",
  sponsor: "#D85A30",
  bank: "#1D9E75",
  external_org: "#F59E0B",
  partner_2026: "#06B6D4",
  gov_bkk: "#9CA3AF",
  gov_district: "#6B7280",
};

const ALL_TYPES = Object.keys(TYPE_LABELS);

export default function Home() {
  const [partners, setPartners] = useState<GeoJSON>({ type: "FeatureCollection", features: [] });
  const [projects, setProjects] = useState<GeoJSON>({ type: "FeatureCollection", features: [] });
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<Record<string, unknown> | null>(null);
  const [linkedPartners, setLinkedPartners] = useState<{ name: string; entity_type: string; phone: string; email: string; admin_zone: string }[]>([]);
  const [selZone, setSelZone] = useState("");
  const [selProvince, setSelProvince] = useState("");
  const [selProject, setSelProject] = useState("");
  const [selTypes, setSelTypes] = useState<Set<string>>(new Set(ALL_TYPES));

  const fetchPartners = useCallback(async () => {
    const params = new URLSearchParams();
    if (selZone) params.set("zone", selZone);
    if (selProvince) params.set("province", selProvince);
    if (selProject) params.set("projectId", selProject);
    const res = await fetch(`/api/partners?${params}`);
    const data = await res.json();
    setPartners(data);
    setLoading(false);
  }, [selZone, selProvince, selProject]);

  useEffect(() => {
    fetch("/api/projects").then((r) => r.json()).then(setProjects);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selZone) params.set("zone", selZone);
    if (selProvince) params.set("province", selProvince);
    if (selProject) params.set("projectId", selProject);
    const qs = params.toString();
    fetch(`/api/filters${qs ? "?" + qs : ""}`)
      .then((r) => r.json())
      .then(setFilters);
  }, [selZone, selProvince, selProject]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(fetchPartners, 300);
    return () => clearTimeout(timer);
  }, [fetchPartners]);

  // Filter projects too — when a project is selected, show only that one
  const displayProjects = useMemo(() => {
    if (!selProject) return projects;
    return {
      ...projects,
      features: projects.features.filter(
        (f) => String(f.properties.id) === selProject
      ),
    };
  }, [projects, selProject]);

  // Client-side: filter by search + type checkboxes
  const displayPartners = useMemo(() => {
    let features = partners.features;

    if (selTypes.size < ALL_TYPES.length) {
      features = features.filter((f) =>
        selTypes.has(f.properties.entity_type as string)
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      features = features.filter((f) => {
        const name = ((f.properties.name as string) || "").toLowerCase();
        return name.includes(q);
      });
    }

    return { ...partners, features };
  }, [partners, searchQuery, selTypes]);

  const toggleType = (type: string) => {
    setSelTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleSelect = useCallback(async (props: Record<string, unknown>) => {
    setSelectedItem(props);
    setLinkedPartners([]);
    if (props.isProject && props.id) {
      try {
        const res = await fetch(`/api/projects?id=${props.id}`);
        const data = await res.json();
        if (data.linkedPartners) setLinkedPartners(data.linkedPartners);
      } catch { /* ignore */ }
    }
  }, []);

  const hasFilter = selZone || selProvince || selProject || searchQuery || selTypes.size < ALL_TYPES.length;

  const resetAll = () => {
    setSelZone(""); setSelProvince(""); setSelProject(""); setSearchQuery("");
    setSelTypes(new Set(ALL_TYPES));
  };

  const activeChips: { label: string; onClear: () => void }[] = [];
  if (selProject) {
    const p = filters?.projects.find((p) => String(p.id) === selProject);
    if (p) activeChips.push({ label: p.name, onClear: () => setSelProject("") });
  }
  if (selProvince) activeChips.push({ label: selProvince, onClear: () => setSelProvince("") });
  if (selZone) activeChips.push({ label: selZone, onClear: () => setSelZone("") });

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-4 py-2.5 flex items-center gap-4 shrink-0 bg-white">
        <div className="flex flex-col leading-tight shrink-0">
          <img src="/assetwise-logo.png" alt="AssetWise" className="h-5 w-auto" />
          <span className="text-[10px] text-gray-400 mt-1.5">แผนที่พาร์ทเนอร์</span>
        </div>

        <div className="mx-auto flex items-center gap-2 bg-gray-50 rounded-2xl px-4 h-10 w-full max-w-sm border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อพาร์ทเนอร์..."
            className="border-none bg-transparent outline-none text-sm flex-1 text-gray-700 placeholder-gray-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
          )}
        </div>

        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin shrink-0" />
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-500 bg-blue-50 text-blue-600 px-2.5 py-1 rounded-md border border-blue-100 font-medium">
              {displayPartners.features.length} พาร์ทเนอร์
            </span>
            <span className="text-xs text-gray-500 bg-red-50 text-red-600 px-2.5 py-1 rounded-md border border-red-100 font-medium">
              {projects.features.length} โครงการ
            </span>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 border-r border-gray-200 flex flex-col shrink-0 bg-white">
          {/* Active chips */}
          {activeChips.length > 0 && (
            <div className="px-4 pt-3 pb-1 flex flex-wrap gap-1.5">
              {activeChips.map((chip, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-blue-50 text-blue-600 text-[11px] px-2.5 py-1 rounded-full border border-blue-100">
                  {chip.label}
                  <button onClick={chip.onClear} className="hover:text-blue-800">✕</button>
                </span>
              ))}
              <button onClick={resetAll} className="text-[11px] text-red-400 hover:text-red-600 px-1">ล้างทั้งหมด</button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5">
            {/* Project */}
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1.5">โครงการ</label>
              <select
                value={selProject}
                onChange={(e) => setSelProject(e.target.value)}
                className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition outline-none"
              >
                <option value="">ทั้งหมด</option>
                {filters?.projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Province */}
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1.5">จังหวัด</label>
              <select
                value={selProvince}
                onChange={(e) => setSelProvince(e.target.value)}
                className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition outline-none"
              >
                <option value="">ทั้งหมด</option>
                {filters?.provinces.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Zone */}
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1.5">เขต / อำเภอ</label>
              <select
                value={selZone}
                onChange={(e) => setSelZone(e.target.value)}
                className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition outline-none"
              >
                <option value="">ทั้งหมด</option>
                {filters?.zones.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Type checkboxes */}
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-2">ประเภทธุรกิจ</label>
              <div className="space-y-2">
                {ALL_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer hover:text-gray-900">
                    <input
                      type="checkbox"
                      checked={selTypes.has(type)}
                      onChange={() => toggleType(type)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-400"
                    />
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLORS[type] }} />
                    {TYPE_LABELS[type]}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Result count + export */}
          <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50/50 flex items-center justify-between">
            <p className="text-[12px] text-gray-500">
              พบ <span className="font-semibold text-gray-700">{displayPartners.features.length}</span> พาร์ทเนอร์
            </p>
            {displayPartners.features.length > 0 && (
              <button
                onClick={() => {
                  const rows = displayPartners.features.map((f) => {
                    const p = f.properties;
                    return [p.name, TYPE_LABELS[p.entity_type as string] || p.entity_type, p.admin_zone, p.province, p.phone, p.email].map((v) => `"${(v as string) || ""}"`).join(",");
                  });
                  const csv = ["\uFEFFชื่อ,ประเภท,เขต,จังหวัด,โทร,Email", ...rows].join("\n");
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "partners_export.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-[11px] text-blue-500 hover:text-blue-700 hover:underline font-medium"
              >
                Export CSV
              </button>
            )}
          </div>
        </aside>

        {/* Map + floating legend + detail panel */}
        <main className="flex-1 relative">
          <MapView partners={displayPartners} projects={displayProjects} onSelect={handleSelect} />

          {/* Empty state */}
          {!loading && displayPartners.features.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-[500] pointer-events-none">
              <div className="bg-white/90 border border-gray-200 rounded-xl px-6 py-4 text-center shadow-lg">
                <p className="text-sm font-medium text-gray-500">ไม่พบพาร์ทเนอร์ที่ตรงกับตัวกรอง</p>
                <button onClick={resetAll} className="mt-2 text-xs text-blue-500 hover:underline">ล้างตัวกรองทั้งหมด</button>
              </div>
            </div>
          )}

          {/* Floating legend — bottom left */}
          <div className="absolute bottom-3 left-3 bg-white/95 border border-gray-200 rounded-lg px-3 py-2 text-[12px] flex flex-nowrap gap-x-4 shadow-md z-[500] backdrop-blur-sm overflow-x-auto">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-red-200" />
              โครงการ
            </span>
            {ALL_TYPES.map((type) => (
              <span key={type} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] }} />
                {TYPE_LABELS[type]}
              </span>
            ))}
          </div>

          {/* Detail panel */}
          <DetailPanel selected={selectedItem} linkedPartners={linkedPartners} onClose={() => setSelectedItem(null)} />
        </main>
      </div>
    </div>
  );
}
