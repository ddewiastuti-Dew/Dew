import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Building2,
  FileCheck2,
  Lock,
  LogOut,
  MessageSquareText,
  SearchCheck,
  ShieldCheck,
  Users,
} from 'lucide-react';
import CitizenAssistant from './components/CitizenAssistant.tsx';
import CitizenPreValidation from './components/CitizenPreValidation.tsx';
import CitizenTicketLookup from './components/CitizenTicketLookup.tsx';
import OfficerDashboard from './components/OfficerDashboard.tsx';
import StaffLoginView from './components/StaffLoginView.tsx';
import { INITIAL_FAQS, INITIAL_TICKETS, PRAMBON_SERVICES } from './data/prambonCatalog.ts';
import type {
  AppMode,
  CitizenTab,
  DashboardStats,
  FaqItem,
  KnowledgeBaseState,
  OfficerTicketStatus,
  OperatingHoursConfig,
  PreValidationTicket,
  ServiceId,
  StaffAccountPublic,
} from './types.ts';

const AUTH_TOKEN_STORAGE_KEY = 'siap_prambon_token';

const EMPTY_STATS: DashboardStats = {
  totalTickets: INITIAL_TICKETS.length,
  lengkapCount: INITIAL_TICKETS.filter((t) => t.overallStatus === 'LENGKAP_COCOK').length,
  minorCount: INITIAL_TICKETS.filter((t) => t.overallStatus === 'PERHATIAN_MINOR').length,
  tidakLengkapCount: INITIAL_TICKETS.filter((t) => t.overallStatus === 'TIDAK_LENGKAP').length,
  verifiedCount: INITIAL_TICKETS.filter(
    (t) => t.officerStatus === 'Terverifikasi Loket' || t.officerStatus === 'Selesai'
  ).length,
  aiQuestionsAnswered: 142,
  docsCheckedToday: 21,
  prevalidationsToday: INITIAL_TICKETS.length,
  passRatePercent: 33,
  identityMismatchCount: 4,
  channelBreakdown: { whatsapp: 112, instagram: 46, web: 28 },
  aiResolutionRatePercent: 86,
  avgResponseTimeSec: 2.3,
  activeEscalationCount: 3,
  escalationRatePercent: 14,
  csatScore: 4.5,
  csatPositivePercent: 85,
  totalFeedbackCount: 2,
  peakHours: [
    { slot: '08.00–11.59 WIB', count: 52, percentage: 28, isAfterHours: false },
    { slot: '12.00–15.59 WIB', count: 44, percentage: 24, isAfterHours: false },
    { slot: '16.00–17.59 WIB', count: 22, percentage: 12, isAfterHours: false },
    { slot: '18.00–21.59 WIB', count: 58, percentage: 31, isAfterHours: true },
    { slot: '22.00–07.59 WIB', count: 10, percentage: 5, isAfterHours: true },
  ],
  spikeAlerts: [],
  negativeFeedbackSessions: [],
  topAskedServices: [],
  serviceBreakdown: [],
  issueTrends: [],
  villageBreakdown: [],
};

const DEFAULT_KB: KnowledgeBaseState = {
  operatingHours: {
    seninKamis: '08.00 – 15.00 WIB',
    jumat: '08.00 – 14.30 WIB',
    istirahat: '12.00 – 13.00 WIB',
    lokasi: 'Kantor Kecamatan Prambon, Jl. Raya Prambon No. 12, Kab. Sidoarjo',
    catatanLayanan: 'Seluruh layanan Adminduk Gratis (Rp 0).',
    updatedAt: '2026-11-16',
  },
  services: PRAMBON_SERVICES,
};

