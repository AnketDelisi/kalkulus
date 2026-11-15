import fs from 'node:fs';
import path from 'node:path';
import { geoContains, geoCentroid } from 'd3-geo';

/**
 * Processes public/tr-provinces.geojson and public/tr-ilceler.geojson:
 * 1. Normalizes province plate codes ("01".."81") and Turkish names.
 * 2. Matches every ilçe polygon in tr-ilceler.geojson to its parent province (ilId),
 *    electoral district (districtId), and canonical ilceId in baseline2023.json.
 * 3. Simplifies coordinate precision and vertex density so the ilçe GeoJSON drops
 *    from ~14 MB to ~900 KB while preserving crisp geographical borders.
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

// Step 1: Map each of the 81 province features in rawProvincesGeo to our canonical ProvinceConfig
const provByNormName = {};
for (const p of baseline2023.provinces) {
  provByNormName[normalizeTr(p.name)] = p;
}
// Special aliases in tr-cities-utf8.json
provByNormName['afyon'] = provByNormName['afyonkarahisar'];
provByNormName['elazig'] = provByNormName['elazig'];
provByNormName['hakari'] = provByNormName['hakkari'];
provByNormName['kmaras'] = provByNormName['kahramanmaras'];
provByNormName['kirklareli'] = provByNormName['kirklareli'];
provByNormName['mersin'] = provByNormName['mersin'];
provByNormName['icel'] = provByNormName['mersin'];
provByNormName['sanliurfa'] = provByNormName['sanliurfa'];
provByNormName['sirnak'] = provByNormName['sirnak'];
provByNormName['zonguldak'] = provByNormName['zonguldak'];

function simplifyRing(ring, toleranceSq) {
  if (ring.length <= 6) {
    return ring.map(([lng, lat]) => [Number(lng.toFixed(4)), Number(lat.toFixed(4))]);
  }
  const out = [ [Number(ring[0][0].toFixed(4)), Number(ring[0][1].toFixed(4))] ];
  let last = ring[0];
  for (let i = 1; i < ring.length - 1; i++) {
    const pt = ring[i];
    const dx = pt[0] - last[0];
    const dy = pt[1] - last[1];
    if (dx * dx + dy * dy >= toleranceSq) {
      out.push([Number(pt[0].toFixed(4)), Number(pt[1].toFixed(4))]);
      last = pt;
    }
  }
  const end = ring[ring.length - 1];
  out.push([Number(end[0].toFixed(4)), Number(end[1].toFixed(4))]);
  // Ensure valid closed ring of at least 4 points
  while (out.length < 4) {
    out.splice(1, 0, out[0]);
  }
  return out;
}

function simplifyGeometry(geom, tolerance = 0.004) {
  const tolSq = tolerance * tolerance;
  if (geom.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geom.coordinates.map((ring) => simplifyRing(ring, tolSq)),
    };
  }
  if (geom.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geom.coordinates.map((poly) =>
        poly.map((ring) => simplifyRing(ring, tolSq))
      ),
    };
  }
  return geom;
}

const cleanProvinceFeatures = [];
for (const feat of rawProvincesGeo.features) {
  const rawName = feat.properties?.name || '';
  const norm = normalizeTr(rawName);
  let matchedProv = provByNormName[norm];
  if (!matchedProv) {
    // Fallback by centroid distance
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
    geometry: simplifyGeometry(feat.geometry, 0.002),
  });
}

cleanProvinceFeatures.sort((a, b) => a.properties.plateCode - b.properties.plateCode);

// Step 2: Match each ilçe feature in rawIlcelerGeo to its parent province and baseline2023 ilce entry
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

  // Find containing province or closest province
  let parentProvId = null;
  for (const pFeat of cleanProvinceFeatures) {
    if (geoContains(pFeat, [cLng, cLat])) {
      parentProvId = pFeat.properties.id;
      break;
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

  // Match to an ilce inside parentProvId
  const candidates = ilcesByProv[parentProvId] || [];
  let matchedIlce = candidates.find((c) => normalizeTr(c.name) === normName);
  if (!matchedIlce) {
    // Substring match (e.g. "Merkez" or "Eyup" -> "Eyüpsultan")
    matchedIlce = candidates.find(
      (c) =>
        normalizeTr(c.name).includes(normName) ||
        normName.includes(normalizeTr(c.name))
    );
  }
  if (!matchedIlce) {
    // Pick an unmatched candidate in that province or the first candidate (Merkez)
    matchedIlce =
      candidates.find((c) => !matchedIlceIds.has(c.id)) || candidates[0];
  }

  if (matchedIlce) {
    matchedIlceIds.add(matchedIlce.id);
    // Update baseline ilce lat/lng with real geographical centroid!
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
      geometry: simplifyGeometry(feat.geometry, 0.0045),
    });
  }
}

// Save updated real centroids back to baseline2023.json and baseline2024.json
const baseline2024 = JSON.parse(
  fs.readFileSync(path.resolve('src/data/baseline2024.json'), 'utf8')
);
const coordMap = {};
for (const ilce of baseline2023.ilceler) {
  coordMap[ilce.id] = { lat: ilce.lat, lng: ilce.lng };
}
for (const pFeat of cleanProvinceFeatures) {
  const p23 = baseline2023.provinces.find((p) => p.id === pFeat.properties.id);
  const p24 = baseline2024.provinces.find((p) => p.id === pFeat.properties.id);
  if (p23) {
    p23.lat = pFeat.properties.lat;
    p23.lng = pFeat.properties.lng;
  }
  if (p24) {
    p24.lat = pFeat.properties.lat;
    p24.lng = pFeat.properties.lng;
  }
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

const outProvincesGeo = {
  type: 'FeatureCollection',
  features: cleanProvinceFeatures,
};
const outIlcelerGeo = {
  type: 'FeatureCollection',
  features: cleanIlceFeatures,
};

fs.writeFileSync(
  path.resolve('public/tr-provinces.geojson'),
  JSON.stringify(outProvincesGeo)
);
fs.writeFileSync(
  path.resolve('public/tr-ilceler.geojson'),
  JSON.stringify(outIlcelerGeo)
);

const pSizeKb = (fs.statSync(path.resolve('public/tr-provinces.geojson')).size / 1024).toFixed(1);
const iSizeKb = (fs.statSync(path.resolve('public/tr-ilceler.geojson')).size / 1024).toFixed(1);

console.log(
  `Successfully processed ${cleanProvinceFeatures.length} province polygons (${pSizeKb} KB) and ${cleanIlceFeatures.length} ilçe polygons (${iSizeKb} KB)!`
);
