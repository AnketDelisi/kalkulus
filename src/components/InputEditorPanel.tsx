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
import { BASELINES } from '../data/baselines';
import { translations } from '../i18n/translations';
import { useElectionStore } from '../store/useElectionStore';
import { BaselineId, SwingMode } from '../types/election';
import { formatInt, formatPct } from '../utils/format';

export const InputEditorPanel: React.FC = () => {
  const {
    lang,
    baselineId,
    swingMode,
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
    setBaselineId,
    setSwingMode,
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
      : baselineId === '2023_general'
      ? BASELINES['2023_general']
      : BASELINES['blended_90_10'];

  const scopeData = useMemo(() => {
    if (activeScope.type === 'national') {
      const shares = nationalTargetShares;
      const baseShares = activeDataset.nationalBaseShares;
      const sum = Object.values(shares).reduce((a, b) => a + (Number(b) || 0), 0);
      return {
        title: t.nationalScope,
        subtitle: lang === 'tr' ? '81 il, 87 seçim çevresi, 973 ilçe' : '81 provinces, 87 districts, 973 ilçeler',
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
        subtitle: lang === 'tr' ? '87 seçim çevresine oransal dağıtım' : 'Proportional distribution across 87 districts',
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
        title: `${pRes?.plateCode || activeScope.ilId} · ${pRes?.name || ''}`,
        subtitle: `${t.provinceScope} · ${pRes?.mpCount || 0} ${lang === 'tr' ? 'milletvekili' : 'MPs'}`,
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
        title: `${activeScope.districtId} · ${dRes?.name || ''}`,
        subtitle: `${t.districtScope} · ${dRes?.mpCount || 0} ${lang === 'tr' ? 'milletvekili' : 'MPs'}`,
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
      subtitle: `${t.ilceScope} · ${lang === 'tr' ? 'Bölge' : 'District'}: ${iRes?.districtId || ''}`,
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
    <div className="studio-panel p-4 flex flex-col gap-3.5">
      {/* Model Parameters: Base Election & Swing Mode */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="eyebrow">
            {lang === 'tr' ? 'Baz seçim' : 'Base election'}
          </label>
          <select
            value={baselineId}
            onChange={(e) => setBaselineId(e.target.value as BaselineId)}
            className="studio-input border-[#090A0F] px-2 py-1.5 text-body font-bold text-[#090A0F] cursor-pointer"
          >
            <option value="blended_90_10">{lang === 'tr' ? '%90 2023 + %10 2024' : '90% 2023 + 10% 2024'}</option>
            <option value="2023_general">{lang === 'tr' ? 'Sadece 2023' : '2023 only'}</option>
            <option value="custom">{lang === 'tr' ? 'Özel CSV veri' : 'Custom CSV data'}</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="eyebrow">
            {lang === 'tr' ? 'Salınım modeli' : 'Swing model'}
          </label>
          <select
            value={swingMode}
            onChange={(e) => setSwingMode(e.target.value as SwingMode)}
            className="studio-input border-[#090A0F] px-2 py-1.5 text-body font-bold text-[#090A0F] cursor-pointer"
          >
            <option value="proportional">{lang === 'tr' ? 'Oransal (PS)' : 'Proportional (PS)'}</option>
            <option value="uniform">{lang === 'tr' ? 'Tekdüze (UNS)' : 'Uniform (UNS)'}</option>
          </select>
        </div>
      </div>

      {/* Top Scope Selector Tabs (National vs Abroad) */}
      <div className="grid grid-cols-2 border-[1.5px] border-[#090A0F] bg-white text-body font-bold">
        <button
          onClick={() => setActiveScope({ type: 'national' })}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 border-r border-[#090A0F] transition-colors ${
            activeScope.type === 'national'
              ? 'bg-[#090A0F] text-white'
              : 'text-[#090A0F] hover:bg-slate-100'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          <span>{t.nationalScope}</span>
        </button>

        <button
          onClick={() => setActiveScope({ type: 'abroad' })}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 transition-colors ${
            activeScope.type === 'abroad'
              ? 'bg-[#090A0F] text-white'
              : 'text-[#090A0F] hover:bg-slate-100'
          }`}
        >
          <Globe2 className="w-3.5 h-3.5" />
          <span>{t.abroadScope}</span>
        </button>
      </div>

      {/* Direct Jump Selectors for 87 Electoral Regions / 81 Provinces & 973 İlçeler */}
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
          className="studio-input border-[#090A0F] px-2.5 py-1.5 text-body font-medium text-[#090A0F]"
        >
          <option value="">{lang === 'tr' ? 'Bölge veya il seçin...' : 'Select district or province...'}</option>
          <optgroup label={lang === 'tr' ? '87 seçim çevresi' : '87 electoral districts'}>
            {activeDataset.districts.map((d) => (
              <option key={d.id} value={`d:${d.id}`}>
                {d.id} - {d.name} ({projection.districtResults[d.id]?.mpCount || d.mpCount} {lang === 'tr' ? 'MV' : 'MP'})
              </option>
            ))}
          </optgroup>
          <optgroup label={lang === 'tr' ? '81 il' : '81 provinces'}>
            {activeDataset.provinces.map((p) => (
              <option key={p.id} value={`p:${p.id}`}>
                {p.id} - {p.name}
              </option>
            ))}
          </optgroup>
        </select>

        <select
          value={activeScope.type === 'ilce' ? activeScope.ilceId : ''}
          onChange={(e) => {
            if (e.target.value) setActiveScope({ type: 'ilce', ilceId: e.target.value });
          }}
          className="studio-input border-[#090A0F] px-2.5 py-1.5 text-body font-medium text-[#090A0F]"
        >
          <option value="">{lang === 'tr' ? 'İlçe seçin (973)...' : 'Select ilçe (973)...'}</option>
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
            .map((ilce) => (
              <option key={ilce.id} value={ilce.id}>
                {ilce.name} ({ilce.districtId})
              </option>
            ))}
        </select>
      </div>

      {/* Active Unit Monochrome Banner */}
      <div className="bg-[#090A0F] text-white p-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <h2 className="text-title font-bold truncate">
              {scopeData.title}
            </h2>
          </div>
          <p className="text-micro text-slate-400 mt-0.5">{scopeData.subtitle}</p>
        </div>

        {scopeData.canLock && (
          <div className="shrink-0">
            {scopeData.isLocked ? (
              <button
                onClick={handleUnlockActive}
                className="inline-flex items-center gap-1 px-2 py-1 text-micro font-bold bg-amber-400 text-[#090A0F] hover:bg-amber-300"
                title={t.resetUnitLock}
              >
                <Lock className="w-3 h-3" />
                <span>{lang === 'tr' ? 'Kilitli ×' : 'Locked ×'}</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-micro border border-slate-700 text-slate-300">
                <Unlock className="w-3 h-3 text-slate-400" />
                <span>{lang === 'tr' ? 'Otomatik' : 'Auto'}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Abroad Checkboxes */}
      {activeScope.type === 'abroad' && (
        <div className="bg-slate-50 border border-[#090A0F] p-2.5 flex flex-col gap-1.5 text-body">
          <label className="flex items-center gap-2 cursor-pointer font-medium text-[#090A0F]">
            <input
              type="checkbox"
              checked={abroadConfig.enabled}
              onChange={(e) => updateAbroadConfig({ enabled: e.target.checked })}
              className="accent-[#090A0F] w-3.5 h-3.5"
            />
            <span>{t.abroadEnabledLabel}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-slate-600">
            <input
              type="checkbox"
              checked={abroadConfig.syncWithNationalSwing}
              onChange={(e) => updateAbroadConfig({ syncWithNationalSwing: e.target.checked })}
              className="accent-[#090A0F] w-3.5 h-3.5"
            />
            <span>{t.abroadSyncLabel}</span>
          </label>
        </div>
      )}

      {/* Total Share Indicator & Normalization Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 border border-[#090A0F] px-3 py-2">
        <div className="flex items-center gap-1.5 text-body">
          <CheckCircle2
            className={`w-4 h-4 ${
              isSumBalanced ? 'text-emerald-600' : 'text-amber-600'
            }`}
          />
          <span className="text-slate-600 font-medium">{lang === 'tr' ? 'Toplam:' : 'Total:'}</span>
          <span
            className={`font-bold ${
              isSumBalanced ? 'text-[#090A0F]' : 'text-amber-700'
            }`}
          >
            {formatPct(scopeData.sum, lang, 1)}
          </span>
          {!isSumBalanced && (
            <span className="text-micro font-bold text-amber-700">
              ({sumDiff >= 0 ? `+${formatPct(sumDiff, lang, 1)}` : formatPct(sumDiff, lang, 1)})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={normalizeActiveScopeShares}
            className="studio-btn px-2 py-1 text-micro"
          >
            <Sparkles className="w-3 h-3" />
            <span>{t.normalize100}</span>
          </button>
          <button
            onClick={sendActiveScopeRemainderToOther}
            className="studio-btn px-2 py-1 text-micro"
          >
            <span>{t.sendToOther}</span>
          </button>
        </div>
      </div>

      {/* Sharp Single-Row Party Signal Sliders */}
      <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
        {parties.map((party) => {
          const val = Number((scopeData.shares[party.id] ?? 0).toFixed(2));
          const baseVal = Number((scopeData.baseShares[party.id] ?? 0).toFixed(2));
          const delta = val - baseVal;
          const seats = scopeData.partySeats ? scopeData.partySeats[party.id] ?? 0 : undefined;

          return (
            <div
              key={party.id}
              className="group flex items-center gap-2.5 py-2 px-1 hover:bg-slate-50 transition-colors"
            >
              {/* Party Logo (tinted with party color) + Party Code */}
              <div className="flex items-center gap-2 w-24 shrink-0">
                {party.logoUrl ? (
                  <span
                    role="img"
                    aria-label={party.shortName}
                    className="w-5 h-5 shrink-0 inline-block"
                    style={{
                      backgroundColor: party.color,
                      WebkitMaskImage: `url(${party.logoUrl})`,
                      maskImage: `url(${party.logoUrl})`,
                      WebkitMaskSize: 'contain',
                      maskSize: 'contain',
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                      WebkitMaskPosition: 'center',
                      maskPosition: 'center',
                    }}
                  />
                ) : (
                  <span
                    className="w-3.5 h-3.5 shrink-0 border border-[#090A0F]"
                    style={{ backgroundColor: party.color }}
                  />
                )}
                <span
                  className="font-bold text-body text-[#090A0F] truncate"
                  title={party.fullName}
                >
                  {party.shortName}
                </span>
              </div>

              {/* Precision Range Slider */}
              <div className="flex-1 flex items-center">
                <input
                  type="range"
                  min={0}
                  max={70}
                  step={0.1}
                  value={Math.min(70, val)}
                  onChange={(e) => handleShareChange(party.id, parseFloat(e.target.value) || 0)}
                  className="w-full studio-slider"
                />
              </div>

              {/* Delta Badge */}
              <span
                className={`w-12 text-right text-micro font-bold shrink-0 ${
                  delta > 0.05
                    ? 'text-emerald-600'
                    : delta < -0.05
                    ? 'text-rose-600'
                    : 'text-slate-400'
                }`}
              >
                {delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
              </span>

              {/* Sharp Numeric Input */}
              <div className="relative flex items-center shrink-0">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={val}
                  onChange={(e) => handleShareChange(party.id, parseFloat(e.target.value) || 0)}
                  className="w-16 studio-input border-[#090A0F] pr-4 pl-1.5 py-1 text-right text-body font-bold text-[#090A0F]"
                />
                <span className="absolute right-1.5 text-micro text-slate-400 pointer-events-none">
                  %
                </span>
              </div>

              {/* Projected Seats Pill */}
              {seats !== undefined && (
                <span
                  className={`w-14 text-center py-1 text-micro font-bold shrink-0 border ${
                    seats > 0
                      ? 'bg-[#090A0F] text-white border-[#090A0F]'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}
                >
                  {seats} {lang === 'tr' ? 'MV' : 'MP'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Expandable Turnout & Registered Voters Section */}
      <div className="pt-1">
        <button
          onClick={() => setShowVoterDetails((v) => !v)}
          className="w-full flex items-center justify-between text-body font-bold text-[#090A0F] hover:bg-slate-100 px-2.5 py-2 border border-slate-300"
        >
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>
              {lang === 'tr' ? 'Katılım' : 'Turnout'}: {formatPct(scopeData.turnout, lang, 1)} ·{' '}
              {lang === 'tr' ? 'Geçerli oy' : 'Valid votes'}: {formatInt(scopeData.validVotes, lang)}
            </span>
          </div>
          {showVoterDetails ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showVoterDetails && (
          <div className="mt-2 grid grid-cols-3 gap-2 bg-slate-50 border border-[#090A0F] p-2.5 text-body">
            <div>
              <label className="block text-micro font-medium text-slate-500 mb-1">
                {t.registeredVoters}
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                value={Math.round(scopeData.registeredVoters)}
                onChange={(e) => handleVotersChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full studio-input border-[#090A0F] px-2 py-1 text-body font-bold"
              />
            </div>

            <div>
              <label className="block text-micro font-medium text-slate-500 mb-1">
                {t.turnoutPct}
              </label>
              <input
                type="number"
                min={1}
                max={100}
                step={0.1}
                value={Number(scopeData.turnout.toFixed(2))}
                onChange={(e) => handleTurnoutChange(parseFloat(e.target.value) || 0)}
                className="w-full studio-input border-[#090A0F] px-2 py-1 text-body font-bold"
              />
            </div>

            <div>
              <label className="block text-micro font-medium text-slate-500 mb-1">
                {t.validVotes}
              </label>
              <div className="px-2 py-1 bg-white border border-[#090A0F] text-body font-bold text-[#090A0F] truncate">
                {formatInt(scopeData.validVotes, lang)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
