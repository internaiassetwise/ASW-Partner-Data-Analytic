"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Search, X, Download } from "lucide-react";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });
const DetailPanel = dynamic(() => import("@/components/DetailPanel"), { ssr: false });

interface Feature {
  geometry: { coordinates: [number, number] };
  properties: Record<string, any>;
}
interface GeoJSON { type: string; features: Feature[]; }
interface FilterOptions {
  zones: string[];
  types: { value: string; count: number }[];
  provinces: string[];
  projects: { id: number; name: string }[];
}

const TYPE_LABELS: Record<string, string> = {
  partner: "ASW Partner", sponsor: "Sponsor", bank: "Bank",
  external_org: "องค์กรภายนอก", partner_2026: "พาร์ทเนอร์ 2026",
  gov_bkk: "หน่วยงาน กทม.", gov_district: "สำนักงานเขต",
};
const TYPE_COLORS: Record<string, string> = {
  partner: "#378ADD", sponsor: "#D85A30", bank: "#1D9E75",
  external_org: "#F59E0B", partner_2026: "#06B6D4",
  gov_bkk: "#9CA3AF", gov_district: "#6B7280",
};
const ALL_TYPES = Object.keys(TYPE_LABELS);
const NAVY = "#1e3a5f";

export default function Home() {
  const [partners, setPartners] = useState<GeoJSON>({ type: "FeatureCollection", features: [] });
  const [projects, setProjects] = useState<GeoJSON>({ type: "FeatureCollection", features: [] });
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<Record<string, any> | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
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

  useEffect(() => { fetch("/api/projects").then((r) => r.json()).then(setProjects); }, []);
  useEffect(() => {
    const params = new URLSearchParams();
    if (selZone) params.set("zone", selZone);
    if (selProvince) params.set("province", selProvince);
    if (selProject) params.set("projectId", selProject);
    fetch(`/api/filters${params.toString() ? "?" + params.toString() : ""}`).then((r) => r.json()).then(setFilters);
  }, [selZone, selProvince, selProject]);
  useEffect(() => { setLoading(true); const t = setTimeout(fetchPartners, 300); return () => clearTimeout(t); }, [fetchPartners]);

  const displayProjects = useMemo(() => {
    if (!selProject) return projects;
    return { ...projects, features: projects.features.filter((f) => String(f.properties.id) === selProject) };
  }, [projects, selProject]);

  const displayPartners = useMemo(() => {
    let features = partners.features;
    if (selTypes.size < ALL_TYPES.length) features = features.filter((f) => selTypes.has(f.properties.entity_type));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      features = features.filter((f) => ((f.properties.name as string) || "").toLowerCase().includes(q));
    }
    return { ...partners, features };
  }, [partners, searchQuery, selTypes]);

  const toggleType = (type: string) => {
    setSelTypes((prev) => { const n = new Set(prev); n.has(type) ? n.delete(type) : n.add(type); return n; });
  };

  const handleSelect = useCallback(async (props: Record<string, any>) => {
    setSelectedItem(props);
    setSelectedId(props.id || null);
    setLinkedPartners([]);
    if (props.isProject && props.id) {
      try { const res = await fetch(`/api/projects?id=${props.id}`); const data = await res.json(); if (data.linkedPartners) setLinkedPartners(data.linkedPartners); } catch {}
    }
  }, []);

  // Click from list → select + fly to marker
  const handleListClick = useCallback((feature: Feature) => {
    handleSelect(feature.properties);
  }, [handleSelect]);

  const hasFilter = selZone || selProvince || selProject || searchQuery || selTypes.size < ALL_TYPES.length;
  const resetAll = () => { setSelZone(""); setSelProvince(""); setSelProject(""); setSearchQuery(""); setSelTypes(new Set(ALL_TYPES)); };

  const activeChips: { label: string; onClear: () => void }[] = [];
  if (selProject) { const p = filters?.projects.find((p) => String(p.id) === selProject); if (p) activeChips.push({ label: p.name, onClear: () => setSelProject("") }); }
  if (selProvince) activeChips.push({ label: selProvince, onClear: () => setSelProvince("") });
  if (selZone) activeChips.push({ label: selZone, onClear: () => setSelZone("") });

  const exportCSV = () => {
    const rows = displayPartners.features.map((f) => {
      const p = f.properties;
      return [p.name, TYPE_LABELS[p.entity_type] || p.entity_type, p.admin_zone, p.province, p.phone, p.email].map((v) => `"${(v as string) || ""}"`).join(",");
    });
    const csv = ["\uFEFFชื่อ,ประเภท,เขต,จังหวัด,โทร,Email", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "partners_export.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-4 py-2.5 flex items-center gap-4 shrink-0 bg-white">
        <div className="flex flex-col leading-tight shrink-0">
          <img src="/assetwise-logo.png" alt="AssetWise" className="h-5 w-auto" />
          <span className="text-[10px] text-gray-400 mt-1.5">แผนที่พาร์ทเนอร์</span>
        </div>
        <div className="mx-auto flex items-center gap-2 bg-gray-50 rounded-2xl px-4 h-10 w-full max-w-sm border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ค้นหาชื่อพาร์ทเนอร์..." className="border-none bg-transparent outline-none text-sm flex-1 text-gray-700 placeholder-gray-400" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
        </div>
        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin shrink-0 ml-auto" />
        ) : (
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <span className="text-xs px-2.5 py-1 rounded-md font-medium" style={{ background: "#378ADD", color: "white" }}>{displayPartners.features.length} พาร์ทเนอร์</span>
            <span className="text-xs px-2.5 py-1 rounded-md font-medium" style={{ background: NAVY, color: "white" }}>{displayProjects.features.length} โครงการ</span>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — w-72 with filters + partner list */}
        <aside className="w-72 border-r border-gray-200 flex flex-col shrink-0 bg-white">
          {/* Active chips */}
          {activeChips.length > 0 && (
            <div className="px-4 pt-2.5 pb-1 flex flex-wrap gap-1.5">
              {activeChips.map((chip, i) => (
                <span key={i} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border" style={{ background: "#ebf5ff", color: "#378ADD", borderColor: "#bfdbfe" }}>
                  {chip.label}<button onClick={chip.onClear} className="hover:text-blue-800"><X className="w-3 h-3" /></button>
                </span>
              ))}
              <button onClick={resetAll} className="text-[11px] text-red-400 hover:text-red-600 px-1">ล้าง</button>
            </div>
          )}

          {/* Filters (compact) */}
          <div className="px-4 py-2.5 space-y-2 border-b border-gray-100">
            <select value={selProject} onChange={(e) => setSelProject(e.target.value)} className="w-full text-[13px] border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:bg-white focus:border-blue-400 outline-none">
              <option value="">โครงการ: ทั้งหมด</option>
              {filters?.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="flex gap-2">
              <select value={selProvince} onChange={(e) => setSelProvince(e.target.value)} className="flex-1 text-[13px] border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:bg-white focus:border-blue-400 outline-none">
                <option value="">จังหวัด</option>
                {filters?.provinces.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={selZone} onChange={(e) => setSelZone(e.target.value)} className="flex-1 text-[13px] border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:bg-white focus:border-blue-400 outline-none">
                <option value="">เขต/อำเภอ</option>
                {filters?.zones.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            {/* Type checkboxes (compact inline) */}
            <div className="flex flex-wrap gap-1.5">
              {ALL_TYPES.map((type) => (
                <label key={type} className="flex items-center gap-1 text-[11px] text-gray-600 bg-gray-50 px-2 py-1 rounded-md cursor-pointer hover:bg-gray-100">
                  <input type="checkbox" checked={selTypes.has(type)} onChange={() => toggleType(type)} className="w-3 h-3" style={{ accentColor: TYPE_COLORS[type] }} />
                  <span className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[type] }}></span>
                  {TYPE_LABELS[type]}
                </label>
              ))}
            </div>
          </div>

          {/* Partner list header */}
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-gray-100 bg-gray-50/50">
            <span className="text-[11px] font-semibold text-gray-400 uppercase">รายชื่อ ({displayPartners.features.length})</span>
            {displayPartners.features.length > 0 && (
              <button onClick={exportCSV} className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
                <Download className="w-3 h-3" /> Export
              </button>
            )}
          </div>

          {/* Partner list (scrollable) */}
          <div className="flex-1 overflow-y-auto">
            {displayPartners.features.map((f, i) => {
              const p = f.properties;
              const isActive = selectedId === p.id;
              const color = TYPE_COLORS[p.entity_type as string] || "#666";
              return (
                <div
                  key={i}
                  onClick={() => handleListClick(f)}
                  className={`px-4 py-2 border-b border-gray-50 cursor-pointer transition ${isActive ? "bg-blue-50 border-l-2 border-l-blue-500" : "hover:bg-gray-50"}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] truncate ${isActive ? "font-medium text-gray-900" : "text-gray-700"}`}>{p.name}</p>
                      <p className="text-[11px] text-gray-400">
                        {TYPE_LABELS[p.entity_type as string] || p.entity_type}
                        {p.admin_zone && ` · ${p.admin_zone}`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {displayPartners.features.length === 0 && !loading && (
              <div className="px-4 py-6 text-center">
                <p className="text-[13px] text-gray-400">ไม่พบพาร์ทเนอร์</p>
                {hasFilter && <button onClick={resetAll} className="mt-1 text-[11px] text-gray-400 hover:text-gray-600 underline">ล้างตัวกรอง</button>}
              </div>
            )}
          </div>
        </aside>

        {/* Map */}
        <main className="flex-1 relative">
          <MapView
            partners={displayPartners}
            projects={displayProjects}
            onSelect={handleSelect}
            flyTo={selectedItem ? { lat: (selectedItem as any).lat, lng: (selectedItem as any).lng } : null}
          />
          {/* Legend */}
          <div className="absolute bottom-3 left-3 bg-white/95 border border-gray-200 rounded-lg px-3 py-2 text-[12px] flex flex-nowrap gap-x-4 shadow-md z-[500] backdrop-blur-sm overflow-x-auto">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: NAVY, border: "2px solid #2a5277" }} /> โครงการ
            </span>
            {ALL_TYPES.map((type) => (
              <span key={type} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] }} /> {TYPE_LABELS[type]}
              </span>
            ))}
          </div>
          <DetailPanel selected={selectedItem} linkedPartners={linkedPartners} onClose={() => { setSelectedItem(null); setSelectedId(null); }} />
        </main>
      </div>
    </div>
  );
}
