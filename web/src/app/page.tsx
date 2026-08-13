"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { AlertCircle, Check, Link2, MapPin, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import type {
  EntityType,
  GeoFeature,
  GeoJSON,
  LinkedPartner,
  MapProperties,
  NearbyPartner,
  PartnerProperties,
  ProjectProperties,
} from "@/lib/types";
import { isProjectProperties } from "@/lib/types";
import { ENTITY_COLORS as TYPE_COLORS, ENTITY_TINTS as TYPE_TINTS } from "@/lib/entityStyles";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });
const DetailPanel = dynamic(() => import("@/components/DetailPanel"), { ssr: false });

const TYPE_LABELS: Record<EntityType, string> = {
  partner: "พาร์ทเนอร์", sponsor: "สปอนเซอร์", bank: "ธนาคาร",
  external_org: "องค์กรภายนอก", partner_2026: "พาร์ทเนอร์ 2026",
  gov_bkk: "โรงเรียน/สถาบัน", gov_district: "สำนักงานเขต กทม.",
};
const ALL_TYPES = Object.keys(TYPE_LABELS) as EntityType[];
const NAVY = "#0C2A44";

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

function nearbyToPartner(partner: NearbyPartner): PartnerProperties {
  return {
    id: partner.id,
    name: partner.name,
    entity_type: partner.entity_type,
    email: partner.email,
    phone: partner.phone,
    contact_name: partner.contact_name,
    address_full: partner.address_full,
    admin_zone: partner.admin_zone,
    subzone: partner.subzone,
    province: partner.province,
    project_zone: "",
    project_name: partner.project_name,
    project_id: partner.project_id,
    employee_count: "",
    join_date: "",
    geo_source: "nearby",
    marketing: { intranet: false, edm: false, line: false, standee: false, poster: false, booth: false, leaflet: false },
    remark: "",
    _lat: partner.lat,
    _lng: partner.lng,
    _distanceKm: partner.distance_km,
    _geoPrecision: partner.geo_precision,
  };
}

// Helper: apply a set of filters to features, optionally excluding one dimension
function applyFilters(features: GeoFeature<PartnerProperties>[], opts: {
  zone?: string; province?: string; projectId?: string;
  types?: Set<EntityType>; search?: string;
  exclude?: "zone" | "province" | "projectId" | "types" | "search";
}) {
  let result = features;
  if (opts.projectId && opts.exclude !== "projectId") {
    result = result.filter((f) => String(f.properties.project_id) === opts.projectId);
  }
  if (opts.zone && opts.exclude !== "zone") {
    result = result.filter((f) => f.properties.admin_zone === opts.zone);
  }
  if (opts.province && opts.exclude !== "province") {
    result = result.filter((f) => f.properties.province === opts.province);
  }
  if (opts.types && opts.types.size < ALL_TYPES.length && opts.exclude !== "types") {
    result = result.filter((f) => opts.types!.has(f.properties.entity_type));
  }
  if (opts.search?.trim() && opts.exclude !== "search") {
    const q = opts.search.toLowerCase().trim();
    result = result.filter((f) => ((f.properties.name as string) || "").toLowerCase().includes(q));
  }
  return result;
}

