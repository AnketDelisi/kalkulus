import fs from 'node:fs';
import path from 'node:path';
import { geoContains, geoCentroid } from 'd3-geo';
import * as topojsonServer from 'topojson-server';
import * as topojsonClient from 'topojson-client';

/**
 * Processes public/tr-provinces.geojson and public/tr-ilceler.geojson:
 * 1. Normalizes province plate codes ("01".."81") and Turkish names.
 * 2. Matches every ilçe polygon in tr-ilceler.geojson to its parent province (ilId),
 *    updated electoral district (districtId), and canonical ilceId in baseline2023.json.
 * 3. Dissolves/merges adjacent ilçe polygons by districtId inside multi-district provinces
 *    (İstanbul 1-2-3, Ankara 1-2-3, İzmir 1-2, Bursa 1-2) using TopoJSON topological union,
 *    generating public/tr-districts-87.geojson with 87 unified electoral region polygons!
 */

const baseline2023 = JSON.parse(
  fs.readFileSync(path.resolve('src/data/baseline2023.json'), 'utf8')
);
const rawProvincesGeo = JSON.parse(
  fs.readFileSync(path.resolve('public/tr-provinces.geojson'), 'utf8')
);
const rawIlcelerGeo = JSON.parse(
  fs.readFileSync(path.resolve('public/tr-ilceler.geojson'), 'utf8')
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

const provByNormName = {};
for (const p of baseline2023.provinces) {
  provByNormName[normalizeTr(p.name)] = p;
}
provByNormName['afyon'] = provByNormName['afyonkarahisar'];
provByNormName['hakari'] = provByNormName['hakkari'];
provByNormName['kmaras'] = provByNormName['kahramanmaras'];
provByNormName['icel'] = provByNormName['mersin'];

const cleanProvinceFeatures = [];
for (const feat of rawProvincesGeo.features) {
  const rawName = feat.properties?.name || '';
  const norm = normalizeTr(rawName);
  let matchedProv = provByNormName[norm];
  if (!matchedProv) {
    const [cLng, cLat] = geoCentroid(feat);
    let bestDist = Infinity;
    for (const p of baseline2023.provinces) {
      const d = (p.lat - cLat) ** 2 + (p.lng - cLng) ** 2;
      if (d < bestDist) {
        bestDist = d;
        matchedProv = p;
      }
    }
  }

  const [cLng, cLat] = geoCentroid(feat);
  cleanProvinceFeatures.push({
    type: 'Feature',
    properties: {
      id: matchedProv.id,
      plateCode: matchedProv.plateCode,
      name: matchedProv.name,
      region: matchedProv.region,
      districtIds: matchedProv.districtIds,
      lat: Number(cLat.toFixed(4)),
      lng: Number(cLng.toFixed(4)),
    },
    geometry: feat.geometry,
  });
}

cleanProvinceFeatures.sort((a, b) => a.properties.plateCode - b.properties.plateCode);

// Group baseline ilceler by province
const ilcesByProv = {};
for (const ilce of baseline2023.ilceler) {
  if (!ilcesByProv[ilce.ilId]) ilcesByProv[ilce.ilId] = [];
  ilcesByProv[ilce.ilId].push(ilce);
}

const cleanIlceFeatures = [];
const matchedIlceIds = new Set();

for (const feat of rawIlcelerGeo.features) {
  if (!feat.geometry) continue;
  const rawName = feat.properties?.Name || feat.properties?.name || '';
  const normName = normalizeTr(rawName);
  const [cLng, cLat] = geoCentroid(feat);
  if (isNaN(cLng) || isNaN(cLat)) continue;

  let parentProvId = feat.properties?.ilId || null;
  if (!parentProvId) {
    for (const pFeat of cleanProvinceFeatures) {
      if (geoContains(pFeat, [cLng, cLat])) {
        parentProvId = pFeat.properties.id;
        break;
      }
    }
  }
  if (!parentProvId) {
    let bestD = Infinity;
    for (const pFeat of cleanProvinceFeatures) {
      const d = (pFeat.properties.lat - cLat) ** 2 + (pFeat.properties.lng - cLng) ** 2;
      if (d < bestD) {
        bestD = d;
        parentProvId = pFeat.properties.id;
      }
    }
  }

  const candidates = ilcesByProv[parentProvId] || [];
  let matchedIlce = candidates.find((c) => normalizeTr(c.name) === normName);
  if (!matchedIlce) {
    matchedIlce = candidates.find(
      (c) =>
        normalizeTr(c.name).includes(normName) ||
        normName.includes(normalizeTr(c.name))
    );
  }
  if (!matchedIlce) {
    matchedIlce =
      candidates.find((c) => !matchedIlceIds.has(c.id)) || candidates[0];
  }

  if (matchedIlce) {
    matchedIlceIds.add(matchedIlce.id);
    matchedIlce.lat = Number(cLat.toFixed(4));
    matchedIlce.lng = Number(cLng.toFixed(4));

    cleanIlceFeatures.push({
      type: 'Feature',
      properties: {
        id: matchedIlce.id,
        name: matchedIlce.name,
        ilId: matchedIlce.ilId,
        districtId: matchedIlce.districtId,
        lat: Number(cLat.toFixed(4)),
        lng: Number(cLng.toFixed(4)),
      },
      geometry: feat.geometry,
    });
  }
}

// Build Merged 87-Electoral-District GeoJSON by dissolving ilçe polygons inside multi-district provinces
const multiDistrictProvIds = new Set(['06', '16', '34', '35']);
const districtFeatures87 = [];

for (const dConfig of baseline2023.districts) {
  if (!multiDistrictProvIds.has(dConfig.ilId)) {
    // Single-district province -> use the clean province polygon directly
    const pFeat = cleanProvinceFeatures.find((f) => f.properties.id === dConfig.ilId);
    if (pFeat) {
      districtFeatures87.push({
        type: 'Feature',
        properties: {
          id: dConfig.id,
          ilId: dConfig.ilId,
          name: dConfig.name,
          mpCount: dConfig.mpCount,
          lat: pFeat.properties.lat,
          lng: pFeat.properties.lng,
        },
        geometry: pFeat.geometry,
      });
    }
  } else {
    // Multi-district electoral region (e.g. 34-1, 06-2, 35-1, 16-2) -> dissolve constituent ilçe polygons via TopoJSON merge!
    const regionIlceFeatures = cleanIlceFeatures.filter(
      (f) => f.properties.districtId === dConfig.id
    );
    const fc = {
      type: 'FeatureCollection',
      features: regionIlceFeatures,
    };
    // Quantize coordinates so shared borders snap and dissolve cleanly
    const topology = topojsonServer.topology({ ilceler: fc }, 1e4);
    const mergedGeometry = topojsonClient.merge(
      topology,
      topology.objects.ilceler.geometries
    );
    const tempFeat = { type: 'Feature', properties: {}, geometry: mergedGeometry };
    const [cLng, cLat] = geoCentroid(tempFeat);

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
      geometry: mergedGeometry,
    });
  }
}

// Update centroids in baseline2023 and baseline2024
const baseline2024 = JSON.parse(
  fs.readFileSync(path.resolve('src/data/baseline2024.json'), 'utf8')
);
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
console.log(
  `Built 81 provinces, ${districtFeatures87.length} dissolved electoral districts (${dSizeKb} KB), and ${cleanIlceFeatures.length} ilçeler!`
);
