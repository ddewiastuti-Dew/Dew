import { useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileCheck2,
  FileText,
  Loader2,
  Lock,
  Printer,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  PRAMBON_SERVICES,
  PRAMBON_VILLAGES,
  SIMULATION_PRESETS,
  SUPPORTING_DOCUMENT_SLOTS,
  type SimulationPreset,
} from '../data/prambonCatalog.ts';
import type {
  PreValidationTicket,
  ServiceCatalogItem,
  ServiceId,
  UploadedDocumentInput,
} from '../types.ts';
import QrCodeSvg from './QrCodeSvg.tsx';
import {
  ChecklistItemLabel,
  ConsistencyCellLabel,
  OfficerStatusLabel,
  ValidationStatusBanner,
} from './StatusBadge.tsx';

interface CitizenPreValidationProps {
  services?: ServiceCatalogItem[];
  selectedServiceId: ServiceId;
  onSelectServiceId: (id: ServiceId) => void;
  onTicketCreated: (ticket: PreValidationTicket) => void;
  onNavigateTicketLookup: (ticketId: string) => void;
}

export default function CitizenPreValidation({
  services,
  selectedServiceId,
  onSelectServiceId,
  onTicketCreated,
  onNavigateTicketLookup,
}: CitizenPreValidationProps) {
  const serviceCatalog = services && services.length > 0 ? services : PRAMBON_SERVICES;
  const [nama, setNama] = useState('');
  const [nik, setNik] = useState('');
  const [ttl, setTtl] = useState('');
  const [alamat, setAlamat] = useState('');
  const [desa, setDesa] = useState('Prambon');
  const [nomorKK, setNomorKK] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [documents, setDocuments] = useState<UploadedDocumentInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultTicket, setResultTicket] = useState<PreValidationTicket | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const selectedService =
    serviceCatalog.find((s) => s.id === selectedServiceId) ?? serviceCatalog[0];

  const handleLoadPreset = (preset: SimulationPreset) => {
    onSelectServiceId(preset.serviceId);
    setNama(preset.citizenInfo.nama);
    setNik(preset.citizenInfo.nik);
    setTtl(preset.citizenInfo.tempatTanggalLahir);
    setAlamat(preset.citizenInfo.alamat);
    setDesa(preset.citizenInfo.desa);
    setNomorKK(preset.citizenInfo.nomorKK);
    setExtraNotes(preset.extraNotes);
    setDocuments(
      preset.simulatedDocs.map((d, idx) => ({
        id: `sim-${preset.id}-${idx}`,
        slotKey: d.slotKey,
        name: d.name,
        docType: d.docType,
        mimeType: 'text/plain',
        simulatedText: d.simulatedText,
      }))
    );
    setErrorMsg(null);
    setResultTicket(null);
  };

  const handleReset = () => {
    setNama('');
    setNik('');
    setTtl('');
    setAlamat('');
    setDesa('Prambon');
    setNomorKK('');
    setExtraNotes('');
    setDocuments([]);
    setErrorMsg(null);
    setResultTicket(null);
  };

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        const commaIdx = res.indexOf(',');
        resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
      };
      reader.onerror = () => reject(new Error('Gagal membaca berkas.'));
      reader.readAsDataURL(file);
    });

  const handleSlotFileUpload = async (
    slotKey: string,
    slotLabel: string,
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const base64Data = await readFileAsBase64(file);
    const isImage = file.type.startsWith('image/');
    const newDoc: UploadedDocumentInput = {
      id: `upload-${slotKey}-${Date.now()}`,
      slotKey,
      name: file.name,
      docType: slotLabel.replace(/^\d+\.\s*/, ''),
      mimeType: file.type || 'image/jpeg',
      base64Data,
      previewUrl: isImage ? URL.createObjectURL(file) : undefined,
    };

    setDocuments((prev) => [...prev.filter((d) => d.slotKey !== slotKey), newDoc]);
    e.target.value = '';
  };

  const handleRemoveDoc = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSubmitValidation = async () => {
    if (!nama.trim() || !nik.trim()) {
      setErrorMsg('Mohon lengkapi Nama Lengkap dan NIK pemohon (16 digit) terlebih dahulu.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/prevalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          citizenInfo: {
            nama: nama.trim(),
            nik: nik.trim(),
            tempatTanggalLahir: ttl.trim() || 'Sidoarjo',
            alamat: alamat.trim() || `Desa ${desa}`,
            desa,
            nomorKK: nomorKK.trim(),
          },
          documents: documents.map((d) => ({
            name: d.name,
            docType: d.docType,
            mimeType: d.mimeType,
            base64Data: d.base64Data,
            simulatedText: d.simulatedText,
          })),
          extraNotes: extraNotes.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Terjadi kendala saat memeriksa berkas.');
      }
      setResultTicket(data.ticket);
      onTicketCreated(data.ticket);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTicket = () => {
    if (!resultTicket) return;
    navigator.clipboard.writeText(resultTicket.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Step 1: Pilih Layanan */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold text-[#0D9488]">Langkah 1 dari 3</div>
            <h2 className="text-lg font-bold text-slate-900">
              Pilih Layanan Adminduk Kecamatan Prambon
            </h2>
          </div>
          <div className="text-xs text-slate-500">
            Seluruh layanan Adminduk Gratis (Rp 0)
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {serviceCatalog.map((svc) => {
            const active = svc.id === selectedServiceId;
            return (
              <button
                key={svc.id}
                type="button"
                onClick={() => {
                  onSelectServiceId(svc.id);
                  setResultTicket(null);
                }}
                className={`flex flex-col justify-between rounded-lg border p-3.5 text-left transition-colors ${
                  active
                    ? 'border-[#1E3A8A] bg-blue-50/50 ring-1 ring-[#1E3A8A]'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm font-bold ${
                        active ? 'text-[#1E3A8A]' : 'text-slate-900'
                      }`}
                    >
                      {svc.shortName}
                    </span>
                    <span className="text-[11px] font-medium text-[#0D9488] whitespace-nowrap">
                      {svc.sla.split('(')[0].trim()}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600 line-clamp-2">
                    {svc.description}
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  {svc.requiredDocs.length} syarat utama · {svc.fee}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/80 p-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-bold text-[#1E3A8A]">
              Daftar Persyaratan: {selectedService.name}
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-slate-600">
                Estimasi: {selectedService.sla} · {selectedService.fee}
              </span>
              {selectedService.formCode && (
                <a
                  href={`/api/forms/${encodeURIComponent(selectedService.formCode)}/download`}
                  download={`Formulir_${selectedService.formCode}_SIAP_Prambon.html`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#1E3A8A]/30 bg-white px-3 py-1 text-xs font-semibold text-[#1E3A8A] hover:bg-blue-50 transition-colors whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Unduh Formulir {selectedService.formCode}</span>
                </a>
              )}
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {selectedService.requiredDocs.map((reqDoc) => (
              <li key={reqDoc} className="flex items-start gap-2 text-xs text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0D9488]" />
                <span>{reqDoc}</span>
              </li>
            ))}
          </ul>
          {selectedService.processSteps && selectedService.processSteps.length > 0 && (
            <div className="border-t border-slate-200/80 pt-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Alur Pelayanan Singkat
              </div>
              <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
                {selectedService.processSteps.map((step, sIdx) => (
                  <div key={sIdx} className="flex items-start gap-2 text-[11px] text-slate-600">
                    <span className="font-mono-tabular font-bold text-[#0D9488]">
                      {sIdx + 1}.
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Step 2: Data Pemohon & 5 Slot Unggah Dokumen */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-semibold text-[#0D9488]">Langkah 2 dari 3</div>
              <h2 className="text-lg font-bold text-slate-900">
                Data Pemohon &amp; Unggah 5 Berkas Pendukung
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                AI memeriksa kualitas foto (buram/gelap/terpotong) serta mencocokkan penulisan Nama Lengkap, Tempat Lahir, dan Tanggal Lahir di seluruh dokumen.
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 self-start rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Bersihkan Formulir</span>
            </button>
          </div>

          {/* One-click Simulation Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleLoadPreset(SIMULATION_PRESETS[0])}
              className="rounded-lg bg-[#0D9488] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0b7c72] transition-colors whitespace-nowrap"
            >
              Gunakan Contoh Data Simulasi (Lengkap &amp; Konsisten)
            </button>
            {SIMULATION_PRESETS.slice(1).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleLoadPreset(preset)}
                className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:border-[#1E3A8A] hover:bg-blue-50/40 hover:text-[#1E3A8A] transition-colors whitespace-nowrap"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Applicant Form */}
          <div className="space-y-4 lg:col-span-5">
            <h3 className="text-sm font-bold text-slate-900">Identitas Pemohon</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Nama Lengkap Pemohon *
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Ahmad Fauzi Pratama"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/15"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  NIK (16 Digit) *
                </label>
                <input
                  type="text"
                  value={nik}
                  onChange={(e) => setNik(e.target.value)}
                  placeholder="351503xxxxxxxxxx"
                  className="font-mono-tabular mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/15"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Nomor Kartu Keluarga
                </label>
                <input
                  type="text"
                  value={nomorKK}
                  onChange={(e) => setNomorKK(e.target.value)}
                  placeholder="351503xxxxxxxxxx"
                  className="font-mono-tabular mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/15"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Tempat &amp; Tanggal Lahir
                </label>
                <input
                  type="text"
                  value={ttl}
                  onChange={(e) => setTtl(e.target.value)}
                  placeholder="Sidoarjo, 14 Mei 1992"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/15"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Desa di Kecamatan Prambon *
                </label>
                <select
                  value={desa}
                  onChange={(e) => setDesa(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/15"
                >
                  {PRAMBON_VILLAGES.map((v) => (
                    <option key={v} value={v}>
                      Desa {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Alamat Lengkap (Dusun / Jalan / RT / RW)
                </label>
                <input
                  type="text"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Contoh: Dusun Krajan RT 003 RW 002"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/15"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Keterangan Pengajuan
                </label>
                <textarea
                  rows={2}
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                  placeholder="Misal: Pembuatan KIA anak usia 6 tahun atau pecah KK."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/15"
                />
              </div>
            </div>
          </div>

          {/* Right: 5 Dedicated Document Slots */}
          <div className="flex flex-col justify-between space-y-4 lg:col-span-7">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Unggah Foto / Scan 5 Dokumen Pendukung
                </h3>
                <span className="font-mono-tabular text-xs font-semibold text-[#0D9488]">
                  {documents.length} / 5 dokumen siap diperiksa
                </span>
              </div>

              <div className="mt-3 space-y-2.5">
                {SUPPORTING_DOCUMENT_SLOTS.map((slot) => {
                  const uploaded = documents.find((d) => d.slotKey === slot.slotKey);
                  return (
                    <div
                      key={slot.slotKey}
                      className={`flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${
                        uploaded
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-slate-200 bg-slate-50/60'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900">{slot.label}</div>
                        {uploaded ? (
                          <div className="mt-1 flex items-center gap-2">
                            {uploaded.previewUrl ? (
                              <img
                                src={uploaded.previewUrl}
                                alt={uploaded.name}
                                referrerPolicy="no-referrer"
                                className="h-7 w-7 rounded object-cover border border-slate-200"
                              />
                            ) : (
                              <FileText className="h-4 w-4 shrink-0 text-emerald-700" />
                            )}
                            <span className="truncate text-xs font-medium text-emerald-800">
                              {uploaded.name}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-0.5 text-[11px] text-slate-500">{slot.helper}</div>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {uploaded && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(uploaded.id)}
                            className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                            title="Hapus berkas"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#0D9488] hover:text-[#0D9488] transition-colors whitespace-nowrap">
                          <Upload className="h-3.5 w-3.5" />
                          <span>{uploaded ? 'Ganti File' : 'Pilih Foto/PDF'}</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleSlotFileUpload(slot.slotKey, slot.label, e)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50/60 px-3.5 py-2.5 text-[11px] text-[#1E3A8A]">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <strong>Perlindungan Data Pribadi (UU PDP):</strong> Berkas gambar dokumen yang diunggah hanya digunakan untuk pengecekan kualitas &amp; konsistensi oleh AI, terenkripsi saat transmisi, dan <strong>dihapus otomatis dalam 24 jam</strong>.
              </span>
            </div>

            {errorMsg && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800">
                {errorMsg}
              </div>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={handleSubmitValidation}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1E3A8A] px-5 py-3 text-sm font-semibold text-white hover:bg-[#172e6e] disabled:opacity-60 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>AI Memeriksa Kualitas Foto &amp; Konsistensi Lintas Dokumen...</span>
                </>
              ) : (
                <>
                  <FileCheck2 className="h-4 w-4" />
                  <span>Periksa Kelengkapan &amp; Konsistensi Berkas AI</span>
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Step 3: Hasil Pra-Validasi & Tiket QR */}
      {resultTicket && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-semibold text-[#0D9488]">
                Langkah 3 dari 3 · Hasil Analisis Dokumen AI
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Laporan Kualitas Foto, Konsistensi Data &amp; Tiket Pra-Validasi
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Cetak Laporan</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTicketLookup(resultTicket.id)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D9488] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0b7c72] whitespace-nowrap"
              >
                <span>Pantau Status Tiket</span>
              </button>
            </div>
          </div>

          <ValidationStatusBanner
            status={resultTicket.overallStatus}
            summary={resultTicket.summary}
          />

          {/* Official SIAP Prambon Ticket with QR Code when LENGKAP_COCOK (or Registration card for all) */}
          <div
            className={`rounded-xl border p-5 ${
              resultTicket.overallStatus === 'LENGKAP_COCOK'
                ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/70 to-teal-50/50'
                : 'border-slate-200 bg-slate-50/70'
            }`}
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-[#1E3A8A]">
                  <ShieldCheck className="h-4 w-4 text-[#0D9488]" />
                  <span>
                    {resultTicket.overallStatus === 'LENGKAP_COCOK'
                      ? 'TIKET PRA-VALIDASI SIAP PRAMBON — SIAP VERIFIKASI LOKET'
                      : 'NOMOR REGISTRASI PRA-CEK SIAP PRAMBON'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono-tabular text-2xl font-extrabold tracking-tight text-[#1E3A8A]">
                    {resultTicket.id}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyTicket}
                    className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    {copiedId ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Salin Kode</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-slate-700 sm:grid-cols-2">
                  <div>
                    Pemohon: <strong className="text-slate-900">{resultTicket.citizenName}</strong>
                  </div>
                  <div>
                    NIK: <strong className="font-mono-tabular text-slate-900">{resultTicket.nik}</strong>
                  </div>
                  <div>
                    Layanan: <strong className="text-slate-900">{resultTicket.serviceName}</strong>
                  </div>
                  <div>
                    Desa: <strong className="text-slate-900">Desa {resultTicket.village}, Kec. Prambon</strong>
                  </div>
                  <div className="sm:col-span-2 mt-1 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span>Status Loket:</span>
                      <OfficerStatusLabel status={resultTicket.officerStatus} />
                    </div>
                    {resultTicket.expiresAt && (
                      <div className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="h-3.5 w-3.5 text-[#0D9488]" />
                        <span>
                          Retensi Auto-Delete 24 Jam:{' '}
                          <strong className="font-mono-tabular text-slate-700">
                            {new Date(resultTicket.expiresAt).toLocaleString('id-ID')}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <QrCodeSvg
                  value={`SIAP-PRAMBON|${resultTicket.id}|${resultTicket.nik}|${resultTicket.overallStatus}`}
                  size={116}
                />
                <span className="font-mono-tabular text-[10px] font-semibold text-slate-500">
                  Pindai di Loket Kecamatan
                </span>
              </div>
            </div>
          </div>

          {/* A. Kualitas Gambar */}
          {resultTicket.imageQualityChecks && resultTicket.imageQualityChecks.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Camera className="h-4 w-4 text-[#0D9488]" />
                <span>1. Pemeriksaan Kualitas Gambar Dokumen</span>
              </h3>
              <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {resultTicket.imageQualityChecks.map((q, idx) => {
                  const ok = q.qualityStatus === 'JELAS';
                  return (
                    <div
                      key={idx}
                      className={`rounded-lg border p-3 text-xs ${
                        ok
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-red-200 bg-red-50/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-bold text-slate-900">{q.docType}</span>
                        <span
                          className={`inline-flex items-center gap-1 font-semibold whitespace-nowrap ${
                            ok ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {ok ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          )}
                          <span>{ok ? 'Foto Jelas' : 'Perlu Foto Ulang'}</span>
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600">{q.note}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* B. Tabel Perbandingan Data Lintas Dokumen */}
          {resultTicket.documentMatrix && resultTicket.documentMatrix.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                2. Tabel Perbandingan Konsistensi Data Lintas Dokumen
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Membandingkan Penulisan Nama Lengkap, Tempat Lahir, dan Tanggal/Bulan/Tahun Lahir antar-berkas yang diunggah.
              </p>
              <div className="mt-2.5 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3.5 py-2.5 font-semibold">Elemen Identitas</th>
                      <th className="px-3.5 py-2.5 font-semibold">Kartu Keluarga</th>
                      <th className="px-3.5 py-2.5 font-semibold">Akta Kelahiran</th>
                      <th className="px-3.5 py-2.5 font-semibold">Buku Nikah</th>
                      <th className="px-3.5 py-2.5 font-semibold">Ijazah Terakhir</th>
                      <th className="px-3.5 py-2.5 font-semibold">Pengantar RT/RW</th>
                      <th className="px-3.5 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {resultTicket.documentMatrix.map((row, idx) => {
                      const rowBg =
                        row.status === 'TIDAK_COCOK'
                          ? 'bg-red-50/70'
                          : row.status === 'PERBEDAAN_MINOR'
                            ? 'bg-amber-50/70'
                            : 'bg-white';
                      return (
                        <tr key={idx} className={rowBg}>
                          <td className="px-3.5 py-3 align-top font-bold text-slate-900">
                            <div>{row.field}</div>
                            <div className="mt-1 font-normal text-[11px] leading-relaxed text-slate-600">
                              {row.impactAndFix}
                            </div>
                          </td>
                          <td className="px-3.5 py-3 align-top text-slate-800">{row.kkValue}</td>
                          <td className="px-3.5 py-3 align-top text-slate-800">{row.aktaValue}</td>
                          <td className="px-3.5 py-3 align-top text-slate-800">{row.nikahValue}</td>
                          <td className="px-3.5 py-3 align-top text-slate-800">{row.ijazahValue}</td>
                          <td className="px-3.5 py-3 align-top text-slate-800">{row.pengantarValue}</td>
                          <td className="px-3.5 py-3 align-top">
                            <ConsistencyCellLabel status={row.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Fallback Consistency table if documentMatrix wasn't present */}
          {(!resultTicket.documentMatrix || resultTicket.documentMatrix.length === 0) &&
            resultTicket.consistencyChecks.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  2. Pemeriksaan Konsistensi Data Lintas Berkas
                </h3>
                <div className="mt-2.5 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Elemen Data</th>
                        <th className="px-4 py-2.5 font-semibold">Dokumen A</th>
                        <th className="px-4 py-2.5 font-semibold">Dokumen B</th>
                        <th className="px-4 py-2.5 font-semibold">Status</th>
                        <th className="px-4 py-2.5 font-semibold">Catatan Koreksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {resultTicket.consistencyChecks.map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 font-semibold text-slate-900">{row.field}</td>
                          <td className="px-4 py-3 text-slate-700">{row.valueDocA}</td>
                          <td className="px-4 py-3 text-slate-700">{row.valueDocB}</td>
                          <td className="px-4 py-3">
                            <ConsistencyCellLabel status={row.status} />
                          </td>
                          <td className="px-4 py-3 text-slate-600">{row.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* Checklist & Recommendations */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                3. Checklist Kelengkapan Persyaratan
              </h3>
              <div className="mt-2.5 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {resultTicket.checklist.map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 p-3 text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">{item.item}</div>
                      <div className="mt-0.5 text-slate-500">{item.note}</div>
                    </div>
                    <ChecklistItemLabel status={item.status} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                4. Dampak &amp; Langkah Koreksi Sebelum ke Kecamatan
              </h3>
              <ol className="mt-2.5 space-y-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                {resultTicket.recommendations.map((rec, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-700"
                  >
                    <span className="font-mono-tabular flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#1E3A8A] text-[11px] font-bold text-white">
                      {idx + 1}
                    </span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
