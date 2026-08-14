export type {
  EntityType,
  GeoFeature,
  GeoJSON,
  GeoPrecision,
  LinkedPartner,
  MapProperties,
  MarketingChannels,
  NearbyPartner,
  PartnerProperties,
  ProjectProperties,
} from "@asw/shared";

import type { MapProperties, ProjectProperties } from "@asw/shared";

export function isProjectProperties(properties: MapProperties): properties is ProjectProperties {
  return properties.isProject === true;
}
