import type { EntityType } from "@/lib/types";

export interface EntityTint {
  background: string;
  color: string;
  border: string;
}

// Soft Corporate palette: distinct categories with matched saturation and weight.
export const ENTITY_COLORS: Record<EntityType, string> = {
  partner: "#3B82C4",
  sponsor: "#C96B4B",
  bank: "#23856D",
  external_org: "#C58A24",
  partner_2026: "#1F9BB7",
  gov_bkk: "#6F7FA8",
  gov_district: "#66717E",
};

export const ENTITY_TINTS: Record<EntityType, EntityTint> = {
  partner: { background: "#EAF4FB", color: "#245F8E", border: "#CFE3F2" },
  sponsor: { background: "#FBEDE8", color: "#9C472F", border: "#EFCFC3" },
  bank: { background: "#E9F5F1", color: "#17644F", border: "#CBE7DE" },
  external_org: { background: "#FFF5E2", color: "#8A5C0A", border: "#F0DCB2" },
  partner_2026: { background: "#E8F7FA", color: "#0F7285", border: "#C8EAF0" },
  gov_bkk: { background: "#EEF1F8", color: "#505F83", border: "#DCE2EF" },
  gov_district: { background: "#F0F2F4", color: "#4B5563", border: "#D9DEE4" },
};
