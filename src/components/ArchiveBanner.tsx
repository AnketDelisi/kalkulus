import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GitCompareArrows,
  History,
  Landmark,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  ARCHIVE_ELECTIONS,
  ARCHIVE_ELECTION_LIST,
} from '../data/archiveRegistry';
import { useElectionStore } from '../store/useElectionStore';
import { ArchiveCategory, ArchiveComparisonRef, ArchiveElectionId } from '../types/election';
import { archiveFamily } from '../utils/archiveCompare';

const CATEGORY_PILLS: Array<{
  key: ArchiveCategory | 'all';
  labelTr: string;
  labelEn: string;
}> = [
  { key: 'all', labelTr: 'Tümü', labelEn: 'All' },
  { key: 'general', labelTr: 'Genel', labelEn: 'General' },
  { key: 'presidential', labelTr: 'CB', labelEn: 'Pres.' },
  { key: 'local', labelTr: 'Yerel', labelEn: 'Local' },
  { key: 'referendum', labelTr: 'Ref.', labelEn: 'Ref.' },
];

const POPOVER_COLUMNS: Array<{
  cat: ArchiveCategory;
  titleTr: string;
  titleEn: string;
}> = [
  { cat: 'general', titleTr: 'Genel Seçimler', titleEn: 'General Elections' },
  { cat: 'presidential', titleTr: 'Cumhurbaşkanlığı', titleEn: 'Presidential' },
  { cat: 'local', titleTr: 'Yerel Seçimler', titleEn: 'Local Elections' },
  { cat: 'referendum', titleTr: 'Referandumlar', titleEn: 'Referendums' },
];

