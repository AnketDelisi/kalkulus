import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Trash2, Zap } from 'lucide-react';
import { useElectionStore } from '../store/useElectionStore';
import type { BuffUnitType, ElectionMode, LocalBuffRule } from '../types/election';

export interface BuffEntityOption {
  id: string;
  shortName: string;
  name: string;
  color: string;
}

interface UnitBuffDrawerProps {
  mode: ElectionMode;
  unitType: BuffUnitType;
  unitId: string;
  unitName: string;
  parentIlId?: string;
  parentDistrictId?: string;
  isLocked?: boolean;
  entities: BuffEntityOption[];
}

export const UnitBuffDrawer: React.FC<UnitBuffDrawerProps> = ({
  mode,
  unitType,
  unitId,
  unitName,
  parentIlId,
  parentDistrictId,
  isLocked = false,
  entities,
}) => {
  const lang = useElectionStore((s) => s.lang);
  const localBuffs = useElectionStore((s) => s.localBuffs);
  const addLocalBuff = useElectionStore((s) => s.addLocalBuff);
  const updateLocalBuff = useElectionStore((s) => s.updateLocalBuff);
  const removeLocalBuff = useElectionStore((s) => s.removeLocalBuff);
  const toggleLocalBuff = useElectionStore((s) => s.toggleLocalBuff);

  const directBuffs = useMemo(
    () =>
      localBuffs.filter(
        (b) => b.mode === mode && b.unitType === unitType && b.unitId === unitId
      ),
    [localBuffs, mode, unitType, unitId]
  );

  const inheritedBuffs = useMemo(() => {
    const out: LocalBuffRule[] = [];
    for (const b of localBuffs) {
      if (b.mode !== mode) continue;
      if (unitType === 'district' && parentIlId && b.unitType === 'province' && b.unitId === parentIlId) {
        out.push(b);
      } else if (unitType === 'ilce') {
        if (parentIlId && b.unitType === 'province' && b.unitId === parentIlId) {
          out.push(b);
        } else if (parentDistrictId && b.unitType === 'district' && b.unitId === parentDistrictId) {
          out.push(b);
        }
      }
    }
    return out;
  }, [localBuffs, mode, unitType, parentIlId, parentDistrictId]);

  const [open, setOpen] = useState(() => directBuffs.length > 0);
  const [targetId, setTargetId] = useState<string>(() => entities[0]?.id ?? '');
  const [bonusPp, setBonusPp] = useState<number>(3.0);
  const [sourceId, setSourceId] = useState<string>('');
  const [label, setLabel] = useState<string>('');

  const entityMap = useMemo(() => {
    const map: Record<string, BuffEntityOption> = {};
    for (const e of entities) map[e.id] = e;
    return map;
  }, [entities]);

  const effectiveTargetId = entityMap[targetId] ? targetId : entities[0]?.id ?? '';

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveTargetId || !Number.isFinite(bonusPp) || bonusPp === 0) return;
    addLocalBuff({
      enabled: true,
      mode,
      unitType,
      unitId,
      targetId: effectiveTargetId,
      sourceId: sourceId && sourceId !== effectiveTargetId ? sourceId : null,
      bonusPp: Math.max(-30, Math.min(30, bonusPp)),
      label: label.trim() || undefined,
    });
    setLabel('');
  };

  const activeDirectCount = directBuffs.filter((b) => b.enabled).length;
  const activeInheritedCount = inheritedBuffs.filter((b) => b.enabled).length;
  const totalBadge = activeDirectCount + activeInheritedCount;

  return (
    <div className="border border-[#090A0F] bg-white">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-2.5 py-2 flex items-center justify-between gap-2 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 text-[#090A0F] shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[#090A0F] shrink-0" />
          )}
          <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-micro font-bold uppercase tracking-wider text-[#090A0F] truncate">
            {lang === 'tr' ? 'Yerel Güç (±pp)' : 'Local Strength (±pp)'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {totalBadge > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#090A0F] text-white">
              {totalBadge}
            </span>
          )}
          <span className="text-[10px] text-slate-500 font-medium hidden sm:inline truncate max-w-[110px]">
            {unitName}
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t border-[#090A0F]/20 p-2.5 space-y-2.5 bg-slate-50/70">
          {isLocked && (
            <div className="text-[11px] px-2 py-1.5 bg-amber-50 border border-amber-400 text-amber-900">
              {lang === 'tr'
                ? 'Bu birim manuel kilitli olduğu için buff etki etmez; kilidi açtığınızda otomatik uygulanır.'
                : 'This unit is manually locked; unlock it for buffs to take effect.'}
            </div>
          )}

          {inheritedBuffs.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {lang === 'tr' ? 'Üst Birimden Gelen Bufflar' : 'Inherited Buffs'}
              </div>
              <div className="flex flex-wrap gap-1">
                {inheritedBuffs.map((b) => {
                  const target = entityMap[b.targetId];
                  const source = b.sourceId ? entityMap[b.sourceId] : null;
                  return (
                    <span
                      key={b.id}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono border ${
                        b.enabled
                          ? 'bg-white border-[#090A0F]/30 text-[#090A0F]'
                          : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: target?.color || '#64748b' }}
                      />
                      <span className="font-bold">{target?.shortName || b.targetId}</span>
                      <span>
                        {b.bonusPp > 0 ? `+${b.bonusPp.toFixed(1)}` : b.bonusPp.toFixed(1)}pp
                      </span>
                      {source && <span className="text-slate-500">← {source.shortName}</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {directBuffs.length > 0 && (
            <div className="space-y-1.5">
              {directBuffs.map((b) => {
                const target = entityMap[b.targetId];
                const source = b.sourceId ? entityMap[b.sourceId] : null;
                return (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between gap-1.5 px-2 py-1.5 border bg-white ${
                      b.enabled ? 'border-[#090A0F]/40' : 'border-slate-200 opacity-60'
                    }`}
                  >
                    <label className="flex items-center gap-1.5 min-w-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={b.enabled}
                        onChange={() => toggleLocalBuff(b.id)}
                        className="accent-[#090A0F] w-3.5 h-3.5 shrink-0"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: target?.color || '#64748b' }}
                      />
                      <div className="min-w-0">
                        <div className="text-micro font-bold text-[#090A0F] truncate">
                          {target?.shortName || b.targetId}
                          {source ? (
                            <span className="font-normal text-slate-500"> ← {source.shortName}</span>
                          ) : (
                            <span className="font-normal text-slate-500">
                              {' '}
                              ({lang === 'tr' ? 'Orantılı' : 'Prop.'})
                            </span>
                          )}
                        </div>
                        {b.label && (
                          <div className="text-[10px] text-slate-500 truncate">{b.label}</div>
                        )}
                      </div>
                    </label>

                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        step={0.5}
                        min={-30}
                        max={30}
                        value={b.bonusPp}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (!Number.isNaN(v)) {
                            updateLocalBuff(b.id, { bonusPp: Math.max(-30, Math.min(30, v)) });
                          }
                        }}
                        className="w-16 px-1.5 py-0.5 text-micro font-mono font-bold text-right border border-[#090A0F]/30 bg-white focus:outline-none focus:border-[#090A0F]"
                      />
                      <span className="text-[10px] font-mono text-slate-500">pp</span>
                      <button
                        type="button"
                        onClick={() => removeLocalBuff(b.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title={lang === 'tr' ? 'Sil' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Add Buff Form */}
          <form onSubmit={handleAdd} className="space-y-1.5 pt-1 border-t border-slate-200">
            <div className="grid grid-cols-12 gap-1.5">
              <select
                value={effectiveTargetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="col-span-5 px-1.5 py-1 text-micro font-medium border border-[#090A0F]/40 bg-white focus:outline-none focus:border-[#090A0F]"
              >
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.shortName}
                  </option>
                ))}
              </select>

              <div className="col-span-3 flex items-center border border-[#090A0F]/40 bg-white">
                <input
                  type="number"
                  step={0.5}
                  min={-30}
                  max={30}
                  value={bonusPp}
                  onChange={(e) => setBonusPp(parseFloat(e.target.value) || 0)}
                  className="w-full px-1.5 py-1 text-micro font-mono font-bold text-right focus:outline-none"
                />
                <span className="pr-1 text-[10px] font-mono text-slate-500">pp</span>
              </div>

              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="col-span-4 px-1.5 py-1 text-micro border border-[#090A0F]/40 bg-white focus:outline-none focus:border-[#090A0F]"
                title={lang === 'tr' ? 'Oy Kaynağı' : 'Donor Source'}
              >
                <option value="">{lang === 'tr' ? 'Orantılı' : 'Proportional'}</option>
                {entities
                  .filter((e) => e.id !== effectiveTargetId)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      ← {e.shortName}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={
                  lang === 'tr' ? 'Not (ör. Güçlü aday, lider memleketi)' : 'Note (optional)'
                }
                className="flex-1 min-w-0 px-2 py-1 text-micro border border-[#090A0F]/30 bg-white focus:outline-none focus:border-[#090A0F]"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-micro font-bold bg-[#090A0F] text-white hover:bg-[#090A0F]/85 shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>{lang === 'tr' ? 'Ekle' : 'Add'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
