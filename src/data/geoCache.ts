export interface GeoFeature {
  type: 'Feature';
  properties: {
    id: string;
    plateCode?: number;
    name: string;
    nameTr?: string;
    nameEn?: string;
    isTurkey?: boolean;
    isBallotCountry?: boolean;
    region?: string;
    districtIds?: string[];
    ilId?: string;
    districtId?: string;
    mpCount?: number;
    lat: number;
    lng: number;
  };
  geometry: unknown;
}

export interface GeoCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

export type GeoLayerKind = 'provinces' | 'districts87' | 'ilceler' | 'world';

const FILE_MAP: Record<GeoLayerKind, string> = {
  provinces: 'tr-provinces.geojson',
  districts87: 'tr-districts-87.geojson',
  ilceler: 'tr-ilceler.geojson',
  world: 'world-countries.geojson',
};

const geoPromiseCache: Partial<Record<GeoLayerKind, Promise<GeoCollection>>> = {};
const geoValueCache: Partial<Record<GeoLayerKind, GeoCollection>> = {};

export function loadGeoLayer(kind: GeoLayerKind): Promise<GeoCollection> {
  const existing = geoPromiseCache[kind];
  if (existing) return existing;

  const baseUrl = import.meta.env?.BASE_URL ?? './';
  const promise = fetch(`${baseUrl}${FILE_MAP[kind]}`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status} loading ${FILE_MAP[kind]}`);
      return r.json() as Promise<GeoCollection>;
    })
    .then((data) => {
      geoValueCache[kind] = data;
      return data;
    })
    .catch((err) => {
      delete geoPromiseCache[kind];
      throw err;
    });

  geoPromiseCache[kind] = promise;
  return promise;
}

export function getCachedGeoLayer(kind: GeoLayerKind): GeoCollection | null {
  return geoValueCache[kind] || null;
}

export const loadProvincesGeo = () => loadGeoLayer('provinces');
export const loadDistricts87Geo = () => loadGeoLayer('districts87');
export const loadIlcelerGeo = () => loadGeoLayer('ilceler');
export const loadWorldCountriesGeo = () => loadGeoLayer('world');
