"use client";

import { MapContainer, TileLayer, Marker, Tooltip, useMap, ZoomControl } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { useCallback, useEffect, useState } from "react";
import L from "leaflet";
import type { GeoFeature, GeoJSON, MapProperties, NearbyPartner, PartnerProperties, ProjectProperties } from "@/lib/types";
import { ENTITY_COLORS as TYPE_COLORS } from "@/lib/entityStyles";
const TYPE_LABELS: Record<string, string> = {
  partner: "พาร์ทเนอร์", sponsor: "สปอนเซอร์", bank: "ธนาคาร",
  external_org: "องค์กรภายนอก", partner_2026: "พาร์ทเนอร์ 2026",
  gov_bkk: "โรงเรียน/สถาบัน", gov_district: "สำนักงานเขต กทม.",
};
const PROJECT_COLOR = "#0C2A44";
const BANGKOK_METRO_CENTER: L.LatLngExpression = [13.78, 100.5];
const BANGKOK_METRO_ZOOM = 10;

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

// Re-fits only when the visible extent actually changes. `features` is a new
// array on every render, so depending on it directly would re-fit after any
// state update (e.g. the /api/nearby response) and undo an in-flight flyTo.
function FitBounds({ coordinates, detailPanelOpen }: { coordinates: [number, number][]; detailPanelOpen: boolean }) {
  const map = useMap();
  const lats = coordinates.map((coordinate) => coordinate[1]);
  const lngs = coordinates.map((coordinate) => coordinate[0]);
  const key = coordinates.length
    ? [Math.min(...lats), Math.min(...lngs), Math.max(...lats), Math.max(...lngs)].join(",")
    : "";
  useEffect(() => {
    if (!key) return;
    const [south, west, north, east] = key.split(",").map(Number);
    const coversNationalExtent = north - south > 2 || east - west > 2;
    if (coversNationalExtent) {
      map.setView(BANGKOK_METRO_CENTER, BANGKOK_METRO_ZOOM);
      return;
    }

    map.fitBounds([[south, west], [north, east]], {
      paddingTopLeft: [32, 32],
      paddingBottomRight: [detailPanelOpen ? 360 : 32, 32],
      maxZoom: 14,
    });
  }, [detailPanelOpen, key, map]);
  return null;
}

function FlyTo({ lat, lng, detailPanelOpen }: { lat: number; lng: number; detailPanelOpen: boolean }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 15, { duration: 0.8 });
    if (!detailPanelOpen) return;
    const makeRoomForPanel = () => map.panBy([160, 0], { animate: true, duration: 0.25 });
    map.once("moveend", makeRoomForPanel);
    return () => { map.off("moveend", makeRoomForPanel); };
  }, [detailPanelOpen, lat, lng, map]);
  return null;
}

// Dot AND label in ONE icon. MarkerClusterGroup clusters every child layer
// that exposes getLatLng() — a CircleMarker plus a separate label Marker made
// each partner count twice in the cluster badge.
function makePartnerIcon(text: string, color: string) {
  const truncated = escapeHtml(text.length > 25 ? text.substring(0, 25) + "..." : text);
  const safeColor = /^#[0-9a-f]{6}$/i.test(color) ? color : "#666666";
  return L.divIcon({
    className: "partner-marker",
    html:
      `<div style="position:relative;width:120px;height:26px;">` +
      `<div class="partner-dot" style="position:absolute;left:55px;top:0;width:10px;height:10px;border-radius:50%;background:${safeColor};opacity:0.85;"></div>` +
      `<div style="position:absolute;left:0;top:13px;width:120px;text-align:center;color:#667785;font-size:9px;font-weight:500;white-space:nowrap;text-shadow:1px 1px 0 white,-1px 1px 0 white,1px -1px 0 white,-1px -1px 0 white;">${truncated}</div>` +
      `</div>`,
    iconSize: [120, 26],
    iconAnchor: [60, 5],
  });
}

// Create label icon for projects (navy badge)
function makeProjectLabelIcon(text: string) {
  const safeText = escapeHtml(text);
  return L.divIcon({
    className: "",
    html: `<div class="project-label">${safeText}</div>`,
    iconSize: [220, 24],
    // Place the label to the right, vertically aligned with the pin head.
    iconAnchor: [-22, 30],
  });
}

