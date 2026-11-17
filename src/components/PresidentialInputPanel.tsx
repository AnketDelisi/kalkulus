import React, { useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Globe2,
  Landmark,
  Lock,
  Plus,
  TableProperties,
  Trash2,
  Unlock,
  Users,
} from 'lucide-react';
import { ABROAD_COUNTRY_BY_ID } from '../data/abroadCountries';
import { getCachedBaseline } from '../data/baselineCache';
import { translations } from '../i18n/translations';
import { useElectionStore } from '../store/useElectionStore';
import { BaselineId, SwingMode } from '../types/election';
import { formatInt, formatPct } from '../utils/format';
import { LocationSearchCombobox } from './LocationSearchCombobox';
import { PollQuickEntryModal } from './PollQuickEntryModal';
import { TurnoutMobilizationDrawer } from './TurnoutMobilizationDrawer';
import { UnitBuffDrawer } from './UnitBuffDrawer';

export const PresidentialInputPanel: React.FC = () => {
  const {
    lang,
    parties,
    customBaseline,
    presBaselineId,
    presSwingMode,
    presCandidates,
    presTargetShares,
    presTargetTurnout,
    presAbroadConfig,
    presProvinceOverrides,
    presIlceOverrides,
    presAbroadCountryOverrides,
    presidentialProjection,
    presCandidateTurnoutMultipliers,
    presProvinceTurnoutMultipliers,
    activeScope,
    setActiveScope,
    setMapLayer,
    setZoomedProvinceId,
    setPresBaselineId,
    setPresSwingMode,
    updatePresCandidateShare,
    setPresSharesBulk,
    normalizePresCandidateShares,
    sendPresRemainderToOther,
    setPresTurnout,
    setPresRegisteredVoters,
    updatePresAbroadConfig,
    addPresCandidate,
    updatePresCandidate,
    removePresCandidate,
    assignPartyToCandidate,
    syncPresidentialFromParliamentary,
    updatePresProvinceShare,
    unlockPresProvince,
    updatePresIlceShare,
    unlockPresIlce,
    updatePresAbroadCountryShare,
    unlockPresAbroadCountry,
    setPresCandidateTurnoutMultiplier,
    resetPresCandidateTurnoutMultipliers,
    setPresProvinceTurnoutMultiplier,
    resetPresProvinceTurnoutMultipliers,
  } = useElectionStore();

  const [showVoterDetails, setShowVoterDetails] = useState(false);
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newShort, setNewShort] = useState('');
  const [newColor, setNewColor] = useState('#2563eb');
  const [editingCoalitionId, setEditingCoalitionId] = useState<string | null>(null);

  const t = translations[lang];
  const r1 = presidentialProjection.round1;
  const partyById = useMemo(() => {
    const m: Record<string, (typeof parties)[0]> = {};
    for (const p of parties) m[p.id] = p;
    return m;
  }, [parties]);

  const scopeInfo = useMemo(() => {
    if (activeScope.type === 'province') {
      const pRes = r1.provinceResults[activeScope.ilId];
      const ovr = presProvinceOverrides[activeScope.ilId];
      const shares = ovr?.partyShares || pRes?.candidateShares || {};
      return {
        type: 'province' as const,
        id: activeScope.ilId,
        title: `${pRes?.plateCode || activeScope.ilId} · ${pRes?.name || ''}`,
        subtitle: lang === 'tr' ? 'Cumhurbaşkanlığı 1. Tur il girişi' : '1st round province input',
        isLocked: Boolean(ovr?.isLocked),
        registeredVoters: pRes?.registeredVoters ?? 0,
        turnout: pRes?.turnout ?? presTargetTurnout,
        validVotes: pRes?.validVotes ?? 0,
        shares,
      };
    }

    if (activeScope.type === 'ilce') {
      const iRes = r1.ilceResults[activeScope.ilceId];
      const ovr = presIlceOverrides[activeScope.ilceId];
      const shares = ovr?.partyShares || iRes?.candidateShares || {};
      return {
        type: 'ilce' as const,
        id: activeScope.ilceId,
        title: iRes?.name || activeScope.ilceId,
        subtitle: lang === 'tr' ? '1. Tur ilçe girişi' : '1st round district input',
        isLocked: Boolean(ovr?.isLocked),
        registeredVoters: iRes?.registeredVoters ?? 0,
        turnout: iRes?.turnout ?? presTargetTurnout,
        validVotes: iRes?.validVotes ?? 0,
        shares,
      };
    }

    if (activeScope.type === 'abroadCountry') {
      const cRes = r1.abroadCountryResults[activeScope.countryId];
      const baseC = ABROAD_COUNTRY_BY_ID[activeScope.countryId];
      const ovr = presAbroadCountryOverrides[activeScope.countryId];
      const shares = ovr?.partyShares || cRes?.candidateShares || {};
      return {
        type: 'abroadCountry' as const,
        id: activeScope.countryId,
        title: lang === 'tr' ? baseC?.nameTr || activeScope.countryId : baseC?.nameEn || activeScope.countryId,
        subtitle: lang === 'tr' ? 'Cumhurbaşkanlığı 1. Tur yurt dışı ülke' : '1st round abroad country input',
        isLocked: Boolean(ovr?.isLocked),
        registeredVoters: cRes?.registeredVoters ?? 0,
        turnout: cRes?.turnout ?? 50,
        validVotes: cRes?.validVotes ?? 0,
        shares,
      };
    }

    if (activeScope.type === 'abroad') {
      const shares: Record<string, number> = {};
      for (const s of r1.candidateSummaries) {
        shares[s.candidateId] =
          r1.abroadValidVotes > 0 ? (s.abroadVotes / r1.abroadValidVotes) * 100 : 0;
      }
      return {
        type: 'abroad' as const,
        id: 'abroad',
        title: t.abroadScope,
        subtitle:
          lang === 'tr'
            ? 'Dünya haritasından ülke seçin veya Gümrük Kapılarını düzenleyin'
            : 'Select a country or Customs Ports on the World Map',
        isLocked: !presAbroadConfig.syncWithNationalSwing,
        registeredVoters: presAbroadConfig.registeredVoters,
        turnout: presAbroadConfig.turnout,
        validVotes: r1.abroadValidVotes,
        shares,
      };
    }

    return {
      type: 'national' as const,
      id: 'national',
      title: t.nationalScope,
      subtitle:
        lang === 'tr'
          ? '50%+1 çoğunluk · 81 il ve 973 ilçe + yurt dışı'
          : '50%+1 majority · 81 provinces, 973 districts & abroad',
      isLocked: false,
      registeredVoters: r1.totalRegisteredVoters,
      turnout: presTargetTurnout,
      validVotes: r1.totalValidVotes,
      shares: presTargetShares,
    };
  }, [
    activeScope,
    r1,
    presAbroadConfig,
    presProvinceOverrides,
    presIlceOverrides,
    presAbroadCountryOverrides,
    presTargetTurnout,
    presTargetShares,
    lang,
    t.nationalScope,
    t.abroadScope,
  ]);

  const activeDataset = getCachedBaseline(presBaselineId, customBaseline);

  const totalSum = Object.values(scopeInfo.shares).reduce((a, b) => a + (Number(b) || 0), 0);
  const sumDiff = Math.abs(totalSum - 100);
  const isSumValid = sumDiff <= 0.15;

  const handleShareChange = (candidateId: string, val: number) => {
    if (scopeInfo.type === 'province') {
      updatePresProvinceShare(scopeInfo.id, candidateId, val);
    } else if (scopeInfo.type === 'ilce') {
      updatePresIlceShare(scopeInfo.id, candidateId, val);
    } else if (scopeInfo.type === 'abroadCountry') {
      updatePresAbroadCountryShare(scopeInfo.id, candidateId, val);
    } else {
      updatePresCandidateShare(candidateId, val);
    }
  };

  const handleAddCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newShort.trim()) return;
    addPresCandidate(newName.trim(), newShort.trim(), newColor);
    setNewName('');
    setNewShort('');
    setShowAddForm(false);
  };

  const nonOtherCount = presCandidates.filter((c) => !c.isOther).length;

  return (
    <div className="bg-white border-[1.5px] border-[#090A0F] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b-[1.5px] border-[#090A0F] bg-white">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-[#090A0F]" />
              <h2 className="text-heading font-semibold text-[#090A0F] tracking-tight">
                {scopeInfo.title}
              </h2>
              {scopeInfo.isLocked && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-micro font-mono font-bold bg-amber-300 text-[#090A0F] border border-[#090A0F]">
                  <Lock className="w-2.5 h-2.5" /> {lang === 'tr' ? 'KİLİTLİ' : 'LOCKED'}
                </span>
              )}
            </div>
            <p className="text-micro text-slate-600 mt-0.5">{scopeInfo.subtitle}</p>
          </div>

          <div className="flex items-center gap-1.5">
            {scopeInfo.type !== 'national' && (
              <button
                onClick={() => {
                  setActiveScope({ type: 'national' });
                  setMapLayer('81_il');
                }}
                className="studio-btn px-2 py-1 text-micro font-medium"
              >
                {lang === 'tr' ? 'Türkiye geneli' : 'National'}
              </button>
            )}
            {scopeInfo.isLocked && scopeInfo.type !== 'abroad' && (
              <button
                onClick={() =>
                  scopeInfo.type === 'province'
                    ? unlockPresProvince(scopeInfo.id)
                    : scopeInfo.type === 'abroadCountry'
                    ? unlockPresAbroadCountry(scopeInfo.id)
                    : unlockPresIlce(scopeInfo.id)
                }
                className="studio-btn px-2 py-1 text-micro bg-rose-50 text-rose-700 border-rose-700"
              >
                <Unlock className="w-3 h-3" /> {t.resetUnitLock}
              </button>
            )}
          </div>
        </div>

        {/* Baseline + Swing + Sync Toolbar */}
        <div className="mt-2.5 pt-2.5 border-t border-slate-200 flex flex-wrap items-center gap-1.5">
          <select
            value={presBaselineId}
            onChange={(e) => setPresBaselineId(e.target.value as BaselineId)}
            className="text-micro font-medium border border-[#090A0F] bg-white px-2 py-1 focus:outline-none"
          >
            <option value="blended_90_10">{t.baselineBlended}</option>
            <option value="2023_general">{t.baseline2023}</option>
          </select>

          <div className="inline-flex border border-[#090A0F] text-micro font-mono font-semibold">
            {(['proportional', 'uniform'] as SwingMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setPresSwingMode(m)}
                className={`px-2 py-1 transition-colors ${
                  presSwingMode === m ? 'bg-[#090A0F] text-white' : 'bg-white text-[#090A0F] hover:bg-slate-100'
                }`}
                title={m === 'proportional' ? t.swingProportional : t.swingUniform}
              >
                {m === 'proportional' ? 'PS' : 'UNS'}
              </button>
            ))}
          </div>

          <button
            onClick={syncPresidentialFromParliamentary}
            className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-micro font-semibold border border-[#090A0F] bg-slate-50 hover:bg-[#090A0F] hover:text-white transition-colors"
            title={
              lang === 'tr'
                ? 'Genel Seçim parti oranlarını aday bloklarına topla'
                : 'Derive candidate shares from Parliamentary party shares'
            }
          >
            <ArrowDownToLine className="w-3 h-3" />
            <span>{lang === 'tr' ? "Genel Seçim'den Aktar" : 'Sync from Parliamentary'}</span>
          </button>
        </div>

        {(activeScope.type === 'province' || activeScope.type === 'ilce') && (
          <div className="mt-2.5">
            <UnitBuffDrawer
              mode="presidential"
              unitType={activeScope.type}
              unitId={
                activeScope.type === 'province' ? activeScope.ilId : activeScope.ilceId
              }
              unitName={scopeInfo.title}
              parentIlId={
                activeScope.type === 'ilce'
                  ? presidentialProjection.round1.ilceResults[activeScope.ilceId]?.ilId
                  : undefined
              }
              isLocked={scopeInfo.isLocked}
              entities={presCandidates.map((c) => ({
                id: c.id,
                shortName: c.shortName,
                name: c.name,
                color: c.color,
              }))}
            />
          </div>
        )}

        <div className="mt-2.5 grid grid-cols-2 border-[1.5px] border-[#090A0F] bg-white text-micro font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveScope({ type: 'national' });
              setMapLayer('81_il');
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 border-r border-[#090A0F] transition-colors ${
              activeScope.type !== 'abroad' && activeScope.type !== 'abroadCountry'
                ? 'bg-[#090A0F] text-white'
                : 'text-[#090A0F] hover:bg-slate-100'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>{t.nationalScope}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setZoomedProvinceId(null);
              setActiveScope({ type: 'abroad' });
              setMapLayer('abroad_world');
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 transition-colors ${
              activeScope.type === 'abroad' || activeScope.type === 'abroadCountry'
                ? 'bg-[#090A0F] text-white'
                : 'text-[#090A0F] hover:bg-slate-100'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>{t.abroadScope}</span>
          </button>
        </div>

        <div className="mt-2">
          <LocationSearchCombobox dataset={activeDataset} isLocal={false} isPresidential />
        </div>

        {/* Collapsible Turnout & Abroad */}
        <div className="mt-2 flex items-center justify-between text-micro text-slate-600">
          <div className="flex items-center gap-3 font-mono tabular-nums">
            <span>
              {lang === 'tr' ? 'Katılım:' : 'Turnout:'}{' '}
              <strong className="text-[#090A0F]">{formatPct(scopeInfo.turnout, lang, 1)}</strong>
            </span>
            <span>
              {lang === 'tr' ? 'Geçerli:' : 'Valid:'}{' '}
              <strong className="text-[#090A0F]">{formatInt(scopeInfo.validVotes, lang)}</strong>
            </span>
          </div>
          <button
            onClick={() => setShowVoterDetails(!showVoterDetails)}
            className="inline-flex items-center gap-1 text-micro font-medium text-[#090A0F] hover:underline"
          >
            <Users className="w-3 h-3" />
            <span>{lang === 'tr' ? 'Katılım / Yurt dışı' : 'Turnout / Abroad'}</span>
            {showVoterDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {showVoterDetails && (
          <div className="mt-2 pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-micro">
            <div>
              <label className="text-slate-600 block mb-0.5">{t.turnoutPct}</label>
              <input
                type="number"
                step="0.1"
                min="10"
                max="100"
                value={Number(presTargetTurnout.toFixed(2))}
                onChange={(e) => setPresTurnout(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 border border-[#090A0F] font-mono font-semibold tabular-nums focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-600 block mb-0.5">{t.registeredVoters}</label>
              <input
                type="number"
                step="10000"
                value={r1.totalRegisteredVoters}
                onChange={(e) => setPresRegisteredVoters(parseInt(e.target.value, 10) || 0)}
                className="w-full px-2 py-1 border border-[#090A0F] font-mono font-semibold tabular-nums focus:outline-none"
              />
            </div>
            <div className="col-span-2 flex items-center justify-between pt-1">
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={presAbroadConfig.enabled}
                  onChange={(e) => updatePresAbroadConfig({ enabled: e.target.checked })}
                  className="accent-[#090A0F]"
                />
                <Globe2 className="w-3.5 h-3.5" />
                <span>{t.abroadEnabledLabel}</span>
              </label>
              <span className="font-mono text-slate-500 tabular-nums">
                {formatInt(r1.abroadValidVotes, lang)} {lang === 'tr' ? 'oy' : 'votes'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Candidate List */}
      <div className="divide-y divide-slate-200 max-h-[430px] overflow-y-auto px-4">
        {presCandidates.map((cand) => {
          const val = scopeInfo.shares[cand.id] ?? 0;
          const isEditingCoalition = editingCoalitionId === cand.id;
          return (
            <div key={cand.id} className="py-2.5 group">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={cand.color}
                  onChange={(e) => updatePresCandidate(cand.id, { color: e.target.value })}
                  className="w-4 h-4 p-0 border border-[#090A0F] cursor-pointer shrink-0 bg-transparent"
                  title={lang === 'tr' ? 'Aday rengi' : 'Candidate color'}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-body text-[#090A0F] truncate">
                      {cand.shortName}
                    </span>
                    <span className="text-micro text-slate-500 truncate">{cand.name}</span>
                  </div>
                </div>

                {!cand.isOther && nonOtherCount > 2 && (
                  <button
                    onClick={() => removePresCandidate(cand.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity"
                    title={lang === 'tr' ? 'Adayı çıkar' : 'Remove candidate'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="relative w-20 shrink-0">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={Number(val.toFixed(2))}
                    onChange={(e) => handleShareChange(cand.id, parseFloat(e.target.value) || 0)}
                    className="w-full pl-2 pr-5 py-1 text-right font-mono font-semibold tabular-nums text-body border border-slate-300 focus:border-[#090A0F] focus:outline-none"
                  />
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-micro font-mono text-slate-400">
                    %
                  </span>
                </div>
              </div>

              {/* Slider */}
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="0.1"
                  value={Math.min(80, val)}
                  onChange={(e) => handleShareChange(cand.id, parseFloat(e.target.value))}
                  style={{ accentColor: cand.color }}
                  className="flex-1 h-1.5 cursor-pointer"
                />
              </div>

              {/* Backing Party Pills + Edit toggle */}
              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                {cand.backingPartyIds.map((pid) => {
                  const p = partyById[pid];
                  if (!p) return null;
                  return (
                    <span
                      key={pid}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-micro font-mono font-semibold border border-slate-300 bg-slate-50 text-slate-800"
                    >
                      <span className="w-1.5 h-1.5" style={{ backgroundColor: p.color }} />
                      {p.shortName}
                    </span>
                  );
                })}
                {!cand.isOther && (
                  <button
                    onClick={() => setEditingCoalitionId(isEditingCoalition ? null : cand.id)}
                    className="px-1.5 py-0.5 text-micro font-medium text-slate-500 hover:text-[#090A0F] border border-dashed border-slate-300 hover:border-[#090A0F]"
                  >
                    {isEditingCoalition
                      ? lang === 'tr'
                        ? 'Kapat'
                        : 'Done'
                      : lang === 'tr'
                      ? 'Parti seç'
                      : 'Edit bloc'}
                  </button>
                )}
              </div>

              {isEditingCoalition && (
                <div className="mt-2 p-2 bg-slate-50 border border-slate-300 flex flex-wrap gap-1">
                  {parties
                    .filter((p) => !p.isOther)
                    .map((p) => {
                      const assignedHere = cand.backingPartyIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => assignPartyToCandidate(p.id, cand.id)}
                          className={`px-1.5 py-0.5 text-micro font-mono font-semibold border transition-colors ${
                            assignedHere
                              ? 'bg-[#090A0F] text-white border-[#090A0F]'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-[#090A0F]'
                          }`}
                        >
                          {p.shortName}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add candidate & Normalize footer */}
      <div className="px-4 py-3 border-t-[1.5px] border-[#090A0F] bg-slate-50 space-y-2">
        {showAddForm && (
          <form onSubmit={handleAddCandidate} className="p-2 bg-white border border-[#090A0F] space-y-2">
            <div className="grid grid-cols-3 gap-1.5">
              <input
                type="text"
                placeholder={lang === 'tr' ? 'Aday adı' : 'Candidate name'}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="col-span-2 px-2 py-1 text-micro border border-slate-300 focus:border-[#090A0F] focus:outline-none"
              />
              <input
                type="text"
                placeholder={lang === 'tr' ? 'Kısa ad' : 'Short'}
                value={newShort}
                onChange={(e) => setNewShort(e.target.value)}
                className="px-2 py-1 text-micro font-mono uppercase border border-slate-300 focus:border-[#090A0F] focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-micro">
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-5 h-5 border border-[#090A0F]"
                />
                <span className="text-slate-600">{lang === 'tr' ? 'Renk' : 'Color'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-2 py-1 text-micro border border-slate-300 bg-white"
                >
                  {lang === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button type="submit" className="studio-btn-primary px-2.5 py-1 text-micro">
                  {lang === 'tr' ? 'Ekle' : 'Add'}
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-body font-mono tabular-nums">
            {isSumValid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <span className="w-2 h-2 bg-amber-500" />
            )}
            <span className="text-slate-600">{t.totalShareSum}:</span>
            <strong className={isSumValid ? 'text-emerald-700' : 'text-amber-700'}>
              {formatPct(totalSum, lang, 2)}
            </strong>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {scopeInfo.type === 'national' && (
              <button
                type="button"
                onClick={() => setPollModalOpen(true)}
                className="studio-btn px-2 py-1 text-micro font-bold"
              >
                <TableProperties className="w-3 h-3" />
                <span>{lang === 'tr' ? 'Yapıştır' : 'Paste'}</span>
              </button>
            )}
            {presCandidates.length < 9 && !showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="studio-btn px-2 py-1 text-micro"
              >
                <Plus className="w-3 h-3" /> {lang === 'tr' ? 'Aday' : 'Candidate'}
              </button>
            )}
            {scopeInfo.type === 'national' && !isSumValid && (
              <>
                <button
                  onClick={normalizePresCandidateShares}
                  className="studio-btn px-2 py-1 text-micro bg-[#090A0F] text-white"
                >
                  {t.normalize100}
                </button>
                <button
                  onClick={sendPresRemainderToOther}
                  className="studio-btn px-2 py-1 text-micro"
                >
                  {t.sendToOther}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {(() => {
        const scopedIlId =
          activeScope.type === 'province'
            ? activeScope.ilId
            : activeScope.type === 'ilce'
            ? presidentialProjection.round1.ilceResults[activeScope.ilceId]?.ilId
            : undefined;
        const scopedProvName = scopedIlId
          ? presidentialProjection.round1.provinceResults[scopedIlId]?.name ?? scopedIlId
          : null;
        const activeMults = scopedIlId
          ? presProvinceTurnoutMultipliers[scopedIlId] ?? {}
          : presCandidateTurnoutMultipliers;

        return (
          <TurnoutMobilizationDrawer
            lang={lang}
            titleTr="Aday bazlı katılım (1. Tur Mobilizasyon)"
            titleEn="Candidate base turnout (R1 Mobilization)"
            scopeLabel={scopedProvName}
            items={presCandidates.map((c) => ({
              id: c.id,
              shortName: c.shortName,
              label: c.name,
              color: c.color,
            }))}
            multipliers={activeMults}
            fallbackMultipliers={scopedIlId ? presCandidateTurnoutMultipliers : undefined}
            onChange={(id, factor) => {
              if (scopedIlId) setPresProvinceTurnoutMultiplier(scopedIlId, id, factor);
              else setPresCandidateTurnoutMultiplier(id, factor);
            }}
            onReset={() => {
              if (scopedIlId) resetPresProvinceTurnoutMultipliers(scopedIlId);
              else resetPresCandidateTurnoutMultipliers();
            }}
          />
        );
      })()}

      <PollQuickEntryModal
        isOpen={pollModalOpen}
        onClose={() => setPollModalOpen(false)}
        lang={lang}
        scopeTitle={scopeInfo.title}
        items={presCandidates.map((c) => ({
          id: c.id,
          shortName: c.shortName,
          fullName: c.name,
          color: c.color,
          isOther: c.isOther,
          currentValue: presTargetShares[c.id] ?? 0,
        }))}
        onApply={(vals) => setPresSharesBulk(vals)}
      />
    </div>
  );
};
