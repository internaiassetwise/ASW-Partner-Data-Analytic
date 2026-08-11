"use client";

import { MapContainer, TileLayer, CircleMarker, Popup, useMap, ZoomControl } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { useEffect, useState, useCallback } from "react";
import L from "leaflet";

const TYPE_COLORS: Record<string, string> = {
  partner: "#378ADD", sponsor: "#D85A30", bank: "#1D9E75",
  external_org: "#F59E0B", partner_2026: "#06B6D4",
  gov_bkk: "#9CA3AF", gov_district: "#6B7280",
};

const TYPE_LABELS: Record<string, string> = {
  partner: "ASW Partner", sponsor: "Sponsor", bank: "Bank",
  external_org: "องค์กรภายนอก", partner_2026: "พาร์ทเนอร์ 2026",
  gov_bkk: "หน่วยงาน กทม.", gov_district: "สำนักงานเขต",
};

interface Feature {
  geometry: { coordinates: [number, number] };
  properties: Record<string, unknown>;
}

function FitBounds({ features }: { features: Feature[] }) {
  const map = useMap();
  const [initial, setInitial] = useState(true);
  useEffect(() => {
    if (features.length === 0) return;
    const lats = features.map((f) => f.geometry.coordinates[1]);
    const lngs = features.map((f) => f.geometry.coordinates[0]);
    map.fitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], { padding: [40, 40] });
    setInitial(false);
  }, [features, map]);
  return null;
}

// Reset view button
function ResetButton() {
  const map = useMap();
  const reset = useCallback(() => {
    map.setView([13.7563, 100.5018], 11);
  }, [map]);
  return (
    <div style={{ position: "absolute", top: "10px", left: "50px", zIndex: 1000 }}>
      <button
        onClick={reset}
        style={{
          background: "white", border: "1px solid #ccc", borderRadius: "6px",
          padding: "6px 10px", fontSize: "12px", cursor: "pointer",
          boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
        }}
      >
        ⌂ มุมมองทั้งหมด
      </button>
    </div>
  );
}

export default function MapView({
  partners,
  projects,
  onSelect,
}: {
  partners: { type: string; features: Feature[] };
  projects: { type: string; features: Feature[] };
  onSelect: (props: Record<string, unknown>) => void;
}) {
  const createClusterIcon = (cluster: { getChildCount: () => number }) => {
    const count = cluster.getChildCount();
    let size = 40;
    let color = "#378ADD";
    if (count > 50) { size = 52; color = "#1D9E75"; }
    else if (count > 20) { size = 46; color = "#378ADD"; }
    return L.divIcon({
      html: `<div style="background:${color};color:white;border-radius:50%;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;box-shadow:0 2px 6px rgba(0,0,0,0.2);border:2px solid white;">${count}</div>`,
      className: "custom-cluster",
      iconSize: L.point(size, size),
    });
  };

  return (
    <MapContainer center={[13.7563, 100.5018]} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom zoomControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
      <ZoomControl position="topleft" />

      {/* Project markers (no clustering — only 36) */}
      {projects.features.map((f, i) => (
        <CircleMarker
          key={`proj-${i}`}
          center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
          radius={10}
          pathOptions={{ color: "#dc2626", weight: 2, fillColor: "#ef4444", fillOpacity: 0.85 }}
          eventHandlers={{ click: () => onSelect(f.properties) }}
        >
          <Popup>
            <div style={{ minWidth: "160px" }}>
              <strong style={{ fontSize: "13px", color: "#991b1b" }}>🏢 {f.properties.name as string}</strong>
              <br />
              <span style={{ fontSize: "11px", color: "#888" }}>คลิกเพื่อดูรายละเอียด</span>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* Partner markers (with clustering) */}
      <MarkerClusterGroup iconCreateFunction={createClusterIcon} showCoverageOnHover={false} maxClusterRadius={50}>
        {partners.features.map((f, i) => {
          const color = TYPE_COLORS[f.properties.entity_type as string] || "#666";
          return (
            <CircleMarker
              key={`p-${i}`}
              center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
              radius={5}
              pathOptions={{ color, weight: 1, fillColor: color, fillOpacity: 0.75 }}
              eventHandlers={{ click: () => onSelect(f.properties) }}
            >
              <Popup>
                <div style={{ minWidth: "150px" }}>
                  <strong style={{ fontSize: "12px" }}>{f.properties.name as string}</strong>
                  <br />
                  <span style={{ fontSize: "11px", color: "#888" }}>
                    {TYPE_LABELS[f.properties.entity_type as string] || f.properties.entity_type as string}
                    {(f.properties.admin_zone as string) && ` · ${f.properties.admin_zone}`}
                  </span>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MarkerClusterGroup>

      <FitBounds features={[...partners.features, ...projects.features]} />
      <ResetButton />
    </MapContainer>
  );
}
