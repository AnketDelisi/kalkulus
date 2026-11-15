import React, { useState } from 'react';
import {
  GitMerge,
  Landmark,
  Plus,
  Shield,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import baseline2023Raw from '../data/baseline2023.json';
import { translations } from '../i18n/translations';
import { useElectionStore } from '../store/useElectionStore';
import { BaselineDataset, BaselineId, DHondtMode, SwingMode } from '../types/election';
import { formatPct } from '../utils/format';

const BASELINE_2023 = baseline2023Raw as unknown as BaselineDataset;

interface AllianceAndRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AllianceAndRulesModal: React.FC<AllianceAndRulesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    lang,
    baselineId,
    swingMode,
    dhondtMode,
    thresholdPct,
    parties,
    alliances,
    jointListRules,
    projection,
    setBaselineId,
    setSwingMode,
    setDHondtMode,
    setThresholdPct,
    addCustomParty,
    updatePartyConfig,
    addAlliance,
    addJointListRule,
    updateJointListRule,
    removeJointListRule,
    updateDistrictMpCount,
  } = useElectionStore();

  const [activeTab, setActiveTab] = useState<'parties' | 'joint' | 'seats'>('parties');

  const [newPartyShort, setNewPartyShort] = useState('');
  const [newPartyFull, setNewPartyFull] = useState('');
  const [newPartyColor, setNewPartyColor] = useState('#14b8a6');
  const [newPartyAlliance, setNewPartyAlliance] = useState<string>('');

  const [newAllianceShort, setNewAllianceShort] = useState('');
  const [newAllianceName, setNewAllianceName] = useState('');
  const [newAllianceColor, setNewAllianceColor] = useState('#f97316');

  const [jlSource, setJlSource] = useState('TIP');
  const [jlTarget, setJlTarget] = useState('DEM');
  const [jlDistrictMode, setJlDistrictMode] = useState<'ALL' | 'SMALL' | 'CUSTOM'>('SMALL');
  const [jlMaxMp, setJlMaxMp] = useState(5);
  const [jlCustomDistricts, setJlCustomDistricts] = useState('06-1, 34-1');
  const [jlEfficiency, setJlEfficiency] = useState(90);
  const [jlReserved, setJlReserved] = useState(0);

  if (!isOpen) return null;
  const t = translations[lang];

  return (
    <div className="fixed inset-0 z-50 bg-[#090A0F]/70 flex items-center justify-center p-4">
      <div className="studio-panel w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#090A0F] text-white">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-[#00F5D4]" />
            <h2 className="text-title font-bold">
              {t.rulesAndAlliancesBtn}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-white/25 hover:bg-white hover:text-[#090A0F] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Electoral System Parameters Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-3.5 bg-[#F4F5F7] border-b-[1.5px] border-[#090A0F] text-body">
          <div>
            <label className="block eyebrow mb-1">
              {lang === 'tr' ? 'Baz seçim verisi' : 'Baseline election'}
            </label>
            <select
              value={baselineId}
              onChange={(e) => setBaselineId(e.target.value as BaselineId)}
              className="w-full studio-input px-2 py-1.5 text-body font-medium"
            >
              <option value="2023_general">{t.baseline2023}</option>
              <option value="2024_local">{t.baseline2024}</option>
              <option value="custom">{t.baselineCustom}</option>
            </select>
          </div>

          <div>
            <label className="block eyebrow mb-1">
              {lang === 'tr' ? 'Swing modeli' : 'Swing model'}
            </label>
            <select
              value={swingMode}
              onChange={(e) => setSwingMode(e.target.value as SwingMode)}
              className="w-full studio-input px-2 py-1.5 text-body font-medium"
            >
              <option value="proportional">{t.swingProportional}</option>
              <option value="uniform">{t.swingUniform}</option>
            </select>
          </div>

          <div>
            <label className="block eyebrow mb-1">
              {lang === 'tr' ? "D'Hondt sistemi" : "D'Hondt system"}
            </label>
            <select
              value={dhondtMode}
              onChange={(e) => setDHondtMode(e.target.value as DHondtMode)}
              className="w-full studio-input px-2 py-1.5 text-body font-medium"
            >
              <option value="2022_separate">{t.dhondt2022}</option>
              <option value="2018_alliance">{t.dhondt2018}</option>
            </select>
          </div>

          <div>
            <label className="block eyebrow mb-1">
              {t.thresholdLabel} (%)
            </label>
            <input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={thresholdPct}
              onChange={(e) => setThresholdPct(parseFloat(e.target.value) || 0)}
              className="w-full studio-input px-2.5 py-1.5 font-bold"
            />
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex gap-2 px-5 py-2.5 bg-white border-b-[1.5px] border-[#090A0F] text-body font-bold">
          <button
            onClick={() => setActiveTab('parties')}
            className={`studio-btn px-3 py-1.5 ${
              activeTab === 'parties' ? 'studio-btn-primary' : ''
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{lang === 'tr' ? 'Partiler ve ittifaklar' : 'Parties & alliances'}</span>
          </button>
          <button
            onClick={() => setActiveTab('joint')}
            className={`studio-btn px-3 py-1.5 ${
              activeTab === 'joint' ? 'studio-btn-primary' : ''
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>{t.jointListsTitle}</span>
          </button>
          <button
            onClick={() => setActiveTab('seats')}
            className={`studio-btn px-3 py-1.5 ${
              activeTab === 'seats' ? 'studio-btn-primary' : ''
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>
              {lang === 'tr'
                ? `87 seçim çevresi MV (${projection.totalSeatsAllocated} MV)`
                : `87 district MPs (${projection.totalSeatsAllocated} MPs)`}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-body flex-1 bg-white">
          {activeTab === 'parties' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Party Alliance Assignment & Colors */}
              <div className="bg-[#F4F5F7] border-[1.5px] border-[#090A0F] p-4 space-y-3">
                <h3 className="text-title font-bold text-[#090A0F]">
                  {lang === 'tr' ? 'Parti ittifak atamaları ve renkler' : 'Party alliances & colors'}
                </h3>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {parties
                    .filter((p) => !p.isOther)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 bg-white border border-[#090A0F] px-3 py-2"
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="color"
                            value={p.color}
                            onChange={(e) => updatePartyConfig(p.id, { color: e.target.value })}
                            className="w-6 h-6 border border-[#090A0F] cursor-pointer"
                          />
                          <div>
                            <div className="font-bold text-[#090A0F]">{p.shortName}</div>
                            <div className="text-micro text-slate-500">{p.fullName}</div>
                            {p.proxyWeights && Object.keys(p.proxyWeights).length > 0 && (
                              <div className="text-micro text-slate-500 mt-0.5">
                                {lang === 'tr' ? 'Vekil dağılım' : 'Proxy'}:{' '}
                                {Object.entries(p.proxyWeights)
                                  .map(([dId, w]) => {
                                    const dName =
                                      parties.find((x) => x.id === dId)?.shortName || dId;
                                    return `${formatPct(w * 100, lang, 0)} ${dName}`;
                                  })
                                  .join(' + ')}
                              </div>
                            )}
                          </div>
                        </div>

                        <select
                          value={p.allianceId || ''}
                          onChange={(e) =>
                            updatePartyConfig(p.id, {
                              allianceId: e.target.value ? e.target.value : null,
                            })
                          }
                          className="studio-input px-2.5 py-1 text-body"
                        >
                          <option value="">{lang === 'tr' ? 'Bağımsız (ittifaksız)' : 'Independent'}</option>
                          {alliances.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                </div>
              </div>

              {/* Add Custom Party & Add New Alliance */}
              <div className="space-y-4">
                <div className="bg-[#F4F5F7] border-[1.5px] border-[#090A0F] p-4 space-y-3">
                  <h3 className="text-title font-bold text-[#090A0F]">
                    {t.addCustomParty}
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Kısa ad (örn: DEVA)"
                      value={newPartyShort}
                      onChange={(e) => setNewPartyShort(e.target.value)}
                      className="studio-input px-2.5 py-1.5"
                    />
                    <input
                      type="text"
                      placeholder="Tam parti adı"
                      value={newPartyFull}
                      onChange={(e) => setNewPartyFull(e.target.value)}
                      className="studio-input px-2.5 py-1.5"
                    />
                    <select
                      value={newPartyAlliance}
                      onChange={(e) => setNewPartyAlliance(e.target.value)}
                      className="studio-input px-2.5 py-1.5"
                    >
                      <option value="">İttifaksız</option>
                      {alliances.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={newPartyColor}
                        onChange={(e) => setNewPartyColor(e.target.value)}
                        className="w-8 h-8 border border-[#090A0F] cursor-pointer"
                      />
                      <button
                        onClick={() => {
                          if (!newPartyShort.trim()) return;
                          addCustomParty(
                            newPartyShort.trim(),
                            newPartyFull.trim() || newPartyShort.trim(),
                            newPartyColor,
                            newPartyAlliance || null
                          );
                          setNewPartyShort('');
                          setNewPartyFull('');
                        }}
                        className="studio-btn studio-btn-primary px-3 py-1.5 flex-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{lang === 'tr' ? 'Parti ekle' : 'Add party'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-[#F4F5F7] border-[1.5px] border-[#090A0F] p-4 space-y-3">
                  <h3 className="text-title font-bold text-[#090A0F]">
                    {lang === 'tr' ? 'Yeni ittifak oluştur' : 'Create new alliance'}
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Kısa kod (örn: MERKEZ)"
                      value={newAllianceShort}
                      onChange={(e) => setNewAllianceShort(e.target.value)}
                      className="studio-input px-2.5 py-1.5"
                    />
                    <input
                      type="text"
                      placeholder="İttifak tam adı"
                      value={newAllianceName}
                      onChange={(e) => setNewAllianceName(e.target.value)}
                      className="studio-input px-2.5 py-1.5"
                    />
                    <div className="col-span-2 flex items-center gap-2">
                      <input
                        type="color"
                        value={newAllianceColor}
                        onChange={(e) => setNewAllianceColor(e.target.value)}
                        className="w-8 h-8 border border-[#090A0F] cursor-pointer"
                      />
                      <button
                        onClick={() => {
                          if (!newAllianceShort.trim()) return;
                          addAlliance(
                            newAllianceName.trim() || newAllianceShort.trim(),
                            newAllianceShort.trim().toUpperCase(),
                            newAllianceColor
                          );
                          setNewAllianceShort('');
                          setNewAllianceName('');
                        }}
                        className="studio-btn studio-btn-primary px-3 py-1.5 flex-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{lang === 'tr' ? 'İttifak ekle' : 'Add alliance'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'joint' && (
            <div className="space-y-4">
              <div className="bg-[#F4F5F7] border-[1.5px] border-[#090A0F] p-4 space-y-3">
                <h3 className="text-title font-bold text-[#090A0F]">
                  {lang === 'tr'
                    ? 'Ortak aday listesi ve taktik oy transferi ekle'
                    : 'Add joint candidate list / tactical vote transfer'}
                </h3>
                <p className="text-slate-600">
                  Belirli seçim çevrelerinde bir partinin seçime ayrı liste yerine başka bir partinin
                  listesinden girmesini ve seçilen kontenjan vekillerinin aktarılmasını simüle eder.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block eyebrow mb-1">
                      {lang === 'tr' ? 'Çekilen / misafir parti' : 'Guest party'}
                    </label>
                    <select
                      value={jlSource}
                      onChange={(e) => setJlSource(e.target.value)}
                      className="w-full studio-input px-2.5 py-1.5"
                    >
                      {parties
                        .filter((p) => !p.isOther)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.shortName} - {p.fullName}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block eyebrow mb-1">
                      {lang === 'tr' ? 'Çatı / ev sahibi parti' : 'Host list party'}
                    </label>
                    <select
                      value={jlTarget}
                      onChange={(e) => setJlTarget(e.target.value)}
                      className="w-full studio-input px-2.5 py-1.5"
                    >
                      {parties
                        .filter((p) => !p.isOther)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.shortName} - {p.fullName}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block eyebrow mb-1">
                      {lang === 'tr' ? 'Oy geçiş verimi (%)' : 'Vote transfer efficiency (%)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={jlEfficiency}
                      onChange={(e) => setJlEfficiency(parseInt(e.target.value, 10) || 0)}
                      className="w-full studio-input px-2.5 py-1.5"
                    />
                  </div>

                  <div>
                    <label className="block eyebrow mb-1">
                      {lang === 'tr' ? 'Uygulanacak seçim çevreleri' : 'Target districts'}
                    </label>
                    <select
                      value={jlDistrictMode}
                      onChange={(e) => setJlDistrictMode(e.target.value as any)}
                      className="w-full studio-input px-2.5 py-1.5"
                    >
                      <option value="SMALL">Küçük seçim çevrelerinde (MV sayısına göre)</option>
                      <option value="ALL">Tüm 87 seçim çevresinde</option>
                      <option value="CUSTOM">Belirli seçim çevrelerinde (kod ile)</option>
                    </select>
                  </div>

                  {jlDistrictMode === 'SMALL' && (
                    <div>
                      <label className="block eyebrow mb-1">
                        {lang === 'tr' ? 'En fazla MV sayısı (≤ N MV)' : 'Max district MPs (≤ N)'}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={36}
                        value={jlMaxMp}
                        onChange={(e) => setJlMaxMp(parseInt(e.target.value, 10) || 5)}
                        className="w-full studio-input px-2.5 py-1.5"
                      />
                    </div>
                  )}

                  {jlDistrictMode === 'CUSTOM' && (
                    <div>
                      <label className="block eyebrow mb-1">
                        {lang === 'tr' ? 'Bölge kodları (örn: 01, 06-1)' : 'District IDs (e.g. 01, 06-1)'}
                      </label>
                      <input
                        type="text"
                        value={jlCustomDistricts}
                        onChange={(e) => setJlCustomDistricts(e.target.value)}
                        className="w-full studio-input px-2.5 py-1.5 font-mono"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block eyebrow mb-1">
                      {lang === 'tr' ? 'Bölge başına kontenjan MV' : 'Reserved MPs per district'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={jlReserved}
                      onChange={(e) => setJlReserved(parseInt(e.target.value, 10) || 0)}
                      className="w-full studio-input px-2.5 py-1.5"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (jlSource === jlTarget) return;
                    addJointListRule({
                      enabled: true,
                      sourcePartyId: jlSource,
                      targetPartyId: jlTarget,
                      districtIds:
                        jlDistrictMode === 'ALL'
                          ? ['ALL']
                          : jlDistrictMode === 'CUSTOM'
                          ? jlCustomDistricts
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean)
                          : [],
                      maxDistrictMpThreshold: jlDistrictMode === 'SMALL' ? jlMaxMp : undefined,
                      transferEfficiency: jlEfficiency,
                      reservedSeatsPerDistrict: jlReserved,
                    });
                  }}
                  className="studio-btn studio-btn-primary px-4 py-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.addJointRule}</span>
                </button>
              </div>

              {/* Active Joint List Rules */}
              <div className="space-y-2">
                {jointListRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="bg-white border-[1.5px] border-[#090A0F] p-3 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => updateJointListRule(rule.id, { enabled: e.target.checked })}
                        className="accent-[#090A0F] w-4 h-4"
                      />
                      <span className="font-bold text-[#090A0F]">
                        {rule.sourcePartyId} → {rule.targetPartyId} {lang === 'tr' ? 'listesi' : 'list'}
                      </span>
                      <span className="text-slate-600 text-micro">
                        ({lang === 'tr' ? 'Verim' : 'Efficiency'}: {formatPct(rule.transferEfficiency, lang, 0)},{' '}
                        {lang === 'tr' ? 'Kontenjan' : 'Reserved'}: {rule.reservedSeatsPerDistrict} MV/bölge,{' '}
                        {rule.districtIds.includes('ALL')
                          ? '87 bölge'
                          : rule.maxDistrictMpThreshold
                          ? `≤${rule.maxDistrictMpThreshold} MV bölgeler`
                          : rule.districtIds.join(', ')}
                        )
                      </span>
                    </div>
                    <button
                      onClick={() => removeJointListRule(rule.id)}
                      className="studio-btn p-1.5 text-rose-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'seats' && (
            <div className="space-y-3">
              <p className="text-slate-600 text-body">
                87 seçim çevresinin çıkardığı milletvekili sayılarını YSK güncellemelerine veya özel
                senaryolara göre aşağıdan değiştirebilirsiniz.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-96 overflow-y-auto pr-1">
                {BASELINE_2023.districts.map((d) => {
                  const currentMp = projection.districtResults[d.id]?.mpCount ?? d.mpCount;
                  return (
                    <div
                      key={d.id}
                      className="bg-[#F4F5F7] border border-[#090A0F] px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <span className="font-mono text-micro text-slate-500 font-bold mr-1.5">{d.id}</span>
                        <span className="font-bold text-[#090A0F]">{d.name}</span>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={currentMp}
                        onChange={(e) =>
                          updateDistrictMpCount(d.id, parseInt(e.target.value, 10) || 1)
                        }
                        className="w-14 studio-input px-2 py-1 text-right font-bold text-[#090A0F]"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
