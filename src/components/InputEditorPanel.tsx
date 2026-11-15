import React, { useMemo } from 'react';
import {
  CheckCircle2,
  Globe2,
  Landmark,
  Lock,
  MapPin,
  Percent,
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

  const t = translations[lang];
  const activeDataset =
    baselineId === 'custom' && customBaseline
      ? customBaseline
      : BASELINES[baselineId] || BASELINES['2023_general'];

  // Resolve current scope's metadata, shares, turnout, voters, and lock state
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
        title: `${pRes?.plateCode || activeScope.ilId} - ${pRes?.name || ''}`,
        subtitle: `${t.provinceScope} • ${pRes?.mpCount || 0} Milletvekili`,
        isLocked: Boolean(ovr?.isLocked),
        canLock: true,
        registeredVoters: ovr?.registeredVoters ?? pRes?.registeredVoters ?? 0,
        turnout: ovr?.turnout ?? pRes?.turnout ?? 85,
        validVotes: pRes?.totalValidVotes ?? 0,
        shares,
        baseShares,
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
        sum,
      };
    }

    // activeScope.type === 'ilce'
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
    <div className="pixel-box p-3 flex flex-col gap-3 h-full">
      {/* Scope Switcher Tabs (National / Abroad / Active Local Selection) */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={() => setActiveScope({ type: 'national' })}
          className={`pixel-btn py-1.5 px-2 text-xs ${
            activeScope.type === 'national'
              ? 'pixel-btn-amber'
              : 'bg-slate-900 text-slate-300'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          <span>{t.nationalScope}</span>
        </button>

        <button
          onClick={() => setActiveScope({ type: 'abroad' })}
          className={`pixel-btn py-1.5 px-2 text-xs ${
            activeScope.type === 'abroad'
              ? 'pixel-btn-amber'
              : 'bg-slate-900 text-slate-300'
          }`}
        >
          <Globe2 className="w-3.5 h-3.5" />
          <span>{t.abroadScope}</span>
        </button>
      </div>

      {/* Quick Selector for Any İl / Seçim Çevresi / İlçe */}
      <div className="grid grid-cols-2 gap-1.5 bg-slate-950/90 border-2 border-slate-800 p-2 text-xs">
        <div>
          <label className="block text-[10px] font-mono text-slate-400 mb-1">
            İL / SEÇİM ÇEVRESİ SEÇ:
          </label>
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
              if (!val) {
                setActiveScope({ type: 'national' });
              } else if (val.startsWith('p:')) {
                setActiveScope({ type: 'province', ilId: val.slice(2) });
              } else if (val.startsWith('d:')) {
                setActiveScope({ type: 'district', districtId: val.slice(2) });
              }
            }}
            className="w-full pixel-input px-2 py-1 text-xs"
          >
            <option value="">-- Türkiye Geneli --</option>
            <optgroup label="87 Seçim Çevresi">
              {activeDataset.districts.map((d) => (
                <option key={d.id} value={`d:${d.id}`}>
                  {d.id} - {d.name} ({projection.districtResults[d.id]?.mpCount || d.mpCount} MV)
                </option>
              ))}
            </optgroup>
            <optgroup label="81 İl">
              {activeDataset.provinces.map((p) => (
                <option key={p.id} value={`p:${p.id}`}>
                  {p.id} - {p.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-slate-400 mb-1">
            İLÇE SEÇ (973 İLÇE):
          </label>
          <select
            value={activeScope.type === 'ilce' ? activeScope.ilceId : ''}
            onChange={(e) => {
              if (e.target.value) {
                setActiveScope({ type: 'ilce', ilceId: e.target.value });
              }
            }}
            className="w-full pixel-input px-2 py-1 text-xs"
          >
            <option value="">-- İlçe Seçin --</option>
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
      </div>

      {/* Active Unit Title Banner & Lock Status */}
      <div className="bg-slate-900 border-2 border-slate-700 p-2.5 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="font-pixel text-xs text-white truncate">{scopeData.title}</h3>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{scopeData.subtitle}</p>
        </div>

        {scopeData.canLock && (
          <div className="flex items-center gap-1.5 shrink-0">
            {scopeData.isLocked ? (
              <button
                onClick={handleUnlockActive}
                className="pixel-btn px-2 py-1 text-[10px] border-amber-500 bg-amber-950/80 text-amber-300"
                title={t.resetUnitLock}
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>{t.lockedUnitBadge} (×)</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono bg-slate-950 border border-slate-700 text-slate-400">
                <Unlock className="w-3 h-3 text-cyan-400" />
                {t.unlockedUnitBadge}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Abroad specific toggles */}
      {activeScope.type === 'abroad' && (
        <div className="bg-slate-950 border-2 border-slate-800 p-2 flex flex-col gap-1.5 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={abroadConfig.enabled}
              onChange={(e) => updateAbroadConfig({ enabled: e.target.checked })}
              className="accent-amber-500 w-4 h-4"
            />
            <span className="font-medium text-slate-200">{t.abroadEnabledLabel}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={abroadConfig.syncWithNationalSwing}
              onChange={(e) => updateAbroadConfig({ syncWithNationalSwing: e.target.checked })}
              className="accent-cyan-500 w-4 h-4"
            />
            <span className="text-slate-300">{t.abroadSyncLabel}</span>
          </label>
        </div>
      )}

      {/* Turnout (%) & Registered Voters (Seçmen) Controls */}
      <div className="grid grid-cols-3 gap-2 bg-slate-950/90 border-2 border-slate-800 p-2.5 text-xs">
        <div>
          <label className="flex items-center gap-1 text-[10px] font-mono text-slate-400 mb-1">
            <Users className="w-3 h-3 text-cyan-400" />
            {t.registeredVoters}
          </label>
          <input
            type="number"
            min={0}
            step={1000}
            value={Math.round(scopeData.registeredVoters)}
            onChange={(e) => handleVotersChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="w-full pixel-input px-1.5 py-1 text-xs font-bold text-slate-100"
          />
        </div>

        <div>
          <label className="flex items-center gap-1 text-[10px] font-mono text-slate-400 mb-1">
            <Percent className="w-3 h-3 text-amber-400" />
            {t.turnoutPct}
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={100}
              step={0.1}
              value={Number(scopeData.turnout.toFixed(2))}
              onChange={(e) => handleTurnoutChange(parseFloat(e.target.value) || 0)}
              className="w-full pixel-input px-1.5 py-1 text-xs font-bold text-amber-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono text-slate-400 mb-1">
            {t.validVotes}
          </label>
          <div className="px-2 py-1 bg-slate-900 border-2 border-slate-800 font-mono text-xs font-bold text-emerald-400 truncate">
            {scopeData.validVotes.toLocaleString('tr-TR')}
          </div>
        </div>
      </div>

      {/* Live Total Percentage Bar & Normalization Helper Buttons */}
      <div className="bg-slate-900 border-2 border-slate-700 p-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <CheckCircle2
            className={`w-4 h-4 ${
              isSumBalanced ? 'text-emerald-400' : 'text-amber-400'
            }`}
          />
          <span className="text-xs font-mono text-slate-300">{t.totalShareSum}:</span>
          <span
            className={`font-mono text-xs font-bold px-1.5 py-0.5 border ${
              isSumBalanced
                ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300'
                : 'bg-amber-950/80 border-amber-500 text-amber-300'
            }`}
          >
            %{scopeData.sum.toFixed(2)} ({sumDiff >= 0 ? `+${sumDiff.toFixed(2)}` : sumDiff.toFixed(2)}%)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={normalizeActiveScopeShares}
            className="pixel-btn px-2 py-1 text-[11px] text-cyan-300 border-cyan-600"
          >
            <Sparkles className="w-3 h-3" />
            <span>{t.normalize100}</span>
          </button>
          <button
            onClick={sendActiveScopeRemainderToOther}
            className="pixel-btn px-2 py-1 text-[11px] text-amber-300 border-amber-600"
          >
            <span>{t.sendToOther}</span>
          </button>
        </div>
      </div>

      {/* Party Share Sliders & Direct Inputs */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[440px]">
        {parties.map((party) => {
          const val = Number((scopeData.shares[party.id] ?? 0).toFixed(2));
          const baseVal = Number((scopeData.baseShares[party.id] ?? 0).toFixed(2));
          const delta = val - baseVal;
          const rawVotes = Math.round(scopeData.validVotes * (val / 100));

          return (
            <div
              key={party.id}
              className="bg-slate-950/90 border-2 border-slate-800 hover:border-slate-700 p-2 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3.5 h-3.5 shrink-0 border border-slate-950 shadow-[1px_1px_0px_#000]"
                    style={{ backgroundColor: party.color }}
                  />
                  <span className="font-pixel text-xs text-white">{party.shortName}</span>
                  <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                    {party.fullName}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Raw Vote Count Estimate */}
                  <span className="text-[10px] font-mono text-slate-400">
                    {rawVotes.toLocaleString('tr-TR')} oy
                  </span>

                  {/* Delta vs Baseline */}
                  <span
                    className={`text-[10px] font-mono px-1 py-0.5 font-semibold ${
                      delta > 0.05
                        ? 'text-emerald-400 bg-emerald-950/50'
                        : delta < -0.05
                        ? 'text-rose-400 bg-rose-950/50'
                        : 'text-slate-500'
                    }`}
                  >
                    {delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}%
                  </span>

                  {/* Numeric Input */}
                  <div className="flex items-center">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={val}
                      onChange={(e) => handleShareChange(party.id, parseFloat(e.target.value) || 0)}
                      className="w-16 pixel-input px-1.5 py-0.5 text-right text-xs font-bold text-amber-300"
                    />
                    <span className="ml-1 text-xs font-mono text-slate-400">%</span>
                  </div>
                </div>
              </div>

              {/* Range Slider */}
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={75}
                  step={0.1}
                  value={Math.min(75, val)}
                  onChange={(e) => handleShareChange(party.id, parseFloat(e.target.value) || 0)}
                  className="w-full pixel-slider"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
