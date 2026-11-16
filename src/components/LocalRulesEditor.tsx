import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useElectionStore } from '../store/useElectionStore';
import { LocalRuleMode } from '../types/election';

export const LocalRulesEditor: React.FC = () => {
  const {
    lang,
    parties,
    localAllianceRules,
    toggleLocalAllianceRule,
    updateLocalAllianceRule,
    addLocalAllianceRule,
    removeLocalAllianceRule,
  } = useElectionStore();

  const nonOther = parties.filter((p) => !p.isOther);

  const [locMode, setLocMode] = useState<LocalRuleMode>('tactical_soft');
  const [locName, setLocName] = useState('');
  const [locSource, setLocSource] = useState('DEM');
  const [locTarget, setLocTarget] = useState('YENI');
  const [locProvs, setLocProvs] = useState('34, 06, 35');
  const [locNationwide, setLocNationwide] = useState(false);
  const [locEff, setLocEff] = useState(45);
  const [locAbstain, setLocAbstain] = useState(10);
  const [locMaxMargin, setLocMaxMargin] = useState(12);
  const [locRetainFloor, setLocRetainFloor] = useState(35);

  const isPresetRule = (id: string) =>
    id.startsWith('cumhur_') || id.startsWith('tactical_');

  return (
    <div className="space-y-4 text-body">
      <p className="text-slate-600 text-micro leading-relaxed">
        {lang === 'tr'
          ? 'Kesin aday çekilmesi (Ortak Aday) veya rekabetçi illerde adayı pusulada tutarak kısmi geçiş sağlayan Taktiksel Oy (Kent Uzlaşısı) kurallarını yönetin.'
          : 'Manage hard candidate withdrawals (Joint Candidate) or margin-triggered Soft Tactical Consolidation rules while keeping the source party on the ballot.'}
      </p>

      {/* Active Rules List */}
      <div className="space-y-2.5">
        {localAllianceRules.map((rule) => {
          const mode: LocalRuleMode = rule.mode ?? 'withdrawal';
          const isTactical = mode === 'tactical_soft';

          return (
            <div
              key={rule.id}
              className="p-3 bg-[#F4F5F7] border border-[#090A0F] space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2.5 cursor-pointer min-w-0">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => toggleLocalAllianceRule(rule.id)}
                    className="accent-[#090A0F] w-4 h-4 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#090A0F]">{rule.name}</span>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-mono font-bold border border-[#090A0F] ${
                          isTactical
                            ? 'bg-emerald-200 text-[#090A0F]'
                            : 'bg-amber-200 text-[#090A0F]'
                        }`}
                      >
                        {isTactical
                          ? lang === 'tr'
                            ? 'TAKTİKSEL OY'
                            : 'TACTICAL'
                          : lang === 'tr'
                          ? 'ÇEKİLME'
                          : 'WITHDRAWAL'}
                      </span>
                    </div>
                    <div className="text-micro text-slate-500 font-mono">
                      {rule.sourcePartyId} → {rule.targetPartyId} ·{' '}
                      {rule.applyNationwide || rule.provinceIds.length === 0
                        ? lang === 'tr'
                          ? 'Tüm 81 İl'
                          : 'All 81 Prov'
                        : `${rule.provinceIds.length} ${lang === 'tr' ? 'İl' : 'Prov'} (${rule.provinceIds
                            .slice(0, 6)
                            .join(', ')}${rule.provinceIds.length > 6 ? '...' : ''})`}
                    </div>
                  </div>
                </label>

                <div className="flex items-center gap-2">
                  {!isPresetRule(rule.id) && (
                    <button
                      onClick={() => removeLocalAllianceRule(rule.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 border border-slate-300"
                      title={lang === 'tr' ? 'Kuralı sil' : 'Delete rule'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Parameter controls */}
              <div className="flex flex-wrap items-center gap-3 text-micro pt-1 border-t border-slate-300/70">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600">
                    {lang === 'tr' ? 'Geçiş %:' : 'Transfer %:'}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={rule.transferEfficiency}
                    onChange={(e) =>
                      updateLocalAllianceRule(rule.id, {
                        transferEfficiency: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)),
                      })
                    }
                    className="w-14 studio-input px-1.5 py-0.5 text-right font-mono font-bold"
                  />
                </div>

                {isTactical && (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-600">
                        {lang === 'tr' ? 'Fark sınırı (pp):' : 'Max gap (pp):'}
                      </span>
                      <input
                        type="number"
                        min={5}
                        max={30}
                        value={rule.maxMarginTriggerPct ?? 12}
                        onChange={(e) =>
                          updateLocalAllianceRule(rule.id, {
                            maxMarginTriggerPct: Math.min(
                              30,
                              Math.max(5, parseFloat(e.target.value) || 12)
                            ),
                          })
                        }
                        className="w-14 studio-input px-1.5 py-0.5 text-right font-mono font-bold"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-600">
                        {lang === 'tr' ? 'Taban koruma %:' : 'Floor %:'}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={90}
                        value={rule.retainFloorPct ?? 30}
                        onChange={(e) =>
                          updateLocalAllianceRule(rule.id, {
                            retainFloorPct: Math.min(90, Math.max(0, parseInt(e.target.value, 10) || 0)),
                          })
                        }
                        className="w-14 studio-input px-1.5 py-0.5 text-right font-mono font-bold"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-600">
                        {lang === 'tr' ? 'Fire %:' : 'Abstain %:'}
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={rule.abstainPct ?? 0}
                        onChange={(e) =>
                          updateLocalAllianceRule(rule.id, {
                            abstainPct: Math.min(50, Math.max(0, parseInt(e.target.value, 10) || 0)),
                          })
                        }
                        className="w-14 studio-input px-1.5 py-0.5 text-right font-mono font-bold"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Rule */}
      <div className="p-3.5 border border-[#090A0F] bg-white space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="font-bold text-[#090A0F] text-body">
            {lang === 'tr' ? 'Yeni kural ekle' : 'Add local rule'}
          </div>
          <div className="flex border border-[#090A0F] text-micro font-semibold">
            <button
              type="button"
              onClick={() => setLocMode('tactical_soft')}
              className={`px-2 py-0.5 ${
                locMode === 'tactical_soft' ? 'bg-[#090A0F] text-white' : 'bg-white text-[#090A0F]'
              }`}
            >
              {lang === 'tr' ? 'Taktiksel oy' : 'Tactical soft'}
            </button>
            <button
              type="button"
              onClick={() => setLocMode('withdrawal')}
              className={`px-2 py-0.5 ${
                locMode === 'withdrawal' ? 'bg-[#090A0F] text-white' : 'bg-white text-[#090A0F]'
              }`}
            >
              {lang === 'tr' ? 'Çekilme / ortak aday' : 'Hard withdrawal'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-micro">
          <input
            type="text"
            placeholder={lang === 'tr' ? 'Kural adı' : 'Rule name'}
            value={locName}
            onChange={(e) => setLocName(e.target.value)}
            className="col-span-2 sm:col-span-4 studio-input px-2.5 py-1.5"
          />

          <div>
            <label className="block text-slate-500 mb-0.5">
              {lang === 'tr' ? 'Kaynak parti' : 'Source party'}
            </label>
            <select
              value={locSource}
              onChange={(e) => setLocSource(e.target.value)}
              className="w-full studio-input px-2 py-1.5"
            >
              {nonOther.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.shortName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 mb-0.5">
              {lang === 'tr' ? 'Desteklenen parti' : 'Target party'}
            </label>
            <select
              value={locTarget}
              onChange={(e) => setLocTarget(e.target.value)}
              className="w-full studio-input px-2 py-1.5"
            >
              {nonOther.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.shortName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 mb-0.5">
              {lang === 'tr' ? 'İl plakaları (boş=tümü)' : 'Plates (empty=all)'}
            </label>
            <input
              type="text"
              value={locProvs}
              disabled={locNationwide}
              onChange={(e) => setLocProvs(e.target.value)}
              placeholder="34, 06, 35"
              className="w-full studio-input px-2 py-1.5 font-mono disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-slate-500 mb-0.5">
              {lang === 'tr' ? 'Aktarım %' : 'Transfer %'}
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={locEff}
              onChange={(e) => setLocEff(parseInt(e.target.value, 10) || 0)}
              className="w-full studio-input px-2 py-1.5 font-mono"
            />
          </div>

          {locMode === 'tactical_soft' && (
            <>
              <div>
                <label className="block text-slate-500 mb-0.5">
                  {lang === 'tr' ? 'Fark sınırı (pp)' : 'Max gap (pp)'}
                </label>
                <input
                  type="number"
                  min={5}
                  max={30}
                  value={locMaxMargin}
                  onChange={(e) => setLocMaxMargin(parseFloat(e.target.value) || 12)}
                  className="w-full studio-input px-2 py-1.5 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-0.5">
                  {lang === 'tr' ? 'Taban koruma %' : 'Floor %'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={locRetainFloor}
                  onChange={(e) => setLocRetainFloor(parseInt(e.target.value, 10) || 35)}
                  className="w-full studio-input px-2 py-1.5 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-0.5">
                  {lang === 'tr' ? 'Fire / Katılmama %' : 'Abstain %'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={locAbstain}
                  onChange={(e) => setLocAbstain(parseInt(e.target.value, 10) || 0)}
                  className="w-full studio-input px-2 py-1.5 font-mono"
                />
              </div>
              <label className="flex items-center gap-1.5 pt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={locNationwide}
                  onChange={(e) => setLocNationwide(e.target.checked)}
                  className="accent-[#090A0F]"
                />
                <span>{lang === 'tr' ? '81 il geneli' : 'All 81'}</span>
              </label>
            </>
          )}
        </div>

        <button
          onClick={() => {
            const codes = locNationwide
              ? []
              : locProvs
                  .split(',')
                  .map((s) => s.trim().padStart(2, '0'))
                  .filter((s) => /^\d{2}$/.test(s));
            addLocalAllianceRule({
              name: locName.trim() || `${locSource} → ${locTarget}`,
              enabled: true,
              mode: locMode,
              sourcePartyId: locSource,
              targetPartyId: locTarget,
              provinceIds: codes,
              applyNationwide: locNationwide,
              transferEfficiency: locEff,
              ...(locMode === 'tactical_soft'
                ? {
                    abstainPct: locAbstain,
                    maxMarginTriggerPct: locMaxMargin,
                    retainFloorPct: locRetainFloor,
                  }
                : {}),
            });
            setLocName('');
          }}
          className="studio-btn studio-btn-primary px-3 py-1.5 text-micro"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{lang === 'tr' ? 'Yerel kural ekle' : 'Add local rule'}</span>
        </button>
      </div>
    </div>
  );
};
