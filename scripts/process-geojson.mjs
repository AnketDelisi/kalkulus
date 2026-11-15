import fs from 'node:fs';
import path from 'node:path';
import { geoArea, geoCentroid, geoContains, geoMercator } from 'd3-geo';
import * as topojsonServer from 'topojson-server';
import * as topojsonClient from 'topojson-client';

/**
 * Generates public/tr-districts-87.geojson (87), public/tr-provinces.geojson (81),
 * and public/tr-ilceler.geojson (973) directly from AnketDelisi/600's geoBoundaries SVGs:
 * - scripts/data/repo600_turkey_il.svg (87 dissolved electoral districts)
 * - scripts/data/repo600_turkey.svg (all 973 modern ilçe boundaries)
 *
 * Also updates lat/lng centroids in baseline2023.json and baseline2024.json.
 */

const SVG_PROJECTION = geoMercator().fitExtent(
  [
    [0, 0],
    [1000, 446.4],
  ],
  {
    type: 'MultiPoint',
    coordinates: [
      [25.6685, 35.8084],
      [44.8179, 42.1067],
    ],
  }
);

function normalizeTr(str) {
  if (!str) return '';
  return str
    .toString()
    .trim()
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/i̇/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u')
    .replace(/[^a-z0-9]/g, '');
}

function roundCoord(pt) {
  return [Number(pt[0].toFixed(5)), Number(pt[1].toFixed(5))];
}

/**
 * Parses an SVG path `d` attribute (M/L/Z commands in the 1000x446.4 Mercator canvas)
 * into a spherical-RFC7946 GeoJSON Polygon or MultiPolygon with normalized winding and holes.
 */
function svgPathToGeoJSON(dStr) {
  const rawSubpaths = dStr.trim().split(/(?=M)/);
  const candidateRings = [];

  for (const sub of rawSubpaths) {
    const pts = [];
    for (const match of sub.matchAll(/([0-9.-]+),([0-9.-]+)/g)) {
      const x = Number(match[1]);
      const y = Number(match[2]);
      const lonLat = SVG_PROJECTION.invert([x, y]);
      if (!lonLat || Number.isNaN(lonLat[0]) || Number.isNaN(lonLat[1])) continue;
      const rounded = roundCoord(lonLat);
      if (
        pts.length === 0 ||
        pts[pts.length - 1][0] !== rounded[0] ||
        pts[pts.length - 1][1] !== rounded[1]
      ) {
        pts.push(rounded);
      }
    }

    if (pts.length < 3) continue;
    if (pts[0][0] !== pts[pts.length - 1][0] || pts[0][1] !== pts[pts.length - 1][1]) {
      pts.push([...pts[0]]);
    }
    if (pts.length < 4) continue;

    let polyArea = geoArea({ type: 'Polygon', coordinates: [pts] });
    if (polyArea > Math.PI) {
      pts.reverse();
      polyArea = geoArea({ type: 'Polygon', coordinates: [pts] });
    }
    if (polyArea <= 1e-10) continue;

    candidateRings.push({
      ring: pts,
      area: polyArea,
      centroid: geoCentroid({ type: 'Polygon', coordinates: [pts] }),
    });
  }

  if (candidateRings.length === 0) {
    throw new Error('SVG path produced zero valid non-degenerate rings');
  }

  // Classify outer rings vs holes using strictly larger area + centroid containment
  const outerPolys = [];
  const parentOfRing = new Array(candidateRings.length).fill(-1);
  const depthOfRing = new Array(candidateRings.length).fill(0);

  for (let j = 0; j < candidateRings.length; j++) {
    const child = candidateRings[j];
    const containers = [];
    for (let i = 0; i < candidateRings.length; i++) {
      if (i === j) continue;
      const parent = candidateRings[i];
      if (parent.area <= child.area * 1.001) continue;
      if (geoContains({ type: 'Polygon', coordinates: [parent.ring] }, child.centroid)) {
        containers.push(i);
      }
    }
    depthOfRing[j] = containers.length;
    if (containers.length % 2 === 1) {
      // Immediate enclosing outer shell is the smallest-area container
      containers.sort((a, b) => candidateRings[a].area - candidateRings[b].area);
      parentOfRing[j] = containers[0];
    }
  }

  const outerIndexByRing = new Map();
  for (let i = 0; i < candidateRings.length; i++) {
    if (depthOfRing[i] % 2 === 0) {
      outerIndexByRing.set(i, outerPolys.length);
      outerPolys.push([candidateRings[i].ring]);
    }
  }

  for (let j = 0; j < candidateRings.length; j++) {
    const pIdx = parentOfRing[j];
    if (pIdx >= 0 && outerIndexByRing.has(pIdx)) {
      const hole = [...candidateRings[j].ring].reverse();
      outerPolys[outerIndexByRing.get(pIdx)].push(hole);
    }
  }

  const geom =
    outerPolys.length === 1
      ? { type: 'Polygon', coordinates: outerPolys[0] }
      : { type: 'MultiPolygon', coordinates: outerPolys };

  const totalArea = geoArea({ type: 'Feature', properties: {}, geometry: geom });
  if (totalArea > 0.5) {
    throw new Error(`Invalid spherical winding detected (geoArea=${totalArea})`);
  }

  return geom;
}

