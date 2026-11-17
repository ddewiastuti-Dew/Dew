import { useEffect, useState, type FormEvent } from 'react';
import { ChevronDown, Clock, Download, Loader2, Search } from 'lucide-react';
import {
  OFFICIAL_FORMS,
  PRAMBON_SERVICES,
  PRAMBON_VILLAGES,
} from '../data/prambonCatalog.ts';
import type { FaqItem, KnowledgeBaseState, PreValidationTicket } from '../types.ts';
import {
  ConsistencyCellLabel,
  OfficerStatusLabel,
  ValidationStatusBanner,
} from './StatusBadge.tsx';
import QrCodeSvg from './QrCodeSvg.tsx';

interface CitizenTicketLookupProps {
  initialTicketId?: string;
  recentTicketIds: string[];
  faqs: FaqItem[];
  knowledgeBase?: KnowledgeBaseState;
}

export default function CitizenTicketLookup({
  initialTicketId,
  recentTicketIds,
  faqs,
  knowledgeBase,
}: CitizenTicketLookupProps) {
  const servicesList = knowledgeBase?.services ?? PRAMBON_SERVICES;
  const hours = knowledgeBase?.operatingHours;
  const [queryId, setQueryId] = useState(initialTicketId || 'PRB-2026-0412');
  const [ticket, setTicket] = useState<PreValidationTicket | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [openFaqId, setOpenFaqId] = useState<string | null>(faqs[0]?.id ?? null);

  const lookupTicket = async (code: string) => {
    const clean = code.trim();
    if (!clean) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/tickets/${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!res.ok) {
        setTicket(null);
        setErrorMsg(data.error || 'Kode tiket tidak ditemukan.');
        return;
      }
      setTicket(data.ticket);
    } catch {
      setErrorMsg('Gagal terhubung ke server saat mencari tiket.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTicketId) {
      setQueryId(initialTicketId);
      lookupTicket(initialTicketId);
    } else {
      lookupTicket('PRB-2026-0412');
    }
  }, [initialTicketId]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    lookupTicket(queryId);
  };

  const sampleCodes = Array.from(
    new Set([...recentTicketIds, 'PRB-2026-0412', 'PRB-2026-0413', 'PRB-2026-0414'])
  ).slice(0, 5);

  const activeFaqs = faqs.filter((f) => f.isActive);

  return (
    <div className="space-y-8">
      {/* Ticket Lookup Section */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Cek Status Tiket Pra-Validasi Mandiri
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Masukkan kode tiket (contoh: PRB-2026-0412) untuk melihat hasil validasi AI, QR Registrasi, dan catatan terbaru petugas loket Kecamatan Prambon.
            </p>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={queryId}
              onChange={(e) => setQueryId(e.target.value)}
              placeholder="Masukkan kode tiket (misal: PRB-2026-0412)"
              className="font-mono-tabular w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/15"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1E3A8A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#172e6e] disabled:opacity-60 transition-colors whitespace-nowrap"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span>Cek Tiket</span>
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Contoh kode tiket:</span>
          {sampleCodes.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setQueryId(code);
                lookupTicket(code);
              }}
              className="font-mono-tabular rounded border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-[#1E3A8A] hover:border-[#0D9488] hover:bg-teal-50 transition-colors"
            >
              {code}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
            {errorMsg}
          </div>
        )}

        {ticket && (
          <div className="mt-6 space-y-5 border-t border-slate-200 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-mono-tabular text-xs font-semibold text-[#0D9488]">
                  {ticket.id} · {new Date(ticket.createdAt).toLocaleString('id-ID')}
                </div>
                <h3 className="mt-0.5 text-base font-bold text-slate-900">
                  {ticket.serviceName}
                </h3>
                <p className="text-xs text-slate-600">
                  Pemohon: <strong className="text-slate-900">{ticket.citizenName}</strong> · NIK{' '}
                  <span className="font-mono-tabular">{ticket.nik}</span> · Desa {ticket.village}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                    <span className="text-[11px] font-medium text-slate-500">Status Loket:</span>
                    <OfficerStatusLabel status={ticket.officerStatus} />
                  </div>
                  {ticket.expiresAt && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                      <Clock className="h-3.5 w-3.5 text-[#0D9488]" />
                      <span>
                        Berkas auto-delete:{' '}
                        <strong className="font-mono-tabular">
                          {new Date(ticket.expiresAt).toLocaleString('id-ID')}
                        </strong>
                      </span>
                    </span>
                  )}
                </div>
              </div>
              <QrCodeSvg
                value={`SIAP-PRAMBON|${ticket.id}|${ticket.nik}|${ticket.overallStatus}`}
                size={96}
              />
            </div>

            <ValidationStatusBanner status={ticket.overallStatus} summary={ticket.summary} />

            {ticket.officerNotes && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 text-xs text-slate-800">
                <div className="font-bold text-[#1E3A8A]">Catatan Petugas Kecamatan Prambon</div>
                <p className="mt-1 leading-relaxed">{ticket.officerNotes}</p>
              </div>
            )}

            {ticket.documentMatrix && ticket.documentMatrix.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">Elemen Identitas</th>
                      <th className="px-3 py-2.5 font-semibold">KK</th>
                      <th className="px-3 py-2.5 font-semibold">Akta</th>
                      <th className="px-3 py-2.5 font-semibold">Buku Nikah</th>
                      <th className="px-3 py-2.5 font-semibold">Ijazah</th>
                      <th className="px-3 py-2.5 font-semibold">Pengantar</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ticket.documentMatrix.map((row, idx) => (
                      <tr
                        key={idx}
                        className={
                          row.status === 'TIDAK_COCOK'
                            ? 'bg-red-50/60'
                            : row.status === 'PERBEDAAN_MINOR'
                              ? 'bg-amber-50/60'
                              : ''
                        }
                      >
                        <td className="px-3 py-2.5 font-semibold text-slate-900">{row.field}</td>
                        <td className="px-3 py-2.5 text-slate-700">{row.kkValue}</td>
                        <td className="px-3 py-2.5 text-slate-700">{row.aktaValue}</td>
                        <td className="px-3 py-2.5 text-slate-700">{row.nikahValue}</td>
                        <td className="px-3 py-2.5 text-slate-700">{row.ijazahValue}</td>
                        <td className="px-3 py-2.5 text-slate-700">{row.pengantarValue}</td>
                        <td className="px-3 py-2.5">
                          <ConsistencyCellLabel status={row.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              ticket.consistencyChecks.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3.5 py-2.5 font-semibold">Elemen Data</th>
                        <th className="px-3.5 py-2.5 font-semibold">Dokumen A</th>
                        <th className="px-3.5 py-2.5 font-semibold">Dokumen B</th>
                        <th className="px-3.5 py-2.5 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ticket.consistencyChecks.map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-3.5 py-2.5 font-semibold text-slate-900">{row.field}</td>
                          <td className="px-3.5 py-2.5 text-slate-700">{row.valueDocA}</td>
                          <td className="px-3.5 py-2.5 text-slate-700">{row.valueDocB}</td>
                          <td className="px-3.5 py-2.5">
                            <ConsistencyCellLabel status={row.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {/* FAQ & Service Directory */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-7">
          <h2 className="text-lg font-bold text-slate-900">
            Pertanyaan yang Sering Diajukan (FAQ Resmi)
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Diperbarui langsung oleh Petugas Pelayanan Kecamatan Prambon.
          </p>

          <div className="mt-4 divide-y divide-slate-200 border-t border-b border-slate-200">
            {activeFaqs.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div key={faq.id} className="py-3">
                  <button
                    type="button"
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div>
                      <div className="text-[11px] font-semibold text-[#0D9488]">
                        {faq.category} · Diperbarui {faq.updatedAt}
                      </div>
                      <div className="mt-0.5 text-sm font-semibold text-slate-900">
                        {faq.question}
                      </div>
                    </div>
                    <ChevronDown
                      className={`mt-1 h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-2.5 text-xs leading-relaxed text-slate-600">
                      {faq.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Cakupan Layanan &amp; 20 Desa
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {hours?.lokasi ?? 'Kantor Kecamatan Prambon, Jl. Raya Prambon No. 12, Kabupaten Sidoarjo'}
            </p>
          </div>

          <div className="space-y-2.5 border-t border-slate-100 pt-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Senin – Kamis</span>
              <span className="font-mono-tabular font-semibold text-slate-900">
                {hours?.seninKamis ?? '08.00 – 15.00 WIB'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Jumat</span>
              <span className="font-mono-tabular font-semibold text-slate-900">
                {hours?.jumat ?? '08.00 – 14.30 WIB'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Istirahat Loket</span>
              <span className="font-mono-tabular font-semibold text-slate-900">
                {hours?.istirahat ?? '12.00 – 13.00 WIB'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tarif Resmi Adminduk</span>
              <span className="font-semibold text-emerald-700">Gratis (Rp 0)</span>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <h3 className="text-xs font-bold text-slate-700">
              Estimasi Waktu Penyelesaian
            </h3>
            <div className="mt-2 space-y-1.5">
              {servicesList.map((svc) => (
                <div key={svc.id} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700">{svc.shortName}</span>
                  <span className="font-medium text-[#0D9488]">{svc.sla}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <h3 className="text-xs font-bold text-slate-700">
              Unduh Formulir Resmi Adminduk
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {OFFICIAL_FORMS.map((f) => (
                <a
                  key={f.code}
                  href={`/api/forms/${encodeURIComponent(f.code)}/download`}
                  download={`Formulir_${f.code}_SIAP_Prambon.html`}
                  className="inline-flex items-center justify-between gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-[#1E3A8A] hover:border-[#0D9488] hover:bg-teal-50/60 transition-colors"
                >
                  <span className="font-mono-tabular truncate">{f.code}</span>
                  <Download className="h-3 w-3 shrink-0" />
                </a>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <h3 className="text-xs font-bold text-slate-700">
              Wilayah 20 Desa Kecamatan Prambon
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              {PRAMBON_VILLAGES.join(' · ')}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
