import React, { useEffect, useState } from 'react';
import { Check, ClipboardPaste, Scale, Sparkles, X } from 'lucide-react';
import { Language } from '../types/election';
import { normalizeTr } from './LocationSearchCombobox';

export interface PollEntryItem {
  id: string;
  shortName: string;
  fullName: string;
  color: string;
  isOther?: boolean;
  currentValue: number;
}

/**
 * Parses quick tabular or pasted poll text (e.g. "CHP 32,4 AKP 30.8 DEM 9,5") into item IDs.
 */
export function parsePollText(raw: string, items: PollEntryItem[]): Record<string, number> {
  const result: Record<string, number> = {};
  if (!raw.trim()) return result;

  const aliases = items.map((it) => ({
    id: it.id,
    shortNorm: normalizeTr(it.shortName),
    fullNorm: normalizeTr(it.fullName),
    idNorm: normalizeTr(it.id),
  }));

  // Split by newlines, semicolons, or commas preceding a party token
  const tokens = raw.split(/\r?\n|;/);
  const allSegments =
    tokens.length > 1
      ? tokens
      : raw.split(/,(?=\s*[A-Za-zÇĞIİÖŞÜçğıiöşü])/);

  for (const seg of allSegments) {
    const numMatch = seg.match(/(-?\d+(?:[.,]\d+)?)\s*%?\s*$/);
    if (!numMatch) continue;
    const val = Math.max(0, Math.min(100, parseFloat(numMatch[1].replace(',', '.'))));
    if (!Number.isFinite(val)) continue;

    const labelPart = normalizeTr(seg.slice(0, numMatch.index).replace(/[:=\-\t]/g, ' '));
    if (!labelPart) continue;

    const found =
      aliases.find(
        (a) => a.shortNorm === labelPart || a.idNorm === labelPart || a.fullNorm === labelPart
      ) ||
      aliases.find(
        (a) =>
          labelPart.includes(a.shortNorm) ||
          (a.shortNorm.length >= 2 && a.fullNorm.includes(labelPart))
      );

    if (found) {
      result[found.id] = Number(val.toFixed(2));
    }
  }

  // Fallback single-line matcher: "CHP 33.1 AKP 29.4 ..."
  if (Object.keys(result).length === 0) {
    const pairRe = /([A-Za-zÇĞIİÖŞÜçğıiöşü.]{2,20})\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*%?/g;
    let m: RegExpExecArray | null;
    while ((m = pairRe.exec(raw)) !== null) {
      const lbl = normalizeTr(m[1]);
      const val = Math.max(0, Math.min(100, parseFloat(m[2].replace(',', '.'))));
      const found = aliases.find((a) => a.shortNorm === lbl || a.idNorm === lbl);
      if (found && Number.isFinite(val)) {
        result[found.id] = Number(val.toFixed(2));
      }
    }
  }

  return result;
}

interface PollQuickEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  scopeTitle: string;
  items: PollEntryItem[];
  onApply: (values: Record<string, number>) => void;
}

