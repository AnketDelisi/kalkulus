import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileCode2,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';
import {
  GeoCollection,
  getCachedGeoLayer,
  loadDistricts87Geo,
  loadIlcelerGeo,
  loadProvincesGeo,
  loadWorldCountriesGeo,
} from '../../data/geoCache';
import { preloadAllPartyLogos } from '../../data/partyLogoCache';
import { useElectionStore } from '../../store/useElectionStore';
import {
  copySvgElementAsPng,
  downloadSvgElement,
  downloadSvgElementAsPng,
} from '../../utils/svgExport';
import { InfographicSvgCanvas } from './InfographicSvgCanvas';
import {
  buildDefaultInfographicTexts,
  buildInfographicDataModel,
} from './infographicData';
import {
  InfographicAspect,
  InfographicConfig,
  InfographicGrouping,
  InfographicMapColor,
  InfographicMapLayer,
  InfographicTemplate,
  InfographicTheme,
} from './infographicTypes';

export const InfographicStudio: React.FC = () => {
  const {
    lang,
    electionMode,
    parties,
    alliances,
    projection,
    official2023Projection,
    presCandidates,
    presRoundView,
    presidentialProjection,
    localProjection,
    localDefections,
  } = useElectionStore();

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [provincesGeo, setProvincesGeo] = useState<GeoCollection | null>(() =>
    getCachedGeoLayer('provinces')
  );
  const [districts87Geo, setDistricts87Geo] = useState<GeoCollection | null>(() =>
    getCachedGeoLayer('districts87')
  );
  const [ilcelerGeo, setIlcelerGeo] = useState<GeoCollection | null>(() =>
    getCachedGeoLayer('ilceler')
  );
  const [worldGeo, setWorldGeo] = useState<GeoCollection | null>(() =>
    getCachedGeoLayer('world')
  );
  const [logosLoadedTick, setLogosLoadedTick] = useState(0);

  const initialTexts = useMemo(
    () =>
      buildDefaultInfographicTexts(
        electionMode,
        presRoundView,
        localProjection.referenceBaseline,
        lang
      ),
    [electionMode, presRoundView, localProjection.referenceBaseline, lang]
  );

  const [config, setConfig] = useState<InfographicConfig>(() => ({
    template: 'wiki_sheet',
    theme: 'wiki_light',
    aspect: '16:10',
    grouping: 'party',
    mapLayer: electionMode === 'parliamentary' ? '87_district' : '81_il',
    mapColorMode: 'leader',
    spotlightProvinceId: '34',
    minVoteCutoffPct: 0.5,
    showMap: true,
    showSeatCircles: true,
    showPartyLogos: true,
    showVisualSummary: true,
    showTable: true,
    showDeltaColumn: true,
    showSeatBars: true,
    showWatermark: true,
    title: initialTexts.title,
    subtitle: initialTexts.subtitle,
    footerNote: initialTexts.footerNote,
  }));

  const [exportScale, setExportScale] = useState<1 | 2 | 3>(2);
  const [copiedBanner, setCopiedBanner] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Preload SVG party logos into base64 cache so Canvas PNG & SVG export stay crisp
  useEffect(() => {
    void preloadAllPartyLogos(parties).then(() => {
      setLogosLoadedTick((t) => t + 1);
    });
  }, [parties]);

  // Auto-sync title/subtitle/layer defaults when election mode or round changes cleanly
  useEffect(() => {
    const texts = buildDefaultInfographicTexts(
      electionMode,
      presRoundView,
      localProjection.referenceBaseline,
      lang
    );
    setConfig((prev) => ({
      ...prev,
      title: texts.title,
      subtitle: texts.subtitle,
      footerNote: texts.footerNote,
      mapLayer:
        electionMode === 'parliamentary'
          ? prev.mapLayer
          : electionMode === 'local' && prev.mapLayer === 'abroad_world'
          ? '81_il'
          : prev.mapLayer === '87_district'
          ? '81_il'
          : prev.mapLayer,
    }));
  }, [electionMode, presRoundView, localProjection.referenceBaseline, lang]);

  // Lazy-fetch required GeoJSON boundaries from shared cache
  useEffect(() => {
    if (!provincesGeo) {
      loadProvincesGeo()
        .then(setProvincesGeo)
        .catch(() => {});
    }
    if (
      electionMode === 'parliamentary' &&
      (config.mapLayer === '87_district' || config.mapLayer === 'dual_il_ilce') &&
      !districts87Geo
    ) {
      loadDistricts87Geo()
        .then(setDistricts87Geo)
        .catch(() => {});
    }
    if (
      (config.mapLayer === '973_ilce' ||
        config.mapLayer === 'dual_il_ilce' ||
        config.template === 'province_spotlight') &&
      !ilcelerGeo
    ) {
      loadIlcelerGeo()
        .then(setIlcelerGeo)
        .catch(() => {});
    }
    if (electionMode !== 'local' && config.mapLayer === 'abroad_world' && !worldGeo) {
      loadWorldCountriesGeo()
        .then(setWorldGeo)
        .catch(() => {});
    }
  }, [
    electionMode,
    config.mapLayer,
    config.template,
    provincesGeo,
    districts87Geo,
    ilcelerGeo,
    worldGeo,
  ]);

  const dataModel = useMemo(
    () =>
      buildInfographicDataModel({
        config,
        lang,
        electionMode,
        parties,
        alliances,
        projection,
        baselineProjection: official2023Projection,
        presCandidates,
        presRoundView,
        presidentialProjection,
        localProjection,
        localDefections,
      }),
    [
      config,
      lang,
      electionMode,
      parties,
      alliances,
      projection,
      official2023Projection,
      presCandidates,
      presRoundView,
      presidentialProjection,
      localProjection,
      localDefections,
    ]
  );

  const provinceList = useMemo(
    () =>
      Object.values(projection.provinceResults)
        .map((p) => ({ id: p.id, name: p.name }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    [projection.provinceResults]
  );

  const handleSelectTemplate = (template: InfographicTemplate) => {
    setConfig((prev) => ({
      ...prev,
      template,
      aspect:
        template === 'social_card'
          ? '4:5'
          : prev.aspect === '4:5' || prev.aspect === '1:1'
          ? '16:10'
          : prev.aspect,
    }));
  };

  const handleSyncTexts = () => {
    const texts = buildDefaultInfographicTexts(
      electionMode,
      presRoundView,
      localProjection.referenceBaseline,
      lang
    );
    setConfig((prev) => ({ ...prev, ...texts }));
  };

  const exportBg = config.theme === 'kalkulus_dark' ? '#090A0F' : '#FFFFFF';
  const slugBase = `kalkulus-${electionMode}-${config.template}`;

  const handleDownloadPng = async () => {
    if (!svgRef.current) return;
    setIsExporting(true);
    try {
      await downloadSvgElementAsPng(svgRef.current, `${slugBase}-${exportScale}x.png`, exportScale, exportBg);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    downloadSvgElement(svgRef.current, `${slugBase}.svg`);
  };

  const handleCopyClipboard = async () => {
    if (!svgRef.current) return;
    setIsExporting(true);
    try {
      const ok = await copySvgElementAsPng(svgRef.current, exportScale, exportBg);
      if (ok) {
        setCopiedBanner(true);
        setTimeout(() => setCopiedBanner(false), 2000);
      }
    } catch {
      // Fallback: silent no-op if clipboard API restricted
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
      {/* Left Studio Controls Column (reordered below preview on mobile) */}
      <div className="order-2 lg:order-1 lg:col-span-4 studio-panel p-4 sm:p-5 space-y-5">
        <div className="border-b-[1.5px] border-[#090A0F] pb-3 flex items-center justify-between">
          <div>
            <div className="eyebrow">{lang === 'tr' ? 'Görsel Üretimi' : 'Graphic Generator'}</div>
            <h2 className="text-heading font-bold text-[#090A0F]">
              {lang === 'tr' ? 'İnfografik Stüdyo' : 'Infographic Studio'}
            </h2>
          </div>
          <ImageIcon className="w-5 h-5 text-[#090A0F]" />
        </div>

        {/* Template Picker */}
        <div>
          <label className="block text-micro font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            {lang === 'tr' ? 'Şablon Düzeni' : 'Template Layout'}
          </label>
          <div className="grid grid-cols-3 border-[1.5px] border-[#090A0F] text-micro font-bold">
            {(
              [
                ['wiki_sheet', lang === 'tr' ? 'Tam Sayfa' : 'Full Sheet'],
                ['social_card', lang === 'tr' ? 'Sosyal Kart' : 'Social Card'],
                ['province_spotlight', lang === 'tr' ? 'İl Sonucu' : 'Province'],
              ] as [InfographicTemplate, string][]
            ).map(([tId, label], idx) => (
              <button
                key={tId}
                onClick={() => handleSelectTemplate(tId)}
                className={`py-2 px-1.5 text-center transition-colors ${
                  idx > 0 ? 'border-l border-[#090A0F]' : ''
                } ${
                  config.template === tId
                    ? 'bg-[#090A0F] text-white'
                    : 'bg-white text-[#090A0F] hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Aspect Ratio + Color Theme */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-micro font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              {lang === 'tr' ? 'En-Boy Oranı' : 'Aspect Ratio'}
            </label>
            <select
              value={config.aspect}
              onChange={(e) => setConfig((p) => ({ ...p, aspect: e.target.value as InfographicAspect }))}
              className="w-full studio-input border-[#090A0F] px-2.5 py-1.5 text-body font-medium"
            >
              <option value="16:10">16:10 (1600×1000)</option>
              <option value="16:9">16:9 (1600×900 · X/Web)</option>
              <option value="4:5">4:5 (1200×1500 · Portre)</option>
              <option value="1:1">1:1 (1200×1200 · Kare)</option>
            </select>
          </div>

          <div>
            <label className="block text-micro font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              {lang === 'tr' ? 'Renk Teması' : 'Theme'}
            </label>
            <select
              value={config.theme}
              onChange={(e) => setConfig((p) => ({ ...p, theme: e.target.value as InfographicTheme }))}
              className="w-full studio-input border-[#090A0F] px-2.5 py-1.5 text-body font-medium"
            >
              <option value="wiki_light">{lang === 'tr' ? 'Açık' : 'Light'}</option>
              <option value="kalkulus_dark">{lang === 'tr' ? 'Koyu' : 'Dark'}</option>
            </select>
          </div>
        </div>

        {/* Map Layer & Color Mode (or Spotlight Province) */}
        <div className="grid grid-cols-2 gap-3">
          {config.template === 'province_spotlight' ? (
            <div className="col-span-2">
              <label className="block text-micro font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                {lang === 'tr' ? 'İl Seçimi (İl Sonucu & İlçe Haritası)' : 'Select Province'}
              </label>
              <select
                value={config.spotlightProvinceId}
                onChange={(e) => setConfig((p) => ({ ...p, spotlightProvinceId: e.target.value }))}
                className="w-full studio-input border-[#090A0F] px-2.5 py-1.5 text-body font-medium"
              >
                {provinceList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id} · {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-micro font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                {lang === 'tr' ? 'Harita Katmanı' : 'Map Layer'}
              </label>
              <select
                value={config.mapLayer}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    mapLayer: e.target.value as InfographicMapLayer,
                  }))
                }
                className="w-full studio-input border-[#090A0F] px-2.5 py-1.5 text-body font-medium"
              >
                {electionMode === 'parliamentary' && (
                  <option value="87_district">
                    {lang === 'tr' ? '87 Seçim Çevresi' : '87 Districts'}
                  </option>
                )}
                <option value="81_il">{lang === 'tr' ? '81 İl' : '81 Provinces'}</option>
                <option value="973_ilce">{lang === 'tr' ? '973 İlçe' : '973 Sub-districts'}</option>
                <option value="dual_il_ilce">
                  {lang === 'tr' ? 'İl + 973 İlçe (İkili)' : 'Province + District (Dual)'}
                </option>
                {electionMode !== 'local' && (
                  <option value="abroad_world">
                    {lang === 'tr' ? 'Yurt Dışı (Dünya)' : 'Abroad (World)'}
                  </option>
                )}
              </select>
            </div>
          )}

          <div className={config.template === 'province_spotlight' ? 'col-span-2' : ''}>
            <label className="block text-micro font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              {lang === 'tr' ? 'Renklendirme' : 'Map Coloring'}
            </label>
            <select
              value={config.mapColorMode}
              onChange={(e) =>
                setConfig((p) => ({ ...p, mapColorMode: e.target.value as InfographicMapColor }))
              }
              className="w-full studio-input border-[#090A0F] px-2.5 py-1.5 text-body font-medium"
            >
              <option value="leader">{lang === 'tr' ? 'Kazanan Parti/Aday' : 'Leading Winner'}</option>
              {electionMode === 'parliamentary' && (
                <option value="alliance">{lang === 'tr' ? 'İttifak Bloğu' : 'Alliance Bloc'}</option>
              )}
              {electionMode === 'local' && (
                <option value="flips">{lang === 'tr' ? 'El Değiştirenler' : 'Flipped Only'}</option>
              )}
              <option value="margin">{lang === 'tr' ? 'Fark Şiddeti' : 'Victory Margin'}</option>
            </select>
          </div>
        </div>

        {/* Parliamentary Grouping & Cutoff Filter */}
        <div className="grid grid-cols-2 gap-3 items-end">
          {electionMode === 'parliamentary' && (
            <div>
              <label className="block text-micro font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                {lang === 'tr' ? 'Tablo / Meclis Gruplama' : 'Grouping'}
              </label>
              <select
                value={config.grouping}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, grouping: e.target.value as InfographicGrouping }))
                }
                className="w-full studio-input border-[#090A0F] px-2.5 py-1.5 text-body font-medium"
              >
                <option value="party">{lang === 'tr' ? 'Parti Bazlı' : 'By Party'}</option>
                <option value="alliance">{lang === 'tr' ? 'İttifak Blokları' : 'By Alliance'}</option>
              </select>
            </div>
          )}

          <div className={electionMode !== 'parliamentary' ? 'col-span-2' : ''}>
            <div className="flex items-center justify-between text-micro font-bold uppercase tracking-wider text-slate-600 mb-1">
              <span>{lang === 'tr' ? 'Alt Sınır (Diğer)' : 'Cutoff Filter'}</span>
              <span className="font-mono text-[#090A0F]">%{config.minVoteCutoffPct.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={3}
              step={0.5}
              value={config.minVoteCutoffPct}
              onChange={(e) =>
                setConfig((p) => ({ ...p, minVoteCutoffPct: parseFloat(e.target.value) }))
              }
              className="studio-slider w-full"
            />
          </div>
        </div>

        {/* Toggle Checkboxes */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#090A0F]/15 text-micro font-medium">
          {(
            [
              ['showMap', lang === 'tr' ? 'Harita Modülü' : 'Show Map'],
              ['showSeatCircles', lang === 'tr' ? 'MV Daireleri' : 'Seat Circles'],
              ['showPartyLogos', lang === 'tr' ? 'Parti Logoları' : 'Party Logos'],
              ['showVisualSummary', lang === 'tr' ? 'Meclis / Özet Bar' : 'Hemicycle / Bar'],
              ['showTable', lang === 'tr' ? 'Sonuç Tablosu' : 'Results Table'],
              ['showDeltaColumn', lang === 'tr' ? '± Fark Sütunu' : '± Delta Column'],
              ['showSeatBars', lang === 'tr' ? 'Tablo Çubukları' : 'Inline Bars'],
              ['showWatermark', lang === 'tr' ? 'Kalkülüs Logosu' : 'Kalkülüs Logo'],
            ] as [keyof InfographicConfig, string][]
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer select-none py-0.5">
              <input
                type="checkbox"
                checked={Boolean(config[key])}
                onChange={(e) => setConfig((p) => ({ ...p, [key]: e.target.checked }))}
                className="accent-[#090A0F] w-3.5 h-3.5"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>

        {/* Editable Labels */}
        <div className="space-y-2.5 pt-2 border-t border-[#090A0F]/15">
          <div className="flex items-center justify-between">
            <span className="text-micro font-bold uppercase tracking-wider text-slate-600">
              {lang === 'tr' ? 'Başlık Metinleri' : 'Headlines'}
            </span>
            <button
              onClick={handleSyncTexts}
              className="text-micro font-bold text-[#090A0F] inline-flex items-center gap-1 hover:underline"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{lang === 'tr' ? 'Otomatik Doldur' : 'Sync Defaults'}</span>
            </button>
          </div>
          <input
            type="text"
            value={config.title}
            onChange={(e) => setConfig((p) => ({ ...p, title: e.target.value }))}
            placeholder={lang === 'tr' ? 'Ana Başlık' : 'Headline'}
            className="w-full studio-input px-2.5 py-1.5 text-body font-bold"
          />
          <input
            type="text"
            value={config.subtitle}
            onChange={(e) => setConfig((p) => ({ ...p, subtitle: e.target.value }))}
            placeholder={lang === 'tr' ? 'Alt Başlık / Tarih' : 'Subtitle'}
            className="w-full studio-input px-2.5 py-1.5 text-body"
          />
        </div>
      </div>

      {/* Right Preview Stage & Export Toolbar */}
      <div className="order-1 lg:order-2 lg:col-span-8 flex flex-col gap-4">
        <div className="studio-panel p-3.5 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2 text-body">
            <span className="font-bold text-[#090A0F]">
              {lang === 'tr' ? 'Canlı Önizleme' : 'Live Vector Preview'}
            </span>
            <span className="px-2 py-0.5 bg-[#F4F5F7] border border-[#090A0F]/20 font-mono text-micro text-slate-700">
              {config.aspect}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex border-[1.5px] border-[#090A0F] text-micro font-mono font-bold">
              {([1, 2, 3] as const).map((s, idx) => (
                <button
                  key={s}
                  onClick={() => setExportScale(s)}
                  className={`px-2 py-1.5 transition-colors ${
                    idx > 0 ? 'border-l border-[#090A0F]' : ''
                  } ${
                    exportScale === s ? 'bg-[#090A0F] text-white' : 'bg-white text-[#090A0F] hover:bg-slate-100'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <button
              onClick={handleDownloadPng}
              disabled={isExporting}
              className="studio-btn-solid px-3 py-1.5 text-body inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{lang === 'tr' ? 'PNG İndir' : 'Download PNG'}</span>
            </button>

            <button
              onClick={handleDownloadSvg}
              className="studio-btn px-3 py-1.5 text-body"
              title={lang === 'tr' ? 'Wikimedia uyumlu vektör SVG indir' : 'Download vector SVG'}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>SVG</span>
            </button>

            <button
              onClick={handleCopyClipboard}
              disabled={isExporting}
              className="studio-btn px-3 py-1.5 text-body disabled:opacity-50"
            >
              {copiedBanner ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{lang === 'tr' ? 'Kopyalandı' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{lang === 'tr' ? 'Kopyala' : 'Copy'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* SVG Stage Container */}
        <div className="studio-panel p-4 studio-map-grid flex items-center justify-center overflow-hidden">
          <div
            className={`w-full shadow-[6px_6px_0px_rgba(9,10,15,0.16)] border border-[#090A0F] ${
              config.aspect === '4:5'
                ? 'max-w-[620px]'
                : config.aspect === '1:1'
                ? 'max-w-[700px]'
                : 'max-w-full'
            }`}
          >
            <InfographicSvgCanvas
              svgRef={svgRef}
              config={config}
              data={dataModel}
              lang={lang}
              provincesGeo={provincesGeo}
              districts87Geo={districts87Geo}
              ilcelerGeo={ilcelerGeo}
              worldGeo={worldGeo}
              logosLoadedTick={logosLoadedTick}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfographicStudio;
