// Building and spatial data types

export interface BuildingProperties {
  id: number;
  name?: string;
  height: number; // meters
  levels?: number; // number of floors
  building_type?: string;
}

export interface BuildingFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][]; // [[[lng, lat], ...]]
  };
  properties: BuildingProperties;
}

export interface BuildingCollection {
  type: 'FeatureCollection';
  features: BuildingFeature[];
}
