import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import * as topojson from 'topojson-client';

const require = createRequire(import.meta.url);
const t110 = require('world-atlas/countries-110m.json');
const t50 = require('world-atlas/countries-50m.json');

const ROOT = process.cwd();
const WIKI_ABROAD_PATH =
  process.env.WIKI_ABROAD_PATH ||
  'C:/Users/deneme/.gemini/antigravity/brain/27964982-5e57-4cfb-9cfb-f682e05579d6/scratch/wiki_abroad_2023.json';
const WIKI_GUMRUK_PATH =
  process.env.WIKI_GUMRUK_PATH ||
  'C:/Users/deneme/.gemini/antigravity/brain/27964982-5e57-4cfb-9cfb-f682e05579d6/scratch/wiki_gumruk_2023.json';

function roundCoords(coords) {
  if (typeof coords[0] === 'number') {
    return [Number(coords[0].toFixed(2)), Number(coords[1].toFixed(2))];
  }
  return coords.map(roundCoords);
}

function roundGeometry(geom) {
  if (!geom || !geom.coordinates) return geom;
  return { ...geom, coordinates: roundCoords(geom.coordinates) };
}

function parseTrNum(raw) {
  if (!raw) return 0;
  const cleaned = String(raw)
    .replace(/<[^>]+>/g, '')
    .replace(/'''?/g, '')
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parsePctStr(raw) {
  if (!raw) return 0;
  const cleaned = String(raw)
    .replace(/<[^>]+>/g, '')
    .replace(/'''?/g, '')
    .replace(/%/g, '')
    .replace(/\s+/g, '')
    .replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// ISO-A3, World-Atlas matching key (ISO numeric id or exact properties.name), English name, Region
const COUNTRY_META = {
  'Almanya': { id: 'DEU', atlasName: 'Germany', en: 'Germany', region: 'Avrupa' },
  'Amerika Birleşik Devletleri': { id: 'USA', atlasName: 'United States of America', en: 'United States', region: 'Amerika' },
  'Arnavutluk': { id: 'ALB', atlasName: 'Albania', en: 'Albania', region: 'Avrupa' },
  'Avustralya': { id: 'AUS', atlasName: 'Australia', en: 'Australia', region: 'Okyanusya' },
  'Avusturya': { id: 'AUT', atlasName: 'Austria', en: 'Austria', region: 'Avrupa' },
  'Azerbaycan': { id: 'AZE', atlasName: 'Azerbaijan', en: 'Azerbaijan', region: 'Asya & Kafkasya' },
  'Bahreyn': { id: 'BHR', atlasName: 'Bahrain', en: 'Bahrain', region: 'Orta Doğu' },
  'Belarus': { id: 'BLR', atlasName: 'Belarus', en: 'Belarus', region: 'Avrupa' },
  'Belçika': { id: 'BEL', atlasName: 'Belgium', en: 'Belgium', region: 'Avrupa' },
  'Birleşik Arap Emirlikleri': { id: 'ARE', atlasName: 'United Arab Emirates', en: 'United Arab Emirates', region: 'Orta Doğu' },
  'Birleşik Krallık': { id: 'GBR', atlasName: 'United Kingdom', en: 'United Kingdom', region: 'Avrupa' },
  'Bosna Hersek': { id: 'BIH', atlasName: 'Bosnia and Herz.', en: 'Bosnia and Herzegovina', region: 'Avrupa' },
  'Brezilya': { id: 'BRA', atlasName: 'Brazil', en: 'Brazil', region: 'Amerika' },
  'Bulgaristan': { id: 'BGR', atlasName: 'Bulgaria', en: 'Bulgaria', region: 'Avrupa' },
  'Cezayir': { id: 'DZA', atlasName: 'Algeria', en: 'Algeria', region: 'Afrika' },
  'Çekya': { id: 'CZE', atlasName: 'Czechia', en: 'Czechia', region: 'Avrupa' },
  'Çin': { id: 'CHN', atlasName: 'China', en: 'China', region: 'Asya & Kafkasya' },
  'Danimarka': { id: 'DNK', atlasName: 'Denmark', en: 'Denmark', region: 'Avrupa' },
  'Estonya': { id: 'EST', atlasName: 'Estonia', en: 'Estonia', region: 'Avrupa' },
  'Fas': { id: 'MAR', atlasName: 'Morocco', en: 'Morocco', region: 'Afrika' },
  'Finlandiya': { id: 'FIN', atlasName: 'Finland', en: 'Finland', region: 'Avrupa' },
  'Fransa': { id: 'FRA', atlasName: 'France', en: 'France', region: 'Avrupa' },
  'Güney Afrika Cumhuriyeti': { id: 'ZAF', atlasName: 'South Africa', en: 'South Africa', region: 'Afrika' },
  'Güney Kore': { id: 'KOR', atlasName: 'South Korea', en: 'South Korea', region: 'Asya & Kafkasya' },
  'Gürcistan': { id: 'GEO', atlasName: 'Georgia', en: 'Georgia', region: 'Asya & Kafkasya' },
  'Hollanda': { id: 'NLD', atlasName: 'Netherlands', en: 'Netherlands', region: 'Avrupa' },
  'Irak': { id: 'IRQ', atlasName: 'Iraq', en: 'Iraq', region: 'Orta Doğu' },
  'İran': { id: 'IRN', atlasName: 'Iran', en: 'Iran', region: 'Orta Doğu' },
  'İrlanda': { id: 'IRL', atlasName: 'Ireland', en: 'Ireland', region: 'Avrupa' },
  'İspanya': { id: 'ESP', atlasName: 'Spain', en: 'Spain', region: 'Avrupa' },
  'İsrail': { id: 'ISR', atlasName: 'Israel', en: 'Israel', region: 'Orta Doğu' },
  'İsveç': { id: 'SWE', atlasName: 'Sweden', en: 'Sweden', region: 'Avrupa' },
  'İsviçre': { id: 'CHE', atlasName: 'Switzerland', en: 'Switzerland', region: 'Avrupa' },
  'İtalya': { id: 'ITA', atlasName: 'Italy', en: 'Italy', region: 'Avrupa' },
  'Japonya': { id: 'JPN', atlasName: 'Japan', en: 'Japan', region: 'Asya & Kafkasya' },
  'Kanada': { id: 'CAN', atlasName: 'Canada', en: 'Canada', region: 'Amerika' },
  'Karadağ': { id: 'MNE', atlasName: 'Montenegro', en: 'Montenegro', region: 'Avrupa' },
  'Katar': { id: 'QAT', atlasName: 'Qatar', en: 'Qatar', region: 'Orta Doğu' },
  'Kazakistan': { id: 'KAZ', atlasName: 'Kazakhstan', en: 'Kazakhstan', region: 'Asya & Kafkasya' },
  'Kırgızistan': { id: 'KGZ', atlasName: 'Kyrgyzstan', en: 'Kyrgyzstan', region: 'Asya & Kafkasya' },
  'Kosova': { id: 'XKX', atlasName: 'Kosovo', en: 'Kosovo', region: 'Avrupa' },
  'Kuveyt': { id: 'KWT', atlasName: 'Kuwait', en: 'Kuwait', region: 'Orta Doğu' },
  'Kuzey Kıbrıs Türk Cumhuriyeti': { id: 'KKTC', atlasName: 'N. Cyprus', en: 'Northern Cyprus', region: 'Kıbrıs' },
  'Kuzey Makedonya': { id: 'MKD', atlasName: 'Macedonia', en: 'North Macedonia', region: 'Avrupa' },
  'Libya': { id: 'LBY', atlasName: 'Libya', en: 'Libya', region: 'Afrika' },
  'Litvanya': { id: 'LTU', atlasName: 'Lithuania', en: 'Lithuania', region: 'Avrupa' },
  'Lübnan': { id: 'LBN', atlasName: 'Lebanon', en: 'Lebanon', region: 'Orta Doğu' },
  'Lüksemburg': { id: 'LUX', atlasName: 'Luxembourg', en: 'Luxembourg', region: 'Avrupa' },
  'Macaristan': { id: 'HUN', atlasName: 'Hungary', en: 'Hungary', region: 'Avrupa' },
  'Malezya': { id: 'MYS', atlasName: 'Malaysia', en: 'Malaysia', region: 'Asya & Kafkasya' },
  'Malta': { id: 'MLT', atlasName: 'Malta', en: 'Malta', region: 'Avrupa' },
  'Mısır': { id: 'EGY', atlasName: 'Egypt', en: 'Egypt', region: 'Afrika' },
  'Moldova': { id: 'MDA', atlasName: 'Moldova', en: 'Moldova', region: 'Avrupa' },
  'Nijerya': { id: 'NGA', atlasName: 'Nigeria', en: 'Nigeria', region: 'Afrika' },
  'Norveç': { id: 'NOR', atlasName: 'Norway', en: 'Norway', region: 'Avrupa' },
  'Özbekistan': { id: 'UZB', atlasName: 'Uzbekistan', en: 'Uzbekistan', region: 'Asya & Kafkasya' },
  'Pakistan': { id: 'PAK', atlasName: 'Pakistan', en: 'Pakistan', region: 'Asya & Kafkasya' },
  'Polonya': { id: 'POL', atlasName: 'Poland', en: 'Poland', region: 'Avrupa' },
  'Portekiz': { id: 'PRT', atlasName: 'Portugal', en: 'Portugal', region: 'Avrupa' },
  'Romanya': { id: 'ROU', atlasName: 'Romania', en: 'Romania', region: 'Avrupa' },
  'Rusya': { id: 'RUS', atlasName: 'Russia', en: 'Russia', region: 'Asya & Kafkasya' },
  'Sırbistan': { id: 'SRB', atlasName: 'Serbia', en: 'Serbia', region: 'Avrupa' },
  'Singapur': { id: 'SGP', atlasName: 'Singapore', en: 'Singapore', region: 'Asya & Kafkasya' },
  'Slovakya': { id: 'SVK', atlasName: 'Slovakia', en: 'Slovakia', region: 'Avrupa' },
  'Suudi Arabistan': { id: 'SAU', atlasName: 'Saudi Arabia', en: 'Saudi Arabia', region: 'Orta Doğu' },
  'Tanzanya': { id: 'TZA', atlasName: 'Tanzania', en: 'Tanzania', region: 'Afrika' },
  'Tayland': { id: 'THA', atlasName: 'Thailand', en: 'Thailand', region: 'Asya & Kafkasya' },
  'Türkmenistan': { id: 'TKM', atlasName: 'Turkmenistan', en: 'Turkmenistan', region: 'Asya & Kafkasya' },
  'Ukrayna': { id: 'UKR', atlasName: 'Ukraine', en: 'Ukraine', region: 'Avrupa' },
  'Umman': { id: 'OMN', atlasName: 'Oman', en: 'Oman', region: 'Orta Doğu' },
  'Ürdün': { id: 'JOR', atlasName: 'Jordan', en: 'Jordan', region: 'Orta Doğu' },
  'Yeni Zelanda': { id: 'NZL', atlasName: 'New Zealand', en: 'New Zealand', region: 'Okyanusya' },
  'Yunanistan': { id: 'GRC', atlasName: 'Greece', en: 'Greece', region: 'Avrupa' },
};

const PARTY_PATTERNS = [
  { key: 'AKP', test: (cell) => /\bAK Parti\b|Adalet ve Kalkınma Partisi/i.test(cell) },
  { key: 'CHP', test: (cell) => /\bCHP\b|Cumhuriyet Halk Partisi/i.test(cell) },
  { key: 'MHP', test: (cell) => /\bMHP\b|Milliyetçi Hareket Partisi/i.test(cell) },
  { key: 'IYI', test: (cell) => /İYİ\s*P\.|İYİ Parti/i.test(cell) },
  { key: 'DEM', test: (cell) => /\bYSP\b|Yeşiller ve Sol/i.test(cell) },
  { key: 'TIP', test: (cell) => /\bTİP\b|Türkiye İşçi Partisi/i.test(cell) },
  { key: 'YRP', test: (cell) => /\bYRP\b|Yeniden Refah Partisi/i.test(cell) },
  { key: 'ZP', test: (cell) => /\bZAFER\b|Zafer Partisi/i.test(cell) },
  { key: 'BBP', test: (cell) => /\bBBP\b|Büyük Birlik Partisi/i.test(cell) },
];

function parseParliamentaryTable(tableText) {
  const rows = tableText.split(/\|-[^\n]*/);
  let registeredVoters = 0;
  let validVotes = 0;
  let invalidVotes = 0;
  let turnout = 0;
  const partyVotes = {
    AKP: 0,
    CHP: 0,
    MHP: 0,
    IYI: 0,
    DEM: 0,
    YRP: 0,
    ZP: 0,
    TIP: 0,
    BBP: 0,
    A: 0,
    YENI: 0,
    SAADET: 0,
    OTHER: 0,
  };

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const lines = row
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('|') || l.startsWith('!'));

    // Registered voters row appears immediately after header row with "Toplam seçmen sayısı"
    if (row.includes('Toplam seçmen sayısı') && idx + 1 < rows.length) {
      const nextLines = rows[idx + 1]
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.startsWith('|'));
      if (nextLines[0]) {
        const val = nextLines[0].split('|').pop();
        registeredVoters = Math.round(parseTrNum(val));
      }
      continue;
    }

    if (row.includes("'''Toplam'''")) {
      const dataLines = lines.filter((l) => l.startsWith('|'));
      if (dataLines[0]) {
        validVotes = Math.round(parseTrNum(dataLines[0].replace(/^\|/, '')));
      }
      continue;
    }

    if (row.includes('Geçersiz ya da boş')) {
      const dataLine = lines.find((l) => l.startsWith('|'));
      if (dataLine) invalidVotes = Math.round(parseTrNum(dataLine.split('|').pop()));
      continue;
    }

    if (row.includes('Katılım oranı')) {
      const dataLine = lines.find((l) => l.startsWith('|'));
      if (dataLine) turnout = parsePctStr(dataLine.split('|').pop());
      continue;
    }

    // Standard party row: find party match in lines, then grab first numeric vote cell
    const matchedParty = PARTY_PATTERNS.find((p) => lines.some((l) => p.test(l)));
    if (matchedParty) {
      const partyLineIdx = lines.findIndex((l) => matchedParty.test(l));
      for (let j = partyLineIdx + 1; j < lines.length; j++) {
        const rawCell = lines[j].replace(/^\|/, '').trim();
        if (!rawCell || rawCell.includes('yüzde') || rawCell.includes('%') || rawCell.includes('rowspan')) {
          continue;
        }
        const n = parseTrNum(rawCell);
        if (n >= 0 && /^\d[\d.]*$/.test(rawCell.replace(/\s+/g, ''))) {
          partyVotes[matchedParty.key] = Math.round(n);
          break;
        }
      }
    }
  }

  const majorSum =
    partyVotes.AKP +
    partyVotes.CHP +
    partyVotes.MHP +
    partyVotes.IYI +
    partyVotes.DEM +
    partyVotes.YRP +
    partyVotes.ZP +
    partyVotes.TIP +
    partyVotes.BBP;

  if (validVotes < majorSum) validVotes = majorSum;
  partyVotes.OTHER = Math.max(0, validVotes - majorSum);

  if (turnout <= 0 && registeredVoters > 0) {
    turnout = Number((((validVotes + invalidVotes) / registeredVoters) * 100).toFixed(2));
  }

  const validVoteRatio =
    validVotes + invalidVotes > 0
      ? Number(((validVotes / (validVotes + invalidVotes)) * 100).toFixed(2))
      : 98.4;

  const partyShares = {};
  for (const k of Object.keys(partyVotes)) {
    partyShares[k] = validVotes > 0 ? Number(((partyVotes[k] / validVotes) * 100).toFixed(3)) : 0;
  }

  return { registeredVoters, validVotes, invalidVotes, turnout, validVoteRatio, partyVotes, partyShares };
}

