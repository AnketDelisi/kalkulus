import React, { useState } from 'react';
import { Check, Copy, Download, FileUp, Upload, X } from 'lucide-react';
import { translations } from '../i18n/translations';
import { useElectionStore } from '../store/useElectionStore';

interface ScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScenarioModal: React.FC<ScenarioModalProps> = ({ isOpen, onClose }) => {
  const {
    lang,
    parties,
    projection,
    exportScenarioJson,
    importScenarioJson,
    loadCustomBaseline,
  } = useElectionStore();

  const [jsonText, setJsonText] = useState('');
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;
  const t = translations[lang];
  const districtCount = Object.keys(projection.districtResults).length || 87;

  const handleCopyScenario = () => {
    const data = exportScenarioJson();
    setJsonText(data);
    navigator.clipboard?.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJson = () => {
    const data = exportScenarioJson();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kalkulus-senaryo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    const nonOther = parties.filter((p) => !p.isOther);
    const headers = [
      'BolgeKodu',
      'SecimCevresi',
      'MV_Sayisi',
      'Secmen',
      'Katilim_Pct',
      'Gecerli_Oy',
      ...nonOther.map((p) => `${p.shortName}_Pct`),
      ...nonOther.map((p) => `${p.shortName}_MV`),
    ];
    const rows = Object.values(projection.districtResults).map((d) => [
      d.id,
      `"${d.name}"`,
      d.mpCount,
      d.registeredVoters,
      d.turnout.toFixed(2),
      d.totalValidVotes,
      ...nonOther.map((p) => (d.partyShares[p.id] || 0).toFixed(2)),
      ...nonOther.map((p) => d.partySeats[p.id] || 0),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kalkulus-${districtCount}-bolge-sonuclar.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportScenario = () => {
    if (!jsonText.trim()) return;
    const ok = importScenarioJson(jsonText);
    if (ok) {
      setStatusMsg(lang === 'tr' ? 'Senaryo başarıyla yüklendi.' : 'Scenario loaded successfully.');
      setTimeout(() => {
        setStatusMsg(null);
        onClose();
      }, 900);
    } else {
      setStatusMsg(lang === 'tr' ? 'Hata: geçersiz JSON formatı.' : 'Error: invalid JSON format.');
    }
  };

  const handleCustomDatasetFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result || ''));
        if (parsed && parsed.ilceler && parsed.districts) {
          loadCustomBaseline(parsed);
          setStatusMsg(lang === 'tr' ? 'Özel baz veri seti yüklendi.' : 'Custom baseline loaded.');
        } else if (parsed && parsed.nationalTargetShares) {
          importScenarioJson(JSON.stringify(parsed));
          setStatusMsg(lang === 'tr' ? 'Senaryo dosyası yüklendi.' : 'Scenario file loaded.');
        } else {
          setStatusMsg(lang === 'tr' ? 'Dosya formatı tanınmadı.' : 'Unrecognized file format.');
        }
      } catch {
        setStatusMsg(lang === 'tr' ? 'Dosya okunamadı.' : 'Failed to read file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#090A0F]/70 flex items-center justify-center p-4">
      <div className="studio-panel w-full max-w-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#090A0F] text-white">
          <h2 className="text-title font-bold">
            {t.exportImportBtn}
          </h2>
          <button
            onClick={onClose}
            className="p-1 border border-white/25 hover:bg-white hover:text-[#090A0F] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-body bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              onClick={handleCopyScenario}
              className="studio-btn studio-btn-primary py-2.5 px-3"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>
                {copied
                  ? lang === 'tr'
                    ? 'Kopyalandı'
                    : 'Copied'
                  : lang === 'tr'
                  ? 'Senaryo JSON kopyala'
                  : 'Copy scenario JSON'}
              </span>
            </button>

            <button onClick={handleDownloadJson} className="studio-btn py-2.5 px-3">
              <Download className="w-4 h-4" />
              <span>{lang === 'tr' ? 'Senaryo (.json) indir' : 'Download (.json)'}</span>
            </button>

            <button onClick={handleDownloadCsv} className="studio-btn py-2.5 px-3">
              <Download className="w-4 h-4 text-emerald-700" />
              <span>{lang === 'tr' ? `${districtCount} bölge (.csv)` : `${districtCount} districts (.csv)`}</span>
            </button>
          </div>

          <div className="bg-[#F4F5F7] border-[1.5px] border-[#090A0F] p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileUp className="w-4 h-4 text-[#090A0F]" />
              <span className="text-[#090A0F] font-bold text-body">
                {lang === 'tr'
                  ? 'Bilgisayardan senaryo veya özel baz veri (.json) yükle'
                  : 'Upload scenario or custom baseline (.json)'}
              </span>
            </div>
            <label className="studio-btn px-3 py-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{lang === 'tr' ? 'Dosya seç' : 'Choose file'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleCustomDatasetFile}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="block eyebrow">
              {lang === 'tr'
                ? 'Senaryo JSON metni (yapıştırıp yükleyebilirsiniz)'
                : 'Scenario JSON text (paste to load)'}
            </label>
            <textarea
              rows={6}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='{"version": "1.0", "nationalTargetShares": ...}'
              className="w-full studio-input p-2.5 font-mono text-micro"
            />
            <div className="flex items-center justify-between pt-1">
              {statusMsg ? (
                <span className="font-bold text-emerald-700">{statusMsg}</span>
              ) : (
                <span />
              )}
              <button
                onClick={handleImportScenario}
                className="studio-btn studio-btn-primary px-4 py-2"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{lang === 'tr' ? 'Metinden senaryoyu yükle' : 'Load scenario from text'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