export default function App() {
  const [mode, setMode] = useState<AppMode>('warga');
  const [citizenTab, setCitizenTab] = useState<CitizenTab>('pravalidasi');
  const [selectedServiceId, setSelectedServiceId] = useState<ServiceId>('KK_PERUBAHAN');

  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [currentUser, setCurrentUser] = useState<StaffAccountPublic | null>(null);

  const [tickets, setTickets] = useState<PreValidationTicket[]>(INITIAL_TICKETS);
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [faqs, setFaqs] = useState<FaqItem[]>(INITIAL_FAQS);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseState>(DEFAULT_KB);
  const [recentTicketIds, setRecentTicketIds] = useState<string[]>([]);
  const [lookupTicketId, setLookupTicketId] = useState<string | undefined>(undefined);
  const [heroImageFailed, setHeroImageFailed] = useState(false);

  const workspaceRef = useRef<HTMLDivElement>(null);

  const fetchAllData = useCallback(async () => {
    try {
      const [ticketsRes, statsRes, faqsRes, kbRes] = await Promise.all([
        fetch('/api/tickets'),
        fetch('/api/stats'),
        fetch('/api/faqs'),
        fetch('/api/knowledge-base'),
      ]);
      if (ticketsRes.ok) {
        const tData = await ticketsRes.json();
        if (Array.isArray(tData.tickets)) setTickets(tData.tickets);
      }
      if (statsRes.ok) {
        const sData = await statsRes.json();
        if (sData.stats) setStats(sData.stats);
      }
      if (faqsRes.ok) {
        const fData = await faqsRes.json();
        if (Array.isArray(fData.faqs)) setFaqs(fData.faqs);
      }
      if (kbRes.ok) {
        const kData = await kbRes.json();
        if (kData.knowledgeBase) setKnowledgeBase(kData.knowledgeBase);
      }
    } catch (err) {
      console.error('Gagal memuat data awal SIAP Prambon:', err);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Verify saved session token on mount
  useEffect(() => {
    if (!authToken) {
      setCurrentUser(null);
      return;
    }
    let active = true;
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Sesi kedaluwarsa');
        return res.json();
      })
      .then((data) => {
        if (active && data.account) {
          setCurrentUser(data.account);
        }
      })
      .catch(() => {
        if (!active) return;
        try {
          localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        } catch {
          // ignore storage error
        }
        setAuthToken(null);
        setCurrentUser(null);
      });
    return () => {
      active = false;
    };
  }, [authToken]);

  const handleLoginSuccess = (token: string, account: StaffAccountPublic) => {
    try {
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    } catch {
      // ignore storage error
    }
    setAuthToken(token);
    setCurrentUser(account);
    setMode('petugas');
    fetchAllData();
  };

  const handleLogout = async () => {
    if (authToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch {
        // ignore network error on logout
      }
    }
    try {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    } catch {
      // ignore storage error
    }
    setAuthToken(null);
    setCurrentUser(null);
    setMode('warga');
  };

  const handleTicketCreated = (ticket: PreValidationTicket) => {
    setRecentTicketIds((prev) => [ticket.id, ...prev.filter((id) => id !== ticket.id)]);
    fetchAllData();
  };

  const handleUpdateTicket = async (
    id: string,
    patch: { officerStatus: OfficerTicketStatus; officerNotes: string }
  ) => {
    const res = await fetch(`/api/tickets/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal memperbarui status verifikasi tiket.');
    }
    await fetchAllData();
  };

  const handleCreateFaq = async (faq: Omit<FaqItem, 'id' | 'updatedAt'>) => {
    const res = await fetch('/api/faqs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify(faq),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal menambahkan FAQ.');
    }
    await fetchAllData();
  };

  const handleUpdateFaq = async (id: string, patch: Partial<Omit<FaqItem, 'id'>>) => {
    const res = await fetch(`/api/faqs/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal memperbarui FAQ.');
    }
    await fetchAllData();
  };

  const handleDeleteFaq = async (id: string) => {
    const res = await fetch(`/api/faqs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal menghapus FAQ.');
    }
    await fetchAllData();
  };

  const handleUpdateOperatingHours = async (
    patch: Partial<Omit<OperatingHoursConfig, 'updatedAt'>>
  ) => {
    const res = await fetch('/api/knowledge-base/hours', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal memperbarui jam operasional.');
    }
    await fetchAllData();
  };

  const handleUpdateServiceKnowledge = async (
    serviceId: ServiceId,
    patch: {
      sla: string;
      fee: string;
      requiredDocs: string[];
      commonPitfall: string;
      formCode?: string;
      processSteps?: string[];
    }
  ) => {
    const res = await fetch(`/api/knowledge-base/services/${encodeURIComponent(serviceId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal memperbarui persyaratan layanan.');
    }
    await fetchAllData();
  };

  const handleCreateServiceKnowledge = async (input: {
    name: string;
    shortName: string;
    sla: string;
    fee: string;
    description: string;
    requiredDocs: string[];
    commonPitfall: string;
  }) => {
    const res = await fetch('/api/knowledge-base/services', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal menambahkan layanan Adminduk baru.');
    }
    await fetchAllData();
  };

  const scrollToWorkspace = (tab: CitizenTab, serviceId?: ServiceId) => {
    if (serviceId) setSelectedServiceId(serviceId);
    setCitizenTab(tab);
    setMode('warga');
    setTimeout(() => {
      workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const isOfficerAuthenticated = Boolean(currentUser && authToken);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* Brand Wordmark */}
          <button
            type="button"
            onClick={() => {
              setMode('warga');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E3A8A] text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <span className="font-display block text-lg font-extrabold leading-none tracking-tight text-[#1E3A8A]">
                SIAP Prambon
              </span>
              <span className="hidden text-[10px] font-medium text-slate-500 sm:block">
                Kecamatan Prambon · Kab. Sidoarjo
              </span>
            </div>
          </button>

          {/* Right Header Controls: Authenticated Switcher OR Discreet Citizen Header */}
          {isOfficerAuthenticated && currentUser ? (
            <div className="flex items-center gap-2">
              <div
                role="tablist"
                aria-label="Mode Tampilan Petugas"
                className="flex items-center gap-1 rounded-lg bg-slate-100 p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'warga'}
                  onClick={() => {
                    setMode('warga');
                    fetchAllData();
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    mode === 'warga'
                      ? 'bg-[#1E3A8A] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span>Mode Warga</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'petugas'}
                  onClick={() => {
                    setMode('petugas');
                    fetchAllData();
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    mode === 'petugas'
                      ? 'bg-[#0D9488] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {currentUser.role === 'super_admin'
                      ? 'Dashboard Super Admin'
                      : 'Dashboard Petugas'}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                title="Keluar Sesi Petugas"
                className="hidden items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 sm:inline-flex whitespace-nowrap"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Keluar</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="hidden text-xs font-medium text-slate-500 sm:inline">
                Layanan Mandiri Warga Adminduk
              </span>
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'warga' : 'login')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-500 hover:border-[#1E3A8A]/40 hover:text-[#1E3A8A] transition-colors whitespace-nowrap"
              >
                <Lock className="h-3 w-3" />
                <span>{mode === 'login' ? 'Mode Warga' : 'Login Petugas'}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Route Views */}
      {mode === 'login' ? (
        <StaffLoginView
          onLoginSuccess={handleLoginSuccess}
          onCancelToCitizen={() => setMode('warga')}
        />
      ) : mode === 'petugas' && isOfficerAuthenticated && currentUser && authToken ? (
        <OfficerDashboard
          currentUser={currentUser}
          authToken={authToken}
          tickets={tickets}
          stats={stats}
          faqs={faqs}
          knowledgeBase={knowledgeBase}
          onLogout={handleLogout}
          onRefreshData={fetchAllData}
          onUpdateTicket={handleUpdateTicket}
          onCreateFaq={handleCreateFaq}
          onUpdateFaq={handleUpdateFaq}
          onDeleteFaq={handleDeleteFaq}
          onUpdateOperatingHours={handleUpdateOperatingHours}
          onUpdateServiceKnowledge={handleUpdateServiceKnowledge}
          onCreateServiceKnowledge={handleCreateServiceKnowledge}
        />
      ) : (
        <main>
          {/* Citizen Hero Banner */}
          <section className="border-b border-slate-200 bg-white">
            <div className="mx-auto grid max-w-7xl grid-cols-1 items-stretch gap-8 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:py-12">
              <div className="flex flex-col justify-center lg:col-span-7">
                <div className="text-xs font-semibold text-[#0D9488]">
                  Pemerintah Kabupaten Sidoarjo · Kecamatan Prambon
                </div>
                <h1
                  className="font-display mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-4xl"
                  style={{ textWrap: 'balance' }}
                >
                  Cek Kelengkapan &amp; Konsistensi Berkas Adminduk Sebelum ke Kecamatan
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                  Layanan mandiri terpadu untuk warga di 20 desa Kecamatan Prambon. Konsultasikan syarat pengurusan lewat Asisten Virtual (Indonesia/Jawa) atau unggah foto dokumen untuk pra-validasi otomatis berbasis AI agar tidak bolak-balik ke loket.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => scrollToWorkspace('pravalidasi')}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-5 py-3 text-sm font-semibold text-white hover:bg-[#172e6e] transition-colors whitespace-nowrap"
                  >
                    <FileCheck2 className="h-4 w-4" />
                    <span>Mulai Pra-Validasi Berkas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToWorkspace('asisten')}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#0D9488] bg-white px-5 py-3 text-sm font-semibold text-[#0D9488] hover:bg-teal-50 transition-colors whitespace-nowrap"
                  >
                    <MessageSquareText className="h-4 w-4" />
                    <span>Tanya Asisten Virtual</span>
                  </button>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                  <span>
                    Tarif Adminduk: <strong className="text-emerald-700">Gratis Rp 0</strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Senin–Kamis {knowledgeBase.operatingHours.seninKamis}</span>
                  <span aria-hidden="true">·</span>
                  <span>Jumat {knowledgeBase.operatingHours.jumat}</span>
                </div>
              </div>

              {/* Right Column Hero Photo */}
              <div className="relative min-h-[240px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 lg:col-span-5">
                {!heroImageFailed ? (
                  <img
                    src="/src/assets/images/prambon_service_counter_1794887770854.jpg"
                    alt="Loket Pelayanan Publik Kecamatan Prambon Kabupaten Sidoarjo"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImageFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full min-h-[240px] flex-col items-center justify-center bg-gradient-to-br from-[#1E3A8A] to-[#0D9488] p-6 text-center text-white">
                    <Building2 className="h-10 w-10 opacity-90" />
                    <div className="mt-3 text-base font-bold">
                      Pelayanan Terpadu Kecamatan Prambon
                    </div>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/45 to-transparent p-4 text-white">
                  <div className="text-xs font-semibold text-teal-200">
                    Kantor Kecamatan Prambon, Sidoarjo
                  </div>
                  <div className="mt-0.5 text-sm font-bold">
                    {knowledgeBase.operatingHours.lokasi}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Citizen Interactive Workspace */}
          <section ref={workspaceRef} className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            {/* Sub-navigation Tabs */}
            <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
              <button
                type="button"
                onClick={() => setCitizenTab('pravalidasi')}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                  citizenTab === 'pravalidasi'
                    ? 'bg-[#1E3A8A] text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileCheck2 className="h-4 w-4 shrink-0" />
                <span>Pra-Validasi Berkas AI</span>
              </button>

              <button
                type="button"
                onClick={() => setCitizenTab('asisten')}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                  citizenTab === 'asisten'
                    ? 'bg-[#0D9488] text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <MessageSquareText className="h-4 w-4 shrink-0" />
                <span>Asisten Virtual Adminduk</span>
              </button>

              <button
                type="button"
                onClick={() => setCitizenTab('tiket')}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                  citizenTab === 'tiket'
                    ? 'bg-[#1E3A8A] text-white'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <SearchCheck className="h-4 w-4 shrink-0" />
                <span>Cek Status Tiket &amp; FAQ</span>
              </button>
            </div>

            {citizenTab === 'pravalidasi' && (
              <CitizenPreValidation
                services={knowledgeBase.services}
                selectedServiceId={selectedServiceId}
                onSelectServiceId={setSelectedServiceId}
                onTicketCreated={handleTicketCreated}
                onNavigateTicketLookup={(ticketId) => {
                  setLookupTicketId(ticketId);
                  setCitizenTab('tiket');
                }}
              />
            )}

            {citizenTab === 'asisten' && (
              <CitizenAssistant
                knowledgeBase={knowledgeBase}
                onJumpToPreValidation={(svcId) => scrollToWorkspace('pravalidasi', svcId)}
              />
            )}

            {citizenTab === 'tiket' && (
              <CitizenTicketLookup
                initialTicketId={lookupTicketId}
                recentTicketIds={recentTicketIds}
                faqs={faqs}
                knowledgeBase={knowledgeBase}
              />
            )}
          </section>

          {/* Clean Footer with Discreet Staff Login Entry */}
          <footer className="border-t border-slate-200 bg-white py-6">
            <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:px-6">
              <div>
                <strong className="text-slate-700">SIAP Prambon</strong> — Sistem Informasi Administrasi Publik Kecamatan Prambon, Kabupaten Sidoarjo
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <span>{knowledgeBase.operatingHours.catatanLayanan}</span>
                {isOfficerAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => setMode('petugas')}
                    className="inline-flex items-center gap-1 font-semibold text-[#0D9488] hover:underline"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Buka Dashboard Petugas</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-[#1E3A8A] hover:underline"
                  >
                    <Lock className="h-3 w-3" />
                    <span>Login Petugas Kecamatan</span>
                  </button>
                )}
              </div>
            </div>
          </footer>
        </main>
      )}
    </div>
  );
}
