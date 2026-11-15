import React, { useState } from 'react';
import {
  GitMerge,
  Landmark,
  Plus,
  Shield,
  Sliders,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import baseline2023Raw from '../data/baseline2023.json';
import { translations } from '../i18n/translations';
import { useElectionStore } from '../store/useElectionStore';
import { BaselineDataset, BaselineId, DHondtMode, SwingMode } from '../types/election';

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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="editorial-card w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-slate-800" />
            <h2 className="text-base font-bold text-slate-900">{t.rulesAndAlliancesBtn}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Electoral System Parameters Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Baz Seçim Verisi
            </label>
            <select
              value={baselineId}
              onChange={(e) => setBaselineId(e.target.value as BaselineId)}
              className="w-full editorial-input px-2 py-1.5 font-medium"
            >
              <option value="2023_general">{t.baseline2023}</option>
              <option value="2024_local">{t.baseline2024}</option>
              <option value="custom">{t.baselineCustom}</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Swing Modeli
            </label>
            <select
              value={swingMode}
              onChange={(e) => setSwingMode(e.target.value as SwingMode)}
              className="w-full editorial-input px-2 py-1.5 font-medium"
            >
              <option value="proportional">{t.swingProportional}</option>
              <option value="uniform">{t.swingUniform}</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              D’Hondt Sistemi
            </label>
            <select
              value={dhondtMode}
              onChange={(e) => setDHondtMode(e.target.value as DHondtMode)}
              className="w-full editorial-input px-2 py-1.5 font-medium"
            >
              <option value="2022_separate">{t.dhondt2022}</option>
              <option value="2018_alliance">{t.dhondt2018}</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              {t.thresholdLabel} (%)
            </label>
            <input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={thresholdPct}
              onChange={(e) => setThresholdPct(parseFloat(e.target.value) || 0)}
              className="w-full editorial-input px-2.5 py-1.5 font-mono font-semibold"
            />
          </div>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex gap-2 px-5 py-2.5 bg-white border-b border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('parties')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'parties'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Partiler & İttifaklar</span>
          </button>
          <button
            onClick={() => setActiveTab('joint')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'joint'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>{t.jointListsTitle}</span>
          </button>
          <button
            onClick={() => setActiveTab('seats')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'seats'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>87 Seçim Çevresi MV Sayıları ({projection.totalSeatsAllocated} MV)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs flex-1 bg-white">
          {activeTab === 'parties' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Party Alliance Assignment & Colors */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-slate-900">Parti İttifak Atamaları & Renkler</h3>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {parties
                    .filter((p) => !p.isOther)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="color"
                            value={p.color}
                            onChange={(e) => updatePartyConfig(p.id, { color: e.target.value })}
                            className="w-6 h-6 rounded border-0 cursor-pointer"
                          />
                          <div>
                            <div className="font-bold text-slate-900">{p.shortName}</div>
                            <div className="text-[11px] text-slate-500">{p.fullName}</div>
                          </div>
                        </div>

                        <select
                          value={p.allianceId || ''}
                          onChange={(e) =>
                            updatePartyConfig(p.id, {
                              allianceId: e.target.value ? e.target.value : null,
                            })
                          }
                          className="editorial-input px-2.5 py-1 text-xs font-medium"
                        >
                          <option value="">Bağımsız (İttifaksız)</option>
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
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <h3 className="font-bold text-slate-900">{t.addCustomParty}</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Kısa Ad (Örn: DEVA)"
                      value={newPartyShort}
                      onChange={(e) => setNewPartyShort(e.target.value)}
                      className="editorial-input px-2.5 py-1.5"
                    />
                    <input
                      type="text"
                      placeholder="Tam Parti Adı"
                      value={newPartyFull}
                      onChange={(e) => setNewPartyFull(e.target.value)}
                      className="editorial-input px-2.5 py-1.5"
                    />
                    <select
                      value={newPartyAlliance}
                      onChange={(e) => setNewPartyAlliance(e.target.value)}
                      className="editorial-input px-2.5 py-1.5"
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
                        className="w-8 h-8 rounded cursor-pointer"
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
                        className="editorial-btn editorial-btn-primary px-3 py-1.5 flex-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Parti Ekle</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <h3 className="font-bold text-slate-900">Yeni İttifak Oluştur</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Kısa Kod (Örn: MERKEZ)"
                      value={newAllianceShort}
                      onChange={(e) => setNewAllianceShort(e.target.value)}
                      className="editorial-input px-2.5 py-1.5"
                    />
                    <input
                      type="text"
                      placeholder="İttifak Tam Adı"
                      value={newAllianceName}
                      onChange={(e) => setNewAllianceName(e.target.value)}
                      className="editorial-input px-2.5 py-1.5"
                    />
                    <div className="col-span-2 flex items-center gap-2">
                      <input
                        type="color"
                        value={newAllianceColor}
                        onChange={(e) => setNewAllianceColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer"
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
                        className="editorial-btn editorial-btn-primary px-3 py-1.5 flex-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>İttifak Ekle</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'joint' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-slate-900">
                  Ortak Aday Listesi / Taktik Oy Transferi Ekle
                </h3>
                <p className="text-slate-500">
                  Belirli seçim çevrelerinde bir partinin seçime ayrı liste yerine başka bir partinin
                  listesinden girmesini ve seçilen kontenjan vekillerinin aktarılmasını simüle eder.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Çekilen / Misafir Parti
                    </label>
                    <select
                      value={jlSource}
                      onChange={(e) => setJlSource(e.target.value)}
                      className="w-full editorial-input px-2.5 py-1.5"
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
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Çatı / Ev Sahibi Liste Partisi
                    </label>
                    <select
                      value={jlTarget}
                      onChange={(e) => setJlTarget(e.target.value)}
                      className="w-full editorial-input px-2.5 py-1.5"
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
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Oy Geçiş Verimi (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={jlEfficiency}
                      onChange={(e) => setJlEfficiency(parseInt(e.target.value, 10) || 0)}
                      className="w-full editorial-input px-2.5 py-1.5 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Uygulanacak Seçim Çevreleri
                    </label>
                    <select
                      value={jlDistrictMode}
                      onChange={(e) => setJlDistrictMode(e.target.value as any)}
                      className="w-full editorial-input px-2.5 py-1.5"
                    >
                      <option value="SMALL">Küçük Seçim Çevrelerinde (MV Sayısına Göre)</option>
                      <option value="ALL">Tüm 87 Seçim Çevresinde</option>
                      <option value="CUSTOM">Belirli Seçim Çevrelerinde (Kod İle)</option>
                    </select>
                  </div>

                  {jlDistrictMode === 'SMALL' && (
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        En Fazla Kaç MV Çıkaran İller? (≤ N MV)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={36}
                        value={jlMaxMp}
                        onChange={(e) => setJlMaxMp(parseInt(e.target.value, 10) || 5)}
                        className="w-full editorial-input px-2.5 py-1.5 font-mono"
                      />
                    </div>
                  )}

                  {jlDistrictMode === 'CUSTOM' && (
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Bölge Kodları (Örn: 01, 06-1, 34-2)
                      </label>
                      <input
                        type="text"
                        value={jlCustomDistricts}
                        onChange={(e) => setJlCustomDistricts(e.target.value)}
                        className="w-full editorial-input px-2.5 py-1.5 font-mono"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Bölge Başına Garantili Kontenjan MV
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={jlReserved}
                      onChange={(e) => setJlReserved(parseInt(e.target.value, 10) || 0)}
                      className="w-full editorial-input px-2.5 py-1.5 font-mono"
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
                  className="editorial-btn editorial-btn-primary px-4 py-1.5"
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
                    className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => updateJointListRule(rule.id, { enabled: e.target.checked })}
                        className="rounded accent-slate-900 w-4 h-4"
                      />
                      <span className="font-bold text-slate-900">
                        {rule.sourcePartyId} → {rule.targetPartyId} Listesi
                      </span>
                      <span className="text-slate-500">
                        (Verim: %{rule.transferEfficiency}, Kontenjan: {rule.reservedSeatsPerDistrict} MV/bölge,{' '}
                        {rule.districtIds.includes('ALL')
                          ? '87 Bölge'
                          : rule.maxDistrictMpThreshold
                          ? `≤${rule.maxDistrictMpThreshold} MV Bölgeler`
                          : rule.districtIds.join(', ')}
                        )
                      </span>
                    </div>
                    <button
                      onClick={() => removeJointListRule(rule.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600"
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
              <p className="text-slate-500">
                87 Seçim Çevresinin çıkardığı milletvekili sayılarını YSK güncellemelerine veya özel
                senaryolara göre aşağıdan değiştirebilirsiniz.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-96 overflow-y-auto pr-1">
                {BASELINE_2023.districts.map((d) => {
                  const currentMp = projection.districtResults[d.id]?.mpCount ?? d.mpCount;
                  return (
                    <div
                      key={d.id}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <span className="font-mono text-slate-400 font-bold mr-1.5">{d.id}</span>
                        <span className="font-medium text-slate-800">{d.name}</span>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={currentMp}
                        onChange={(e) =>
                          updateDistrictMpCount(d.id, parseInt(e.target.value, 10) || 1)
                        }
                        className="w-14 editorial-input px-2 py-1 text-right font-mono font-bold text-slate-900"
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
