import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Globe2, Landmark, MapPin, Search, X } from 'lucide-react';
import { ABROAD_COUNTRIES_2023 } from '../data/abroadCountries';
import { ActiveEditorScope, useElectionStore } from '../store/useElectionStore';
import { BaselineDataset } from '../types/election';

export function normalizeTr(input: string): string {
  return input
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ş/g, 's')
    .replace(/ş/g, 's')
    .replace(/Ç/g, 'c')
    .replace(/ç/g, 'c')
    .replace(/Ğ/g, 'g')
    .replace(/ğ/g, 'g')
    .replace(/Ö/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/Ü/g, 'u')
    .replace(/ü/g, 'u')
    .toLowerCase()
    .trim();
}

export interface SearchLocationItem {
  key: string;
  category: 'district' | 'province' | 'ilce' | 'abroadCountry';
  label: string;
  sublabel: string;
  searchNorm: string;
  scope: ActiveEditorScope;
  switchMapToAbroad?: boolean;
}

interface LocationSearchComboboxProps {
  dataset: BaselineDataset;
  isLocal: boolean;
  isPresidential?: boolean;
}

export const LocationSearchCombobox: React.FC<LocationSearchComboboxProps> = ({
  dataset,
  isLocal,
  isPresidential = false,
}) => {
  const {
    lang,
    activeScope,
    projection,
    mapLayer,
    setActiveScope,
    setMapLayer,
    setZoomedProvinceId,
  } = useElectionStore();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onOpenJump = () => {
      setOpen(true);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    };
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('kalkulus:open-jump-search', onOpenJump);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('kalkulus:open-jump-search', onOpenJump);
    };
  }, []);

  const provNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of dataset.provinces) m[p.id] = p.name;
    return m;
  }, [dataset.provinces]);

  const allItems = useMemo<SearchLocationItem[]>(() => {
    const items: SearchLocationItem[] = [];

    if (!isLocal && !isPresidential) {
      for (const d of dataset.districts) {
        const mp = projection.districtResults[d.id]?.mpCount || d.mpCount;
        const label = `${d.id} · ${d.name}`;
        items.push({
          key: `d:${d.id}`,
          category: 'district',
          label,
          sublabel: `${mp} MV`,
          searchNorm: normalizeTr(`${d.id} ${d.name}`),
          scope: { type: 'district', districtId: d.id },
        });
      }
    }

    for (const p of dataset.provinces) {
      const label = `${p.id} · ${p.name}`;
      items.push({
        key: `p:${p.id}`,
        category: 'province',
        label,
        sublabel: p.region,
        searchNorm: normalizeTr(`${p.id} ${p.name} ${p.region}`),
        scope: { type: 'province', ilId: p.id },
      });
    }

    for (const i of dataset.ilceler) {
      const pName = provNameById[i.ilId] || i.ilId;
      items.push({
        key: `i:${i.id}`,
        category: 'ilce',
        label: i.name,
        sublabel: `${pName} (${i.districtId})`,
        searchNorm: normalizeTr(`${i.name} ${pName} ${i.districtId}`),
        scope: { type: 'ilce', ilceId: i.id },
      });
    }

    if (!isLocal) {
      for (const c of ABROAD_COUNTRIES_2023) {
        items.push({
          key: `a:${c.id}`,
          category: 'abroadCountry',
          label: lang === 'tr' ? c.nameTr : c.nameEn,
          sublabel: c.isCustoms
            ? lang === 'tr'
              ? 'Gümrük Kapıları'
              : 'Customs Ports'
            : `${lang === 'tr' ? 'Yurt Dışı' : 'Abroad'} · ${c.region}`,
          searchNorm: normalizeTr(`${c.nameTr} ${c.fullNameTr} ${c.nameEn} ${c.id} ${c.region}`),
          scope: { type: 'abroadCountry', countryId: c.id },
          switchMapToAbroad: true,
        });
      }
    }

    return items;
  }, [dataset, isLocal, isPresidential, projection.districtResults, provNameById, lang]);

  const filtered = useMemo(() => {
    const q = normalizeTr(query);
    if (!q) {
      // Show curated top quick-picks when query is empty
      const priorityProvs = ['34', '06', '35', '16', '07', '01', '21', '61'];
      const quick = allItems.filter(
        (it) =>
          (it.category === 'province' && priorityProvs.includes((it.scope as { ilId: string }).ilId)) ||
          (it.category === 'abroadCountry' &&
            ['DEU', 'FRA', 'NLD', 'USA', 'GBR', 'CUSTOMS'].includes(
              (it.scope as { countryId: string }).countryId
            ))
      );
      return quick.slice(0, 14);
    }

    const prefixMatches: SearchLocationItem[] = [];
    const containsMatches: SearchLocationItem[] = [];
    for (const it of allItems) {
      const labelNorm = normalizeTr(it.label);
      if (labelNorm.startsWith(q)) prefixMatches.push(it);
      else if (it.searchNorm.includes(q)) containsMatches.push(it);
      if (prefixMatches.length + containsMatches.length >= 24) break;
    }
    return [...prefixMatches, ...containsMatches].slice(0, 20);
  }, [allItems, query]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const handleSelect = (item: SearchLocationItem) => {
    setActiveScope(item.scope);
    if (item.switchMapToAbroad) {
      setZoomedProvinceId(null);
      if (mapLayer !== 'abroad_world') setMapLayer('abroad_world');
    } else {
      if (mapLayer === 'abroad_world') {
        setMapLayer(!isLocal && !isPresidential ? '87_district' : '81_il');
      }
      if (item.scope.type === 'province') {
        setZoomedProvinceId(item.scope.ilId);
      } else if (item.scope.type === 'district') {
        const dId = item.scope.districtId;
        const ilId = dataset.districts.find((d) => d.id === dId)?.ilId ?? null;
        setZoomedProvinceId(ilId);
      } else if (item.scope.type === 'ilce') {
        const iId = item.scope.ilceId;
        const ilId = dataset.ilceler.find((i) => i.id === iId)?.ilId ?? null;
        setZoomedProvinceId(ilId);
      }
    }
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const activePlaceholder = useMemo(() => {
    if (activeScope.type === 'abroadCountry') {
      const c = ABROAD_COUNTRIES_2023.find((x) => x.id === activeScope.countryId);
      return c ? (lang === 'tr' ? c.nameTr : c.nameEn) : activeScope.countryId;
    }
    if (activeScope.type === 'province') {
      return `${activeScope.ilId} · ${provNameById[activeScope.ilId] || ''}`;
    }
    if (activeScope.type === 'district') {
      const d = dataset.districts.find((x) => x.id === activeScope.districtId);
      return d ? `${d.id} · ${d.name}` : activeScope.districtId;
    }
    if (activeScope.type === 'ilce') {
      const i = dataset.ilceler.find((x) => x.id === activeScope.ilceId);
      return i ? `${i.name} (${provNameById[i.ilId] || i.ilId})` : activeScope.ilceId;
    }
    return lang === 'tr'
      ? isLocal
        ? 'İl veya ilçe ara (81 il, 973 ilçe)...'
        : 'İl, bölge, ilçe veya ülke ara...'
      : isLocal
      ? 'Search province or district...'
      : 'Search province, district, sub-district, or country...';
  }, [activeScope, dataset, provNameById, isLocal, lang]);

  const categoryIcon = (cat: SearchLocationItem['category']) => {
    if (cat === 'abroadCountry') return <Globe2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />;
    if (cat === 'district') return <Landmark className="w-3.5 h-3.5 text-slate-600 shrink-0" />;
    return <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0" />;
  };

  const categoryTag = (cat: SearchLocationItem['category']) => {
    if (cat === 'abroadCountry') return lang === 'tr' ? 'YURT DIŞI' : 'ABROAD';
    if (cat === 'district') return lang === 'tr' ? 'BÖLGE' : 'DIST';
    if (cat === 'province') return lang === 'tr' ? 'İL' : 'PROV';
    return lang === 'tr' ? 'İLÇE' : 'SUB';
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
              setOpen(true);
              return;
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveIdx((i) => Math.max(0, i - 1));
            } else if (e.key === 'Enter' && open && filtered[activeIdx]) {
              e.preventDefault();
              handleSelect(filtered[activeIdx]);
            } else if (e.key === 'Escape') {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder={activePlaceholder}
          aria-label={lang === 'tr' ? 'Konum ara' : 'Search location'}
          className="w-full studio-input border-[#090A0F] pl-8 pr-16 py-2 sm:py-1.5 text-body font-medium text-[#090A0F] placeholder:text-slate-600 min-h-[40px] sm:min-h-[34px]"
        />
        {!query && activeScope.type === 'national' && (
          <kbd className="hidden sm:inline-block absolute right-2 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-500 bg-slate-100 border border-slate-300 pointer-events-none">
            Ctrl+K
          </kbd>
        )}
        {(query || activeScope.type !== 'national') && (
          <button
            type="button"
            onClick={() => {
              if (query) {
                setQuery('');
                inputRef.current?.focus();
              } else {
                setZoomedProvinceId(null);
                setActiveScope({ type: 'national' });
                setOpen(false);
              }
            }}
            className="absolute right-1.5 p-1.5 text-slate-500 hover:text-[#090A0F]"
            title={
              query
                ? lang === 'tr'
                  ? 'Aramayı temizle'
                  : 'Clear search'
                : lang === 'tr'
                ? 'Türkiye geneline dön'
                : 'Reset to national'
            }
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-white border-[1.5px] border-[#090A0F] shadow-[4px_4px_0px_rgba(9,10,15,0.18)] max-h-72 overflow-y-auto divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-micro text-slate-500 font-mono">
              {lang === 'tr' ? 'Eşleşen il, ilçe veya ülke bulunamadı.' : 'No matching location found.'}
            </div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setActiveIdx(idx)}
                className={`w-full text-left px-3 py-2.5 sm:py-1.5 flex items-center justify-between gap-2 text-body transition-colors ${
                  idx === activeIdx ? 'bg-[#090A0F] text-white' : 'hover:bg-slate-50 text-[#090A0F]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {categoryIcon(item.category)}
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{item.label}</div>
                    <div
                      className={`text-micro truncate ${
                        idx === activeIdx ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {item.sublabel}
                    </div>
                  </div>
                </div>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.5 border shrink-0 ${
                    idx === activeIdx
                      ? 'border-white/40 text-white'
                      : 'border-slate-300 text-slate-600'
                  }`}
                >
                  {categoryTag(item.category)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
