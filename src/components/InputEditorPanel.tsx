import React, { useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Globe2,
  Landmark,
  Lock,
  MapPin,
  Sparkles,
  TableProperties,
  Unlock,
  Users,
} from 'lucide-react';
import { ABROAD_COUNTRY_BY_ID } from '../data/abroadCountries';
import { getCachedBaseline, getCachedLocalBaseline } from '../data/baselineCache';
import { translations } from '../i18n/translations';
import { useElectionStore } from '../store/useElectionStore';
import { BaselineId, LocalBaselineId, LocalProvinceMode, SwingMode } from '../types/election';
import { formatInt, formatPct } from '../utils/format';
import { LocationSearchCombobox } from './LocationSearchCombobox';
import { PollQuickEntryModal } from './PollQuickEntryModal';
import { TurnoutMobilizationDrawer } from './TurnoutMobilizationDrawer';
import { UnitBuffDrawer } from './UnitBuffDrawer';

export const InputEditorPanel: React.FC = () => {
  const {
    lang,
    electionMode,
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
    abroadCountryOverrides,
    projection,
    official2023Projection,
    localBaselineId,
    localSwingMode,
    localProvinceMode,
    localTargetShares,
    localTargetTurnout,
    localProvinceOverrides,
    localIlceOverrides,
    localAllianceRules,
    localProjection,
    partyTurnoutMultipliers,
    provinceTurnoutMultipliers,
    localPartyTurnoutMultipliers,
    localProvinceTurnoutMultipliers,
    setBaselineId,
    setSwingMode,
    setActiveScope,
    setMapLayer,
    setZoomedProvinceId,
    updateNationalPartyShare,
    setNationalSharesBulk,
    normalizeActiveScopeShares,
    sendActiveScopeRemainderToOther,
    setNationalTurnout,
    setNationalRegisteredVoters,
    updateAbroadConfig,
    updateAbroadPartyShare,
    updateAbroadCountryShare,
    updateAbroadCountryTurnoutAndVoters,
    unlockAbroadCountry,
    updateProvinceShare,
    updateProvinceTurnoutAndVoters,
    unlockProvince,
    updateDistrictShare,
    updateDistrictTurnoutAndVoters,
    unlockDistrict,
    updateIlceShare,
    updateIlceTurnoutAndVoters,
    unlockIlce,
    setLocalBaselineId,
    setLocalSwingMode,
    setLocalProvinceMode,
    updateLocalPartyShare,
    normalizeLocalShares,
    sendLocalRemainderToOther,
    setLocalTurnout,
    setLocalRegisteredVoters,
    setLocalSharesBulk,
    syncLocalFromParliamentary,
    updateLocalProvinceShare,
    updateLocalProvinceTurnoutAndVoters,
    unlockLocalProvince,
    updateLocalIlceShare,
    updateLocalIlceTurnoutAndVoters,
    unlockLocalIlce,
    toggleLocalAllianceRule,
    setPartyTurnoutMultiplier,
    resetPartyTurnoutMultipliers,
    setProvinceTurnoutMultiplier,
    resetProvinceTurnoutMultipliers,
    setLocalPartyTurnoutMultiplier,
    resetLocalPartyTurnoutMultipliers,
    setLocalProvinceTurnoutMultiplier,
    resetLocalProvinceTurnoutMultipliers,
  } = useElectionStore();

  const [showVoterDetails, setShowVoterDetails] = useState(false);
  const [showMinorParties, setShowMinorParties] = useState(false);
  const [pollModalOpen, setPollModalOpen] = useState(false);

  const isLocal = electionMode === 'local';
  const t = translations[lang];
  const activeDataset = isLocal
    ? getCachedLocalBaseline(localBaselineId)
    : getCachedBaseline(baselineId, customBaseline);

  const scopeData = useMemo(() => {
    if (isLocal) {
      if (activeScope.type === 'province') {
        const pRes = localProjection.provinceResults[activeScope.ilId];
        const ovr = localProvinceOverrides[activeScope.ilId];
        const shares = ovr?.partyShares || pRes?.partyShares || {};
        const sum = Object.values(shares).reduce((a, b) => a + (Number(b) || 0), 0);
        return {
          title: `${pRes?.plateCode || activeScope.ilId} · ${pRes?.name || ''}`,
          subtitle: pRes?.isBuyuksehir
            ? lang === 'tr'
              ? 'Büyükşehir Belediyesi'
              : 'Metropolitan Municipality'
            : pRes?.countingBasis === 'merkez_ilce'
            ? lang === 'tr'
              ? 'İl Belediyesi (Merkez İlçe)'
              : 'Provincial Center (Merkez)'
            : lang === 'tr'
            ? 'İl Belediyesi (İl Geneli)'
            : 'Province-wide',
          isLocked: Boolean(ovr?.isLocked),
          canLock: true,
          registeredVoters: ovr?.registeredVoters ?? pRes?.registeredVoters ?? 0,
          turnout: ovr?.turnout ?? pRes?.turnout ?? localTargetTurnout,
          validVotes: pRes?.validVotes ?? 0,
          shares,
          baseShares: {},
          partySeats: undefined,
          sum,
        };
      }

      if (activeScope.type === 'ilce') {
        const iRes = localProjection.ilceResults[activeScope.ilceId];
        const ovr = localIlceOverrides[activeScope.ilceId];
        const provName = localProjection.provinceResults[iRes?.ilId || '']?.name || '';
        const shares = ovr?.partyShares || iRes?.partyShares || {};
        const sum = Object.values(shares).reduce((a, b) => a + (Number(b) || 0), 0);
        return {
          title: `${iRes?.name || activeScope.ilceId} (${provName})`,
          subtitle: lang === 'tr' ? 'İlçe Belediye Başkanlığı' : 'District Municipality',
          isLocked: Boolean(ovr?.isLocked),
          canLock: true,
          registeredVoters: ovr?.registeredVoters ?? iRes?.registeredVoters ?? 0,
          turnout: ovr?.turnout ?? iRes?.turnout ?? localTargetTurnout,
          validVotes: iRes?.validVotes ?? 0,
          shares,
          baseShares: {},
          partySeats: undefined,
          sum,
        };
      }

      const shares = localTargetShares;
      const sum = Object.values(shares).reduce((a, b) => a + (Number(b) || 0), 0);
      return {
        title: t.nationalScope,
        subtitle:
          lang === 'tr'
            ? '30 Büyükşehir + 51 İl Merkezi + 973 İlçe'
            : '30 Metropolitans + 51 Provincial + 973 Districts',
        isLocked: false,
        canLock: false,
        registeredVoters: localProjection.totalRegisteredVoters,
        turnout: localTargetTurnout,
        validVotes: localProjection.totalValidVotes,
        shares,
        baseShares: activeDataset.nationalBaseShares,
        partySeats: undefined,
        sum,
      };
    }

    if (activeScope.type === 'national') {
      const shares = nationalTargetShares;
      const baseShares = official2023Projection.nationalPartyShares;
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
      const baseShares = official2023Projection.abroadPartyShares;
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
      const basePRes = official2023Projection.provinceResults[activeScope.ilId];
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
      const baseDRes = official2023Projection.districtResults[activeScope.districtId];
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

    if (activeScope.type === 'abroadCountry') {
      const cRes = projection.abroadCountryResults[activeScope.countryId];
      const baseC = ABROAD_COUNTRY_BY_ID[activeScope.countryId];
      const ovr = abroadCountryOverrides[activeScope.countryId];
      const shares = ovr?.partyShares || cRes?.partyShares || {};
      const baseShares = baseC?.partyShares || {};
      const sum = Object.values(shares).reduce((a, b) => a + (Number(b) || 0), 0);
      return {
        title: lang === 'tr' ? cRes?.nameTr || activeScope.countryId : cRes?.nameEn || activeScope.countryId,
        subtitle: cRes?.isCustoms
          ? lang === 'tr'
            ? 'Yurt Dışı · 46 Gümrük Kapısı'
            : 'Abroad · 46 Customs Ports'
          : `${lang === 'tr' ? 'Yurt Dışı Temsilcilikleri' : 'Abroad Mission'} · ${cRes?.region || ''}`,
        isLocked: Boolean(ovr?.isLocked),
        canLock: true,
        registeredVoters: ovr?.registeredVoters ?? cRes?.registeredVoters ?? 0,
        turnout: ovr?.turnout ?? cRes?.turnout ?? 50,
        validVotes: cRes?.validVotes ?? 0,
        shares,
        baseShares,
        partySeats: undefined,
        sum,
      };
    }

    const ilceId = activeScope.type === 'ilce' ? activeScope.ilceId : '';
    const iRes = projection.ilceResults[ilceId];
    const baseIRes = official2023Projection.ilceResults[ilceId];
    const ovr = ilceOverrides[ilceId];
    const provName = projection.provinceResults[iRes?.ilId || '']?.name || '';
    const shares = ovr?.partyShares || iRes?.partyShares || {};
    const baseShares = baseIRes?.partyShares || {};
    const sum = Object.values(shares).reduce((a, b) => a + (Number(b) || 0), 0);
    return {
      title: `${iRes?.name || ilceId} (${provName})`,
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
    isLocal,
    activeScope,
    nationalTargetShares,
    nationalTargetTurnout,
    abroadConfig,
    provinceOverrides,
    districtOverrides,
    ilceOverrides,
    abroadCountryOverrides,
    abroadCountryOverrides,
    projection,
    official2023Projection,
    localTargetShares,
    localTargetTurnout,
    localProvinceOverrides,
    localIlceOverrides,
    localProjection,
    activeDataset,
    lang,
    t,
  ]);

  const handleShareChange = (partyId: string, val: number) => {
    if (isLocal) {
      if (activeScope.type === 'province') {
        updateLocalProvinceShare(activeScope.ilId, partyId, val);
      } else if (activeScope.type === 'ilce') {
        updateLocalIlceShare(activeScope.ilceId, partyId, val);
      } else {
        updateLocalPartyShare(partyId, val);
      }
      return;
    }
    if (activeScope.type === 'national') {
      updateNationalPartyShare(partyId, val);
    } else if (activeScope.type === 'abroad') {
      updateAbroadPartyShare(partyId, val);
    } else if (activeScope.type === 'abroadCountry') {
      updateAbroadCountryShare(activeScope.countryId, partyId, val);
    } else if (activeScope.type === 'province') {
      updateProvinceShare(activeScope.ilId, partyId, val);
    } else if (activeScope.type === 'district') {
      updateDistrictShare(activeScope.districtId, partyId, val);
    } else if (activeScope.type === 'ilce') {
      updateIlceShare(activeScope.ilceId, partyId, val);
    }
  };

  const handleTurnoutChange = (newTurnout: number) => {
    if (isLocal) {
      if (activeScope.type === 'province') {
        updateLocalProvinceTurnoutAndVoters(activeScope.ilId, newTurnout, undefined);
      } else if (activeScope.type === 'ilce') {
        updateLocalIlceTurnoutAndVoters(activeScope.ilceId, newTurnout, undefined);
      } else {
        setLocalTurnout(newTurnout);
      }
      return;
    }
    if (activeScope.type === 'national') {
      setNationalTurnout(newTurnout);
    } else if (activeScope.type === 'abroad') {
      updateAbroadConfig({ turnout: newTurnout });
    } else if (activeScope.type === 'abroadCountry') {
      updateAbroadCountryTurnoutAndVoters(activeScope.countryId, newTurnout, undefined);
    } else if (activeScope.type === 'province') {
      updateProvinceTurnoutAndVoters(activeScope.ilId, newTurnout, undefined);
    } else if (activeScope.type === 'district') {
      updateDistrictTurnoutAndVoters(activeScope.districtId, newTurnout, undefined);
    } else if (activeScope.type === 'ilce') {
      updateIlceTurnoutAndVoters(activeScope.ilceId, newTurnout, undefined);
    }
  };

  const handleVotersChange = (newVoters: number) => {
    if (isLocal) {
      if (activeScope.type === 'province') {
        updateLocalProvinceTurnoutAndVoters(activeScope.ilId, undefined, newVoters);
      } else if (activeScope.type === 'ilce') {
        updateLocalIlceTurnoutAndVoters(activeScope.ilceId, undefined, newVoters);
      } else {
        setLocalRegisteredVoters(newVoters);
      }
      return;
    }
    if (activeScope.type === 'national') {
      setNationalRegisteredVoters(newVoters);
    } else if (activeScope.type === 'abroad') {
      updateAbroadConfig({ registeredVoters: newVoters });
    } else if (activeScope.type === 'abroadCountry') {
      updateAbroadCountryTurnoutAndVoters(activeScope.countryId, undefined, newVoters);
    } else if (activeScope.type === 'province') {
      updateProvinceTurnoutAndVoters(activeScope.ilId, undefined, newVoters);
    } else if (activeScope.type === 'district') {
      updateDistrictTurnoutAndVoters(activeScope.districtId, undefined, newVoters);
    } else if (activeScope.type === 'ilce') {
      updateIlceTurnoutAndVoters(activeScope.ilceId, undefined, newVoters);
    }
  };

  const handleUnlockActive = () => {
    if (isLocal) {
      if (activeScope.type === 'province') unlockLocalProvince(activeScope.ilId);
      else if (activeScope.type === 'ilce') unlockLocalIlce(activeScope.ilceId);
      return;
    }
    if (activeScope.type === 'abroad') {
      updateAbroadConfig({ syncWithNationalSwing: true });
    } else if (activeScope.type === 'abroadCountry') {
      unlockAbroadCountry(activeScope.countryId);
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
          {isLocal ? (
            <select
              value={localBaselineId}
              onChange={(e) => setLocalBaselineId(e.target.value as LocalBaselineId)}
              className="studio-input border-[#090A0F] px-2 py-1.5 text-body font-bold text-[#090A0F] cursor-pointer"
            >
              <option value="2024_local">
                {lang === 'tr' ? '2024 Yerel Bazı' : '2024 Local Base'}
              </option>
              <option value="local_50_30_20">
                {lang === 'tr' ? '%50 2024 + %30 2023 + %20 2019' : '50% 2024 + 30% 2023 + 20% 2019'}
              </option>
              <option value="local_50_50">
                {lang === 'tr' ? '%50 2024 + %50 2023' : '50% 2024 + 50% 2023'}
              </option>
            </select>
          ) : (
            <select
              value={baselineId}
              onChange={(e) => setBaselineId(e.target.value as BaselineId)}
              className="studio-input border-[#090A0F] px-2 py-1.5 text-body font-bold text-[#090A0F] cursor-pointer"
            >
              <option value="blended_90_10">{lang === 'tr' ? '%90 2023 + %10 2024' : '90% 2023 + 10% 2024'}</option>
              <option value="2023_general">{lang === 'tr' ? 'Sadece 2023' : '2023 only'}</option>
              <option value="custom">{lang === 'tr' ? 'Özel CSV veri' : 'Custom CSV data'}</option>
            </select>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="eyebrow">
            {lang === 'tr' ? 'Salınım modeli' : 'Swing model'}
          </label>
          <select
            value={isLocal ? localSwingMode : swingMode}
            onChange={(e) =>
              isLocal
                ? setLocalSwingMode(e.target.value as SwingMode)
                : setSwingMode(e.target.value as SwingMode)
            }
            className="studio-input border-[#090A0F] px-2 py-1.5 text-body font-bold text-[#090A0F] cursor-pointer"
          >
            <option value="proportional">{lang === 'tr' ? 'Oransal (PS)' : 'Proportional (PS)'}</option>
            <option value="uniform">{lang === 'tr' ? 'Tekdüze (UNS)' : 'Uniform (UNS)'}</option>
          </select>
        </div>
      </div>

      {/* Local-specific controls: 51 İl Mode + Sync from Parliamentary + Ortak Aday pills */}
      {isLocal ? (
        <div className="space-y-2 border border-slate-300 bg-slate-50 p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex border border-[#090A0F] text-micro font-semibold bg-white">
              {(
                [
                  { id: 'merkez_ilce', tr: '51 İl: Merkez İlçe', en: '51 Prov: Merkez' },
                  { id: 'province_wide', tr: '51 İl: İl Geneli', en: '51 Prov: Wide' },
                ] as { id: LocalProvinceMode; tr: string; en: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setLocalProvinceMode(m.id)}
                  className={`px-2 py-1 transition-colors ${
                    localProvinceMode === m.id
                      ? 'bg-[#090A0F] text-white'
                      : 'text-[#090A0F] hover:bg-slate-100'
                  }`}
                >
                  {lang === 'tr' ? m.tr : m.en}
                </button>
              ))}
            </div>

            <button
              onClick={syncLocalFromParliamentary}
              className="inline-flex items-center gap-1 px-2 py-1 text-micro font-semibold border border-[#090A0F] bg-white hover:bg-[#090A0F] hover:text-white transition-colors"
              title={
                lang === 'tr'
                  ? 'Genel Seçim parti oranlarını yerel seçime kopyala'
                  : 'Copy party shares from Parliamentary scenario'
              }
            >
              <ArrowDownToLine className="w-3 h-3" />
              <span>{lang === 'tr' ? "Genel Seçim'den Aktar" : 'Sync'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {localAllianceRules.map((rule) => (
              <button
                key={rule.id}
                onClick={() => toggleLocalAllianceRule(rule.id)}
                className={`px-2 py-0.5 text-micro font-medium border transition-colors ${
                  rule.enabled
                    ? 'bg-[#090A0F] text-white border-[#090A0F]'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-[#090A0F]'
                }`}
              >
                {rule.enabled ? '✓ ' : '+ '}
                {rule.name}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Top Scope Selector Tabs (National vs Abroad) */
        <div className="grid grid-cols-2 border-[1.5px] border-[#090A0F] bg-white text-body font-bold">
          <button
            onClick={() => {
              setActiveScope({ type: 'national' });
              setMapLayer('87_district');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 border-r border-[#090A0F] transition-colors ${
              activeScope.type !== 'abroad' && activeScope.type !== 'abroadCountry'
                ? 'bg-[#090A0F] text-white'
                : 'text-[#090A0F] hover:bg-slate-100'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>{t.nationalScope}</span>
          </button>

          <button
            onClick={() => {
              setZoomedProvinceId(null);
              setActiveScope({ type: 'abroad' });
              setMapLayer('abroad_world');
            }}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 transition-colors ${
              activeScope.type === 'abroad' || activeScope.type === 'abroadCountry'
                ? 'bg-[#090A0F] text-white'
                : 'text-[#090A0F] hover:bg-slate-100'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>{t.abroadScope}</span>
          </button>
        </div>
      )}

      {/* Instant Turkish-Aware Location Finder (Provinces, Districts, İlçeler & Abroad Countries) */}
      <LocationSearchCombobox dataset={activeDataset} isLocal={isLocal} />

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

      {/* Per-Unit Local Buff (±pp) Drawer */}
      {(activeScope.type === 'province' ||
        (activeScope.type === 'district' && !isLocal) ||
        activeScope.type === 'ilce') && (
        <UnitBuffDrawer
          mode={electionMode}
          unitType={activeScope.type}
          unitId={
            activeScope.type === 'province'
              ? activeScope.ilId
              : activeScope.type === 'district'
              ? activeScope.districtId
              : activeScope.ilceId
          }
          unitName={scopeData.title}
          parentIlId={
            activeScope.type === 'district'
              ? projection.districtResults[activeScope.districtId]?.ilId
              : activeScope.type === 'ilce'
              ? isLocal
                ? localProjection.ilceResults[activeScope.ilceId]?.ilId
                : projection.ilceResults[activeScope.ilceId]?.ilId
              : undefined
          }
          parentDistrictId={
            activeScope.type === 'ilce' && !isLocal
              ? projection.ilceResults[activeScope.ilceId]?.districtId
              : undefined
          }
          isLocked={scopeData.isLocked}
          entities={parties.map((p) => ({
            id: p.id,
            shortName: p.shortName,
            name: p.fullName,
            color: p.color,
          }))}
        />
      )}

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

      {activeScope.type === 'abroadCountry' && (
        <div className="flex items-center justify-between gap-2 bg-slate-50 border border-[#090A0F] px-2.5 py-2 text-micro">
          <button
            type="button"
            onClick={() => setActiveScope({ type: 'abroad' })}
            className="font-bold text-[#090A0F] hover:underline"
          >
            ← {lang === 'tr' ? 'Tüm Yurt Dışı Toplamı' : 'All Abroad Summary'}
          </button>
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

        <div className="flex flex-wrap items-center gap-1.5">
          {((!isLocal && activeScope.type === 'national') || (isLocal && activeScope.type === 'national')) && (
            <button
              type="button"
              onClick={() => setPollModalOpen(true)}
              className="studio-btn px-2 py-1 text-micro font-bold"
              title={lang === 'tr' ? 'Hızlı yüzde yapıştır veya tablodan gir' : 'Paste or enter percentages quickly'}
            >
              <TableProperties className="w-3 h-3" />
              <span>{lang === 'tr' ? 'Yapıştır' : 'Paste'}</span>
            </button>
          )}
          <button
            onClick={() => (isLocal ? normalizeLocalShares() : normalizeActiveScopeShares())}
            className="studio-btn px-2 py-1 text-micro"
          >
            <Sparkles className="w-3 h-3" />
            <span>{t.normalize100}</span>
          </button>
          <button
            onClick={() => (isLocal ? sendLocalRemainderToOther() : sendActiveScopeRemainderToOther())}
            className="studio-btn px-2 py-1 text-micro"
          >
            <span>{t.sendToOther}</span>
          </button>
        </div>
      </div>

      {/* Sharp Single-Row Party Signal Sliders */}
      {(() => {
        const renderPartyRow = (party: (typeof parties)[number]) => {
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
        };

        const majorParties = parties.filter(
          (p) => !p.isOther && (scopeData.shares[p.id] ?? 0) >= 1.0
        );
        const minorParties = parties.filter(
          (p) => !p.isOther && (scopeData.shares[p.id] ?? 0) < 1.0
        );
        const otherParties = parties.filter((p) => p.isOther);
        const minorSum = minorParties.reduce(
          (acc, p) => acc + (scopeData.shares[p.id] ?? 0),
          0
        );

        return (
          <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
            {majorParties.map(renderPartyRow)}

            {minorParties.length > 0 && (
              <div className="bg-slate-50/70">
                <button
                  type="button"
                  onClick={() => setShowMinorParties((prev) => !prev)}
                  className="w-full py-2 px-1.5 flex items-center justify-between gap-2 text-left hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {showMinorParties ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[#090A0F] shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[#090A0F] shrink-0" />
                    )}
                    <span className="text-micro font-bold uppercase tracking-wider text-[#090A0F]">
                      {lang === 'tr'
                        ? `Küçük Partiler (<%1) · ${minorParties.length}`
                        : `Minor Parties (<1%) · ${minorParties.length}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {!showMinorParties &&
                      minorParties.map((p) => (
                        <span
                          key={p.id}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white border border-slate-300 text-[#090A0F]"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: p.color }}
                          />
                          {p.shortName} {(scopeData.shares[p.id] ?? 0).toFixed(1)}
                        </span>
                      ))}
                    <span className="text-micro font-mono font-bold text-slate-600">
                      %{minorSum.toFixed(2)}
                    </span>
                  </div>
                </button>

                {showMinorParties && (
                  <div className="divide-y divide-slate-200 border-t border-slate-200 bg-white">
                    {minorParties.map(renderPartyRow)}
                  </div>
                )}
              </div>
            )}

            {otherParties.map(renderPartyRow)}
          </div>
        );
      })()}

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
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 border border-[#090A0F] p-2.5 text-body">
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
                className="w-full studio-input border-[#090A0F] px-2 py-1.5 sm:py-1 text-body font-bold"
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
                className="w-full studio-input border-[#090A0F] px-2 py-1.5 sm:py-1 text-body font-bold"
              />
            </div>

            <div>
              <label className="block text-micro font-medium text-slate-500 mb-1">
                {t.validVotes}
              </label>
              <div className="px-2 py-1.5 sm:py-1 bg-white border border-[#090A0F] text-body font-bold text-[#090A0F] truncate">
                {formatInt(scopeData.validVotes, lang)}
              </div>
            </div>
          </div>
        )}
      </div>

      {(() => {
        const scopedIlId =
          activeScope.type === 'province'
            ? activeScope.ilId
            : activeScope.type === 'district'
            ? projection.districtResults[activeScope.districtId]?.ilId
            : activeScope.type === 'ilce'
            ? (isLocal
                ? localProjection.ilceResults[activeScope.ilceId]?.ilId
                : projection.ilceResults[activeScope.ilceId]?.ilId)
            : undefined;
        const scopedProvName = scopedIlId
          ? projection.provinceResults[scopedIlId]?.name ?? scopedIlId
          : null;
        const natMults = isLocal ? localPartyTurnoutMultipliers : partyTurnoutMultipliers;
        const activeMults = scopedIlId
          ? (isLocal
              ? localProvinceTurnoutMultipliers[scopedIlId]
              : provinceTurnoutMultipliers[scopedIlId]) ?? {}
          : natMults;

        return (
          <TurnoutMobilizationDrawer
            lang={lang}
            scopeLabel={scopedProvName}
            items={parties.map((p) => ({
              id: p.id,
              shortName: p.shortName,
              label: p.fullName,
              color: p.color,
            }))}
            multipliers={activeMults}
            fallbackMultipliers={scopedIlId ? natMults : undefined}
            onChange={(id, factor) => {
              if (scopedIlId) {
                if (isLocal) setLocalProvinceTurnoutMultiplier(scopedIlId, id, factor);
                else setProvinceTurnoutMultiplier(scopedIlId, id, factor);
              } else {
                if (isLocal) setLocalPartyTurnoutMultiplier(id, factor);
                else setPartyTurnoutMultiplier(id, factor);
              }
            }}
            onReset={() => {
              if (scopedIlId) {
                if (isLocal) resetLocalProvinceTurnoutMultipliers(scopedIlId);
                else resetProvinceTurnoutMultipliers(scopedIlId);
              } else {
                if (isLocal) resetLocalPartyTurnoutMultipliers();
                else resetPartyTurnoutMultipliers();
              }
            }}
          />
        );
      })()}

      <PollQuickEntryModal
        isOpen={pollModalOpen}
        onClose={() => setPollModalOpen(false)}
        lang={lang}
        scopeTitle={scopeData.title}
        items={parties.map((p) => ({
          id: p.id,
          shortName: p.shortName,
          fullName: p.fullName,
          color: p.color,
          isOther: p.isOther,
          currentValue: scopeData.shares[p.id] ?? 0,
        }))}
        onApply={(vals) => {
          if (isLocal) setLocalSharesBulk(vals);
          else setNationalSharesBulk(vals);
        }}
      />
    </div>
  );
};