function main() {
  const wikiAbroadRaw = fs.readFileSync(WIKI_ABROAD_PATH, 'utf8').replace(/^\uFEFF/, '');
  const wtAbroad = JSON.parse(wikiAbroadRaw).parse.wikitext['*'];

  const wikiGumrukRaw = fs.readFileSync(WIKI_GUMRUK_PATH, 'utf8').replace(/^\uFEFF/, '');
  const wtGumruk = JSON.parse(wikiGumrukRaw).parse.wikitext['*'];

  const sectionRe = /^===\s*\{\{bayraksimge\|[^}]+\}\}\s*\[\[([^\]]+)\]\]\s*===$/gm;
  const matches = [...wtAbroad.matchAll(sectionRe)];
  const countries = [];

  for (let i = 0; i < matches.length; i++) {
    const trName = matches[i][1].split('|')[0].trim();
    const meta = COUNTRY_META[trName];
    if (!meta) {
      throw new Error(`Missing COUNTRY_META mapping for: ${trName}`);
    }
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : wtAbroad.indexOf('== Kaynakça ==');
    const secText = wtAbroad.slice(start, end);
    const firstTableMatch = secText.match(/\{\{Seçim tablosu\}\}([\s\S]*?)\|\}/);
    if (!firstTableMatch) {
      throw new Error(`Could not find parliamentary table for: ${trName}`);
    }
    const parsed = parseParliamentaryTable(firstTableMatch[1]);
    countries.push({
      id: meta.id,
      atlasName: meta.atlasName,
      nameTr: trName === 'Amerika Birleşik Devletleri' ? 'ABD' : trName === 'Kuzey Kıbrıs Türk Cumhuriyeti' ? 'KKTC' : trName === 'Birleşik Arap Emirlikleri' ? 'BAE' : trName,
      fullNameTr: trName,
      nameEn: meta.en,
      region: meta.region,
      isCustoms: false,
      isInset: meta.id === 'KKTC',
      ...parsed,
    });
  }

  // Parse Gümrük Kapıları aggregate table
  const gumrukSection = wtGumruk.slice(
    wtGumruk.indexOf('== Toplu sonuçlar =='),
    wtGumruk.indexOf('==Karayolları')
  );
  const gumrukTable = gumrukSection.match(/\{\{Seçim tablosu\}\}([\s\S]*?)\|\}/);
  if (!gumrukTable) throw new Error('Could not parse Gümrük table');
  const parsedGumruk = parseParliamentaryTable(gumrukTable[1]);
  countries.push({
    id: 'CUSTOMS',
    atlasName: null,
    nameTr: 'Gümrük Kapıları',
    fullNameTr: '46 Gümrük Kapısı (Sınır & Havalimanı)',
    nameEn: 'Customs Gates (46 Ports)',
    region: 'Gümrük',
    isCustoms: true,
    isInset: true,
    registeredVoters: 0, // Customs voters draw from the abroad voter pool at border ports
    turnout: parsedGumruk.turnout,
    validVoteRatio: parsedGumruk.validVoteRatio,
    validVotes: parsedGumruk.validVotes,
    invalidVotes: parsedGumruk.invalidVotes,
    partyVotes: parsedGumruk.partyVotes,
    partyShares: parsedGumruk.partyShares,
  });

  // Sort countries descending by validVotes
  countries.sort((a, b) => b.validVotes - a.validVotes);

  // Write abroadCountries2023.json
  const outCountriesPath = path.join(ROOT, 'src', 'data', 'abroadCountries2023.json');
  fs.writeFileSync(outCountriesPath, JSON.stringify(countries, null, 2), 'utf8');

  // Build compact public/world-countries.geojson from 110m + 50m microstates (Singapore, Malta, Bahrain)
  const geo110 = topojson.feature(t110, t110.objects.countries);
  const geo50 = topojson.feature(t50, t50.objects.countries);

  const metaByAtlasName = new Map();
  for (const c of countries) {
    if (c.atlasName) metaByAtlasName.set(c.atlasName, c);
  }

  const features = [];
  const seenAtlasNames = new Set();

  for (const f of geo110.features) {
    const atlasName = f.properties?.name || '';
    if (atlasName === 'Antarctica') continue;
    seenAtlasNames.add(atlasName);
    const meta = metaByAtlasName.get(atlasName);
    features.push({
      type: 'Feature',
      properties: {
        id: meta ? meta.id : `ISO_${f.id || atlasName.replace(/\s+/g, '_')}`,
        name: atlasName,
        nameTr: meta ? meta.nameTr : atlasName,
        nameEn: meta ? meta.nameEn : atlasName,
        isTurkey: atlasName === 'Turkey',
        isBallotCountry: Boolean(meta),
      },
      geometry: roundGeometry(f.geometry),
    });
  }

  // Pull tiny island/city-state YSK countries missing from 110m (Singapore, Malta, Bahrain) from 50m
  for (const tinyName of ['Singapore', 'Malta', 'Bahrain']) {
    if (seenAtlasNames.has(tinyName)) continue;
    const f50 = geo50.features.find((f) => f.properties?.name === tinyName);
    if (!f50) throw new Error(`Missing 50m feature for ${tinyName}`);
    const meta = metaByAtlasName.get(tinyName);
    features.push({
      type: 'Feature',
      properties: {
        id: meta.id,
        name: tinyName,
        nameTr: meta.nameTr,
        nameEn: meta.nameEn,
        isTurkey: false,
        isBallotCountry: true,
      },
      geometry: roundGeometry(f50.geometry),
    });
    seenAtlasNames.add(tinyName);
  }

  // Verify every non-customs country has a GeoJSON feature
  const missingGeo = countries.filter((c) => !c.isCustoms && !seenAtlasNames.has(c.atlasName));
  if (missingGeo.length > 0) {
    throw new Error(`Countries missing from GeoJSON: ${missingGeo.map((c) => c.nameTr + '/' + c.atlasName).join(', ')}`);
  }

  const worldGeoOut = path.join(ROOT, 'public', 'world-countries.geojson');
  fs.writeFileSync(worldGeoOut, JSON.stringify({ type: 'FeatureCollection', features }), 'utf8');

  // Summary stats
  const totalReg = countries.reduce((s, c) => s + c.registeredVoters, 0);
  const totalValid = countries.reduce((s, c) => s + c.validVotes, 0);
  const aggVotes = {};
  for (const k of Object.keys(countries[0].partyVotes)) {
    aggVotes[k] = countries.reduce((s, c) => s + (c.partyVotes[k] || 0), 0);
  }
  console.log(`Built ${countries.length} abroad units (73 countries + CUSTOMS).`);
  console.log(`Total registeredVoters=${totalReg}, totalValidVotes=${totalValid}`);
  console.log('Aggregate shares (%):');
  for (const [k, v] of Object.entries(aggVotes)) {
    console.log(`  ${k}: ${((v / totalValid) * 100).toFixed(2)}% (${v})`);
  }
  console.log(
    `world-countries.geojson: ${features.length} features (${(fs.statSync(worldGeoOut).size / 1024).toFixed(1)} KB)`
  );
}

main();
