import { useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type { StaffAccountPublic } from '../types.ts';

interface StaffLoginViewProps {
  onLoginSuccess: (token: string, account: StaffAccountPublic) => void;
  onCancelToCitizen: () => void;
}

export default function StaffLoginView({
  onLoginSuccess,
  onCancelToCitizen,
}: StaffLoginViewProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const performLogin = async (userOrEmail: string, pass: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: userOrEmail.trim(), password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal masuk ke sistem.');
      }
      onLoginSuccess(data.token, data.account);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi gangguan koneksi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMsg('Mohon masukkan Username/Email dan Kata Sandi.');
      return;
    }
    performLogin(identifier, password);
  };

  const handleDemoLogin = (demoUser: string, demoPass: string) => {
    setIdentifier(demoUser);
    setPassword(demoPass);
    performLogin(demoUser, demoPass);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-md">
        <button
          type="button"
          onClick={onCancelToCitizen}
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#1E3A8A] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Halaman Layanan Warga</span>
        </button>

        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#1E3A8A] text-white">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-extrabold text-slate-900">
                Portal Petugas &amp; Admin Kecamatan
              </h1>
              <p className="text-xs text-slate-500">
                SIAP Prambon · Pemerintah Kabupaten Sidoarjo
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Username atau Email Kedinasan
              </label>
              <input
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Contoh: admin.prambon"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/15"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Kata Sandi (Password)
              </label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-3.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1E3A8A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#172e6e] disabled:opacity-60 transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              <span>Masuk ke Dashboard</span>
            </button>
          </form>

          {/* Simulasi Login Cepat untuk Pengujian */}
          <div className="mt-6 border-t border-slate-200 pt-5">
            <div className="text-xs font-bold text-slate-700">
              Simulasi Login Cepat (Akun Demo Pengujian)
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Klik salah satu akun di bawah untuk menguji hak akses Admin Loket atau Super Admin:
            </p>

            <div className="mt-3 grid grid-cols-1 gap-2.5">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDemoLogin('admin.prambon', 'password123')}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-left hover:border-[#1E3A8A] hover:bg-blue-50/40 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className="h-4 w-4 text-[#1E3A8A]" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Login Admin Biasa (Petugas Loket)
                    </div>
                    <div className="font-mono-tabular text-[11px] text-slate-500">
                      admin.prambon / password123
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#1E3A8A]">Masuk →</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleDemoLogin('superadmin.prambon', 'superadmin123')}
                className="flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50/50 px-3.5 py-2.5 text-left hover:border-[#0D9488] hover:bg-teal-50 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-[#0D9488]" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Login Super Admin (Camat / Admin Utama)
                    </div>
                    <div className="font-mono-tabular text-[11px] text-slate-500">
                      superadmin.prambon / superadmin123
                    </div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#0D9488]">Masuk →</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <Building2 className="h-3.5 w-3.5" />
          <span>Akses terbatas khusus aparatur Kecamatan Prambon</span>
        </div>
      </div>
    </div>
  );
}
