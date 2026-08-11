"use client";

import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Tooltip, useMap, ZoomControl } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { useEffect, useCallback } from "react";
import L from "leaflet";

const TYPE_COLORS: Record<string, string> = {
  partner: "#378ADD", sponsor: "#D85A30", bank: "#1D9E75",
  external_org: "#F59E0B", partner_2026: "#06B6D4",
  gov_bkk: "#9CA3AF", gov_district: "#6B7280",
};
const TYPE_LABELS: Record<string, string> = {
  partner: "พาร์ทเนอร์", sponsor: "สปอนเซอร์", bank: "ธนาคาร",
  external_org: "องค์กรภายนอก", partner_2026: "พาร์ทเนอร์ 2026",
  gov_bkk: "โรงเรียน/สถาบัน", gov_district: "สำนักงานเขต กทม.",
};
const NAVY = "#1e3a5f";

interface Feature {
  geometry: { coordinates: [number, number] };
  properties: Record<string, any>;
}

function FitBounds({ features }: { features: Feature[] }) {
  const map = useMap();
  useEffect(() => {
    if (features.length === 0) return;
    const lats = features.map((f) => f.geometry.coordinates[1]);
    const lngs = features.map((f) => f.geometry.coordinates[0]);
    map.fitBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]], { padding: [40, 40] });
  }, [features, map]);
  return null;
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 15, { duration: 0.8 });
  }, [lat, lng, map]);
  return null;
}

// Create label icon for partners (small gray text)
function makeLabelIcon(text: string) {
  const truncated = text.length > 25 ? text.substring(0, 25) + "..." : text;
  return L.divIcon({
    className: "",
    html: `<div style="color:#6b7280;font-size:9px;font-weight:500;white-space:nowrap;text-shadow:1px 1px 0 white,-1px 1px 0 white,1px -1px 0 white,-1px -1px 0 white;">${truncated}</div>`,
    iconSize: [120, 14],
    iconAnchor: [60, -4],
  });
}

// Create label icon for projects (navy badge)
function makeProjectLabelIcon(text: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:rgba(30,58,95,0.9);color:white;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:600;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.15);">${text}</div>`,
    iconSize: [150, 20],
    iconAnchor: [75, -8],
  });
}

export default function MapView({
  partners, projects, onSelect, flyTo,
}: {
  partners: { type: string; features: Feature[] };
  projects: { type: string; features: Feature[] };
  onSelect: (props: Record<string, any>) => void;
  flyTo: { lat: number; lng: number } | null;
}) {
  const createClusterIcon = (cluster: { getChildCount: () => number }) => {
    const count = cluster.getChildCount();
    let size = 40, color = "#378ADD";
    if (count > 50) { size = 52; color = "#1D9E75"; }
    return L.divIcon({
      html: `<div style="background:${color};color:white;border-radius:50%;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;box-shadow:0 2px 6px rgba(0,0,0,0.2);border:2px solid white;">${count}</div>`,
      className: "custom-cluster", iconSize: L.point(size, size),
    });
  };

  return (
    <MapContainer center={[13.7563, 100.5018]} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom zoomControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
      <ZoomControl position="topleft" />

      {/* Projects — dot + permanent label */}
      {projects.features.map((f, i) => (
        <ProjectMarker key={`proj-${i}`} feature={f} onSelect={onSelect} />
      ))}

      {/* Partners — dot + permanent label + cluster */}
      <MarkerClusterGroup iconCreateFunction={createClusterIcon} showCoverageOnHover={false} maxClusterRadius={50}>
        {partners.features.map((f, i) => (
          <PartnerMarker key={`p-${i}`} feature={f} onSelect={onSelect} />
        ))}
      </MarkerClusterGroup>

      <FitBounds features={[...partners.features, ...projects.features]} />
      {flyTo && <FlyTo lat={flyTo.lat} lng={flyTo.lng} />}

      <ResetButton />
    </MapContainer>
  );
}

function ResetButton() {
  const map = useMap();
  const reset = useCallback(() => { map.setView([13.7563, 100.5018], 11); }, [map]);
  return (
    <div style={{ position: "absolute", top: "10px", left: "50px", zIndex: 1000 }}>
      <button onClick={reset} style={{
        background: "white", border: "1px solid #ccc", borderRadius: "6px",
        padding: "6px 10px", fontSize: "12px", cursor: "pointer",
        boxShadow: "0 1px 4px rgba(0,0,0,0.15)", color: "#4b5563",
      }}>มุมมองทั้งหมด</button>
    </div>
  );
}

function ProjectMarker({ feature, onSelect }: { feature: Feature; onSelect: (p: Record<string, any>) => void }) {
  const lat = feature.geometry.coordinates[1];
  const lng = feature.geometry.coordinates[0];
  return (
    <>
      <CircleMarker
        center={[lat, lng]}
        radius={7}
        pathOptions={{ color: NAVY, weight: 2, fillColor: NAVY, fillOpacity: 0.85 }}
        eventHandlers={{ click: () => onSelect(feature.properties) }}
      >
        <Tooltip sticky direction="top" offset={[0, -8]}>
          <div><b style={{ color: NAVY }}>{feature.properties.name}</b><br /><span style={{ color: "#9ca3af", fontSize: "10px" }}>โครงการ</span></div>
        </Tooltip>
      </CircleMarker>
      <Marker position={[lat, lng]} icon={makeProjectLabelIcon(feature.properties.name)} interactive={false} />
    </>
  );
}

function PartnerMarker({ feature, onSelect }: { feature: Feature; onSelect: (p: Record<string, any>) => void }) {
  const lat = feature.geometry.coordinates[1];
  const lng = feature.geometry.coordinates[0];
  const color = TYPE_COLORS[feature.properties.entity_type as string] || "#666";
  const name = feature.properties.name as string;
  return (
    <>
      <CircleMarker
        center={[lat, lng]}
        radius={5}
        pathOptions={{ color, weight: 1, fillColor: color, fillOpacity: 0.75 }}
        eventHandlers={{ click: () => onSelect(feature.properties) }}
      >
        <Tooltip sticky direction="top" offset={[0, -8]}>
          <div><b>{name}</b><br /><span style={{ color: "#9ca3af", fontSize: "10px" }}>
            {TYPE_LABELS[feature.properties.entity_type as string] || feature.properties.entity_type}
            {feature.properties.admin_zone && ` · ${feature.properties.admin_zone}`}
          </span></div>
        </Tooltip>
      </CircleMarker>
      <Marker position={[lat, lng]} icon={makeLabelIcon(name)} interactive={false} />
    </>
  );
}
