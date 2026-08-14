export type EntityType =
  | "partner"
  | "sponsor"
  | "bank"
  | "external_org"
  | "partner_2026"
  | "gov_bkk"
  | "gov_district";

export type GeoPrecision =
  | "precise"
  | "interpolated"
  | "geometric_center"
  | "district"
  | "city"
  | "approximate"
  | "file";

export interface MarketingChannels {
  intranet: boolean;
  edm: boolean;
  line: boolean;
  standee: boolean;
  poster: boolean;
  booth: boolean;
  leaflet: boolean;
}

export interface PartnerProperties {
  id: number;
  name: string;
  entity_type: EntityType;
  email: string;
  phone: string;
  contact_name: string;
  address_full: string;
  admin_zone: string;
  subzone: string;
  province: string;
  project_zone: string;
  project_name: string;
  project_id: number | null;
  employee_count: string | number;
  join_date: string;
  geo_source: string;
  marketing: MarketingChannels;
  remark: string;
  _lat?: number;
  _lng?: number;
  _distanceKm?: number;
  _geoPrecision?: GeoPrecision;
  isProject?: false;
}

export interface ProjectProperties {
  id: number;
  name: string;
  status: string;
  zone: string;
  province: string;
  admin_zone: string;
  address: string;
  google_map_url: string;
  bu: string;
  lat: number;
  lng: number;
  isProject: true;
  _lat?: number;
  _lng?: number;
}

export type MapProperties = PartnerProperties | ProjectProperties;

export interface GeoFeature<TProperties extends MapProperties = MapProperties> {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: TProperties;
}

export interface GeoJSON<TProperties extends MapProperties = MapProperties> {
  type: "FeatureCollection";
  features: GeoFeature<TProperties>[];
}

export interface LinkedPartner {
  id: number;
  name: string;
  entity_type: EntityType;
  phone: string;
  email: string;
  admin_zone: string;
}

export interface NearbyPartner {
  id: number;
  name: string;
  entity_type: EntityType;
  phone: string;
  email: string;
  contact_name: string;
  address_full: string;
  admin_zone: string;
  subzone: string;
  province: string;
  project_name: string;
  project_id: number | null;
  geo_precision: GeoPrecision;
  distance_km: number;
  lat: number;
  lng: number;
}
