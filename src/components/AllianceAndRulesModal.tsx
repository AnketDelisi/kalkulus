import React, { useState } from 'react';
import {
  GitMerge,
  Landmark,
  Plus,
  Shield,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import baseline2023Raw from '../data/baseline2023.json';
import { translations } from '../i18n/translations';
import { useElectionStore } from '../store/useElectionStore';
import { BaselineDataset } from '../types/election';

const BASELINE_2023 = baseline2023Raw as unknown as BaselineDataset;

interface AllianceAndRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AllianceAndRulesModal: React.FC<AllianceAndRulesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    lang,
    parties,
    alliances,
    jointListRules,
    projection,
    addCustomParty,
    updatePartyConfig,
    addAlliance,
    addJointListRule,
    updateJointListRule,
    removeJointListRule,
    updateDistrictMpCount,
  } = useElectionStore();

  const [activeTab, setActiveTab] = useState<'parties' | 'joint' | 'seats'>('parties');

  // New Party Form State
  const [newPartyShort, setNewPartyShort] = useState('');
  const [newPartyFull, setNewPartyFull] = useState('');
  const [newPartyColor, setNewPartyColor] = useState('#14b8a6');
  const [newPartyAlliance, setNewPartyAlliance] = useState<string>('');

  // New Alliance Form State
  const [newAllianceShort, setNewAllianceShort] = useState('');
  const [newAllianceName, setNewAllianceName] = useState('');
  const [newAllianceColor, setNewAllianceColor] = useState('#f97316');

  // New Joint List Rule State
  const [jlSource, setJlSource] = useState('TIP');
  const [jlTarget, setJlTarget] = useState('DEM');
  const [jlDistrictMode, setJlDistrictMode] = useState<'ALL' | 'SMALL' | 'CUSTOM'>('SMALL');
  const [jlMaxMp, setJlMaxMp] = useState(5);
  const [jlCustomDistricts, setJlCustomDistricts] = useState('06-1, 34-1');
  const [jlEfficiency, setJlEfficiency] = useState(90);
  const [jlReserved, setJlReserved] = useState(0);

  if (!isOpen) return null;
  const t = translations[lang];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="pixel-box-bright w-full max-w-4xl max-h-[88vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-700 bg-slate-900">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <h2 className="font-pixel text-sm text-amber-300">{t.rulesAndAlliancesBtn}</h2>
          </div>
          <button onClick={onClose} className="pixel-btn px-2 py-1 text-xs">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex gap-2 px-4 py-2 bg-slate-950 border-b-2 border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('parties')}
            className={`pixel-btn px-3 py-1.5 ${
              activeTab === 'parties' ? 'pixel-btn-amber' : ''
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Partiler & İttifaklar</span>
          </button>
          <button
            onClick={() => setActiveTab('joint')}
            className={`pixel-btn px-3 py-1.5 ${
              activeTab === 'joint' ? 'pixel-btn-amber' : ''
            }`}
          >
            <GitMerge className="w-3.5 h-3.5" />
            <span>{t.jointListsTitle}</span>
          </button>
          <button
            onClick={() => setActiveTab('seats')}
            className={`pixel-btn px-3 py-1.5 ${
              activeTab === 'seats' ? 'pixel-btn-amber' : ''
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>87 Seçim Çevresi MV Sayıları ({projection.totalSeatsAllocated} MV)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs flex-1">
          {activeTab === 'parties' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Party Alliance Assignment & Colors */}
              <div className="bg-slate-950 border-2 border-slate-800 p-3 space-y-2">
                <h3 className="font-pixel text-xs text-cyan-300 mb-2">
                  PARTİ İTTİFAK ATAMALARI & RENKLER
                </h3>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {parties
                    .filter((p) => !p.isOther)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 px-2 py-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={p.color}
                            onChange={(e) => updatePartyConfig(p.id, { color: e.target.value })}
                            className="w-6 h-6 bg-transparent border-0 cursor-pointer"
                          />
                          <div>
                            <div className="font-bold text-slate-100">{p.shortName}</div>
                            <div className="text-[10px] text-slate-400">{p.fullName}</div>
                          </div>
                        </div>

                        <select
                          value={p.allianceId || ''}
                          onChange={(e) =>
                            updatePartyConfig(p.id, {
                              allianceId: e.target.value ? e.target.value : null,
                            })
                          }
                          className="pixel-input px-2 py-1 text-xs"
                        >
                          <option value="">Bağımsız (İttifaksız)</option>
                          {alliances.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                </div>
              </div>

              {/* Add Custom Party & Add New Alliance */}
              <div className="space-y-4">
                <div className="bg-slate-950 border-2 border-slate-800 p-3 space-y-2">
                  <h3 className="font-pixel text-xs text-amber-300">{t.addCustomParty}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Kısa Ad (Örn: DEVA, ANAHTAR)"
                      value={newPartyShort}
                      onChange={(e) => setNewPartyShort(e.target.value)}
                      className="pixel-input px-2 py-1.5"
                    />
                    <input
                      type="text"
                      placeholder="Tam Parti Adı"
                      value={newPartyFull}
                      onChange={(e) => setNewPartyFull(e.target.value)}
                      className="pixel-input px-2 py-1.5"
                    />
                    <select
                      value={newPartyAlliance}
                      onChange={(e) => setNewPartyAlliance(e.target.value)}
                      className="pixel-input px-2 py-1.5"
                    >
                      <option value="">İttifaksız</option>
                      {alliances.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={newPartyColor}
                        onChange={(e) => setNewPartyColor(e.target.value)}
                        className="w-8 h-8 cursor-pointer"
                      />
                      <button
                        onClick={() => {
                          if (!newPartyShort.trim()) return;
                          addCustomParty(
                            newPartyShort.trim(),
                            newPartyFull.trim() || newPartyShort.trim(),
                            newPartyColor,
                            newPartyAlliance || null
                          );
                          setNewPartyShort('');
                          setNewPartyFull('');
                        }}
                        className="pixel-btn pixel-btn-amber px-3 py-1.5 flex-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Parti Ekle</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 border-2 border-slate-800 p-3 space-y-2">
                  <h3 className="font-pixel text-xs text-emerald-300">YENİ İTTİFAK OLUŞTUR</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Kısa Kod (Örn: MERKEZ)"
                      value={newAllianceShort}
                      onChange={(e) => setNewAllianceShort(e.target.value)}
                      className="pixel-input px-2 py-1.5"
                    />
                    <input
                      type="text"
                      placeholder="İttifak Tam Adı"
                      value={newAllianceName}
                      onChange={(e) => setNewAllianceName(e.target.value)}
                      className="pixel-input px-2 py-1.5"
                    />
                    <div className="col-span-2 flex items-center gap-2">
                      <input
                        type="color"
                        value={newAllianceColor}
                        onChange={(e) => setNewAllianceColor(e.target.value)}
                        className="w-8 h-8 cursor-pointer"
                      />
                      <button
                        onClick={() => {
                          if (!newAllianceShort.trim()) return;
                          addAlliance(
                            newAllianceName.trim() || newAllianceShort.trim(),
                            newAllianceShort.trim().toUpperCase(),
                            newAllianceColor
                          );
                          setNewAllianceShort('');
                          setNewAllianceName('');
                        }}
                        className="pixel-btn pixel-btn-cyan px-3 py-1.5 flex-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>İttifak Ekle</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'joint' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border-2 border-slate-800 p-3 space-y-3">
                <h3 className="font-pixel text-xs text-amber-300">
                  ORTAK ADAY LİSTESİ / TAKTİK OY TRANSFERİ EKLE
                </h3>
                <p className="text-slate-400">
                  Belirli seçim çevrelerinde bir partinin seçime ayrı liste yerine başka bir partinin
                  listesinden girmesini ve seçilen kontenjan vekillerinin aktarılmasını simüle eder.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">
                      Çekilen / Misafir Parti:
                    </label>
                    <select
                      value={jlSource}
                      onChange={(e) => setJlSource(e.target.value)}
                      className="w-full pixel-input px-2 py-1.5"
                    >
                      {parties
                        .filter((p) => !p.isOther)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.shortName} - {p.fullName}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">
                      Çatı / Ev Sahibi Liste Partisi:
                    </label>
                    <select
                      value={jlTarget}
                      onChange={(e) => setJlTarget(e.target.value)}
                      className="w-full pixel-input px-2 py-1.5"
                    >
                      {parties
                        .filter((p) => !p.isOther)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.shortName} - {p.fullName}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">
                      Oy Geçiş Verimi (%):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={jlEfficiency}
                      onChange={(e) => setJlEfficiency(parseInt(e.target.value, 10) || 0)}
                      className="w-full pixel-input px-2 py-1.5"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">
                      Uygulanacak Seçim Çevreleri:
                    </label>
                    <select
                      value={jlDistrictMode}
                      onChange={(e) => setJlDistrictMode(e.target.value as any)}
                      className="w-full pixel-input px-2 py-1.5"
                    >
                      <option value="SMALL">Küçük Seçim Çevrelerinde (MV Sayısına Göre)</option>
                      <option value="ALL">Tüm 87 Seçim Çevresinde</option>
                      <option value="CUSTOM">Belirli Seçim Çevrelerinde (Kod İle)</option>
                    </select>
                  </div>

                  {jlDistrictMode === 'SMALL' && (
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">
                        En Fazla Kaç MV Çıkaran İller? (≤ N MV):
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={36}
                        value={jlMaxMp}
                        onChange={(e) => setJlMaxMp(parseInt(e.target.value, 10) || 5)}
                        className="w-full pixel-input px-2 py-1.5"
                      />
                    </div>
                  )}

                  {jlDistrictMode === 'CUSTOM' && (
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 mb-1">
                        Bölge Kodları (Virgülle, Örn: 01, 06-1, 34-2):
                      </label>
                      <input
                        type="text"
                        value={jlCustomDistricts}
                        onChange={(e) => setJlCustomDistricts(e.target.value)}
                        className="w-full pixel-input px-2 py-1.5"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-mono text-slate-400 mb-1">
                      Bölge Başına Garantili Kontenjan MV:
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={jlReserved}
                      onChange={(e) => setJlReserved(parseInt(e.target.value, 10) || 0)}
                      className="w-full pixel-input px-2 py-1.5"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (jlSource === jlTarget) return;
                    addJointListRule({
                      enabled: true,
                      sourcePartyId: jlSource,
                      targetPartyId: jlTarget,
                      districtIds:
                        jlDistrictMode === 'ALL'
                          ? ['ALL']
                          : jlDistrictMode === 'CUSTOM'
                          ? jlCustomDistricts
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean)
                          : [],
                      maxDistrictMpThreshold: jlDistrictMode === 'SMALL' ? jlMaxMp : undefined,
                      transferEfficiency: jlEfficiency,
                      reservedSeatsPerDistrict: jlReserved,
                    });
                  }}
                  className="pixel-btn pixel-btn-amber px-4 py-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t.addJointRule}</span>
                </button>
              </div>

              {/* Active Joint List Rules */}
              <div className="space-y-2">
                {jointListRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="bg-slate-900 border-2 border-slate-700 p-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => updateJointListRule(rule.id, { enabled: e.target.checked })}
                        className="accent-amber-500 w-4 h-4"
                      />
                      <span className="font-mono font-bold text-amber-300">
                        {rule.sourcePartyId} → {rule.targetPartyId} Listesi
                      </span>
                      <span className="text-slate-300 font-mono">
                        (Verim: %{rule.transferEfficiency}, Kontenjan: {rule.reservedSeatsPerDistrict} MV/bölge,{' '}
                        {rule.districtIds.includes('ALL')
                          ? '87 Bölge'
                          : rule.maxDistrictMpThreshold
                          ? `≤${rule.maxDistrictMpThreshold} MV Bölgeler`
                          : rule.districtIds.join(', ')}
                        )
                      </span>
                    </div>
                    <button
                      onClick={() => removeJointListRule(rule.id)}
                      className="pixel-btn px-2 py-1 text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'seats' && (
            <div className="space-y-3">
              <p className="text-slate-400">
                87 Seçim Çevresinin çıkardığı milletvekili sayılarını YSK güncellemelerine veya özel
                senaryolara göre aşağıdan değiştirebilirsiniz.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-96 overflow-y-auto pr-1">
                {BASELINE_2023.districts.map((d) => {
                  const currentMp = projection.districtResults[d.id]?.mpCount ?? d.mpCount;
                  return (
                    <div
                      key={d.id}
                      className="bg-slate-950 border border-slate-800 px-2.5 py-1.5 flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <span className="font-mono text-amber-400 font-bold mr-1">{d.id}</span>
                        <span className="text-slate-200">{d.name}</span>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={currentMp}
                        onChange={(e) =>
                          updateDistrictMpCount(d.id, parseInt(e.target.value, 10) || 1)
                        }
                        className="w-14 pixel-input px-1.5 py-0.5 text-right font-bold text-amber-300"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
