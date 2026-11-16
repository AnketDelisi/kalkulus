import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Zap } from 'lucide-react';
import { useElectionStore } from '../store/useElectionStore';
import type { BuffUnitType } from '../types/election';

export const BuffManagerTab: React.FC = () => {
  const {
    lang,
    electionMode,
    parties,
    presCandidates,
    localBuffs,
    projection,
    presidentialProjection,
    localProjection,
    addLocalBuff,
    updateLocalBuff,
    removeLocalBuff,
    toggleLocalBuff,
  } = useElectionStore();

  const [unitType, setUnitType] = useState<BuffUnitType>('province');
  const [unitSearch, setUnitSearch] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('34');
  const [targetId, setTargetId] = useState(() =>
    electionMode === 'presidential' ? presCandidates[0]?.id ?? '' : parties[0]?.id ?? ''
  );
  const [sourceId, setSourceId] = useState('');
  const [bonusPp, setBonusPp] = useState(3.5);
  const [label, setLabel] = useState('');

  const entities = useMemo(
    () =>
      electionMode === 'presidential'
        ? presCandidates.map((c) => ({
            id: c.id,
            shortName: c.shortName,
            name: c.name,
            color: c.color,
          }))
        : parties.map((p) => ({
            id: p.id,
            shortName: p.shortName,
            name: p.fullName,
            color: p.color,
          })),
    [electionMode, parties, presCandidates]
  );

  const entityById = useMemo(() => {
    const map: Record<string, (typeof entities)[number]> = {};
    for (const e of entities) map[e.id] = e;
    return map;
  }, [entities]);

  const unitOptions = useMemo(() => {
    const q = unitSearch.trim().toLowerCase();
    if (unitType === 'province') {
      const provs =
        electionMode === 'local'
          ? Object.values(localProjection.provinceResults)
          : electionMode === 'presidential'
          ? Object.values(presidentialProjection.round1.provinceResults)
          : Object.values(projection.provinceResults);
      return provs
        .map((p) => ({ id: p.id, label: `${p.plateCode} · ${p.name}` }))
        .filter((o) => !q || o.label.toLowerCase().includes(q))
        .sort((a, b) => a.label.localeCompare(b.label, 'tr'));
    }
    if (unitType === 'district' && electionMode === 'parliamentary') {
      return Object.values(projection.districtResults)
        .map((d) => ({ id: d.id, label: `${d.id} · ${d.name}` }))
        .filter((o) => !q || o.label.toLowerCase().includes(q))
        .sort((a, b) => a.label.localeCompare(b.label, 'tr'));
    }
    const ilceler =
      electionMode === 'local'
        ? Object.values(localProjection.ilceResults)
        : electionMode === 'presidential'
        ? Object.values(presidentialProjection.round1.ilceResults)
        : Object.values(projection.ilceResults);
    const provMap =
      electionMode === 'local'
        ? localProjection.provinceResults
        : electionMode === 'presidential'
        ? presidentialProjection.round1.provinceResults
        : projection.provinceResults;
    return ilceler
      .map((i) => ({
        id: i.id,
        label: `${i.name} (${provMap[i.ilId || '']?.name || i.ilId || ''})`,
      }))
      .filter((o) => !q || o.label.toLowerCase().includes(q))
      .sort((a, b) => a.label.localeCompare(b.label, 'tr'))
      .slice(0, 120);
  }, [unitType, unitSearch, electionMode, projection, presidentialProjection, localProjection]);

  const unitNameLookup = useMemo(() => {
    const map: Record<string, string> = {};
    const provMap =
      electionMode === 'local'
        ? localProjection.provinceResults
        : electionMode === 'presidential'
        ? presidentialProjection.round1.provinceResults
        : projection.provinceResults;
    const ilceMap =
      electionMode === 'local'
        ? localProjection.ilceResults
        : electionMode === 'presidential'
        ? presidentialProjection.round1.ilceResults
        : projection.ilceResults;
    for (const p of Object.values(provMap)) map[`province:${p.id}`] = `${p.plateCode} · ${p.name}`;
    for (const d of Object.values(projection.districtResults))
      map[`district:${d.id}`] = `${d.id} · ${d.name}`;
    for (const i of Object.values(ilceMap))
      map[`ilce:${i.id}`] = `${i.name} (${provMap[i.ilId]?.name || i.ilId})`;
    return map;
  }, [electionMode, projection, presidentialProjection, localProjection]);

  const effectiveUnitId = unitOptions.some((o) => o.id === selectedUnitId)
    ? selectedUnitId
    : unitOptions[0]?.id ?? '';
  const effectiveTargetId = entityById[targetId] ? targetId : entities[0]?.id ?? '';

  const modeBuffs = useMemo(
    () => localBuffs.filter((b) => b.mode === electionMode),
    [localBuffs, electionMode]
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveUnitId || !effectiveTargetId || bonusPp === 0) return;
    addLocalBuff({
      enabled: true,
      mode: electionMode,
      unitType,
      unitId: effectiveUnitId,
      targetId: effectiveTargetId,
      sourceId: sourceId && sourceId !== effectiveTargetId ? sourceId : null,
      bonusPp: Math.max(-30, Math.min(30, bonusPp)),
      label: label.trim() || undefined,
    });
    setLabel('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 border border-[#090A0F]/25 p-3 text-micro text-slate-700 flex items-start gap-2">
        <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-[#090A0F]">
            {lang === 'tr'
              ? 'Yerel Güç — Aday & Lider Etkisi (±pp)'
              : 'Local Strength — Candidate & Leader Effect (±pp)'}
          </div>
          <p className="mt-0.5 text-slate-600">
            {lang === 'tr'
              ? 'İl, seçim çevresi veya ilçe düzeyinde yerel aday/lider etkisi ekleyin. Ulusal salınım değişse bile bu birimlerde ±puan farkı korunur ve il → seçim çevresi → ilçe hiyerarşisinde otomatik devreder (manuel kilitli birimler hariç).'
              : 'Add ±pp local strength adjustments at province, district, or ilce level. They layer on top of national swing and cascade down to unlocked units.'}
          </p>
        </div>
      </div>

      {/* Add Form */}
      <form
        onSubmit={handleAdd}
        className="border border-[#090A0F] p-3 bg-white space-y-2.5"
      >
        <div className="text-micro font-bold uppercase tracking-wider text-[#090A0F]">
          {lang === 'tr' ? 'Yeni Yerel Güç Kuralı Ekle' : 'Add Local Strength Rule'}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="sm:col-span-3">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              {lang === 'tr' ? 'Birim Tipi' : 'Unit Level'}
            </label>
            <select
              value={unitType}
              onChange={(e) => {
                setUnitType(e.target.value as BuffUnitType);
                setUnitSearch('');
              }}
              className="w-full px-2 py-1.5 text-micro font-medium border border-[#090A0F]/40 bg-white"
            >
              <option value="province">{lang === 'tr' ? 'İl' : 'Province'}</option>
              {electionMode === 'parliamentary' && (
                <option value="district">
                  {lang === 'tr' ? 'Seçim Çevresi' : 'Electoral District'}
                </option>
              )}
              <option value="ilce">{lang === 'tr' ? 'İlçe' : 'District (İlçe)'}</option>
            </select>
          </div>

          <div className="sm:col-span-4">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              {lang === 'tr' ? 'Birim Ara & Seç' : 'Search & Select Unit'}
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                value={unitSearch}
                onChange={(e) => setUnitSearch(e.target.value)}
                placeholder={lang === 'tr' ? 'Ara...' : 'Filter...'}
                className="w-24 px-2 py-1.5 text-micro border border-[#090A0F]/30 bg-slate-50"
              />
              <select
                value={effectiveUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className="flex-1 min-w-0 px-2 py-1.5 text-micro font-medium border border-[#090A0F]/40 bg-white"
              >
                {unitOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              {electionMode === 'presidential'
                ? lang === 'tr'
                  ? 'Aday'
                  : 'Candidate'
                : lang === 'tr'
                ? 'Parti'
                : 'Party'}
            </label>
            <select
              value={effectiveTargetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full px-2 py-1.5 text-micro font-bold border border-[#090A0F]/40 bg-white"
            >
              {entities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.shortName}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
              {lang === 'tr' ? 'Etki (±pp) & Kaynak' : 'Bonus (±pp) & Source'}
            </label>
            <div className="flex gap-1">
              <input
                type="number"
                step={0.5}
                min={-30}
                max={30}
                value={bonusPp}
                onChange={(e) => setBonusPp(parseFloat(e.target.value) || 0)}
                className="w-16 px-1.5 py-1.5 text-micro font-mono font-bold text-right border border-[#090A0F]/40 bg-white"
              />
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="flex-1 min-w-0 px-1.5 py-1.5 text-micro border border-[#090A0F]/40 bg-white"
              >
                <option value="">{lang === 'tr' ? 'Orantılı' : 'Prop.'}</option>
                {entities
                  .filter((e) => e.id !== effectiveTargetId)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      ← {e.shortName}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={
              lang === 'tr'
                ? 'Açıklama (ör. Eskişehir Büyükşehir aday etkisi)'
                : 'Optional note'
            }
            className="flex-1 px-2.5 py-1.5 text-micro border border-[#090A0F]/30 bg-white"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-micro font-bold bg-[#090A0F] text-white hover:bg-[#090A0F]/85"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'tr' ? 'Kural Ekle' : 'Add Rule'}</span>
          </button>
        </div>
      </form>

      {/* Active Rules List */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-micro font-bold text-[#090A0F]">
          <span>
            {lang === 'tr' ? 'Tanımlı Yerel Güç Kuralları' : 'Configured Local Strength Rules'} ({modeBuffs.length})
          </span>
        </div>

        {modeBuffs.length === 0 ? (
          <div className="border border-dashed border-slate-300 p-4 text-center text-micro text-slate-500">
            {lang === 'tr'
              ? 'Bu seçim modu için henüz yerel güç kuralı eklenmedi.'
              : 'No local strength rules defined for this election mode yet.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-200 border border-[#090A0F]/30 bg-white">
            {modeBuffs.map((b) => {
              const target = entityById[b.targetId];
              const source = b.sourceId ? entityById[b.sourceId] : null;
              const unitLabel =
                unitNameLookup[`${b.unitType}:${b.unitId}`] || `${b.unitType}:${b.unitId}`;
              return (
                <div
                  key={b.id}
                  className={`px-3 py-2 flex items-center justify-between gap-2 ${
                    b.enabled ? '' : 'opacity-55 bg-slate-50'
                  }`}
                >
                  <label className="flex items-center gap-2.5 min-w-0 cursor-pointer">
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
                        {unitLabel}{' '}
                        <span className="font-normal text-slate-500">
                          · {target?.shortName || b.targetId}
                          {source ? ` ← ${source.shortName}` : ''}
                        </span>
                      </div>
                      {b.label && (
                        <div className="text-[11px] text-slate-500 truncate">{b.label}</div>
                      )}
                    </div>
                  </label>

                  <div className="flex items-center gap-1.5 shrink-0">
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
                      className="w-16 px-1.5 py-1 text-micro font-mono font-bold text-right border border-[#090A0F]/30"
                    />
                    <span className="text-[11px] font-mono text-slate-500">pp</span>
                    <button
                      type="button"
                      onClick={() => removeLocalBuff(b.id)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