export const PollQuickEntryModal: React.FC<PollQuickEntryModalProps> = ({
  isOpen,
  onClose,
  lang,
  scopeTitle,
  items,
  onApply,
}) => {
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [pasteRaw, setPasteRaw] = useState('');
  const [parsedCount, setParsedCount] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      const init: Record<string, number> = {};
      for (const it of items) init[it.id] = Number(it.currentValue.toFixed(2));
      setDraft(init);
      setPasteRaw('');
      setParsedCount(null);
    }
  }, [isOpen, items]);

  if (!isOpen) return null;

  const totalSum = items.reduce((s, it) => s + (Number(draft[it.id]) || 0), 0);
  const otherItem = items.find((it) => it.isOther);
  const nonOtherSum = items
    .filter((it) => !it.isOther)
    .reduce((s, it) => s + (Number(draft[it.id]) || 0), 0);

  const handleParsePaste = () => {
    const parsed = parsePollText(pasteRaw, items);
    const count = Object.keys(parsed).length;
    if (count > 0) {
      setDraft((prev) => ({ ...prev, ...parsed }));
    }
    setParsedCount(count);
  };

  const handleNormalize = () => {
    if (totalSum <= 0) return;
    const next: Record<string, number> = {};
    for (const it of items) {
      next[it.id] = Number((((Number(draft[it.id]) || 0) / totalSum) * 100).toFixed(2));
    }
    setDraft(next);
  };

  const handleSendToOther = () => {
    if (!otherItem) return;
    const rem = Math.max(0, Number((100 - nonOtherSum).toFixed(2)));
    setDraft((prev) => ({ ...prev, [otherItem.id]: rem }));
  };

  const handleConfirm = () => {
    onApply(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090A0F]/70 flex items-center justify-center p-2 sm:p-4">
      <div className="studio-panel w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden bg-white">
        <div className="flex items-center justify-between px-4 py-3 bg-[#090A0F] text-white shrink-0">
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              {scopeTitle}
            </div>
            <h2 className="text-title font-bold truncate">
              {lang === 'tr' ? 'Yapıştır / Hızlı Yüzde Girişi' : 'Paste / Quick Share Entry'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 border border-white/25 hover:bg-white hover:text-[#090A0F] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4 text-body">
          {/* Smart text paste bar */}
          <div className="border border-[#090A0F]/25 bg-[#F4F5F7] p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-micro font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>
                  {lang === 'tr' ? 'Anket Metninden Yapıştır (İsteğe Bağlı)' : 'Paste Poll Text (Optional)'}
                </span>
              </span>
              {parsedCount !== null && (
                <span className="text-micro font-mono font-bold text-emerald-700">
                  {parsedCount > 0
                    ? `${parsedCount} ${lang === 'tr' ? 'parti/aday algılandı' : 'matched'}`
                    : lang === 'tr'
                    ? 'Eşleşme bulunamadı'
                    : 'No matches'}
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <textarea
                rows={2}
                value={pasteRaw}
                onChange={(e) => setPasteRaw(e.target.value)}
                placeholder={
                  lang === 'tr'
                    ? 'Örn: CHP 32,5 AKP 30,2 DEM 9,4 MHP 8,1 İYİ 5,5...'
                    : 'e.g. CHP 32.5 AKP 30.2 DEM 9.4 MHP 8.1...'
                }
                className="flex-1 studio-input border-[#090A0F]/40 p-2 font-mono text-micro"
              />
              <button
                type="button"
                onClick={handleParsePaste}
                className="studio-btn px-3 py-2 text-micro font-bold shrink-0"
              >
                {lang === 'tr' ? 'Ayıkla' : 'Parse'}
              </button>
            </div>
          </div>

          {/* Fast numeric grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {items.map((it) => (
              <label
                key={it.id}
                className="flex items-center justify-between gap-2 border border-[#090A0F]/25 px-2.5 py-2 bg-white focus-within:border-[#090A0F]"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 shrink-0 border border-[#090A0F]/40"
                    style={{ backgroundColor: it.color }}
                  />
                  <span className="font-bold text-body truncate">{it.shortName}</span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    inputMode="decimal"
                    value={draft[it.id] ?? 0}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                      setDraft((prev) => ({ ...prev, [it.id]: val }));
                    }}
                    className="w-16 text-right font-mono font-bold text-body bg-transparent focus:outline-none"
                  />
                  <span className="text-micro font-mono text-slate-400">%</span>
                </div>
              </label>
            ))}
          </div>

          {/* Sum + Helpers */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
            <div
              className={`font-mono text-body font-bold ${
                Math.abs(totalSum - 100) <= 0.15 ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {lang === 'tr' ? 'Toplam' : 'Total'}: %{totalSum.toFixed(2)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {otherItem && nonOtherSum <= 100 && Math.abs(totalSum - 100) > 0.1 && (
                <button
                  type="button"
                  onClick={handleSendToOther}
                  className="studio-btn px-2.5 py-1.5 text-micro"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{lang === 'tr' ? "Farkı Diğer'e Aktar" : 'Send to Other'}</span>
                </button>
              )}
              {Math.abs(totalSum - 100) > 0.1 && (
                <button
                  type="button"
                  onClick={handleNormalize}
                  className="studio-btn px-2.5 py-1.5 text-micro"
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>{lang === 'tr' ? "100%'e Normalize Et" : 'Normalize 100%'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 bg-[#F4F5F7] border-t-[1.5px] border-[#090A0F] flex items-center justify-end gap-2 shrink-0">
          <button type="button" onClick={onClose} className="studio-btn px-4 py-2 text-body">
            {lang === 'tr' ? 'İptal' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="studio-btn studio-btn-primary px-4 py-2 text-body font-bold"
          >
            <Check className="w-4 h-4" />
            <span>{lang === 'tr' ? 'Uygula' : 'Apply'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