function makeProjectIcon() {
  return L.divIcon({
    className: "",
    html: '<div class="project-marker"><i class="ti ti-building-community" aria-hidden="true"></i></div>',
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });
}

function makeNearbyPartnerIcon(name: string, color: string, approximate: boolean) {
  const safeName = escapeHtml(name);
  const safeColor = /^#[0-9a-f]{6}$/i.test(color) ? color : "#66717E";
  return L.divIcon({
    className: "",
    html: `<div class="nearby-partner-marker${approximate ? " nearby-partner-marker--approximate" : ""}" style="--nearby-marker-color:${safeColor}" role="img" aria-label="${safeName}${approximate ? " พิกัดโดยประมาณ" : ""}"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export default function MapView({
  partners, projects, nearbyPartners, focusCoordinates, selectedProjectId, showProjectLabels, detailPanelOpen, onSelect, onSelectNearby, flyTo,
}: {
    partners: GeoJSON<PartnerProperties>;
    projects: GeoJSON<ProjectProperties>;
    nearbyPartners: NearbyPartner[];
    focusCoordinates: [number, number][] | null;
    selectedProjectId: number | null;
    showProjectLabels: boolean;
    detailPanelOpen: boolean;
    onSelect: (props: MapProperties) => void;
    onSelectNearby: (partner: NearbyPartner) => void;
  flyTo: { lat: number; lng: number } | null;
}) {
  const createClusterIcon = (cluster: { getChildCount: () => number }) => {
    const count = cluster.getChildCount();
    let size: number;
    let sizeClass: "cluster-small" | "cluster-medium" | "cluster-large";

    if (count < 10) {
      size = 34;
      sizeClass = "cluster-small";
    } else if (count < 100) {
      size = 44;
      sizeClass = "cluster-medium";
    } else {
      size = 56;
      sizeClass = "cluster-large";
    }

    return L.divIcon({
      html: `<div class="cluster-marker ${sizeClass}" aria-label="${count} markers">${count}</div>`,
      className: "",
      iconSize: L.point(size, size),
    });
  };

  return (
    <MapContainer center={BANGKOK_METRO_CENTER} zoom={BANGKOK_METRO_ZOOM} style={{ height: "100%", width: "100%" }} scrollWheelZoom zoomControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
      <ZoomControl position="topleft" />

      {/* Keep the nationwide overview readable, but reveal every remaining
          project name as soon as the user filters to a province or district. */}
      <ProjectMarkers projects={projects} selectedProjectId={selectedProjectId} showProjectLabels={showProjectLabels} onSelect={onSelect} />

      {/* Partners — dot + permanent label + cluster */}
      <MarkerClusterGroup iconCreateFunction={createClusterIcon} showCoverageOnHover={false} maxClusterRadius={50}>
        {partners.features.map((feature) => (
          <PartnerMarker key={`p-${feature.properties.id}`} feature={feature} onSelect={onSelect} />
        ))}
      </MarkerClusterGroup>

      {/* Nearby search results use a compact, high-contrast marker layer. */}
      {nearbyPartners.length > 0 && (
        <MarkerClusterGroup iconCreateFunction={createClusterIcon} showCoverageOnHover={false} maxClusterRadius={38}>
          {nearbyPartners.map((partner) => (
            <NearbyPartnerMarker key={`nearby-${partner.id}`} partner={partner} onSelect={onSelectNearby} />
          ))}
        </MarkerClusterGroup>
      )}

      <FitBounds detailPanelOpen={detailPanelOpen} coordinates={focusCoordinates?.length
        ? focusCoordinates
        : nearbyPartners.length > 0
          ? [
              ...projects.features.map((feature) => feature.geometry.coordinates),
              ...nearbyPartners.map((partner) => [partner.lng, partner.lat] as [number, number]),
            ]
          : [
              ...partners.features.map((feature) => feature.geometry.coordinates),
              ...projects.features.map((feature) => feature.geometry.coordinates),
            ]
      } />
      {flyTo && <FlyTo lat={flyTo.lat} lng={flyTo.lng} detailPanelOpen={detailPanelOpen} />}

      <ResetButton />
    </MapContainer>
  );
}

function ResetButton() {
  const map = useMap();
  const reset = useCallback(() => {
    map.setView(BANGKOK_METRO_CENTER, BANGKOK_METRO_ZOOM);
  }, [map]);
  return (
    <div style={{ position: "absolute", top: "10px", left: "50px", zIndex: 1000 }}>
      <button type="button" onClick={reset} className="map-reset-control" aria-label="กลับมุมมองกรุงเทพฯ และปริมณฑล">กลับมุมมองกรุงเทพฯ–ปริมณฑล</button>
    </div>
  );
}

function ProjectMarkers({ projects, selectedProjectId, showProjectLabels, onSelect }: {
  projects: GeoJSON<ProjectProperties>;
  selectedProjectId: number | null;
  showProjectLabels: boolean;
  onSelect: (properties: MapProperties) => void;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const updateZoom = () => setZoom(map.getZoom());
    map.on("zoomend", updateZoom);
    return () => { map.off("zoomend", updateZoom); };
  }, [map]);

  return projects.features.map((feature) => (
    <ProjectMarker
      key={`proj-${feature.properties.id}`}
      feature={feature}
      showLabel={showProjectLabels || (selectedProjectId !== null && String(feature.properties.id) === String(selectedProjectId)) || zoom >= 13}
      onSelect={onSelect}
    />
  ));
}

function ProjectMarker({ feature, showLabel, onSelect }: { feature: GeoFeature<ProjectProperties>; showLabel: boolean; onSelect: (properties: MapProperties) => void }) {
  const lat = feature.geometry.coordinates[1];
  const lng = feature.geometry.coordinates[0];
  return (
    <>
      <Marker
        position={[lat, lng]}
        icon={makeProjectIcon()}
        eventHandlers={{ click: () => onSelect(feature.properties) }}
      >
        <Tooltip sticky direction="top" offset={[0, -30]}>
          <div><b style={{ color: PROJECT_COLOR }}>{feature.properties.name}</b><br /><span style={{ color: "#9ca3af", fontSize: "10px" }}>โครงการ</span></div>
        </Tooltip>
      </Marker>
      {showLabel && <Marker position={[lat, lng]} icon={makeProjectLabelIcon(feature.properties.name)} interactive={false} />}
    </>
  );
}

function PartnerMarker({ feature, onSelect }: { feature: GeoFeature<PartnerProperties>; onSelect: (properties: MapProperties) => void }) {
  const lat = feature.geometry.coordinates[1];
  const lng = feature.geometry.coordinates[0];
  const color = TYPE_COLORS[feature.properties.entity_type];
  const name = feature.properties.name;
  return (
    <Marker
      position={[lat, lng]}
      icon={makePartnerIcon(name, color)}
      eventHandlers={{ click: () => onSelect(feature.properties) }}
    >
      <Tooltip direction="top" offset={[0, -8]}>
        <div><b>{name}</b><br /><span style={{ color: "#9ca3af", fontSize: "10px" }}>
          {TYPE_LABELS[feature.properties.entity_type as string] || feature.properties.entity_type}
          {feature.properties.admin_zone && ` · ${feature.properties.admin_zone}`}
        </span></div>
      </Tooltip>
    </Marker>
  );
}

function NearbyPartnerMarker({ partner, onSelect }: { partner: NearbyPartner; onSelect: (partner: NearbyPartner) => void }) {
  const color = TYPE_COLORS[partner.entity_type] || "#66717E";
  const approximate = partner.geo_precision !== "precise";
  return (
    <Marker
      position={[partner.lat, partner.lng]}
      icon={makeNearbyPartnerIcon(partner.name, color, approximate)}
      eventHandlers={{ click: () => onSelect(partner) }}
    >
      <Tooltip direction="top" offset={[0, -10]}>
        <div>
          <b>{partner.name}</b><br />
          <span style={{ color: "#6B7280", fontSize: "10px" }}>
            {TYPE_LABELS[partner.entity_type] || partner.entity_type} · {approximate && "พิกัดโดยประมาณ · ≈"}{partner.distance_km} กม.
          </span>
        </div>
      </Tooltip>
    </Marker>
  );
}