export const ArchiveBanner: React.FC = () => {
  const {
    lang,
    activeArchiveId,
    archiveWhatIfParl,
    archiveComparisonId,
    archiveLoading,
    electionMode,
    enterArchiveElection,
    setArchiveComparisonId,
    stepArchiveElection,
    exitArchiveMode,
  } = useElectionStore();

  const [categoryFilter, setCategoryFilter] = useState<ArchiveCategory | 'all'>('all');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activeArchiveId) return;
    const activeCat = ARCHIVE_ELECTIONS[activeArchiveId]?.category;
    if (categoryFilter !== 'all' && activeCat && activeCat !== categoryFilter) {
      setCategoryFilter('all');
    }
  }, [activeArchiveId, categoryFilter]);

  useEffect(() => {
    if (!popoverOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPopoverOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [popoverOpen]);

  const filteredList = useMemo(
    () =>
      categoryFilter === 'all'
        ? ARCHIVE_ELECTION_LIST
        : ARCHIVE_ELECTION_LIST.filter((opt) => opt.category === categoryFilter),
    [categoryFilter]
  );

  if (!activeArchiveId) return null;
  const activeCfg = ARCHIVE_ELECTIONS[activeArchiveId];
  const curIdx = filteredList.findIndex((o) => o.id === activeArchiveId);
  const canStepOlder = curIdx >= 0 && curIdx + 1 < filteredList.length;
  const canStepNewer = curIdx > 0;

  const activeFamily = archiveWhatIfParl ? 'parliamentary' : archiveFamily(activeCfg);
  const comparableOptions = ARCHIVE_ELECTION_LIST.filter((opt) => {
    if (opt.id === activeArchiveId) return false;
    if (electionMode === 'local') {
      return opt.defaultMode === 'local';
    }
    if (activeFamily === 'presidential') {
      return opt.defaultMode === 'presidential';
    }
    return opt.defaultMode === 'parliamentary' || opt.supportsWhatIfParl;
  });

  const selectElection = (opt: (typeof ARCHIVE_ELECTION_LIST)[number]) => {
    setPopoverOpen(false);
    void enterArchiveElection(opt.id, opt.supportsWhatIfParl ? archiveWhatIfParl : false);
  };

  return (
    <div
      ref={containerRef}
      className="mb-4 studio-panel px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 relative"
    >
      {/* Left Cluster: Monochrome Badge, Category Tabs, Chronological Stepper + Active Election Popover Trigger */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1.5 text-micro font-mono font-bold uppercase tracking-wider text-[#090A0F]">
          <History className="w-3.5 h-3.5 shrink-0" />
          <span>{lang === 'tr' ? 'Arşiv' : 'Archive'}</span>
        </div>

        {/* Category Filter Tabs */}
        <div className="inline-flex border-[1.5px] border-[#090A0F] bg-white">
          {CATEGORY_PILLS.map((pill, idx) => {
            const active = categoryFilter === pill.key;
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => setCategoryFilter(pill.key)}
                className={`px-2 py-1 text-micro font-semibold transition-colors ${
                  idx > 0 ? 'border-l border-[#090A0F]' : ''
                } ${
                  active ? 'bg-[#090A0F] text-white' : 'text-[#090A0F] hover:bg-slate-100'
                }`}
              >
                {lang === 'tr' ? pill.labelTr : pill.labelEn}
              </button>
            );
          })}
        </div>

        {/* Chronological Stepper + Popover Trigger */}
        <div className="inline-flex items-center border-[1.5px] border-[#090A0F] bg-white">
          <button
            type="button"
            disabled={archiveLoading || !canStepOlder}
            onClick={() => void stepArchiveElection(-1, categoryFilter)}
            title={
              lang === 'tr'
                ? 'Önceki (daha eski) seçime geç (Kısayol: [ )'
                : 'Step to older election (Shortcut: [ )'
            }
            aria-label={lang === 'tr' ? 'Önceki seçim' : 'Older election'}
            className="px-2 py-1 text-[#090A0F] hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            disabled={archiveLoading}
            aria-expanded={popoverOpen}
            onClick={() => setPopoverOpen((o) => !o)}
            className={`px-2.5 py-1 border-l border-r border-[#090A0F] inline-flex items-center gap-1.5 text-micro font-bold transition-colors whitespace-nowrap ${
              popoverOpen
                ? 'bg-[#090A0F] text-white'
                : 'bg-white text-[#090A0F] hover:bg-slate-100'
            }`}
          >
            <span>{lang === 'tr' ? activeCfg.shortLabelTr : activeCfg.shortLabelEn}</span>
            <span
              className={`hidden md:inline font-mono font-normal ${
                popoverOpen ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              · {lang === 'tr' ? activeCfg.dateLabelTr : activeCfg.dateLabelEn}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                popoverOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          <button
            type="button"
            disabled={archiveLoading || !canStepNewer}
            onClick={() => void stepArchiveElection(1, categoryFilter)}
            title={
              lang === 'tr'
                ? 'Sonraki (daha yeni) seçime geç (Kısayol: ] )'
                : 'Step to newer election (Shortcut: ] )'
            }
            aria-label={lang === 'tr' ? 'Sonraki seçim' : 'Newer election'}
            className="px-2 py-1 text-[#090A0F] hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right Cluster: Compare, Optional Local What-If Toggle, Reset & Exit */}
      <div className="flex flex-wrap items-center gap-1.5 ml-auto">
        {comparableOptions.length > 0 && (
          <div className="inline-flex items-center gap-1.5 border-[1.5px] border-[#090A0F] bg-white px-2 py-1 text-micro">
            <GitCompareArrows className="w-3.5 h-3.5 text-[#090A0F] shrink-0" />
            <span className="text-slate-500 font-mono hidden sm:inline">
              {lang === 'tr' ? 'Karşılaştır:' : 'Compare:'}
            </span>
            <select
              value={archiveComparisonId || 'self'}
              disabled={archiveLoading}
              onChange={(e) =>
                void setArchiveComparisonId(e.target.value as ArchiveComparisonRef)
              }
              className="bg-transparent text-[#090A0F] font-bold focus:outline-none cursor-pointer pr-1"
            >
              <option value="self">
                {lang === 'tr' ? 'Resmi Sonuç (Kendi Bazı)' : 'Official Result (Self)'}
              </option>
              {comparableOptions.map((opt) => (
                <option key={opt.id} value={opt.id as ArchiveElectionId}>
                  {lang === 'tr' ? `${opt.shortLabelTr}'e göre` : `vs ${opt.shortLabelEn}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {activeCfg?.supportsWhatIfParl && (
          <button
            type="button"
            disabled={archiveLoading}
            onClick={() => void enterArchiveElection(activeArchiveId, !archiveWhatIfParl)}
            className={
              archiveWhatIfParl
                ? 'studio-btn-solid inline-flex items-center gap-1.5 px-2.5 py-1 text-micro'
                : 'studio-btn px-2.5 py-1 text-micro'
            }
            title={
              lang === 'tr'
                ? `${activeCfg.year} yerel meclis oylarıyla 600 MV D’Hondt dağılımını simüle et`
                : `Simulate 600-MP D’Hondt allocation on ${activeCfg.year} local council votes`
            }
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>
              {lang === 'tr' ? "Ya MV Olsaydı? (D'Hondt)" : "What-If 600 MPs (D'Hondt)"}
            </span>
          </button>
        )}

        <button
          type="button"
          disabled={archiveLoading}
          onClick={() => void enterArchiveElection(activeArchiveId, archiveWhatIfParl)}
          className="studio-btn px-2.5 py-1 text-micro"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{lang === 'tr' ? 'Sıfırla' : 'Reset'}</span>
        </button>

        <button
          type="button"
          onClick={exitArchiveMode}
          className="studio-btn-solid inline-flex items-center gap-1.5 px-2.5 py-1 text-micro"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{lang === 'tr' ? 'Güncel Senaryo' : 'Exit Archive'}</span>
        </button>
      </div>

      {/* Categorized 4-Column Archive Election Grid Popover */}
      {popoverOpen && (
        <div
          role="dialog"
          aria-label={lang === 'tr' ? 'Geçmiş Seçim Arşivi' : 'Past Election Archive'}
          className="absolute left-0 right-0 top-full mt-1.5 z-40 studio-panel p-3 sm:p-4 bg-white"
        >
          <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-slate-200">
            <div className="eyebrow">
              {lang === 'tr'
                ? 'Seçim Arşivi (1987–2024)'
                : 'Election Archive (1987–2024)'}
            </div>
            <button
              type="button"
              onClick={() => setPopoverOpen(false)}
              className="studio-btn p-1"
              aria-label={lang === 'tr' ? 'Kapat' : 'Close'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {categoryFilter === 'all' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {POPOVER_COLUMNS.map((col) => {
                const items = ARCHIVE_ELECTION_LIST.filter((opt) => opt.category === col.cat);
                return (
                  <div key={col.cat} className="flex flex-col gap-1.5">
                    <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
                      {lang === 'tr' ? col.titleTr : col.titleEn}
                    </div>
                    <div className="flex flex-col gap-1">
                      {items.map((opt) => {
                        const active = activeArchiveId === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={archiveLoading}
                            onClick={() => selectElection(opt)}
                            className={`w-full text-left px-2.5 py-1.5 border transition-colors flex items-center justify-between gap-2 ${
                              active
                                ? 'bg-[#090A0F] text-white border-[#090A0F]'
                                : 'bg-white text-[#090A0F] border-slate-300 hover:border-[#090A0F] hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-micro font-bold">
                              {lang === 'tr' ? opt.shortLabelTr : opt.shortLabelEn}
                            </span>
                            <span
                              className={`text-[10px] font-mono truncate ${
                                active ? 'text-slate-300' : 'text-slate-500'
                              }`}
                            >
                              {lang === 'tr' ? opt.dateLabelTr : opt.dateLabelEn}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
              {filteredList.map((opt) => {
                const active = activeArchiveId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={archiveLoading}
                    onClick={() => selectElection(opt)}
                    className={`text-left px-2.5 py-1.5 border transition-colors flex items-center justify-between gap-2 ${
                      active
                        ? 'bg-[#090A0F] text-white border-[#090A0F]'
                        : 'bg-white text-[#090A0F] border-slate-300 hover:border-[#090A0F] hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-micro font-bold">
                      {lang === 'tr' ? opt.shortLabelTr : opt.shortLabelEn}
                    </span>
                    <span
                      className={`text-[10px] font-mono truncate ${
                        active ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {lang === 'tr' ? opt.dateLabelTr : opt.dateLabelEn}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
