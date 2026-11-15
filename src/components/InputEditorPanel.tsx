import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Globe2,
  Landmark,
  Lock,
  MapPin,
  Sparkles,
  Unlock,
  Users,
} from 'lucide-react';
import baseline2023Raw from '../data/baseline2023.json';
import baseline2024Raw from '../data/baseline2024.json';
import { translations } from '../i18n/translations';
import { useElectionStore } from '../store/useElectionStore';
import { BaselineDataset } from '../types/election';

const BASELINES: Record<string, BaselineDataset> = {
  '2023_general': baseline2023Raw as unknown as BaselineDataset,
  '2024_local': baseline2024Raw as unknown as BaselineDataset,
};

export const InputEditorPanel: React.FC = () => {
  const {
    lang,
    baselineId,
    customBaseline,
    parties,
    activeScope,
    nationalTargetShares,
    nationalTargetTurnout,
    abroadConfig,
    provinceOverrides,
    districtOverrides,
    ilceOverrides,
    projection,
    baselineProjection,
    setActiveScope,
    updateNationalPartyShare,
    normalizeActiveScopeShares,
    sendActiveScopeRemainderToOther,
    setNationalTurnout,
    setNationalRegisteredVoters,
    updateAbroadConfig,
    updateAbroadPartyShare,
    updateProvinceShare,
    updateProvinceTurnoutAndVoters,
    unlockProvince,
    updateDistrictShare,
    updateDistrictTurnoutAndVoters,
    unlockDistrict,
    updateIlceShare,
    updateIlceTurnoutAndVoters,
    unlockIlce,
  } = useElectionStore();

  const [showVoterDetails, setShowVoterDetails] = useState(false);

  const t = translations[lang];
  const activeDataset =
    baselineId === 'custom' && customBaseline
      ? customBaseline
      : BASELINES[baselineId] || BASELINES['2023_general'];

  const scopeData = useMemo(() => {
    if (activeScope.type === 'national') {
      const shares = nationalTargetShares;
      const baseShares = activeDataset.nationalBaseShares;
      const sum = Object.values(shares).reduce((a, b) => a + (Number(b) || 0), 0);
      return {
        title: t.nationalScope,
        subtitle: '81 İl • 87 Seçim Çevresi • 973 İlçe',
        isLocked: false,
        canLock: false,
        registeredVoters: projection.domesticRegisteredVoters,
        turnout: nationalTargetTurnout,
        validVotes: projection.domesticValidVotes,
        shares,
        baseShares,
        partySeats: projection.partyTotalSeats,
        sum,
      };
    }

    if (activeScope.type === 'abroad') {
      const shares = abroadConfig.syncWithNationalSwing
        ? projection.abroadPartyShares
        : abroadConfig.partyShares;
      const baseShares = activeDataset.abroad.partyShares;
      const sum = Object.values(shares).reduce((a, b) => a + (Number(b) || 0), 0);
      return {
        title: t.abroadScope,
        subtitle: 'YSK 87 Seçim Çevresine Oransal Dağıtım',
        isLocked: !abroadConfig.syncWithNationalSwing,
        canLock: true,
        registeredVoters: abroadConfig.registeredVoters,
        turnout: abroadConfig.turnout,
        validVotes: projection.abroadValidVotes,
        shares,
        baseShares,
        partySeats: undefined,
        sum,
      };
    }

    if (activeScope.type === 'province') {
      const pRes = projection.provinceResults[activeScope.ilId];
      const basePRes = baselineProjection.provinceResults[activeScope.ilId];
      const ovr = provinceOverrides[activeScope.ilId];
      const shares = ovr?.partyShares || pRes?.partyShares || {};
      const baseShares = basePRes?.partyShares || {};
      const sum = Object.values(shares).reduce((a, b) => a + (Number(b) || 0), 0);
      return {
        title: `${pRes?.plateCode || activeScope.ilId} • ${pRes?.name || ''}`,
        subtitle: `${t.provinceScope} • ${pRes?.mpCount || 0} Milletvekili`,
        isLocked: Boolean(ovr?.isLocked),
        canLock: true,
        registeredVoters: ovr?.registeredVoters ?? pRes?.registeredVoters ?? 0,
        turnout: ovr?.turnout ?? pRes?.turnout ?? 85,
        validVotes: pRes?.totalValidVotes ?? 0,
        shares,
        baseShares,
        partySeats: pRes?.partySeats,
        sum,
      };
    }

    if (activeScope.type === 'district') {
      const dRes = projection.districtResults[activeScope.districtId];
      const baseDRes = baselineProjection.districtResults[activeScope.districtId];
      const ovr = districtOverrides[activeScope.districtId];
      const shares = ovr?.partyShares || dRes?.domesticPartyShares || {};
      const baseShares = baseDRes?.domesticPartyShares || {};
      const sum = Object.values(shares).reduce((a, b) => a + (Number(b) || 0), 0);
      return {
        title: dRes?.name || activeScope.districtId,
        subtitle: `${t.districtScope} • ${dRes?.mpCount || 0} Milletvekili`,
        isLocked: Boolean(ovr?.isLocked),
        canLock: true,
        registeredVoters: ovr?.registeredVoters ?? dRes?.registeredVoters ?? 0,
        turnout: ovr?.turnout ?? dRes?.turnout ?? 85,
        validVotes: dRes?.totalValidVotes ?? 0,
        shares,
        baseShares,
        partySeats: dRes?.partySeats,
        sum,
      };
    }

    const iRes = projection.ilceResults[activeScope.ilceId];
    const baseIRes = baselineProjection.ilceResults[activeScope.ilceId];
    const ovr = ilceOverrides[activeScope.ilceId];
    const provName = projection.provinceResults[iRes?.ilId || '']?.name || '';
    const shares = ovr?.partyShares || iRes?.partyShares || {};
    const baseShares = baseIRes?.partyShares || {};
    const sum = Object.values(shares).reduce((a, b) => a + (Number(b) || 0), 0);
    return {
      title: `${iRes?.name || activeScope.ilceId} (${provName})`,
      subtitle: `${t.ilceScope} • Bölge: ${iRes?.districtId || ''}`,
      isLocked: Boolean(ovr?.isLocked),
      canLock: true,
      registeredVoters: ovr?.registeredVoters ?? iRes?.registeredVoters ?? 0,
      turnout: ovr?.turnout ?? iRes?.turnout ?? 85,
      validVotes: iRes?.validVotes ?? 0,
      shares,
      baseShares,
      partySeats: undefined,
      sum,
    };
  }, [
    activeScope,
    nationalTargetShares,
    nationalTargetTurnout,
    abroadConfig,
    provinceOverrides,
    districtOverrides,
    ilceOverrides,
    projection,
    baselineProjection,
    activeDataset,
    t,
  ]);

  const handleShareChange = (partyId: string, val: number) => {
    if (activeScope.type === 'national') {
      updateNationalPartyShare(partyId, val);
    } else if (activeScope.type === 'abroad') {
      updateAbroadPartyShare(partyId, val);
    } else if (activeScope.type === 'province') {
      updateProvinceShare(activeScope.ilId, partyId, val);
    } else if (activeScope.type === 'district') {
      updateDistrictShare(activeScope.districtId, partyId, val);
    } else if (activeScope.type === 'ilce') {
      updateIlceShare(activeScope.ilceId, partyId, val);
    }
  };

  const handleTurnoutChange = (newTurnout: number) => {
    if (activeScope.type === 'national') {
      setNationalTurnout(newTurnout);
    } else if (activeScope.type === 'abroad') {
      updateAbroadConfig({ turnout: newTurnout });
    } else if (activeScope.type === 'province') {
      updateProvinceTurnoutAndVoters(activeScope.ilId, newTurnout, undefined);
    } else if (activeScope.type === 'district') {
      updateDistrictTurnoutAndVoters(activeScope.districtId, newTurnout, undefined);
    } else if (activeScope.type === 'ilce') {
      updateIlceTurnoutAndVoters(activeScope.ilceId, newTurnout, undefined);
    }
  };

  const handleVotersChange = (newVoters: number) => {
    if (activeScope.type === 'national') {
      setNationalRegisteredVoters(newVoters);
    } else if (activeScope.type === 'abroad') {
      updateAbroadConfig({ registeredVoters: newVoters });
    } else if (activeScope.type === 'province') {
      updateProvinceTurnoutAndVoters(activeScope.ilId, undefined, newVoters);
    } else if (activeScope.type === 'district') {
      updateDistrictTurnoutAndVoters(activeScope.districtId, undefined, newVoters);
    } else if (activeScope.type === 'ilce') {
      updateIlceTurnoutAndVoters(activeScope.ilceId, undefined, newVoters);
    }
  };

  const handleUnlockActive = () => {
    if (activeScope.type === 'abroad') {
      updateAbroadConfig({ syncWithNationalSwing: true });
    } else if (activeScope.type === 'province') {
      unlockProvince(activeScope.ilId);
    } else if (activeScope.type === 'district') {
      unlockDistrict(activeScope.districtId);
    } else if (activeScope.type === 'ilce') {
      unlockIlce(activeScope.ilceId);
    }
  };

  const sumDiff = scopeData.sum - 100;
  const isSumBalanced = Math.abs(sumDiff) < 0.08;

  return (
    <div className="editorial-card p-4 flex flex-col gap-3.5">
      {/* Scope Switcher Pills (National vs Abroad vs Local Unit Selector) */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200/80 text-xs font-semibold">
        <button
          onClick={() => setActiveScope({ type: 'national' })}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all ${
            activeScope.type === 'national'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          <span>{t.nationalScope}</span>
        </button>

        <button
          onClick={() => setActiveScope({ type: 'abroad' })}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition-all ${
            activeScope.type === 'abroad'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Globe2 className="w-3.5 h-3.5" />
          <span>{t.abroadScope}</span>
        </button>
      </div>

      {/* Clean Dropdowns to Jump Directly to Any Province / District / İlçe */}
      <div className="grid grid-cols-2 gap-2">
        <select
          value={
            activeScope.type === 'district'
              ? `d:${activeScope.districtId}`
              : activeScope.type === 'province'
              ? `p:${activeScope.ilId}`
              : ''
          }
          onChange={(e) => {
            const val = e.target.value;
            if (!val) setActiveScope({ type: 'national' });
            else if (val.startsWith('p:')) setActiveScope({ type: 'province', ilId: val.slice(2) });
            else if (val.startsWith('d:'))
              setActiveScope({ type: 'district', districtId: val.slice(2) });
          }}
          className="editorial-input px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50/70"
        >
          <option value="">İl veya Bölge Seçin...</option>
          <optgroup label="81 İl">
            {activeDataset.provinces.map((p) => (
              <option key={p.id} value={`p:${p.id}`}>
                {p.id} - {p.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="87 Seçim Çevresi">
            {activeDataset.districts.map((d) => (
              <option key={d.id} value={`d:${d.id}`}>
                {d.id} - {d.name} ({projection.districtResults[d.id]?.mpCount || d.mpCount} MV)
              </option>
            ))}
          </optgroup>
        </select>

        <select
          value={activeScope.type === 'ilce' ? activeScope.ilceId : ''}
          onChange={(e) => {
            if (e.target.value) setActiveScope({ type: 'ilce', ilceId: e.target.value });
          }}
          className="editorial-input px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50/70"
        >
          <option value="">İlçe Seçin (973 İlçe)...</option>
          {activeDataset.ilceler
            .filter((ilce) => {
              if (activeScope.type === 'province') return ilce.ilId === activeScope.ilId;
              if (activeScope.type === 'district') return ilce.districtId === activeScope.districtId;
              if (activeScope.type === 'ilce') {
                const cur = projection.ilceResults[activeScope.ilceId];
                return cur ? ilce.ilId === cur.ilId : true;
              }
              return true;
            })
            .slice(0, 300)
            .map((ilce) => (
              <option key={ilce.id} value={ilce.id}>
                {ilce.name} ({ilce.districtId})
              </option>
            ))}
        </select>
      </div>

      {/* Active Unit Title & Lock Indicator */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-slate-700 shrink-0" />
            <h2 className="text-sm font-bold text-slate-900 truncate">{scopeData.title}</h2>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">{scopeData.subtitle}</p>
        </div>

        {scopeData.canLock && (
          <div className="shrink-0">
            {scopeData.isLocked ? (
              <button
                onClick={handleUnlockActive}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100"
                title={t.resetUnitLock}
              >
                <Lock className="w-3 h-3 text-amber-600" />
                <span>Özel Giriş (Kilidi Aç)</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                <Unlock className="w-3 h-3 text-slate-400" />
                <span>Otomatik Swing</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Abroad Specific Checkboxes */}
      {activeScope.type === 'abroad' && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col gap-1.5 text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
            <input
              type="checkbox"
              checked={abroadConfig.enabled}
              onChange={(e) => updateAbroadConfig({ enabled: e.target.checked })}
              className="rounded accent-slate-900 w-3.5 h-3.5"
            />
            <span>{t.abroadEnabledLabel}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-600">
            <input
              type="checkbox"
              checked={abroadConfig.syncWithNationalSwing}
              onChange={(e) => updateAbroadConfig({ syncWithNationalSwing: e.target.checked })}
              className="rounded accent-slate-900 w-3.5 h-3.5"
            />
            <span>{t.abroadSyncLabel}</span>
          </label>
        </div>
      )}

      {/* Total Share Indicator & Normalization Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200/90 rounded-lg px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs">
          <CheckCircle2
            className={`w-4 h-4 ${
              isSumBalanced ? 'text-emerald-600' : 'text-amber-600'
            }`}
          />
          <span className="text-slate-600 font-medium">{t.totalShareSum}:</span>
          <span
            className={`font-mono font-bold ${
              isSumBalanced ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            %{scopeData.sum.toFixed(1)}
          </span>
          {!isSumBalanced && (
            <span className="text-[11px] font-mono text-amber-600">
              ({sumDiff >= 0 ? `+${sumDiff.toFixed(1)}` : sumDiff.toFixed(1)}%)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={normalizeActiveScopeShares}
            className="editorial-btn px-2 py-1 text-[11px]"
          >
            <Sparkles className="w-3 h-3 text-slate-500" />
            <span>{t.normalize100}</span>
          </button>
          <button
            onClick={sendActiveScopeRemainderToOther}
            className="editorial-btn px-2 py-1 text-[11px]"
          >
            <span>{t.sendToOther}</span>
          </button>
        </div>
      </div>

      {/* Compact Single-Row Party Sliders */}
      <div className="space-y-2">
        {parties.map((party) => {
          const val = Number((scopeData.shares[party.id] ?? 0).toFixed(2));
          const baseVal = Number((scopeData.baseShares[party.id] ?? 0).toFixed(2));
          const delta = val - baseVal;
          const seats = scopeData.partySeats ? scopeData.partySeats[party.id] ?? 0 : undefined;

          return (
            <div
              key={party.id}
              className="group flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg border border-transparent hover:border-slate-200 hover:bg-slate-50/70 transition-all"
            >
              {/* Party Badge */}
              <div className="flex items-center gap-2 w-20 shrink-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: party.color }}
                />
                <span className="font-bold text-xs text-slate-900 truncate" title={party.fullName}>
                  {party.shortName}
                </span>
              </div>

              {/* Smooth Range Slider */}
              <div className="flex-1 flex items-center">
                <input
                  type="range"
                  min={0}
                  max={70}
                  step={0.1}
                  value={Math.min(70, val)}
                  onChange={(e) => handleShareChange(party.id, parseFloat(e.target.value) || 0)}
                  className="w-full editorial-slider"
                />
              </div>

              {/* Delta Badge */}
              <span
                className={`w-12 text-right font-mono text-[11px] font-medium shrink-0 ${
                  delta > 0.05
                    ? 'text-emerald-600'
                    : delta < -0.05
                    ? 'text-rose-600'
                    : 'text-slate-400'
                }`}
              >
                {delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
              </span>

              {/* Direct Percentage Input */}
              <div className="relative flex items-center shrink-0">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={val}
                  onChange={(e) => handleShareChange(party.id, parseFloat(e.target.value) || 0)}
                  className="w-16 editorial-input pr-4 pl-1.5 py-1 text-right font-mono text-xs font-semibold text-slate-900"
                />
                <span className="absolute right-1.5 text-[10px] font-mono text-slate-400 pointer-events-none">
                  %
                </span>
              </div>

              {/* Projected Seats Pill */}
              {seats !== undefined && (
                <span
                  className={`w-12 text-center py-0.5 rounded-md font-mono text-[11px] font-semibold shrink-0 ${
                    seats > 0
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {seats} MV
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Expandable Turnout & Registered Voters Section */}
      <div className="border-t border-slate-200 pt-2.5">
        <button
          onClick={() => setShowVoterDetails((v) => !v)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-900 py-1"
        >
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>
              Katılım (%{scopeData.turnout.toFixed(1)}) & Seçmen Verileri (
              {scopeData.validVotes.toLocaleString('tr-TR')} Geçerli Oy)
            </span>
          </div>
          {showVoterDetails ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showVoterDetails && (
          <div className="mt-2.5 grid grid-cols-3 gap-2.5 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                {t.registeredVoters}
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                value={Math.round(scopeData.registeredVoters)}
                onChange={(e) => handleVotersChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full editorial-input px-2 py-1 font-mono text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                {t.turnoutPct}
              </label>
              <input
                type="number"
                min={1}
                max={100}
                step={0.1}
                value={Number(scopeData.turnout.toFixed(2))}
                onChange={(e) => handleTurnoutChange(parseFloat(e.target.value) || 0)}
                className="w-full editorial-input px-2 py-1 font-mono text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                {t.validVotes}
              </label>
              <div className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs font-semibold text-slate-800 truncate">
                {scopeData.validVotes.toLocaleString('tr-TR')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
