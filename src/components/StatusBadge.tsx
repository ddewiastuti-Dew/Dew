import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { OfficerTicketStatus, ValidationLevel } from '../types.ts';

export function ValidationStatusBanner({
  status,
  summary,
}: {
  status: ValidationLevel;
  summary?: string;
}) {
  if (status === 'LENGKAP_COCOK') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold tracking-wide text-emerald-800">
              STATUS HIJAU · LENGKAP &amp; COCOK
            </div>
            <h3 className="mt-0.5 text-lg font-bold text-emerald-950">
              Berkas Siap Dibawa ke Loket Kecamatan Prambon
            </h3>
            {summary && <p className="mt-1.5 text-sm leading-relaxed text-emerald-900">{summary}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (status === 'PERHATIAN_MINOR') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold tracking-wide text-amber-800">
              STATUS KUNING · PERLU PERHATIAN (PERBEDAAN MINOR)
            </div>
            <h3 className="mt-0.5 text-lg font-bold text-amber-950">
              Dokumen Tersedia dengan Catatan Penyesuaian Ringan
            </h3>
            {summary && <p className="mt-1.5 text-sm leading-relaxed text-amber-900">{summary}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/90 p-5">
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">
          <XCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold tracking-wide text-red-800">
            STATUS MERAH · TIDAK LENGKAP / KETIDAKSESUAIAN DATA
          </div>
          <h3 className="mt-0.5 text-lg font-bold text-red-950">
            Lengkapi atau Perbaiki Berkas Sebelum Datang ke Kecamatan
          </h3>
          {summary && <p className="mt-1.5 text-sm leading-relaxed text-red-900">{summary}</p>}
        </div>
      </div>
    </div>
  );
}

export function ValidationLevelLabel({ status }: { status: ValidationLevel }) {
  if (status === 'LENGKAP_COCOK') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>Lengkap &amp; Cocok</span>
      </span>
    );
  }
  if (status === 'PERHATIAN_MINOR') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>Perlu Perhatian</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
      <XCircle className="h-3.5 w-3.5 shrink-0" />
      <span>Tidak Lengkap</span>
    </span>
  );
}

export function ConsistencyCellLabel({
  status,
}: {
  status: 'COCOK' | 'PERBEDAAN_MINOR' | 'TIDAK_COCOK';
}) {
  if (status === 'COCOK') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>Cocok</span>
      </span>
    );
  }
  if (status === 'PERBEDAAN_MINOR') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>Beda Minor</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
      <XCircle className="h-3.5 w-3.5 shrink-0" />
      <span>Tidak Cocok</span>
    </span>
  );
}

export function ChecklistItemLabel({
  status,
}: {
  status: 'TERPENUHI' | 'PERLU_CEK' | 'BELUM_ADA';
}) {
  if (status === 'TERPENUHI') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>Terpenuhi</span>
      </span>
    );
  }
  if (status === 'PERLU_CEK') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>Perlu Cek</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
      <XCircle className="h-3.5 w-3.5 shrink-0" />
      <span>Belum Ada</span>
    </span>
  );
}

export function OfficerStatusLabel({ status }: { status: OfficerTicketStatus }) {
  if (status === 'Terverifikasi Loket' || status === 'Selesai') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }
  if (status === 'Perlu Revisi Warga') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
        <XCircle className="h-3.5 w-3.5 shrink-0" />
        <span>{status}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] whitespace-nowrap">
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span>{status}</span>
    </span>
  );
}
