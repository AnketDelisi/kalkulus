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
    a.download = `kalkulus-87-bolge-sonuclar.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportScenario = () => {
    if (!jsonText.trim()) return;
    const ok = importScenarioJson(jsonText);
    if (ok) {
      setStatusMsg('Senaryo başarıyla yüklendi!');
      setTimeout(() => {
        setStatusMsg(null);
        onClose();
      }, 900);
    } else {
      setStatusMsg('Hata: Geçersiz JSON formatı.');
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
          setStatusMsg('Özel baz veri seti başarıyla yüklendi!');
        } else if (parsed && parsed.nationalTargetShares) {
          importScenarioJson(JSON.stringify(parsed));
          setStatusMsg('Senaryo dosyası yüklendi!');
        } else {
          setStatusMsg('Dosya formatı tanınmadı.');
        }
      } catch {
        setStatusMsg('Dosya okunamadı.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="editorial-card w-full max-w-2xl flex flex-col overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
          <h2 className="text-base font-bold text-slate-900">{t.exportImportBtn}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              onClick={handleCopyScenario}
              className="editorial-btn editorial-btn-primary py-2.5 px-3"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Panoya Kopyalandı!' : 'Senaryo JSON Kopyala'}</span>
            </button>

            <button onClick={handleDownloadJson} className="editorial-btn py-2.5 px-3">
              <Download className="w-4 h-4 text-slate-600" />
              <span>Senaryo (.JSON) İndir</span>
            </button>

            <button onClick={handleDownloadCsv} className="editorial-btn py-2.5 px-3">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>87 Bölge Tablosu (.CSV)</span>
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileUp className="w-4 h-4 text-slate-600" />
              <span className="text-slate-700 font-medium">
                Bilgisayardan Senaryo veya Özel Baz Veri (.JSON) Yükle
              </span>
            </div>
            <label className="editorial-btn px-3 py-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Dosya Seç</span>
              <input
                type="file"
                accept=".json"
                onChange={handleCustomDatasetFile}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="block font-medium text-slate-600">
              Senaryo JSON Metni (Yapıştırıp Yükleyebilirsiniz)
            </label>
            <textarea
              rows={6}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='{"version": "1.0", "nationalTargetShares": ...}'
              className="w-full editorial-input p-2.5 font-mono text-[11px]"
            />
            <div className="flex items-center justify-between pt-1">
              {statusMsg ? (
                <span className="font-semibold text-emerald-600">{statusMsg}</span>
              ) : (
                <span />
              )}
              <button
                onClick={handleImportScenario}
                className="editorial-btn editorial-btn-primary px-4 py-2"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Metinden Senaryoyu Yükle</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
