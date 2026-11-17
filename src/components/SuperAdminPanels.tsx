import { useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  Clock,
  Download,
  FilePlus2,
  History,
  Loader2,
  Printer,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserX,
} from 'lucide-react';
import type {
  AuditCategory,
  AuditLogEntry,
  GlobalMonthlyReport,
  KnowledgeBaseState,
  OperatingHoursConfig,
  ServiceId,
  StaffAccountPublic,
  UserRole,
} from '../types.ts';

/* 1. MANAJEMEN AKUN PETUGAS */
export function AccountsPanel({
  authToken,
  currentUserId,
  onAuditUpdated,
}: {
  authToken: string;
  currentUserId: string;
  onAuditUpdated: () => void;
}) {
  const [accounts, setAccounts] = useState<StaffAccountPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [role, setRole] = useState<UserRole>('admin');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/accounts', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat daftar akun.');
      setAccounts(data.accounts);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat data akun.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [authToken]);

  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ fullName, username, email, title, role, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat akun petugas.');
      setFullName('');
      setUsername('');
      setEmail('');
      setTitle('');
      setPassword('');
      setRole('admin');
      await fetchAccounts();
      onAuditUpdated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menambah akun.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (acc: StaffAccountPublic) => {
    setErrorMsg(null);
    const res = await fetch(`/api/admin/accounts/${encodeURIComponent(acc.id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ isActive: !acc.isActive }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.error || 'Gagal mengubah status akun.');
      return;
    }
    await fetchAccounts();
    onAuditUpdated();
  };

  const handleChangeRole = async (acc: StaffAccountPublic, nextRole: UserRole) => {
    setErrorMsg(null);
    const res = await fetch(`/api/admin/accounts/${encodeURIComponent(acc.id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ role: nextRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.error || 'Gagal mengubah role akun.');
      return;
    }
    await fetchAccounts();
    onAuditUpdated();
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-[#0D9488]" />
          <h2 className="text-sm font-bold text-slate-900">Tambah Akun Petugas Kecamatan</h2>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          Buat akses baru untuk petugas loket atau admin kecamatan dengan pengaturan role spesifik.
        </p>

        <form onSubmit={handleCreateAccount} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Nama Lengkap *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Contoh: Rini Kusuma, S.AP"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#1E3A8A] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Username *</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="rini.prambon"
                className="font-mono-tabular mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Email Kedinasan</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rini@sidoarjokab.go.id"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700">Jabatan / Unit Loket</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Petugas Loket Pendaftaran KTP-el & KIA"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#1E3A8A] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Role Akses *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#1E3A8A] focus:outline-none"
              >
                <option value="admin">Admin Biasa (Petugas Loket)</option>
                <option value="super_admin">Super Admin Kecamatan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Kata Sandi Awal *</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0D9488] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0b7c72] disabled:opacity-60 transition-colors"
          >
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
            <span>Daftarkan Akun Petugas</span>
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
        <h2 className="text-sm font-bold text-slate-900">
          Daftar Seluruh Akun Petugas &amp; Admin ({accounts.length})
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Ubah role akses atau nonaktifkan akun petugas secara langsung.
        </p>

        {errorMsg && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-800">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center text-xs text-slate-500">Memuat daftar akun...</div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3.5 py-2.5 font-semibold">Petugas</th>
                  <th className="px-3.5 py-2.5 font-semibold">Role Akses</th>
                  <th className="px-3.5 py-2.5 font-semibold">Status</th>
                  <th className="px-3.5 py-2.5 font-semibold text-right">Kontrol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((acc) => {
                  const isSelf = acc.id === currentUserId;
                  return (
                    <tr key={acc.id} className={!acc.isActive ? 'bg-slate-50 opacity-75' : ''}>
                      <td className="px-3.5 py-3">
                        <div className="font-bold text-slate-900">
                          {acc.fullName} {isSelf && <span className="text-[#0D9488]">(Anda)</span>}
                        </div>
                        <div className="font-mono-tabular text-[11px] text-slate-500">
                          {acc.username} · {acc.title}
                        </div>
                      </td>
                      <td className="px-3.5 py-3">
                        <select
                          disabled={isSelf}
                          value={acc.role}
                          onChange={(e) => handleChangeRole(acc, e.target.value as UserRole)}
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800 disabled:bg-slate-100"
                        >
                          <option value="admin">Admin Loket</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </td>
                      <td className="px-3.5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold whitespace-nowrap ${
                            acc.isActive ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {acc.isActive ? (
                            <UserCheck className="h-3.5 w-3.5" />
                          ) : (
                            <UserX className="h-3.5 w-3.5" />
                          )}
                          <span>{acc.isActive ? 'Aktif' : 'Nonaktif'}</span>
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right">
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => handleToggleActive(acc)}
                          className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-40 whitespace-nowrap ${
                            acc.isActive
                              ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {acc.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* 2. PENGATURAN MASTER DATA & REGULASI (SUPER ADMIN) */
export function MasterDataPanel({
  knowledgeBase,
  onUpdateOperatingHours,
  onUpdateServiceKnowledge,
  onCreateServiceKnowledge,
}: {
  knowledgeBase: KnowledgeBaseState;
  onUpdateOperatingHours: (
    patch: Partial<Omit<OperatingHoursConfig, 'updatedAt'>>
  ) => Promise<void>;
  onUpdateServiceKnowledge: (
    serviceId: ServiceId,
    patch: {
      sla: string;
      fee: string;
      requiredDocs: string[];
      commonPitfall: string;
      formCode?: string;
      processSteps?: string[];
    }
  ) => Promise<void>;
  onCreateServiceKnowledge: (input: {
    name: string;
    shortName: string;
    sla: string;
    fee: string;
    description: string;
    requiredDocs: string[];
    commonPitfall: string;
  }) => Promise<void>;
}) {
  const [hoursForm, setHoursForm] = useState(knowledgeBase.operatingHours);
  const [savingHours, setSavingHours] = useState(false);
  const [savedHours, setSavedHours] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState<ServiceId>(
    knowledgeBase.services[0]?.id ?? 'KTP_EL'
  );
  const [serviceSla, setServiceSla] = useState('');
  const [serviceFee, setServiceFee] = useState('');
  const [serviceFormCode, setServiceFormCode] = useState('');
  const [serviceDocsText, setServiceDocsText] = useState('');
  const [serviceStepsText, setServiceStepsText] = useState('');
  const [servicePitfall, setServicePitfall] = useState('');
  const [savingService, setSavingService] = useState(false);
  const [savedService, setSavedService] = useState(false);

  // Add new service state
  const [newName, setNewName] = useState('');
  const [newShortName, setNewShortName] = useState('');
  const [newSla, setNewSla] = useState('1–2 Hari Kerja');
  const [newFee, setNewFee] = useState('Gratis (Rp 0)');
  const [newDesc, setNewDesc] = useState('');
  const [newDocsText, setNewDocsText] = useState('');
  const [newPitfall, setNewPitfall] = useState('');
  const [creatingService, setCreatingService] = useState(false);
  const [createdServiceNotice, setCreatedServiceNotice] = useState(false);

  useEffect(() => {
    setHoursForm(knowledgeBase.operatingHours);
  }, [knowledgeBase.operatingHours]);

  useEffect(() => {
    const svc = knowledgeBase.services.find((s) => s.id === selectedServiceId);
    if (svc) {
      setServiceSla(svc.sla);
      setServiceFee(svc.fee);
      setServiceFormCode(svc.formCode || '');
      setServiceDocsText(svc.requiredDocs.join('\n'));
      setServiceStepsText((svc.processSteps ?? []).join('\n'));
      setServicePitfall(svc.commonPitfall);
    }
  }, [selectedServiceId, knowledgeBase.services]);

  const handleSaveHours = async (e: FormEvent) => {
    e.preventDefault();
    setSavingHours(true);
    try {
      await onUpdateOperatingHours({
        seninKamis: hoursForm.seninKamis,
        jumat: hoursForm.jumat,
        istirahat: hoursForm.istirahat,
        lokasi: hoursForm.lokasi,
        catatanLayanan: hoursForm.catatanLayanan,
      });
      setSavedHours(true);
      setTimeout(() => setSavedHours(false), 2500);
    } finally {
      setSavingHours(false);
    }
  };

  const handleSaveService = async (e: FormEvent) => {
    e.preventDefault();
    setSavingService(true);
    try {
      const requiredDocs = serviceDocsText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const processSteps = serviceStepsText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      await onUpdateServiceKnowledge(selectedServiceId, {
        sla: serviceSla.trim(),
        fee: serviceFee.trim(),
        formCode: serviceFormCode.trim() || undefined,
        requiredDocs,
        processSteps,
        commonPitfall: servicePitfall.trim(),
      });
      setSavedService(true);
      setTimeout(() => setSavedService(false), 2500);
    } finally {
      setSavingService(false);
    }
  };

  const handleCreateService = async (e: FormEvent) => {
    e.preventDefault();
    const requiredDocs = newDocsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (!newName.trim() || !newShortName.trim() || requiredDocs.length === 0) return;
    setCreatingService(true);
    try {
      await onCreateServiceKnowledge({
        name: newName.trim(),
        shortName: newShortName.trim(),
        sla: newSla.trim(),
        fee: newFee.trim(),
        description: newDesc.trim() || newName.trim(),
        requiredDocs,
        commonPitfall: newPitfall.trim(),
      });
      setNewName('');
      setNewShortName('');
      setNewDesc('');
      setNewDocsText('');
      setNewPitfall('');
      setCreatedServiceNotice(true);
      setTimeout(() => setCreatedServiceNotice(false), 3000);
    } finally {
      setCreatingService(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Jam Operasional */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#1E3A8A]" />
            <h2 className="text-sm font-bold text-slate-900">
              Informasi Operasional Kantor Kecamatan
            </h2>
          </div>
          <form onSubmit={handleSaveHours} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Senin – Kamis</label>
                <input
                  type="text"
                  value={hoursForm.seninKamis}
                  onChange={(e) => setHoursForm((p) => ({ ...p, seninKamis: e.target.value }))}
                  className="font-mono-tabular mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Jumat</label>
                <input
                  type="text"
                  value={hoursForm.jumat}
                  onChange={(e) => setHoursForm((p) => ({ ...p, jumat: e.target.value }))}
                  className="font-mono-tabular mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Jam Istirahat</label>
              <input
                type="text"
                value={hoursForm.istirahat}
                onChange={(e) => setHoursForm((p) => ({ ...p, istirahat: e.target.value }))}
                className="font-mono-tabular mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Lokasi Kantor</label>
              <input
                type="text"
                value={hoursForm.lokasi}
                onChange={(e) => setHoursForm((p) => ({ ...p, lokasi: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Catatan Tarif &amp; Layanan</label>
              <textarea
                rows={2}
                value={hoursForm.catatanLayanan}
                onChange={(e) => setHoursForm((p) => ({ ...p, catatanLayanan: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <button
              type="submit"
              disabled={savingHours}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#1E3A8A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#172e6e] disabled:opacity-60"
            >
              {savingHours ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : savedHours ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{savedHours ? 'Jam Operasional Diperbarui' : 'Simpan Informasi Operasional'}</span>
            </button>
          </form>
        </section>

        {/* Edit Existing Service */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
          <h2 className="text-sm font-bold text-slate-900">
            Perbarui Syarat Dokumen &amp; Regulasi Layanan Terdaftar
          </h2>
          <form onSubmit={handleSaveService} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Pilih Layanan</label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
              >
                {knowledgeBase.services.map((svc) => (
                  <option key={svc.id} value={svc.id}>
                    {svc.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Estimasi Waktu</label>
                <input
                  type="text"
                  value={serviceSla}
                  onChange={(e) => setServiceSla(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Biaya Resmi</label>
                <input
                  type="text"
                  value={serviceFee}
                  onChange={(e) => setServiceFee(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Kode Formulir</label>
                <input
                  type="text"
                  value={serviceFormCode}
                  onChange={(e) => setServiceFormCode(e.target.value)}
                  placeholder="Misal: F-1.02"
                  className="font-mono-tabular mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Daftar Persyaratan Dokumen (1 syarat per baris)
              </label>
              <textarea
                rows={4}
                value={serviceDocsText}
                onChange={(e) => setServiceDocsText(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs leading-relaxed text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Alur Tahapan Pelayanan (1 langkah per baris)
              </label>
              <textarea
                rows={3}
                value={serviceStepsText}
                onChange={(e) => setServiceStepsText(e.target.value)}
                placeholder="Isi alur layanan berurutan untuk warga..."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs leading-relaxed text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Catatan Titik Rawan</label>
              <input
                type="text"
                value={servicePitfall}
                onChange={(e) => setServicePitfall(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <button
              type="submit"
              disabled={savingService}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0D9488] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0b7c72] disabled:opacity-60"
            >
              {savingService ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : savedService ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{savedService ? 'Regulasi Layanan Disimpan' : 'Simpan Perubahan Layanan'}</span>
            </button>
          </form>
        </section>
      </div>

      {/* Add New Service */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <FilePlus2 className="h-4 w-4 text-[#0D9488]" />
          <h2 className="text-sm font-bold text-slate-900">
            Tambah Jenis Layanan Adminduk Baru (Master Data)
          </h2>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          Layanan baru akan langsung muncul di portal Pra-Validasi Warga dan menjadi acuan Asisten Virtual AI.
        </p>

        <form onSubmit={handleCreateService} className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="space-y-3 lg:col-span-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Nama Layanan Lengkap *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Aktivasi Identitas Kependudukan Digital (IKD)"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Label Singkat *</label>
                <input
                  type="text"
                  required
                  value={newShortName}
                  onChange={(e) => setNewShortName(e.target.value)}
                  placeholder="Contoh: Aktivasi IKD"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Estimasi Waktu</label>
                <input
                  type="text"
                  value={newSla}
                  onChange={(e) => setNewSla(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Biaya Resmi</label>
                <input
                  type="text"
                  value={newFee}
                  onChange={(e) => setNewFee(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Deskripsi Layanan</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Ringkasan tujuan layanan untuk warga"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-3 lg:col-span-6">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Daftar Persyaratan Dokumen (1 syarat per baris) *
              </label>
              <textarea
                rows={3}
                required
                value={newDocsText}
                onChange={(e) => setNewDocsText(e.target.value)}
                placeholder={'KTP-el Asli\nKartu Keluarga (KK) terbaru\nPonsel Android/iOS dengan nomor HP aktif'}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Catatan Titik Rawan</label>
              <input
                type="text"
                value={newPitfall}
                onChange={(e) => setNewPitfall(e.target.value)}
                placeholder="Contoh: Email atau nomor HP tidak aktif saat verifikasi OTP."
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <button
              type="submit"
              disabled={creatingService}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#1E3A8A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#172e6e] disabled:opacity-60"
            >
              {creatingService ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : createdServiceNotice ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <FilePlus2 className="h-3.5 w-3.5" />
              )}
              <span>
                {createdServiceNotice
                  ? 'Layanan Baru Ditambahkan ke Sistem!'
                  : 'Tambahkan Layanan Baru ke Master Data'}
              </span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

/* 3. AUDIT LOG & KEAMANAN SISTEM */
export function AuditLogPanel({
  authToken,
  refreshSignal,
}: {
  authToken: string;
  refreshSignal: number;
}) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | AuditCategory>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch('/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (active && Array.isArray(data.auditLogs)) {
          setLogs(data.auditLogs);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authToken, refreshSignal]);

  const filtered = logs.filter((l) => {
    const matchCat = categoryFilter === 'ALL' || l.category === categoryFilter;
    const q = search.trim().toLowerCase();
    const matchQ =
      !q ||
      l.actorName.toLowerCase().includes(q) ||
      l.actorUsername.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.target.toLowerCase().includes(q) ||
      l.detail.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const categoryLabel = (cat: AuditCategory) => {
    switch (cat) {
      case 'AUTH':
        return 'Autentikasi';
      case 'VERIFIKASI_TIKET':
        return 'Verifikasi Tiket';
      case 'MASTER_DATA':
        return 'Master Data & FAQ';
      case 'AKUN_PETUGAS':
        return 'Akun Petugas';
      case 'LAPORAN':
        return 'Laporan Global';
      case 'LIVE_CHAT':
        return 'Live Chat Eskalasi';
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-[#1E3A8A]" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Audit Log &amp; Jejak Aktivitas Sistem
            </h2>
            <p className="text-xs text-slate-500">
              Mencatat seluruh verifikasi tiket, perubahan master data, login, dan pengelolaan akun petugas.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari petugas atau target..."
              className="rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:border-[#1E3A8A] focus:outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'ALL' | AuditCategory)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
          >
            <option value="ALL">Semua Aktivitas</option>
            <option value="VERIFIKASI_TIKET">Verifikasi Tiket</option>
            <option value="MASTER_DATA">Master Data &amp; FAQ</option>
            <option value="AKUN_PETUGAS">Akun Petugas</option>
            <option value="LIVE_CHAT">Live Chat Eskalasi</option>
            <option value="AUTH">Autentikasi</option>
            <option value="LAPORAN">Laporan Global</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-xs text-slate-500">Memuat riwayat audit...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3.5 py-2.5 font-semibold">Waktu</th>
                <th className="px-3.5 py-2.5 font-semibold">Pelaku (Role)</th>
                <th className="px-3.5 py-2.5 font-semibold">Kategori</th>
                <th className="px-3.5 py-2.5 font-semibold">Aksi &amp; Target</th>
                <th className="px-3.5 py-2.5 font-semibold">Rincian Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/70">
                  <td className="font-mono-tabular px-3.5 py-2.5 text-[11px] text-slate-500 whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString('id-ID')}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="font-semibold text-slate-900">{entry.actorName}</div>
                    <div className="font-mono-tabular text-[11px] text-slate-500">
                      {entry.actorUsername} ·{' '}
                      {entry.actorRole === 'super_admin'
                        ? 'Super Admin'
                        : entry.actorRole === 'admin'
                          ? 'Admin Loket'
                          : 'Sistem'}
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <span className="inline-flex items-center gap-1 font-semibold text-[#1E3A8A] whitespace-nowrap">
                      {entry.category === 'AUTH' && <ShieldAlert className="h-3.5 w-3.5" />}
                      <span>{categoryLabel(entry.category)}</span>
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="font-semibold text-slate-900">{entry.action}</div>
                    <div className="font-mono-tabular text-[11px] text-[#0D9488]">
                      {entry.target}
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5 text-slate-600">{entry.detail}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Tidak ada catatan audit yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* 4. REKAPITULASI LAPORAN GLOBAL */
export function GlobalReportPanel({
  authToken,
  onAuditUpdated,
}: {
  authToken: string;
  onAuditUpdated: () => void;
}) {
  const [report, setReport] = useState<GlobalMonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch('/api/admin/report', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (active && data.report) setReport(data.report);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authToken]);

  const handleDownloadCsv = async () => {
    if (!report) return;
    setDownloading(true);
    try {
      await fetch('/api/admin/report/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ format: 'CSV' }),
      });

      const lines: string[] = [
        'REKAPITULASI LAPORAN GLOBAL BULANAN - SIAP PRAMBON KECAMATAN PRAMBON SIDOARJO',
        `Periode,${report.periodLabel}`,
        `Dicetak Oleh,${report.generatedBy}`,
        `Tanggal Unduh,${new Date(report.generatedAt).toLocaleString('id-ID')}`,
        '',
        'RINGKASAN METRIK UTAMA',
        `Total Warga Berkonsultasi AI,${report.summaryMetrics.totalConsultationsAi}`,
        `Total Pengajuan Pra-Validasi,${report.summaryMetrics.totalPreValidations}`,
        `Total Berkas Diperiksa,${report.summaryMetrics.totalDocsVerified}`,
        `Tingkat Lolos Pra-Validasi (%),${report.summaryMetrics.passRatePercent}%`,
        `Kasus Perbedaan Identitas Dicegah,${report.summaryMetrics.mismatchCasesPrevented}`,
        `Tiket Terverifikasi di Loket,${report.summaryMetrics.verifiedAtCounter}`,
        `AI Resolution Rate (%),${report.summaryMetrics.aiResolutionRatePercent}%`,
        `Skor Kepuasan Warga (CSAT),${report.summaryMetrics.csatScore}/5.0`,
        '',
        'TINGKAT UTILISASI PER LAYANAN ADMINDUK',
        'Nama Layanan,Konsultasi AI,Pra-Validasi Berkas,Utilisasi (%)',
        ...report.serviceUtilization.map(
          (s) => `"${s.serviceName}",${s.consultations},${s.preValidations},${s.utilizationPercent}%`
        ),
        '',
        'JENIS KESALAHAN DATA ANTAR-BERKAS TERBANYAK',
        'Kategori Kesalahan,Jumlah Kasus,Persentase (%)',
        ...report.topDocumentErrors.map(
          (e) => `"${e.category}",${e.count},${e.percentage}%`
        ),
        '',
        'REKAPITULASI PER DESA KECAMATAN PRAMBON',
        'Desa,Total Pengajuan,Perlu Koreksi',
        ...report.villageSummary.map((v) => `"Desa ${v.village}",${v.total},${v.issues}`),
      ];

      const csvContent = '\uFEFF' + lines.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Laporan_Global_SIAP_Prambon_${new Date().toISOString().slice(0, 7)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      onAuditUpdated();
    } finally {
      setDownloading(false);
    }
  };

  if (loading || !report) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
        Menyiapkan rekapitulasi laporan bulanan SIAP Prambon...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D9488]">
              <ShieldCheck className="h-4 w-4" />
              <span>Rekapitulasi Laporan Global · Periode {report.periodLabel}</span>
            </div>
            <h2 className="mt-0.5 text-lg font-bold text-slate-900">
              Laporan Kinerja Layanan Adminduk Kecamatan Prambon
            </h2>
            <p className="text-xs text-slate-500">
              Disusun oleh {report.generatedBy} · {new Date(report.generatedAt).toLocaleString('id-ID')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              type="button"
              disabled={downloading}
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E3A8A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#172e6e] disabled:opacity-60 whitespace-nowrap"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>Unduh Rekap Data (CSV / Excel)</span>
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <div className="text-[11px] text-slate-500">Konsultasi AI</div>
            <div className="font-mono-tabular mt-1 text-xl font-bold text-[#1E3A8A]">
              {report.summaryMetrics.totalConsultationsAi}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <div className="text-[11px] text-slate-500">Pra-Validasi</div>
            <div className="font-mono-tabular mt-1 text-xl font-bold text-slate-900">
              {report.summaryMetrics.totalPreValidations}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <div className="text-[11px] text-slate-500">Berkas Dicek</div>
            <div className="font-mono-tabular mt-1 text-xl font-bold text-slate-900">
              {report.summaryMetrics.totalDocsVerified}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-emerald-50/70 p-3.5">
            <div className="text-[11px] text-emerald-700">Tingkat Lolos</div>
            <div className="font-mono-tabular mt-1 text-xl font-bold text-emerald-700">
              {report.summaryMetrics.passRatePercent}%
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-amber-50/70 p-3.5">
            <div className="text-[11px] text-amber-700">Beda Data Dicegah</div>
            <div className="font-mono-tabular mt-1 text-xl font-bold text-amber-700">
              {report.summaryMetrics.mismatchCasesPrevented}
            </div>
          </div>
          <div className="rounded-lg border border-teal-200 bg-teal-50/70 p-3.5">
            <div className="text-[11px] text-[#0D9488]">AI Resolution &amp; CSAT</div>
            <div className="font-mono-tabular mt-1 text-lg font-bold text-[#0D9488]">
              {report.summaryMetrics.aiResolutionRatePercent}% · {report.summaryMetrics.csatScore}/5
            </div>
          </div>
        </div>

        {/* Service Utilization & Top Errors */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h3 className="text-sm font-bold text-slate-900">
              Tingkat Utilisasi Pelayanan Adminduk
            </h3>
            <div className="mt-2.5 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3.5 py-2.5 font-semibold">Jenis Layanan</th>
                    <th className="px-3.5 py-2.5 font-semibold text-right">Tanya AI</th>
                    <th className="px-3.5 py-2.5 font-semibold text-right">Pra-Validasi</th>
                    <th className="px-3.5 py-2.5 font-semibold text-right">Utilisasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.serviceUtilization.map((svc) => (
                    <tr key={svc.serviceName}>
                      <td className="px-3.5 py-2.5 font-medium text-slate-900">
                        {svc.serviceName}
                      </td>
                      <td className="font-mono-tabular px-3.5 py-2.5 text-right text-slate-700">
                        {svc.consultations}
                      </td>
                      <td className="font-mono-tabular px-3.5 py-2.5 text-right text-slate-700">
                        {svc.preValidations}
                      </td>
                      <td className="font-mono-tabular px-3.5 py-2.5 text-right font-bold text-[#1E3A8A]">
                        {svc.utilizationPercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-5">
            <h3 className="text-sm font-bold text-slate-900">
              Statistik Kesalahan Data Terbanyak
            </h3>
            <div className="mt-2.5 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3.5 py-2.5 font-semibold">Kategori Kendala</th>
                    <th className="px-3.5 py-2.5 font-semibold text-right">Kasus</th>
                    <th className="px-3.5 py-2.5 font-semibold text-right">Porsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.topDocumentErrors.map((err) => (
                    <tr key={err.category}>
                      <td className="px-3.5 py-2.5 font-medium text-slate-900">{err.category}</td>
                      <td className="font-mono-tabular px-3.5 py-2.5 text-right text-slate-700">
                        {err.count}
                      </td>
                      <td className="font-mono-tabular px-3.5 py-2.5 text-right font-bold text-[#0D9488]">
                        {err.percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