function parseSvgPaths(filePath, skipSeatArea = false) {
  const svgText = fs.readFileSync(path.resolve(filePath), 'utf8');
  const map = new Map();
  for (const match of svgText.matchAll(/<path\b([^>]*)>/g)) {
    const attrs = match[1];
    if (skipSeatArea && attrs.includes('seat-area')) continue;
    const idMatch = attrs.match(/\bid="([^"]+)"/);
    const dMatch = attrs.match(/\bd="([^"]+)"/);
    if (!idMatch || !dMatch) continue;
    map.set(idMatch[1], dMatch[1]);
  }
  return map;
}

const baseline2023 = JSON.parse(
  fs.readFileSync(path.resolve('src/data/baseline2023.json'), 'utf8')
);
const baseline2024 = JSON.parse(
  fs.readFileSync(path.resolve('src/data/baseline2024.json'), 'utf8')
);

const svgDistPaths = parseSvgPaths('scripts/data/repo600_turkey_il.svg', false);
const svgIlcePaths = parseSvgPaths('scripts/data/repo600_turkey.svg', true);

const provFoldById = Object.fromEntries(
  baseline2023.provinces.map((p) => [p.id, normalizeTr(p.name)])
);

// 1. Build 87 Electoral Districts GeoJSON from repo600_turkey_il.svg
const districtFeatures87 = [];
const districtGeomById = {};

for (const dConfig of baseline2023.districts) {
  const pFold = provFoldById[dConfig.ilId];
  let svgKey = pFold;
  if (dConfig.id.includes('-')) {
    const subIdx = Number(dConfig.id.split('-')[1]);
    svgKey = `${pFold}-${['', 'i', 'ii', 'iii'][subIdx]}`;
  }
  const dStr = svgDistPaths.get(svgKey);
  if (!dStr) {
    throw new Error(`Missing district path '${svgKey}' for district ${dConfig.id} in repo600_turkey_il.svg`);
  }

  const geometry = svgPathToGeoJSON(dStr);
  districtGeomById[dConfig.id] = geometry;
  const [cLng, cLat] = geoCentroid({ type: 'Feature', properties: {}, geometry });

  districtFeatures87.push({
    type: 'Feature',
    properties: {
      id: dConfig.id,
      ilId: dConfig.ilId,
      name: dConfig.name,
      mpCount: dConfig.mpCount,
      lat: Number(cLat.toFixed(4)),
      lng: Number(cLng.toFixed(4)),
    },
    geometry,
  });
}

// 2. Build 81 Provinces GeoJSON (merging split sub-districts for Ankara, Bursa, İstanbul, İzmir)
const cleanProvinceFeatures = [];

for (const prov of baseline2023.provinces) {
  let geometry;
  if (prov.districtIds.length === 1) {
    geometry = districtGeomById[prov.districtIds[0]];
  } else {
    const subFc = {
      type: 'FeatureCollection',
      features: prov.districtIds.map((dId) => ({
        type: 'Feature',
        properties: { id: dId },
        geometry: districtGeomById[dId],
      })),
    };
    const topology = topojsonServer.topology({ sub: subFc }, 1e4);
    geometry = topojsonClient.merge(topology, topology.objects.sub.geometries);
    if (geoArea({ type: 'Feature', properties: {}, geometry }) > 0.5) {
      throw new Error(`Invalid merged province winding for province ${prov.id}`);
    }
  }

  const [cLng, cLat] = geoCentroid({ type: 'Feature', properties: {}, geometry });
  cleanProvinceFeatures.push({
    type: 'Feature',
    properties: {
      id: prov.id,
      plateCode: prov.plateCode,
      name: prov.name,
      region: prov.region,
      districtIds: prov.districtIds,
      lat: Number(cLat.toFixed(4)),
      lng: Number(cLng.toFixed(4)),
    },
    geometry,
  });
}