export default function Home() {
  const [allPartners, setAllPartners] = useState<GeoJSON<PartnerProperties>>({ type: "FeatureCollection", features: [] });
  const [projects, setProjects] = useState<GeoJSON<ProjectProperties>>({ type: "FeatureCollection", features: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<MapProperties | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [linkedPartners, setLinkedPartners] = useState<LinkedPartner[]>([]);
  const [nearbyPartners, setNearbyPartners] = useState<NearbyPartner[]>([]);
  const [selZone, setSelZone] = useState("");
  const [selProvince, setSelProvince] = useState("");
  const [selProject, setSelProject] = useState("");
  const [selTypes, setSelTypes] = useState<Set<EntityType>>(new Set(ALL_TYPES));
  const [projectListMode, setProjectListMode] = useState<"linked" | "nearby">("linked");
  const [showSidebar, setShowSidebar] = useState(false);
  const detailRequestRef = useRef<AbortController | null>(null);

  // Fetch ALL data once
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/api/partners", { signal: controller.signal }).then((response) => readJson<GeoJSON<PartnerProperties>>(response)),
      fetch("/api/projects", { signal: controller.signal }).then((response) => readJson<GeoJSON<ProjectProperties>>(response)),
    ])
      .then(([partnerData, projectData]) => {
        setAllPartners(partnerData);
        setProjects(projectData);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadError("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [loadAttempt]);

  useEffect(() => () => detailRequestRef.current?.abort(), []);

  const filterOpts = useMemo(() => ({
    zone: selZone,
    province: selProvince,
    projectId: selProject,
    types: selTypes,
    search: searchQuery,
  }), [selZone, selProvince, selProject, selTypes, searchQuery]);

  // Cascading: available options for each dimension (excluding that dimension's own filter)
  const availableZones = useMemo(() => {
    const filtered = applyFilters(allPartners.features, { ...filterOpts, exclude: "zone" });
    return [...new Set(filtered.map((f) => f.properties.admin_zone).filter(Boolean))].sort();
  }, [allPartners, filterOpts]);

  const availableProvinces = useMemo(() => {
    const filtered = applyFilters(allPartners.features, { ...filterOpts, exclude: "province" });
    return [...new Set(filtered.map((f) => f.properties.province).filter(Boolean))].sort();
  }, [allPartners, filterOpts]);

  const availableTypeCounts = useMemo(() => {
    const filtered = applyFilters(allPartners.features, { ...filterOpts, exclude: "types" });
    const counts = Object.fromEntries(ALL_TYPES.map((type) => [type, 0])) as Record<EntityType, number>;
    filtered.forEach((f) => { const t = f.properties.entity_type; counts[t] = (counts[t] || 0) + 1; });
    return counts;
  }, [allPartners, filterOpts]);

  const zoneOptions = useMemo(() => (
    selZone && !availableZones.includes(selZone) ? [selZone, ...availableZones] : availableZones
  ), [availableZones, selZone]);

  const provinceOptions = useMemo(() => (
    selProvince && !availableProvinces.includes(selProvince) ? [selProvince, ...availableProvinces] : availableProvinces
  ), [availableProvinces, selProvince]);

  // Final displayed partners (all filters applied)
  const displayPartners = useMemo<GeoJSON<PartnerProperties>>(() => ({
    type: "FeatureCollection",
    features: applyFilters(allPartners.features, filterOpts),
  }), [allPartners, filterOpts]);

  // The geographic filters apply to both entity layers. Previously they only
  // filtered partners, leaving every AssetWise project visible on the map and
  // in the project dropdown.
  const areaFilteredProjectFeatures = useMemo(() => projects.features.filter((feature) => (
    (!selProvince || feature.properties.province === selProvince)
    && (!selZone || feature.properties.admin_zone === selZone)
  )), [projects, selProvince, selZone]);

  const displayProjects = useMemo<GeoJSON<ProjectProperties>>(() => {
    if (!selProject) return { ...projects, features: areaFilteredProjectFeatures };
    return { ...projects, features: projects.features.filter((f) => String(f.properties.id) === selProject) };
  }, [areaFilteredProjectFeatures, projects, selProject]);

  const filteredNearbyPartners = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return nearbyPartners.filter((partner) => (
      selTypes.has(partner.entity_type)
      && (!query || partner.name.toLowerCase().includes(query))
    ));
  }, [nearbyPartners, searchQuery, selTypes]);

  const nearbyTypeCounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const counts = Object.fromEntries(ALL_TYPES.map((type) => [type, 0])) as Record<EntityType, number>;
    nearbyPartners.forEach((partner) => {
      if (!query || partner.name.toLowerCase().includes(query)) {
        counts[partner.entity_type] = (counts[partner.entity_type] || 0) + 1;
      }
    });
    return counts;
  }, [nearbyPartners, searchQuery]);

  const approximateNearbyCount = useMemo(
    () => nearbyPartners.filter((partner) => partner.geo_precision !== "precise").length,
    [nearbyPartners],
  );

  // Focus the camera on every visible entity in the selected area. Projects are
  // now area-filtered too, so including them no longer expands the bounds
  // nationwide and areas with few partners still zoom to the right location.
  const geographicFocusCoordinates = useMemo<[number, number][] | null>(() => {
    if (selProject || (!selProvince && !selZone)) return null;

    const partnerCoordinates = allPartners.features
      .filter((feature) => (
        (!selProvince || feature.properties.province === selProvince)
        && (!selZone || feature.properties.admin_zone === selZone)
      ))
      .map((feature) => feature.geometry.coordinates);

    return [
      ...partnerCoordinates,
      ...areaFilteredProjectFeatures.map((feature) => feature.geometry.coordinates),
    ];
  }, [allPartners, areaFilteredProjectFeatures, selProject, selProvince, selZone]);

  // Nearby results are returned separately from the filtered partner dataset.
  // Only add results that are not already present in the main marker layer.
  const nearbyPartnersOnMap = useMemo(() => {
    const visiblePartnerIds = new Set(displayPartners.features.map((feature) => feature.properties.id));
    return filteredNearbyPartners.filter((partner) => !visiblePartnerIds.has(partner.id));
  }, [displayPartners, filteredNearbyPartners]);

  const handleSelect = useCallback(async (props: MapProperties, coords?: [number, number]) => {
    detailRequestRef.current?.abort();
    const selected = coords ? { ...props, _lat: coords[1], _lng: coords[0] } : props;
    const isProjectSelection = isProjectProperties(selected);

    setSelectedItem(selected);
    setSelectedId(selected.id || null);
    setDetailError("");

    if (!isProjectSelection) {
      if (!selProject) {
        setLinkedPartners([]);
        setNearbyPartners([]);
      }
      setDetailLoading(false);
      return;
    }

    // Clicking a project pin and choosing it from the dropdown must enter the
    // same project context so the sidebar, search, counters, and map agree.
    setSelProject(String(selected.id));
    setSelProvince("");
    setSelZone("");
    setSearchQuery("");
    setProjectListMode("linked");
    setLinkedPartners([]);
    setNearbyPartners([]);

    const controller = new AbortController();
    detailRequestRef.current = controller;
    setDetailLoading(true);
    const lat = coords ? coords[1] : selected.lat;
    const lng = coords ? coords[0] : selected.lng;

    try {
      const [projectResponse, nearbyResponse] = await Promise.all([
        fetch(`/api/projects?id=${selected.id}`, { signal: controller.signal }),
        fetch(`/api/nearby?lat=${lat}&lng=${lng}&radius=10&excludeProjectId=${selected.id}`, { signal: controller.signal }),
      ]);
      const [projectData, nearbyData] = await Promise.all([
        readJson<GeoJSON<ProjectProperties> & { linkedPartners: LinkedPartner[] }>(projectResponse),
        readJson<{ partners: NearbyPartner[] }>(nearbyResponse),
      ]);
      if (detailRequestRef.current === controller) {
        setLinkedPartners(projectData.linkedPartners ?? []);
        setNearbyPartners(nearbyData.partners ?? []);
      }
    } catch (error: unknown) {
      if (!(error instanceof DOMException && error.name === "AbortError") && detailRequestRef.current === controller) {
        setDetailError("โหลดรายละเอียดโครงการไม่สำเร็จ");
      }
    } finally {
      if (detailRequestRef.current === controller) {
        setDetailLoading(false);
      }
    }
  }, [selProject]);

  const toggleType = (type: EntityType) => {
    setSelTypes((previous) => {
      const next = new Set(previous);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleProjectChange = (projectId: string) => {
    setSelProject(projectId);
    setSearchQuery("");
    setSelProvince("");
    setSelZone("");
    setProjectListMode("linked");
    if (!projectId) {
      detailRequestRef.current?.abort();
      setSelectedItem(null);
      setSelectedId(null);
      setLinkedPartners([]);
      setNearbyPartners([]);
      setDetailLoading(false);
      setDetailError("");
      return;
    }
    const project = projects.features.find((feature) => String(feature.properties.id) === projectId);
    if (project) void handleSelect(project.properties, project.geometry.coordinates);
  };

  const retryLoad = () => {
    setLoadError("");
    setLoading(true);
    setLoadAttempt((attempt) => attempt + 1);
  };

  const hasFilter = !!selZone || !!selProvince || !!selProject || !!searchQuery || selTypes.size < ALL_TYPES.length;
  const resetAll = () => {
    detailRequestRef.current?.abort();
    setSelZone("");
    setSelProvince("");
    setSelProject("");
    setSearchQuery("");
    setSelTypes(new Set(ALL_TYPES));
    setProjectListMode("linked");
    setSelectedItem(null);
    setSelectedId(null);
    setLinkedPartners([]);
    setNearbyPartners([]);
    setDetailError("");
    setDetailLoading(false);
  };

  const closeDetail = () => {
    const closingProject = selectedItem ? isProjectProperties(selectedItem) : false;
    detailRequestRef.current?.abort();
    setSelectedItem(null);
    setSelectedId(null);
    setDetailError("");
    setDetailLoading(false);
    if (closingProject && selProject) {
      setSelProject("");
      setLinkedPartners([]);
      setNearbyPartners([]);
    }
  };

  const activeChips: { label: string; kind: "province" | "zone" }[] = [];
  if (selProvince) activeChips.push({ label: selProvince, kind: "province" });
  if (selZone) activeChips.push({ label: selZone, kind: "zone" });

  const contextProject = selProject
    ? projects.features.find((feature) => String(feature.properties.id) === selProject)
    : undefined;

  const projectPartnerCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    allPartners.features.forEach((feature) => {
      const projectId = feature.properties.project_id;
      if (projectId) counts[projectId] = (counts[projectId] || 0) + 1;
    });
    return counts;
  }, [allPartners]);

  const projectList = areaFilteredProjectFeatures.map((feature) => ({
    id: feature.properties.id,
    name: feature.properties.name,
    partnerCount: projectPartnerCounts[feature.properties.id] || 0,
  }));

  const isProjectMode = Boolean(selProject);
  const visibleTypeCounts = isProjectMode && projectListMode === "nearby" ? nearbyTypeCounts : availableTypeCounts;
  const visibleListCount = isProjectMode && projectListMode === "nearby"
    ? filteredNearbyPartners.length
    : displayPartners.features.length;
  const searchPlaceholder = isProjectMode
    ? projectListMode === "nearby"
      ? "ค้นหาในพาร์ทเนอร์ใกล้เคียง..."
      : "ค้นหาพาร์ทเนอร์โครงการ..."
    : "ค้นหาชื่อพาร์ทเนอร์...";

  return (
    <div className="app-shell h-screen flex flex-col">
      {/* Header */}
      <header className="app-header relative border-b px-3 md:px-4 py-2.5 flex items-center gap-2 md:gap-4 shrink-0">
        <button
          type="button"
          onClick={() => setShowSidebar((visible) => !visible)}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-[#DDE4EA] text-[#0C2A44] bg-white hover:bg-[#EAF4FD]"
          aria-label={showSidebar ? "ซ่อนตัวกรอง" : "แสดงตัวกรอง"}
          aria-expanded={showSidebar}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
        <div className="flex max-w-[96px] shrink-0 flex-col leading-tight sm:max-w-none">
          <Image src="/assetwise-logo.png" alt="AssetWise" width={160} height={40} priority className="h-4 w-auto sm:h-5" />
          <span className="mt-1.5 hidden text-[10px] text-[#6B7280] sm:block">แผนที่พาร์ทเนอร์</span>
        </div>
        <div className="app-search mx-auto flex min-w-0 flex-1 items-center gap-2 rounded-2xl px-3 md:px-4 h-10 w-full max-w-sm border transition lg:absolute lg:left-1/2 lg:-translate-x-1/2">
          <Search className="w-4 h-4 text-[#6B7280] shrink-0" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} className="min-w-0 border-none bg-transparent outline-none text-sm flex-1 text-[#1F2937] placeholder-[#8793A0]" />
          {searchQuery && <button type="button" onClick={() => setSearchQuery("")} aria-label="ล้างคำค้นหา" className="text-[#6B7280] hover:text-[#0C2A44]"><X className="w-4 h-4" /></button>}
        </div>
        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-[#DDE4EA] border-t-[#2F7FBE] rounded-full animate-spin shrink-0 ml-auto" />
        ) : (
          <div className="hidden sm:flex items-center gap-2 shrink-0 ml-auto">
            {isProjectMode ? (
              <>
                <span className="text-xs px-2.5 py-1 rounded-md font-medium border" style={{ background: "#EDF2F5", color: NAVY, borderColor: "#D9E2E8" }}>
                  พาร์ทเนอร์โครงการ {detailLoading ? "…" : linkedPartners.length}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-md font-medium border" style={{ background: "#EAF4FD", color: "#23699F", borderColor: "#CFE5F7" }}>
                  ใกล้ 10 กม. {detailLoading ? "…" : nearbyPartners.length}
                  {!detailLoading && approximateNearbyCount > 0 && ` · โดยประมาณ ${approximateNearbyCount}`}
                </span>
              </>
            ) : (
              <>
                <span className="text-xs px-2.5 py-1 rounded-md font-medium border" style={{ background: "#EAF4FD", color: "#23699F", borderColor: "#CFE5F7" }}>{displayPartners.features.length} พาร์ทเนอร์</span>
                <span className="text-xs px-2.5 py-1 rounded-md font-medium border" style={{ background: "#EDF2F5", color: NAVY, borderColor: "#D9E2E8" }}>{displayProjects.features.length} โครงการ</span>
              </>
            )}
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {showSidebar && (
          <button
            type="button"
            aria-label="ปิดตัวกรอง"
            onClick={() => setShowSidebar(false)}
            className="absolute inset-0 z-[650] bg-[#0C2A44]/25 backdrop-blur-[1px] md:hidden"
          />
        )}
        {/* Sidebar */}
        <aside className={`${showSidebar ? "flex" : "hidden md:flex"} app-sidebar w-72 max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-[700] border-r flex-col shrink-0 shadow-sm md:shadow-none`}>
          <div className="flex items-center justify-between border-b border-[#E8EDF1] px-4 py-2.5 md:hidden">
            <span className="text-sm font-semibold text-[#0C2A44]">ตัวกรองและรายชื่อ</span>
            <button type="button" onClick={() => setShowSidebar(false)} aria-label="ปิดตัวกรอง" className="grid h-7 w-7 place-items-center rounded-md text-[#6B7280] hover:bg-[#EAF4FD] hover:text-[#0C2A44]">
              <X className="h-4 w-4" />
            </button>
          </div>
          {loadError && (
            <div className="m-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{loadError}</span>
              </div>
              <button type="button" onClick={retryLoad} className="mt-2 inline-flex items-center gap-1 font-medium underline">
                <RefreshCw className="h-3 w-3" /> ลองใหม่
              </button>
            </div>
          )}
          {/* Active chips */}
          {activeChips.length > 0 && (
            <div className="px-4 pt-2.5 pb-1 flex flex-wrap gap-1.5">
              {activeChips.map((chip, i) => (
                <span key={i} className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border" style={{ background: "#EAF4FD", color: "#23699F", borderColor: "#CFE5F7" }}>
                  {chip.label}<button
                    type="button"
                    onClick={() => {
                      if (chip.kind === "province") setSelProvince("");
                      else setSelZone("");
                    }}
                    aria-label={`ล้างตัวกรอง ${chip.label}`}
                    className="hover:text-[#0C2A44]"
                  ><X className="w-3 h-3" /></button>
                </span>
              ))}
              <button onClick={resetAll} className="text-[11px] text-red-400 hover:text-red-600 px-1">ล้าง</button>
            </div>
          )}

          {/* Filters */}
          <div className="px-3 py-2.5 space-y-2 border-b border-[#E8EDF1]">
            <div className="flex items-center justify-between px-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">ตัวกรอง</p>
              {hasFilter && <button type="button" onClick={resetAll} className="text-[11px] text-[#2F7FBE] hover:text-[#0C2A44]">ล้างทั้งหมด</button>}
            </div>
            <select value={selProject} onChange={(e) => handleProjectChange(e.target.value)} aria-label="กรองตามโครงการ" className="filter-select w-full max-w-full text-[12px] text-[#1F2937] border rounded-lg px-2 py-1.5 outline-none truncate">
              <option value="">โครงการ: ทั้งหมด</option>
              {projectList.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.partnerCount})</option>)}
            </select>
            {!isProjectMode && (
              <div className="grid grid-cols-2 gap-1.5">
                <select value={selProvince} onChange={(e) => setSelProvince(e.target.value)} aria-label="กรองตามจังหวัด" className="filter-select w-full min-w-0 text-[11px] text-[#1F2937] border rounded-lg px-1.5 py-1.5 outline-none">
                  <option value="">จังหวัด</option>
                  {provinceOptions.map((p) => <option key={p} value={p}>{p}{p === selProvince && !availableProvinces.includes(p) ? " (0)" : ""}</option>)}
                </select>
                <select value={selZone} onChange={(e) => setSelZone(e.target.value)} aria-label="กรองตามเขตหรืออำเภอ" className="filter-select w-full min-w-0 text-[11px] text-[#1F2937] border rounded-lg px-1.5 py-1.5 outline-none">
                  <option value="">เขต/อำเภอ</option>
                  {zoneOptions.map((z) => <option key={z} value={z}>{z}{z === selZone && !availableZones.includes(z) ? " (0)" : ""}</option>)}
                </select>
              </div>
            )}
            {isProjectMode && (
              <div className="-mx-1 grid grid-cols-[38%_62%] rounded-lg bg-[#EDF2F5] p-1" role="tablist" aria-label="กลุ่มพาร์ทเนอร์ของโครงการ">
                <button
                  type="button"
                  role="tab"
                  aria-selected={projectListMode === "linked"}
                  onClick={() => { setProjectListMode("linked"); setSearchQuery(""); }}
                  className={`whitespace-nowrap rounded-md px-1 py-1.5 text-[10px] font-medium tracking-[-0.01em] transition ${projectListMode === "linked" ? "bg-white text-[#0C2A44] shadow-sm" : "text-[#6B7280] hover:text-[#0C2A44]"}`}
                >
                  พาร์ทเนอร์โครงการ ({detailLoading ? "…" : linkedPartners.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={projectListMode === "nearby"}
                  onClick={() => { setProjectListMode("nearby"); setSearchQuery(""); }}
                  className={`whitespace-nowrap rounded-md px-1 py-1.5 text-[10px] font-medium tracking-[-0.01em] transition ${projectListMode === "nearby" ? "bg-white text-[#23699F] shadow-sm" : "text-[#6B7280] hover:text-[#0C2A44]"}`}
                >
                  พาร์ทเนอร์ใกล้เคียง 10 กม. ({detailLoading ? "…" : nearbyPartners.length})
                </button>
              </div>
            )}
            {/* Type toggle pills — cascading */}
            <p className="px-0.5 pt-0.5 text-[10px] font-medium text-[#8793A0]">ประเภทพาร์ทเนอร์ · เลือกได้หลายประเภท</p>
            <div className="partner-type-grid grid grid-cols-2 gap-1.5">
              {ALL_TYPES.filter((type) => visibleTypeCounts[type] > 0).map((type) => {
                const isActive = selTypes.has(type);
                const tint = TYPE_TINTS[type];
                const count = visibleTypeCounts[type];
                return (
                  <button
                    type="button"
                    key={type}
                    onClick={() => toggleType(type)}
                    aria-pressed={isActive}
                    className="grid h-[30px] grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-1 rounded-[7px] border px-2 py-0.5 text-left cursor-pointer transition hover:brightness-[0.98]"
                    style={isActive ? { background: tint.background, color: tint.color, borderColor: tint.border } : { background: "#F1F3F5", color: "#8A949E", borderColor: "#E3E8EC" }}
                  >
                    <span className="grid h-3.5 w-3.5 place-items-center rounded-full border border-current" aria-hidden="true">
                      {isActive && <Check className="h-2 w-2" strokeWidth={2.5} />}
                    </span>
                    <span className="min-w-0 text-[10px] font-semibold leading-[1.1]">{TYPE_LABELS[type]}</span>
                    <span className="text-[11px] font-semibold tabular-nums">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Partner list header */}
          <div className="list-heading flex items-center justify-between gap-2 px-4 py-1.5 border-b">
            <span className="text-[11px] font-semibold text-[#6B7280] uppercase">
              {isProjectMode ? (projectListMode === "nearby" ? "พาร์ทเนอร์ใกล้เคียง" : "พาร์ทเนอร์โครงการ") : "รายชื่อ"} ({visibleListCount})
            </span>
            {isProjectMode && projectListMode === "nearby" && approximateNearbyCount > 0 && (
              <span className="shrink-0 text-[9px] font-medium text-[#8793A0]">โดยประมาณ {approximateNearbyCount}</span>
            )}
          </div>

          {/* Partner list */}
          <div className="flex-1 overflow-y-auto">
            {isProjectMode && projectListMode === "nearby" ? filteredNearbyPartners.map((partner) => {
              const isActive = selectedId === partner.id && selectedItem && !isProjectProperties(selectedItem);
              const color = TYPE_COLORS[partner.entity_type] || "#666";
              return (
                <button type="button" key={partner.id} onClick={() => { void handleSelect(nearbyToPartner(partner)); setShowSidebar(false); }} className={`block w-full text-left px-4 py-2 border-b border-[#EEF2F5] cursor-pointer transition ${isActive ? "bg-[#EAF4FD] border-l-2 border-l-[#2F7FBE]" : "hover:bg-[#F6F8FA]"}`}>
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] truncate ${isActive ? "font-medium text-[#0C2A44]" : "text-[#1F2937]"}`}>{partner.name}</p>
                      <p className="text-[11px] text-[#6B7280]">
                        {TYPE_LABELS[partner.entity_type]}{partner.admin_zone && ` · ${partner.admin_zone}`}
                        {partner.geo_precision !== "precise" && " · พิกัดโดยประมาณ"}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-0.5 pt-0.5 text-[10px] font-medium text-[#2F7FBE]"><MapPin className="h-3 w-3" />{partner.geo_precision !== "precise" && "≈"}{partner.distance_km} กม.</span>
                  </div>
                </button>
              );
            }) : displayPartners.features.map((f) => {
              const p = f.properties;
              const isActive = selectedId === p.id;
              const color = TYPE_COLORS[p.entity_type] || "#666";
              return (
                <button type="button" key={p.id} onClick={() => { void handleSelect(p, f.geometry.coordinates); setShowSidebar(false); }} className={`block w-full text-left px-4 py-2 border-b border-[#EEF2F5] cursor-pointer transition ${isActive ? "bg-[#EAF4FD] border-l-2 border-l-[#2F7FBE]" : "hover:bg-[#F6F8FA]"}`}>
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] truncate ${isActive ? "font-medium text-[#0C2A44]" : "text-[#1F2937]"}`}>{p.name}</p>
                      <p className="text-[11px] text-[#6B7280]">{TYPE_LABELS[p.entity_type]}{p.admin_zone && ` · ${p.admin_zone}`}</p>
                    </div>
                  </div>
                </button>
              );
            })}
            {visibleListCount === 0 && !loading && !detailLoading && (
              <div className="px-4 py-6 text-center">
                {isProjectMode && projectListMode === "linked" && linkedPartners.length === 0 ? (
                  <>
                    <Link2 className="mx-auto mb-2 h-5 w-5 text-[#9AA6B2]" />
                    <p className="text-[13px] font-medium text-[#6B7280]">โครงการนี้ยังไม่มีพาร์ทเนอร์ที่ผูกไว้</p>
                    {nearbyPartners.length > 0 && <button type="button" onClick={() => { setProjectListMode("nearby"); setSearchQuery(""); }} className="mt-2 text-[11px] font-medium text-[#2F7FBE] hover:text-[#0C2A44]">ดูพาร์ทเนอร์ใกล้เคียง {nearbyPartners.length} ราย</button>}
                  </>
                ) : (
                  <>
                    <p className="text-[13px] text-gray-400">ไม่พบพาร์ทเนอร์ที่ตรงกับตัวกรอง</p>
                    {hasFilter && <button onClick={() => { setSearchQuery(""); setSelTypes(new Set(ALL_TYPES)); }} className="mt-1 text-[11px] text-gray-400 hover:text-gray-600 underline">ล้างคำค้นหาและประเภท</button>}
                  </>
                )}
              </div>
            )}
            {detailLoading && isProjectMode && (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-[#6B7280]">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#DDE4EA] border-t-[#2F7FBE]" /> กำลังค้นหาพาร์ทเนอร์ใกล้เคียง
              </div>
            )}
          </div>
        </aside>

        {/* Map */}
        <main className="flex-1 relative">
          <MapView
            partners={displayPartners}
            projects={displayProjects}
            nearbyPartners={nearbyPartnersOnMap}
            focusCoordinates={geographicFocusCoordinates}
            selectedProjectId={selProject ? Number(selProject) : null}
            showProjectLabels={Boolean(selProvince || selZone)}
            detailPanelOpen={selectedItem !== null}
            onSelect={handleSelect}
            onSelectNearby={(partner) => void handleSelect(nearbyToPartner(partner))}
            flyTo={selectedItem?._lat != null && selectedItem?._lng != null ? { lat: selectedItem._lat, lng: selectedItem._lng } : null}
          />
          <div className="map-legend absolute bottom-3 left-3 border rounded-lg px-3 py-2 text-[12px] text-[#1F2937] flex flex-nowrap gap-x-4 z-[500] backdrop-blur-sm overflow-x-auto">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: NAVY, border: "2px solid #2F7FBE" }} /> โครงการ Assetwise
            </span>
            {ALL_TYPES.map((type) => (
              <span key={type} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] }} /> {TYPE_LABELS[type]}
              </span>
            ))}
          </div>
          <DetailPanel
            selected={selectedItem}
            linkedPartners={linkedPartners}
            nearbyPartners={nearbyPartners}
            loading={detailLoading}
            error={detailError}
            contextProjectName={contextProject?.properties.name}
            onBackToProject={contextProject ? () => void handleSelect(contextProject.properties, contextProject.geometry.coordinates) : undefined}
            onRetry={selectedItem && isProjectProperties(selectedItem) ? () => void handleSelect(selectedItem) : undefined}
            onClose={closeDetail}
          />
        </main>
      </div>
    </div>
  );
}
