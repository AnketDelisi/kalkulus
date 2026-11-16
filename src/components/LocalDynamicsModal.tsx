import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Award,
  GitMerge,
  Plus,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { getCachedLocalBaseline } from '../data/baselineCache';
import { useElectionStore } from '../store/useElectionStore';
import { getContrastTextColor } from '../utils/color';
import { BuffManagerTab } from './BuffManagerTab';
import { LocalRulesEditor } from './LocalRulesEditor';

interface LocalDynamicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'incumbency' | 'defections' | 'tactical' | 'buffs';
}

export const LocalDynamicsModal: React.FC<LocalDynamicsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'tactical',
}) => {
  const {
    lang,
    parties,
    localIncumbency,
    localDefections,
    setLocalIncumbencyIntensity,
    setLocalProvinceIncumbencyBonus,
    removeLocalProvinceIncumbencyBonus,
    resetLocalIncumbency,
    setLocalReferenceBaseline,
    setLocalIncludeKayyim,
    setLocalDefectionCarryover,
    setLocalDefectionBacklash,
    toggleLocalDefectionEntry,
    addLocalDefectionEntry,
    removeLocalDefectionEntry,
    resetLocalDefections,
  } = useElectionStore();

  const [activeTab, setActiveTab] = useState<'incumbency' | 'defections' | 'tactical' | 'buffs'>(initialTab);
  const [newProvId, setNewProvId] = useState('06');
  const [newPartyId, setNewPartyId] = useState('YENI');
  const [newBonusPp, setNewBonusPp] = useState(5.0);
  const [searchProv, setSearchProv] = useState('');

  // Defections tab local form & filter state
  const [defFilterKind, setDefFilterKind] = useState<'all' | 'defection' | 'kayyim'>('all');
  const [defSearch, setDefSearch] = useState('');
  const [defUnitType, setDefUnitType] = useState<'province' | 'ilce'>('province');
  const [defUnitId, setDefUnitId] = useState('35');
  const [defKind, setDefKind] = useState<'defection' | 'kayyim'>('defection');
  const [defFromParty, setDefFromParty] = useState('CHP');
  const [defToParty, setDefToParty] = useState('AKP');

  if (!isOpen) return null;

  const cached2024 = getCachedLocalBaseline('2024_local');
  const provinces = cached2024.provinces;
  const ilceler = cached2024.ilceler;
  const provById: Record<string, (typeof provinces)[0]> = {};
  for (const p of provinces) provById[p.id] = p;
  const ilceById: Record<string, (typeof ilceler)[0]> = {};
  for (const i of ilceler) ilceById[i.id] = i;

  const nonOtherParties = parties.filter((p) => !p.isOther);
  const partyById: Record<string, (typeof parties)[0]> = {};
  for (const p of parties) partyById[p.id] = p;

  const filteredDefections = localDefections.entries.filter((entry) => {
    if (defFilterKind !== 'all' && entry.kind !== defFilterKind) return false;
    if (!defSearch.trim()) return true;
    const q = defSearch.trim().toLowerCase();
    return (
      entry.unitName.toLowerCase().includes(q) ||
      entry.fromPartyId.toLowerCase().includes(q) ||
      entry.toPartyId.toLowerCase().includes(q) ||
      (entry.note || '').toLowerCase().includes(q)
    );
  });

  const kayyimCount = localDefections.entries.filter((e) => e.kind === 'kayyim' && e.enabled).length;

  const bonusEntries = Object.entries(localIncumbency.provinceBonuses)
    .filter(([provId]) => {
      if (!searchProv.trim()) return true;
      const pName = provById[provId]?.name?.toLowerCase() || '';
      const q = searchProv.trim().toLowerCase();
      return pName.includes(q) || provId.includes(q);
    })
    .sort((a, b) => Math.abs(b[1].bonusPp) - Math.abs(a[1].bonusPp));

  return (
    <div className="fixed inset-0 z-50 bg-[#090A0F]/70 flex items-center justify-center p-4">
      <div className="studio-panel w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#090A0F] text-white">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-4 h-4 text-[#00F5D4]" />
            <h2 className="text-title font-bold">
              {lang === 'tr'
                ? 'Yerel İttifak Kuralları ve Dinamikler'
                : 'Local Alliance Rules & Dynamics'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-white/25 hover:bg-white hover:text-[#090A0F] transition-colors"
            title={lang === 'tr' ? 'Kapat' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-[1.5px] border-[#090A0F] bg-[#F4F5F7] text-body overflow-x-auto">
          <button
            onClick={() => setActiveTab('tactical')}
            className={`px-4 py-2.5 font-semibold border-r border-slate-300 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'tactical'
                ? 'bg-white text-[#090A0F] border-b-2 border-b-[#090A0F]'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>
              {lang === 'tr' ? 'İttifak / Taktiksel Oy' : 'Alliances & Tactical'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('incumbency')}
            className={`px-4 py-2.5 font-semibold border-r border-slate-300 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'incumbency'
                ? 'bg-white text-[#090A0F] border-b-2 border-b-[#090A0F]'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>{lang === 'tr' ? 'Görevdeki Başkan Primi' : 'Incumbency Bonus'}</span>
          </button>

          <button
            onClick={() => setActiveTab('defections')}
            className={`px-4 py-2.5 font-semibold border-r border-slate-300 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'defections'
                ? 'bg-white text-[#090A0F] border-b-2 border-b-[#090A0F]'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>
              {lang === 'tr' ? 'Parti Değişimleri & Kayyım' : 'Defections & Kayyım'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('buffs')}
            className={`px-4 py-2.5 font-semibold border-r border-slate-300 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'buffs'
                ? 'bg-white text-[#090A0F] border-b-2 border-b-[#090A0F]'
                : 'text-slate-600 hover:bg-white/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'tr' ? 'Yerel Güç / Buff' : 'Local Buffs'}</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 bg-white">
          {activeTab === 'incumbency' && (
            <div className="space-y-4 text-body">
              {/* Global intensity slider */}
              <div className="p-3.5 bg-[#F4F5F7] border border-[#090A0F] space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="font-bold text-[#090A0F]">
                      {lang === 'tr'
                        ? 'Görevdeki Başkan / Aday Gücü Etkisi'
                        : 'Global Incumbency / Candidate Effect'}
                    </div>
                    <p className="text-micro text-slate-600">
                      {lang === 'tr'
                        ? '2024 Belediye Başkanı – Belediye Meclisi oy farklarından kalibre edilen il primlerini ölçekler.'
                        : 'Scales empirical province bonuses calibrated from 2024 Mayor-vs-Council vote gaps.'}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-heading text-[#090A0F] tabular-nums">
                    {lang === 'tr'
                      ? `%${localIncumbency.intensityPct}`
                      : `${localIncumbency.intensityPct}%`}
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={150}
                  step={5}
                  value={localIncumbency.intensityPct}
                  onChange={(e) =>
                    setLocalIncumbencyIntensity(parseInt(e.target.value, 10) || 0)
                  }
                  className="w-full accent-[#090A0F]"
                />

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-micro">
                    {[
                      { label: lang === 'tr' ? 'Kapalı (%0)' : 'Off (0%)', val: 0 },
                      { label: lang === 'tr' ? 'Dengeli (%100)' : 'Balanced (100%)', val: 100 },
                      { label: lang === 'tr' ? 'Güçlü (%135)' : 'Strong (135%)', val: 135 },
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        onClick={() => setLocalIncumbencyIntensity(preset.val)}
                        className={`px-2 py-0.5 border border-[#090A0F] font-semibold ${
                          localIncumbency.intensityPct === preset.val
                            ? 'bg-[#090A0F] text-white'
                            : 'bg-white text-[#090A0F] hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => resetLocalIncumbency(false)}
                    className="studio-btn px-2 py-1 text-micro"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{lang === 'tr' ? '2024 Kalibrasyonuna Sıfırla' : 'Reset to 2024'}</span>
                  </button>
                </div>
              </div>

              {/* Add / update province bonus */}
              <div className="p-3 border border-[#090A0F] bg-white grid grid-cols-2 sm:grid-cols-4 gap-2 text-micro items-end">
                <div>
                  <label className="block text-slate-500 mb-0.5">
                    {lang === 'tr' ? 'İl' : 'Province'}
                  </label>
                  <select
                    value={newProvId}
                    onChange={(e) => setNewProvId(e.target.value)}
                    className="w-full studio-input px-2 py-1.5"
                  >
                    {provinces.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.plateCode.toString().padStart(2, '0')} - {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-0.5">
                    {lang === 'tr' ? 'Parti' : 'Party'}
                  </label>
                  <select
                    value={newPartyId}
                    onChange={(e) => setNewPartyId(e.target.value)}
                    className="w-full studio-input px-2 py-1.5"
                  >
                    {nonOtherParties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.shortName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-0.5">
                    {lang === 'tr' ? 'Başkan Primi (puan)' : 'Bonus (pp)'}
                  </label>
                  <input
                    type="number"
                    min={-15}
                    max={25}
                    step={0.5}
                    value={newBonusPp}
                    onChange={(e) => setNewBonusPp(parseFloat(e.target.value) || 0)}
                    className="w-full studio-input px-2 py-1.5 font-mono font-bold"
                  />
                </div>

                <button
                  onClick={() => setLocalProvinceIncumbencyBonus(newProvId, newPartyId, newBonusPp)}
                  className="studio-btn studio-btn-primary px-3 py-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{lang === 'tr' ? 'Ekle / Güncelle' : 'Add / Update'}</span>
                </button>
              </div>

              {/* Filter & List */}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder={lang === 'tr' ? 'İl ara...' : 'Search province...'}
                  value={searchProv}
                  onChange={(e) => setSearchProv(e.target.value)}
                  className="w-full studio-input px-2.5 py-1.5 text-micro"
                />

                <div className="border border-[#090A0F] divide-y divide-slate-200 max-h-64 overflow-y-auto">
                  {bonusEntries.map(([provId, entry]) => {
                    const prov = provById[provId];
                    const party = partyById[entry.partyId];
                    const effectivePp = (entry.bonusPp * localIncumbency.intensityPct) / 100;
                    return (
                      <div
                        key={provId}
                        className="px-3 py-2 flex items-center justify-between gap-2 text-micro bg-white hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400">{provId}</span>
                            <span className="font-bold text-[#090A0F]">
                              {prov?.name || provId}
                            </span>
                            <span
                              className="px-1.5 py-0.5 text-[10px] font-mono font-bold"
                              style={{
                                backgroundColor: party?.color || '#090A0F',
                                color: getContrastTextColor(party?.color || '#090A0F'),
                              }}
                            >
                              {party?.shortName || entry.partyId}
                            </span>
                          </div>
                          {entry.note && (
                            <div className="text-[11px] text-slate-500 truncate">{entry.note}</div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-slate-400">
                            ({effectivePp >= 0 ? '+' : ''}
                            {effectivePp.toFixed(1)} net)
                          </span>
                          <input
                            type="number"
                            min={-15}
                            max={25}
                            step={0.5}
                            value={entry.bonusPp}
                            onChange={(e) =>
                              setLocalProvinceIncumbencyBonus(
                                provId,
                                entry.partyId,
                                parseFloat(e.target.value) || 0,
                                entry.note
                              )
                            }
                            className="w-16 studio-input px-1.5 py-0.5 text-right font-mono font-bold"
                          />
                          <button
                            onClick={() => removeLocalProvinceIncumbencyBonus(provId)}
                            className="p-1 text-rose-600 hover:bg-rose-50 border border-slate-300"
                            title={lang === 'tr' ? 'Kaldır' : 'Remove'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {bonusEntries.length === 0 && (
                    <div className="p-4 text-center text-slate-500 text-micro">
                      {lang === 'tr' ? 'Kayıtlı başkan primi yok.' : 'No province bonuses configured.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'defections' && (
            <div className="space-y-4 text-body">
              {/* Top Configuration Box */}
              <div className="p-3.5 bg-[#F4F5F7] border border-[#090A0F] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-[#090A0F]">
                      {lang === 'tr'
                        ? 'Karşılaştırma Bazı & Kayyım Ayarı'
                        : 'Reference Baseline & Trustee Toggle'}
                    </div>
                    <p className="text-micro text-slate-600">
                      {lang === 'tr'
                        ? 'Koltuk farkları (±) ve el değiştirme haritasının hangi yönetime göre ölçüleceğini seçin.'
                        : 'Choose whether seat deltas (±) and map flips compare against current post-defection holders or March 2024 ballots.'}
                    </p>
                  </div>

                  <button
                    onClick={resetLocalDefections}
                    className="studio-btn px-2 py-1 text-micro"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{lang === 'tr' ? 'Varsayılana Sıfırla' : 'Reset'}</span>
                  </button>
                </div>

                {/* Reference Baseline Switch + Kayyim Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="inline-flex border border-[#090A0F] text-micro font-semibold">
                    <button
                      onClick={() => setLocalReferenceBaseline('current')}
                      className={`px-3 py-1.5 ${
                        localDefections.referenceBaseline === 'current'
                          ? 'bg-[#090A0F] text-white'
                          : 'bg-white text-[#090A0F] hover:bg-slate-100'
                      }`}
                    >
                      {lang === 'tr' ? 'Mevcut Yönetim (Geçişler Dahil)' : 'Current Control'}
                    </button>
                    <button
                      onClick={() => setLocalReferenceBaseline('2024')}
                      className={`px-3 py-1.5 ${
                        localDefections.referenceBaseline === '2024'
                          ? 'bg-[#090A0F] text-white'
                          : 'bg-white text-[#090A0F] hover:bg-slate-100'
                      }`}
                    >
                      {lang === 'tr' ? '31 Mart 2024 Sandık' : 'March 2024 Ballots'}
                    </button>
                  </div>

                  <label className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#090A0F] bg-white cursor-pointer text-micro font-semibold">
                    <input
                      type="checkbox"
                      checked={localDefections.includeKayyim}
                      onChange={(e) => setLocalIncludeKayyim(e.target.checked)}
                      className="accent-[#090A0F] w-3.5 h-3.5"
                    />
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      {lang === 'tr'
                        ? `Kayyım atamalarını dahil et (${kayyimCount})`
                        : `Include trustees / kayyım (${kayyimCount})`}
                    </span>
                  </label>
                </div>

                {/* Carryover & Backlash Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-300/70">
                  <div>
                    <div className="flex items-center justify-between text-micro mb-1">
                      <span className="font-semibold text-[#090A0F]">
                        {lang === 'tr' ? 'Kişisel Oy Taşıma Oranı' : 'Personal Vote Carryover'}
                      </span>
                      <span className="font-mono font-bold tabular-nums">
                        {lang === 'tr'
                          ? `%${localDefections.carryoverPct}`
                          : `${localDefections.carryoverPct}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={localDefections.carryoverPct}
                      onChange={(e) =>
                        setLocalDefectionCarryover(parseInt(e.target.value, 10) || 0)
                      }
                      className="w-full accent-[#090A0F]"
                    />
                    <p className="text-[11px] text-slate-500">
                      {lang === 'tr'
                        ? 'Başka partiye geçen başkanın kişisel priminden yeni partiye taşınan oran.'
                        : 'Share of personal incumbency carried over to the new party after defection.'}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-micro mb-1">
                      <span className="font-semibold text-[#090A0F]">
                        {lang === 'tr' ? 'Parti Değişimi Tepkisi' : 'Defection Backlash'}
                      </span>
                      <span className="font-mono font-bold text-rose-700 tabular-nums">
                        -{localDefections.backlashPp.toFixed(1)} pp
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={8}
                      step={0.5}
                      value={localDefections.backlashPp}
                      onChange={(e) =>
                        setLocalDefectionBacklash(parseFloat(e.target.value) || 0)
                      }
                      className="w-full accent-[#090A0F]"
                    />
                    <p className="text-[11px] text-slate-500">
                      {lang === 'tr'
                        ? 'Çapraz geçişlerde yeni partiye yansıyan seçmen tepkisi cezası.'
                        : 'Electoral backlash penalty subtracted from cross-bloc defectors.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Add Defection / Kayyım Entry */}
              <div className="p-3 border border-[#090A0F] bg-white grid grid-cols-2 sm:grid-cols-6 gap-2 text-micro items-end">
                <div>
                  <label className="block text-slate-500 mb-0.5">
                    {lang === 'tr' ? 'Kapsam' : 'Level'}
                  </label>
                  <select
                    value={defUnitType}
                    onChange={(e) => {
                      const nextType = e.target.value as 'province' | 'ilce';
                      setDefUnitType(nextType);
                      setDefUnitId(nextType === 'province' ? provinces[0]?.id || '01' : ilceler[0]?.id || '01-seyhan');
                    }}
                    className="w-full studio-input px-2 py-1.5"
                  >
                    <option value="province">{lang === 'tr' ? 'İl / BB' : 'Province'}</option>
                    <option value="ilce">{lang === 'tr' ? 'İlçe' : 'District'}</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-500 mb-0.5">
                    {lang === 'tr' ? 'Belediye' : 'Municipality'}
                  </label>
                  <select
                    value={defUnitId}
                    onChange={(e) => setDefUnitId(e.target.value)}
                    className="w-full studio-input px-2 py-1.5"
                  >
                    {defUnitType === 'province'
                      ? provinces.map((p) => (
                          <option key={p.id} value={p.id}>
                            {String(p.plateCode).padStart(2, '0')} - {p.name}
                          </option>
                        ))
                      : ilceler.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} ({provById[i.ilId]?.name || i.ilId})
                          </option>
                        ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-0.5">
                    {lang === 'tr' ? 'Eski → Yeni' : 'From → To'}
                  </label>
                  <div className="flex items-center gap-1">
                    <select
                      value={defFromParty}
                      onChange={(e) => setDefFromParty(e.target.value)}
                      className="w-full studio-input px-1.5 py-1.5"
                    >
                      {parties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.shortName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-0.5">
                    {lang === 'tr' ? 'Hedef' : 'Target'}
                  </label>
                  <select
                    value={defKind === 'kayyim' ? 'OTHER' : defToParty}
                    disabled={defKind === 'kayyim'}
                    onChange={(e) => setDefToParty(e.target.value)}
                    className="w-full studio-input px-1.5 py-1.5 disabled:opacity-50"
                  >
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.id === 'OTHER'
                          ? lang === 'tr'
                            ? 'Bağımsız / Kayyım'
                            : 'Indep / Trustee'
                          : p.shortName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <select
                    value={defKind}
                    onChange={(e) => setDefKind(e.target.value as 'defection' | 'kayyim')}
                    className="w-full studio-input px-1.5 py-1 text-[11px]"
                  >
                    <option value="defection">{lang === 'tr' ? 'Geçiş' : 'Defection'}</option>
                    <option value="kayyim">{lang === 'tr' ? 'Kayyım' : 'Kayyım'}</option>
                  </select>
                  <button
                    onClick={() => {
                      const unitName =
                        defUnitType === 'province'
                          ? provById[defUnitId]?.name || defUnitId
                          : `${ilceById[defUnitId]?.name || defUnitId} (${
                              provById[ilceById[defUnitId]?.ilId || '']?.name || ''
                            })`;
                      addLocalDefectionEntry({
                        unitType: defUnitType,
                        unitId: defUnitId,
                        unitName,
                        kind: defKind,
                        fromPartyId: defFromParty,
                        toPartyId: defKind === 'kayyim' ? 'OTHER' : defToParty,
                        enabled: true,
                      });
                    }}
                    className="studio-btn studio-btn-primary px-2 py-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{lang === 'tr' ? 'Ekle' : 'Add'}</span>
                  </button>
                </div>
              </div>

              {/* Filter & Entries List */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder={lang === 'tr' ? 'İl, ilçe veya parti ara...' : 'Search municipality...'}
                    value={defSearch}
                    onChange={(e) => setDefSearch(e.target.value)}
                    className="flex-1 min-w-[160px] studio-input px-2.5 py-1.5 text-micro"
                  />
                  <div className="flex border border-[#090A0F] text-micro font-semibold">
                    {(
                      [
                        ['all', lang === 'tr' ? 'Tümü' : 'All'],
                        ['defection', lang === 'tr' ? 'Parti Değişimi' : 'Defections'],
                        ['kayyim', lang === 'tr' ? 'Kayyım' : 'Kayyım'],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setDefFilterKind(key)}
                        className={`px-2.5 py-1 ${
                          defFilterKind === key
                            ? 'bg-[#090A0F] text-white'
                            : 'bg-white text-[#090A0F] hover:bg-slate-100'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-[#090A0F] divide-y divide-slate-200 max-h-60 overflow-y-auto">
                  {filteredDefections.map((entry) => {
                    const fromP = partyById[entry.fromPartyId];
                    const toP = partyById[entry.toPartyId];
                    const isCustom = entry.id.startsWith('def-custom-');
                    const isKayyim = entry.kind === 'kayyim';
                    return (
                      <div
                        key={entry.id}
                        className={`px-3 py-2 flex items-center justify-between gap-2 text-micro ${
                          isKayyim && !localDefections.includeKayyim ? 'opacity-50 bg-slate-50' : 'bg-white'
                        }`}
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer min-w-0">
                          <input
                            type="checkbox"
                            checked={entry.enabled}
                            onChange={() => toggleLocalDefectionEntry(entry.id)}
                            className="accent-[#090A0F] w-3.5 h-3.5 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-[#090A0F]">{entry.unitName}</span>
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-mono font-bold border border-[#090A0F] ${
                                  isKayyim ? 'bg-amber-200 text-[#090A0F]' : 'bg-slate-100 text-[#090A0F]'
                                }`}
                              >
                                {isKayyim
                                  ? 'KAYYIM'
                                  : entry.unitType === 'province'
                                  ? lang === 'tr'
                                    ? 'İL'
                                    : 'PROV'
                                  : lang === 'tr'
                                  ? 'İLÇE'
                                  : 'DIST'}
                              </span>
                            </div>
                            {entry.note && (
                              <div className="text-[11px] text-slate-500 truncate">{entry.note}</div>
                            )}
                          </div>
                        </label>

                        <div className="flex items-center gap-2 shrink-0 font-mono">
                          <span className="text-slate-500">
                            {fromP?.shortName || entry.fromPartyId}
                          </span>
                          <span>→</span>
                          <span
                            className="px-1.5 py-0.5 text-[10px] font-bold"
                            style={{
                              backgroundColor: toP?.color || '#64748b',
                              color: getContrastTextColor(toP?.color || '#64748b'),
                            }}
                          >
                            {isKayyim
                              ? 'KAYYIM'
                              : entry.toPartyId === 'OTHER'
                              ? lang === 'tr'
                                ? 'BAĞIMSIZ'
                                : 'INDEP'
                              : toP?.shortName || entry.toPartyId}
                          </span>
                          {isCustom && (
                            <button
                              onClick={() => removeLocalDefectionEntry(entry.id)}
                              className="p-1 text-rose-600 hover:bg-rose-50 border border-slate-300"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tactical' && <LocalRulesEditor />}

          {activeTab === 'buffs' && <BuffManagerTab />}
        </div>
      </div>
    </div>
  );
};