cleanProvinceFeatures.sort((a, b) => a.properties.plateCode - b.properties.plateCode);

// 3. Build 973 İlçeler GeoJSON from repo600_turkey.svg (strict 1-to-1 match)
const ILCE_SVG_SPECIAL = {
  '28-merkez': 'giresun-giresundistrict',
  '75-merkez': 'ardahan-ardahan',
  '17-gokceada': 'canakkale-imbros',
  '34-adalar': 'istanbul-princeislands',
  '71-karakecili': 'kirikkale-karakeceli',
  '55-19-mayis': 'samsun-ondokuzmayis',
  '43-gediz': 'kutahya-gedizmerkez',
};

const cleanIlceFeatures = [];
const usedSvgIlceKeys = new Set();

for (const ilce of baseline2023.ilceler) {
  const pf = provFoldById[ilce.ilId];
  const inf = normalizeTr(ilce.name);
  const candidates = [
    ILCE_SVG_SPECIAL[ilce.id],
    `${pf}-${inf}`,
    `${pf}-${pf}merkez`,
    `${pf}-${pf}merkezilce`,
    `${pf}-${pf}merkezi`,
  ].filter(Boolean);

  const svgKey = candidates.find((k) => svgIlcePaths.has(k));
  if (!svgKey) {
    throw new Error(`Missing ilçe path for ${ilce.id} (${ilce.name}) in repo600_turkey.svg`);
  }
  if (usedSvgIlceKeys.has(svgKey)) {
    throw new Error(`Duplicate SVG key '${svgKey}' mapped for ilçe ${ilce.id}`);
  }
  usedSvgIlceKeys.add(svgKey);

  const geometry = svgPathToGeoJSON(svgIlcePaths.get(svgKey));
  const [cLng, cLat] = geoCentroid({ type: 'Feature', properties: {}, geometry });
  ilce.lat = Number(cLat.toFixed(4));
  ilce.lng = Number(cLng.toFixed(4));

  cleanIlceFeatures.push({
    type: 'Feature',
    properties: {
      id: ilce.id,
      name: ilce.name,
      ilId: ilce.ilId,
      districtId: ilce.districtId,
      lat: ilce.lat,
      lng: ilce.lng,
    },
    geometry,
  });
}

if (cleanIlceFeatures.length !== 973 || districtFeatures87.length !== 87 || cleanProvinceFeatures.length !== 81) {
  throw new Error(
    `Feature count mismatch: prov=${cleanProvinceFeatures.length}, dist=${districtFeatures87.length}, ilce=${cleanIlceFeatures.length}`
  );
}

// Update centroids in baseline2023 and baseline2024
const coordMap = {};
for (const ilce of baseline2023.ilceler) {
  coordMap[ilce.id] = { lat: ilce.lat, lng: ilce.lng };
}
for (const ilce24 of baseline2024.ilceler) {
  if (coordMap[ilce24.id]) {
    ilce24.lat = coordMap[ilce24.id].lat;
    ilce24.lng = coordMap[ilce24.id].lng;
  }
}

fs.writeFileSync(
  path.resolve('src/data/baseline2023.json'),
  JSON.stringify(baseline2023)
);
fs.writeFileSync(
  path.resolve('src/data/baseline2024.json'),
  JSON.stringify(baseline2024)
);

fs.writeFileSync(
  path.resolve('public/tr-provinces.geojson'),
  JSON.stringify({ type: 'FeatureCollection', features: cleanProvinceFeatures })
);
fs.writeFileSync(
  path.resolve('public/tr-districts-87.geojson'),
  JSON.stringify({ type: 'FeatureCollection', features: districtFeatures87 })
);
fs.writeFileSync(
  path.resolve('public/tr-ilceler.geojson'),
  JSON.stringify({ type: 'FeatureCollection', features: cleanIlceFeatures })
);

const dSizeKb = (
  fs.statSync(path.resolve('public/tr-districts-87.geojson')).size / 1024
).toFixed(1);
const pSizeKb = (
  fs.statSync(path.resolve('public/tr-provinces.geojson')).size / 1024
).toFixed(1);
const iSizeKb = (
  fs.statSync(path.resolve('public/tr-ilceler.geojson')).size / 1024
).toFixed(1);

console.log(
  `Built from 600: ${cleanProvinceFeatures.length} provinces (${pSizeKb} KB), ${districtFeatures87.length} electoral districts (${dSizeKb} KB), and ${cleanIlceFeatures.length} ilçeler (${iSizeKb} KB)!`
);
