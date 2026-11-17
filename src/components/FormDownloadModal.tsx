import { useEffect, useState } from 'react';
import { Download, FileText, Printer, X } from 'lucide-react';
import { OFFICIAL_FORMS } from '../data/prambonCatalog.ts';

interface FormDownloadModalProps {
  isOpen: boolean;
  initialCode?: string;
  onClose: () => void;
}

export default function FormDownloadModal({
  isOpen,
  initialCode,
  onClose,
}: FormDownloadModalProps) {
  const [selectedCode, setSelectedCode] = useState<string>(
    initialCode || OFFICIAL_FORMS[0].code
  );

  useEffect(() => {
    if (initialCode) {
      const matched = OFFICIAL_FORMS.find(
        (f) => f.code.toUpperCase() === initialCode.toUpperCase()
      );
      if (matched) setSelectedCode(matched.code);
    }
  }, [initialCode, isOpen]);

  if (!isOpen) return null;

  const selectedForm =
    OFFICIAL_FORMS.find((f) => f.code === selectedCode) ?? OFFICIAL_FORMS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="text-xs font-semibold text-[#0D9488]">
              Pusat Formulir Resmi Adminduk Kecamatan Prambon
            </div>
            <h2 className="mt-0.5 text-base font-bold text-slate-900 sm:text-lg">
              Unduh &amp; Pratinjau Formulir Pelayanan (Gratis Rp 0)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal formulir"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="grid flex-1 grid-cols-1 overflow-y-auto md:grid-cols-12">
          {/* Left selector */}
          <div className="border-b border-slate-200 bg-slate-50 p-4 md:col-span-4 md:border-r md:border-b-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pilih Kode Formulir
            </div>
            <div className="mt-2.5 space-y-2">
              {OFFICIAL_FORMS.map((form) => {
                const active = form.code === selectedForm.code;
                return (
                  <button
                    key={form.code}
                    type="button"
                    onClick={() => setSelectedCode(form.code)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      active
                        ? 'border-[#1E3A8A] bg-white ring-1 ring-[#1E3A8A]'
                        : 'border-slate-200 bg-white/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-mono-tabular text-xs font-bold text-[#1E3A8A]">
                      {form.code}
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-slate-800 line-clamp-2">
                      {form.title.replace(`Formulir ${form.code} — `, '')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right detail & printable sheet */}
          <div className="p-5 sm:p-6 md:col-span-8 space-y-5">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 font-mono-tabular text-xs font-bold text-[#0D9488]">
                  <FileText className="h-4 w-4" />
                  <span>KODE {selectedForm.code}</span>
                </div>
                <h3 className="mt-1 text-base font-bold text-slate-900">
                  {selectedForm.title}
                </h3>
                <p className="mt-0.5 text-xs text-slate-600">
                  Layanan Terkait: <strong>{selectedForm.serviceName}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-700">
              {selectedForm.description}
            </p>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Kolom Isian Utama pada Formulir
              </h4>
              <ol className="mt-2.5 space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                {selectedForm.fields.map((field, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-xs text-slate-800"
                  >
                    <span className="font-mono-tabular flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#1E3A8A] text-[11px] font-bold text-white">
                      {idx + 1}
                    </span>
                    <span className="pt-0.5">{field}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
              <h4 className="text-xs font-bold text-amber-900">Petunjuk Pengisian</h4>
              <ul className="mt-1.5 space-y-1 text-xs text-amber-900/90">
                {selectedForm.notes.map((note, idx) => (
                  <li key={idx}>• {note}</li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Cetak Pratinjau</span>
              </button>
              <a
                href={`/api/forms/${encodeURIComponent(selectedForm.code)}/download`}
                download={`Formulir_${selectedForm.code}_SIAP_Prambon.html`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E3A8A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#172e6e]"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Unduh Formulir {selectedForm.code}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
