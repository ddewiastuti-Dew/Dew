import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  ClipboardList,
  Clock,
  Database,
  Edit3,
  FileBarChart2,
  Headset,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageSquareText,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  UserCog,
  X,
} from 'lucide-react';
import type {
  DashboardStats,
  FaqCategory,
  FaqItem,
  KnowledgeBaseState,
  ManagementBrief,
  OfficerTab,
  OfficerTicketStatus,
  OperatingHoursConfig,
  PreValidationTicket,
  ServiceId,
  StaffAccountPublic,
  ValidationLevel,
} from '../types.ts';
import LiveChatEscalationPanel from './LiveChatEscalationPanel.tsx';
import QrCodeSvg from './QrCodeSvg.tsx';
import {
  ConsistencyCellLabel,
  OfficerStatusLabel,
  ValidationLevelLabel,
  ValidationStatusBanner,
} from './StatusBadge.tsx';
import {
  AccountsPanel,
  AuditLogPanel,
  GlobalReportPanel,
  MasterDataPanel,
} from './SuperAdminPanels.tsx';

interface OfficerDashboardProps {
  currentUser: StaffAccountPublic;
  authToken: string;
  tickets: PreValidationTicket[];
  stats: DashboardStats;
  faqs: FaqItem[];
  knowledgeBase: KnowledgeBaseState;
  onLogout: () => void;
  onRefreshData: () => Promise<void>;
  onUpdateTicket: (
    id: string,
    patch: { officerStatus: OfficerTicketStatus; officerNotes: string }
  ) => Promise<void>;
  onCreateFaq: (faq: Omit<FaqItem, 'id' | 'updatedAt'>) => Promise<void>;
  onUpdateFaq: (id: string, patch: Partial<Omit<FaqItem, 'id'>>) => Promise<void>;
  onDeleteFaq: (id: string) => Promise<void>;
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
}

const OFFICER_STATUS_OPTIONS: OfficerTicketStatus[] = [
  'Menunggu Kedatangan',
  'Terverifikasi Loket',
  'Perlu Revisi Warga',
  'Selesai',
];

const FAQ_CATEGORIES: FaqCategory[] = [
  'KTP-el',
  'Kartu Keluarga',
  'KIA Anak',
  'Akta Sipil',
  'Pindah Datang',
  'Jam Layanan & Umum',
];

export default function OfficerDashboard({
  currentUser,
  authToken,
  tickets,
  stats,
  faqs,
  knowledgeBase,
  onLogout,
  onRefreshData,
  onUpdateTicket,
  onCreateFaq,
  onUpdateFaq,
  onDeleteFaq,
  onUpdateOperatingHours,
  onUpdateServiceKnowledge,
  onCreateServiceKnowledge,
}: OfficerDashboardProps) {
  const isSuperAdmin = currentUser.role === 'super_admin';

  const [activeTab, setActiveTab] = useState<OfficerTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [auditRefreshSignal, setAuditRefreshSignal] = useState(0);

  // Ticket Filters & Inspection Modal
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ValidationLevel>('ALL');
  const [selectedTicket, setSelectedTicket] = useState<PreValidationTicket | null>(null);
  const [editOfficerStatus, setEditOfficerStatus] =
    useState<OfficerTicketStatus>('Menunggu Kedatangan');
  const [editOfficerNotes, setEditOfficerNotes] = useState('');
  const [savingTicket, setSavingTicket] = useState(false);
  const [ticketSaveError, setTicketSaveError] = useState<string | null>(null);

  // AI Operational Insights & Management Brief Camat
  const [insights, setInsights] = useState<{
    headline: string;
    observations: string[];
    actionPlan: string[];
  } | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const [managementBrief, setManagementBrief] = useState<ManagementBrief | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  // FAQ Form State
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqCategory, setFaqCategory] = useState<FaqCategory>('KTP-el');
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqTag, setFaqTag] = useState('Umum');
  const [faqActive, setFaqActive] = useState(true);
  const [savingFaq, setSavingFaq] = useState(false);
  const [faqError, setFaqError] = useState<string | null>(null);

  // Guard: If user switches down from super_admin, reset tab if currently on a Super Admin tab
  useEffect(() => {
    const superTabs: OfficerTab[] = ['accounts', 'master_data', 'audit_logs', 'reports'];
    if (!isSuperAdmin && superTabs.includes(activeTab)) {
      setActiveTab('overview');
    }
  }, [isSuperAdmin, activeTab]);

  const bumpAudit = () => setAuditRefreshSignal((n) => n + 1);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshData();
      bumpAudit();
    } finally {
      setRefreshing(false);
    }
  };

  const openTicketModal = (ticket: PreValidationTicket) => {
    setSelectedTicket(ticket);
    setEditOfficerStatus(ticket.officerStatus);
    setEditOfficerNotes(ticket.officerNotes || '');
    setTicketSaveError(null);
  };

  const handleSaveTicketUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setSavingTicket(true);
    setTicketSaveError(null);
    try {
      await onUpdateTicket(selectedTicket.id, {
        officerStatus: editOfficerStatus,
        officerNotes: editOfficerNotes,
      });
      setSelectedTicket(null);
      bumpAudit();
    } catch (err) {
      setTicketSaveError(
        err instanceof Error ? err.message : 'Gagal menyimpan status verifikasi tiket.'
      );
    } finally {
      setSavingTicket(false);
    }
  };

  const handleGenerateInsights = async () => {
    setLoadingInsights(true);
    setInsightsError(null);
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal membuat analisis tren AI.');
      }
      setInsights(data.insights);
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : 'Gagal terhubung ke server.');
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleGenerateBrief = async () => {
    setLoadingBrief(true);
    setBriefError(null);
    try {
      const res = await fetch('/api/insights/brief', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyusun Management Brief Camat.');
      }
      setManagementBrief(data.brief);
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : 'Gagal terhubung ke server.');
    } finally {
      setLoadingBrief(false);
    }
  };

  const resetFaqForm = () => {
    setEditingFaqId(null);
    setFaqCategory('KTP-el');
    setFaqQuestion('');
    setFaqAnswer('');
    setFaqTag('Umum');
    setFaqActive(true);
    setFaqError(null);
  };

  const startEditFaq = (faq: FaqItem) => {
    setEditingFaqId(faq.id);
    setFaqCategory(faq.category);
    setFaqQuestion(faq.question);
    setFaqAnswer(faq.answer);
    setFaqTag(faq.serviceTag);
    setFaqActive(faq.isActive);
    setFaqError(null);
  };

  const handleSaveFaq = async (e: FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;
    setSavingFaq(true);
    setFaqError(null);
    try {
      if (editingFaqId) {
        await onUpdateFaq(editingFaqId, {
          category: faqCategory,
          question: faqQuestion.trim(),
          answer: faqAnswer.trim(),
          serviceTag: faqTag.trim() || 'Umum',
          isActive: faqActive,
        });
      } else {
        await onCreateFaq({
          category: faqCategory,
          question: faqQuestion.trim(),
          answer: faqAnswer.trim(),
          serviceTag: faqTag.trim() || 'Umum',
          isActive: faqActive,
        });
      }
      resetFaqForm();
      bumpAudit();
    } catch (err) {
      setFaqError(err instanceof Error ? err.message : 'Gagal menyimpan FAQ.');
    } finally {
      setSavingFaq(false);
    }
  };

  const handleRemoveFaq = async (id: string) => {
    setFaqError(null);
    try {
      await onDeleteFaq(id);
      bumpAudit();
    } catch (err) {
      setFaqError(err instanceof Error ? err.message : 'Gagal menghapus FAQ.');
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = statusFilter === 'ALL' || t.overallStatus === statusFilter;
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      t.id.toLowerCase().includes(q) ||
      t.citizenName.toLowerCase().includes(q) ||
      t.nik.includes(q) ||
      t.village.toLowerCase().includes(q) ||
      t.serviceName.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const baseNavItems: Array<{
    id: OfficerTab;
    label: string;
    icon: typeof LayoutDashboard;
    badgeCount?: number;
  }> = [
    { id: 'overview', label: 'Ringkasan & KPI', icon: LayoutDashboard },
    {
      id: 'live_chat',
      label: 'Live Chat Eskalasi',
      icon: Headset,
      badgeCount: stats.activeEscalationCount,
    },
    { id: 'tickets', label: 'Antrean Tiket Pra-Validasi', icon: ClipboardList },
    { id: 'trends', label: 'Analitik & Insight', icon: TrendingUp },
    { id: 'faqs', label: 'Manajemen FAQ AI', icon: BookOpen },
  ];

  const superAdminNavItems: Array<{ id: OfficerTab; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'accounts', label: 'Manajemen Akun Petugas', icon: UserCog },
    { id: 'master_data', label: 'Master Data & Regulasi', icon: Database },
    { id: 'audit_logs', label: 'Audit Log Sistem', icon: History },
    { id: 'reports', label: 'Laporan Global', icon: FileBarChart2 },
  ];

  const allNavItems = isSuperAdmin
    ? [...baseNavItems, ...superAdminNavItems]
    : baseNavItems;

  const initials = currentUser.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  const describeIssueTrend = (category: string, pct: number): string => {
    const lower = category.toLowerCase();
    if (lower.includes('ejaan') || lower.includes('nama')) {
      return `${pct}% pengajuan terkendala perbedaan ejaan nama antara KK dan Ijazah/Akta`;
    }
    if (lower.includes('foto') || lower.includes('jelas')) {
      return `${pct}% pengajuan terkendala foto dokumen buram, gelap, atau terpotong`;
    }
    if (lower.includes('pengantar')) {
      return `${pct}% pengajuan terkendala surat pengantar RT/RW atau desa belum lengkap`;
    }
    if (lower.includes('alamat')) {
      return `${pct}% pengajuan terkendala penulisan alamat RT/RW belum mutakhir`;
    }
    if (lower.includes('nik')) {
      return `${pct}% pengajuan terkendala ketidakcocokan digit NIK antar dokumen`;
    }
    return `${pct}% pengajuan terkendala ${category.toLowerCase()}`;
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 lg:flex">
      {/* Left Sidebar (Desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white lg:flex">
        <div>
          <div className="border-b border-slate-200 p-5">
            <div className="flex items-center gap-3">
              {!avatarFailed && !isSuperAdmin ? (
                <img
                  src="/src/assets/images/prambon_officer_avatar_1794887750508.jpg"
                  alt={currentUser.fullName}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                />
              ) : (
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${
                    isSuperAdmin ? 'bg-[#0D9488]' : 'bg-[#1E3A8A]'
                  }`}
                >
                  {initials || 'PR'}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-slate-900">
                  {currentUser.fullName}
                </div>
                <div className="truncate text-xs text-slate-500">{currentUser.title}</div>
                <div
                  className={`mt-0.5 text-[11px] font-bold ${
                    isSuperAdmin ? 'text-[#0D9488]' : 'text-[#1E3A8A]'
                  }`}
                >
                  {isSuperAdmin ? 'Super Admin Kecamatan' : 'Admin Loket'}
                </div>
              </div>
            </div>
          </div>

          <nav className="space-y-1 p-3">
            <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Operasional Loket
            </div>
            {baseNavItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3.5 py-2.5 text-left text-xs font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#1E3A8A] text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badgeCount && item.badgeCount > 0 ? (
                    <span
                      className={`font-mono-tabular rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        active ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {item.badgeCount}
                    </span>
                  ) : null}
                </button>
              );
            })}

            {isSuperAdmin && (
              <div className="pt-4">
                <div className="flex items-center gap-1.5 px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#0D9488]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Panel Super Admin</span>
                </div>
                <div className="space-y-1">
                  {superAdminNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-xs font-semibold transition-colors whitespace-nowrap ${
                          active
                            ? 'bg-[#0D9488] text-white'
                            : 'text-slate-700 hover:bg-teal-50/70 hover:text-slate-900'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </nav>
        </div>

        <div className="border-t border-slate-200 p-4 space-y-3">
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50/70 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar Sesi Petugas</span>
          </button>
          <div className="text-xs text-slate-500">
            <div className="font-semibold text-slate-700">Kecamatan Prambon</div>
            <div>Kabupaten Sidoarjo · 20 Desa</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        {/* Sub-header Bar */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
              aria-label="Menu Petugas"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="text-xs text-slate-500">
                {isSuperAdmin
                  ? 'Dashboard Super Admin Kecamatan Prambon'
                  : 'Dashboard Petugas Loket Kecamatan Prambon'}
              </div>
              <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                {allNavItems.find((i) => i.id === activeTab)?.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Segarkan Data</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 lg:hidden whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white p-3 lg:hidden space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {allNavItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${
                      active ? 'bg-[#1E3A8A] text-white' : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6 space-y-6">
          {/* VIEW 1: RINGKASAN & KPI */}
          {activeTab === 'overview' && (
            <>
              {isSuperAdmin && (
                <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#0D9488]">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Akses Super Admin Aktif</span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-700">
                        Anda memiliki wewenang penuh untuk mengelola akun petugas loket, master regulasi layanan, audit log sistem, dan laporan global bulanan.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('accounts')}
                        className="rounded-lg bg-white border border-teal-200 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-[#0D9488]"
                      >
                        Akun Petugas
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('master_data')}
                        className="rounded-lg bg-white border border-teal-200 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-[#0D9488]"
                      >
                        Master Layanan
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('audit_logs')}
                        className="rounded-lg bg-white border border-teal-200 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-[#0D9488]"
                      >
                        Audit Log
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('reports')}
                        className="rounded-lg bg-[#0D9488] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0b7c72]"
                      >
                        Laporan Global
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 6 Kartu KPI Operasional PRD SIAP Prambon */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Total Interaksi Warga (WA &amp; IG)</span>
                    <MessageSquareText className="h-4 w-4 text-[#0D9488]" />
                  </div>
                  <div className="font-mono-tabular mt-2 text-3xl font-bold text-[#1E3A8A]">
                    {stats.channelBreakdown.whatsapp +
                      stats.channelBreakdown.instagram +
                      stats.channelBreakdown.web}
                  </div>
                  <div className="mt-1.5 text-xs text-slate-600">
                    WA <span className="font-mono-tabular font-semibold">{stats.channelBreakdown.whatsapp}</span> · IG{' '}
                    <span className="font-mono-tabular font-semibold">{stats.channelBreakdown.instagram}</span> · Web{' '}
                    <span className="font-mono-tabular font-semibold">{stats.channelBreakdown.web}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-emerald-700">
                    <span>AI Resolution Rate</span>
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="font-mono-tabular mt-2 text-3xl font-bold text-emerald-700">
                    {stats.aiResolutionRatePercent}%
                  </div>
                  <div className="mt-1.5 text-xs text-slate-600">
                    <span className="font-mono-tabular font-semibold">{stats.aiQuestionsAnswered}</span> pertanyaan dijawab mandiri tanpa eskalasi
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Rata-rata Waktu Respons</span>
                    <Clock className="h-4 w-4 text-[#0D9488]" />
                  </div>
                  <div className="font-mono-tabular mt-2 text-3xl font-bold text-slate-900">
                    {stats.avgResponseTimeSec} <span className="text-base font-semibold text-slate-500">detik</span>
                  </div>
                  <div className="mt-1.5 text-xs text-slate-600">
                    Target SLA ≤ 5 detik (Bahasa Indonesia &amp; Jawa)
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Tiket Pra-Validasi Berkas</span>
                    <ClipboardList className="h-4 w-4 text-[#1E3A8A]" />
                  </div>
                  <div className="font-mono-tabular mt-2 text-3xl font-bold text-slate-900">
                    {stats.prevalidationsToday}
                  </div>
                  <div className="mt-1.5 text-xs text-slate-600">
                    Lolos <span className="font-mono-tabular font-semibold text-emerald-700">{stats.passRatePercent}%</span> ·{' '}
                    <span className="font-mono-tabular font-semibold text-amber-700">{stats.identityMismatchCount}</span> beda data dicegah
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-amber-700">
                    <span>Antrean Eskalasi Petugas</span>
                    <Headset className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="font-mono-tabular mt-2 text-3xl font-bold text-amber-700">
                    {stats.activeEscalationCount}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-xs text-slate-600">
                    <span>
                      Rasio eskalasi <span className="font-mono-tabular font-semibold">{stats.escalationRatePercent}%</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('live_chat')}
                      className="font-semibold text-[#1E3A8A] hover:underline"
                    >
                      Buka Inbox →
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Skor Kepuasan Warga (CSAT)</span>
                    <Star className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="font-mono-tabular mt-2 text-3xl font-bold text-[#0D9488]">
                    {stats.csatScore} <span className="text-base font-semibold text-slate-500">/ 5.0</span>
                  </div>
                  <div className="mt-1.5 text-xs text-slate-600">
                    <span className="font-mono-tabular font-semibold text-emerald-700">{stats.csatPositivePercent}%</span> terbantu ({stats.totalFeedbackCount} ulasan)
                  </div>
                </div>
              </div>

              {/* Tabel Antrean Tiket + Analitik Topik & Peak Hour */}
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <section className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-7">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Antrean Tiket Pra-Validasi Terbaru
                      </h2>
                      <p className="text-xs text-slate-500">
                        Klik baris untuk memeriksa detail konsistensi lintas berkas warga
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('tickets')}
                      className="text-xs font-semibold text-[#0D9488] hover:underline whitespace-nowrap"
                    >
                      Kelola Semua Antrean →
                    </button>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="pb-2.5 font-semibold">Kode Tiket</th>
                          <th className="pb-2.5 font-semibold">Warga / Desa</th>
                          <th className="pb-2.5 font-semibold">Layanan</th>
                          <th className="pb-2.5 font-semibold">Kesesuaian Data</th>
                          <th className="pb-2.5 font-semibold">Status Loket</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tickets.slice(0, 5).map((t) => (
                          <tr
                            key={t.id}
                            onClick={() => openTicketModal(t)}
                            className="cursor-pointer hover:bg-slate-50"
                          >
                            <td className="font-mono-tabular py-3 font-bold text-[#1E3A8A]">
                              {t.id}
                            </td>
                            <td className="py-3">
                              <div className="font-semibold text-slate-900">{t.citizenName}</div>
                              <div className="text-slate-500">Desa {t.village}</div>
                            </td>
                            <td className="py-3 text-slate-700">{t.serviceName}</td>
                            <td className="py-3">
                              <ValidationLevelLabel status={t.overallStatus} />
                            </td>
                            <td className="py-3">
                              <OfficerStatusLabel status={t.officerStatus} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5 xl:col-span-5 space-y-5">
                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-slate-900">
                        Layanan Paling Banyak Ditanyakan
                      </h2>
                      <BarChart3 className="h-4 w-4 text-[#0D9488]" />
                    </div>
                    <div className="mt-3 space-y-2.5">
                      {stats.topAskedServices.slice(0, 5).map((item) => (
                        <div key={item.serviceName}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-800">{item.serviceName}</span>
                            <span className="font-mono-tabular text-slate-600">
                              {item.count} ({item.percentage}%)
                            </span>
                          </div>
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[#1E3A8A]"
                              style={{ width: `${Math.max(item.percentage, 8)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Jam Akses Tersibuk (Peak Hour) */}
                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Jam Akses Tersibuk (Peak Hour)
                      </h3>
                      <span className="text-[10px] font-semibold text-[#0D9488]">
                        Termasuk Luar Jam Kerja
                      </span>
                    </div>
                    <div className="mt-2.5 space-y-2">
                      {stats.peakHours.map((slot) => (
                        <div key={slot.slot}>
                          <div className="flex items-center justify-between text-[11px]">
                            <span
                              className={`font-mono-tabular font-semibold ${
                                slot.isAfterHours ? 'text-amber-800' : 'text-slate-700'
                              }`}
                            >
                              {slot.slot} {slot.isAfterHours ? '(Luar Jam Kantor)' : ''}
                            </span>
                            <span className="font-mono-tabular text-slate-600">
                              {slot.count} ({slot.percentage}%)
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                slot.isAfterHours ? 'bg-amber-500' : 'bg-[#0D9488]'
                              }`}
                              style={{ width: `${Math.max(slot.percentage, 6)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}

          {/* VIEW 1B: LIVE CHAT ESKALASI (HUMAN HANDOVER) */}
          {activeTab === 'live_chat' && (
            <LiveChatEscalationPanel
              authToken={authToken}
              onAuditUpdated={() => {
                onRefreshData();
                bumpAudit();
              }}
            />
          )}

          {/* VIEW 2: ANTREAN TIKET PRA-VALIDASI */}
          {activeTab === 'tickets' && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari kode tiket, nama warga, NIK, atau desa..."
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-[#1E3A8A] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
                  {[
                    { id: 'ALL', label: 'Semua Antrean' },
                    { id: 'LENGKAP_COCOK', label: 'Lolos Pra-Validasi' },
                    { id: 'PERHATIAN_MINOR', label: 'Perlu Perhatian' },
                    { id: 'TIDAK_LENGKAP', label: 'Tidak Lengkap' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id as 'ALL' | ValidationLevel)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                        statusFilter === tab.id
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Kode &amp; Waktu</th>
                      <th className="px-4 py-3 font-semibold">Pemohon &amp; NIK</th>
                      <th className="px-4 py-3 font-semibold">Desa</th>
                      <th className="px-4 py-3 font-semibold">Layanan Adminduk</th>
                      <th className="px-4 py-3 font-semibold">Kesesuaian Data</th>
                      <th className="px-4 py-3 font-semibold">Status Petugas</th>
                      <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <div className="font-mono-tabular font-bold text-[#1E3A8A]">{t.id}</div>
                          <div className="font-mono-tabular text-[11px] text-slate-500">
                            {new Date(t.createdAt).toLocaleDateString('id-ID')}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{t.citizenName}</div>
                          <div className="font-mono-tabular text-[11px] text-slate-500">{t.nik}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{t.village}</td>
                        <td className="px-4 py-3 text-slate-700">{t.serviceName}</td>
                        <td className="px-4 py-3">
                          <ValidationLevelLabel status={t.overallStatus} />
                        </td>
                        <td className="px-4 py-3">
                          <OfficerStatusLabel status={t.officerStatus} />
                          {t.verifiedBy && (
                            <div className="mt-0.5 text-[10px] text-slate-500">
                              Oleh: {t.verifiedBy}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => openTicketModal(t)}
                            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-[#1E3A8A] hover:border-[#1E3A8A] hover:bg-blue-50/40 whitespace-nowrap"
                          >
                            Periksa &amp; Verifikasi
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredTickets.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                          Tidak ada tiket pra-validasi yang sesuai dengan pencarian Anda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* VIEW 3: ANALITIK & INSIGHT */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-6">
                  <h2 className="text-sm font-bold text-slate-900">
                    Layanan Paling Banyak Ditanyakan di Asisten AI
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Statistik topik pertanyaan warga Kecamatan Prambon secara langsung.
                  </p>
                  <div className="mt-5 space-y-4">
                    {stats.topAskedServices.map((item) => (
                      <div key={item.serviceName}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{item.serviceName}</span>
                          <span className="font-mono-tabular text-slate-600">
                            {item.count} pertanyaan · {item.percentage}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#1E3A8A]"
                            style={{ width: `${Math.max(item.percentage, 8)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-6">
                  <h2 className="text-sm font-bold text-slate-900">
                    Jenis Kesalahan Berkas Paling Sering Terjadi
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Pola temuan ketidaksesuaian data dan kelengkapan berkas warga.
                  </p>

                  <div className="mt-5 space-y-4">
                    {stats.issueTrends.length > 0 ? (
                      stats.issueTrends.map((trend) => (
                        <div key={trend.category}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800">{trend.category}</span>
                            <span className="font-mono-tabular text-slate-600">
                              {trend.count} kasus · {trend.percentage}%
                            </span>
                          </div>
                          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[#0D9488]"
                              style={{ width: `${Math.max(trend.percentage, 8)}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {describeIssueTrend(trend.category, trend.percentage)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">
                        Belum ada temuan kendala berkas tercatat.
                      </p>
                    )}
                  </div>
                </section>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
                  <h2 className="text-sm font-bold text-slate-900">
                    Sebaran Pengajuan per Desa
                  </h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="pb-2 font-semibold">Desa</th>
                          <th className="pb-2 font-semibold text-right">Pengajuan</th>
                          <th className="pb-2 font-semibold text-right">Perlu Koreksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stats.villageBreakdown.map((v) => (
                          <tr key={v.village}>
                            <td className="py-2.5 font-medium text-slate-800">Desa {v.village}</td>
                            <td className="font-mono-tabular py-2.5 text-right text-slate-700">
                              {v.total}
                            </td>
                            <td className="font-mono-tabular py-2.5 text-right font-semibold text-amber-700">
                              {v.issues}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 lg:col-span-7">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">
                        Insight &amp; Rekomendasi Operasional AI
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Analisis otomatis untuk pembinaan operator desa dan peningkatan kesiapan berkas warga.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={loadingInsights}
                      onClick={handleGenerateInsights}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E3A8A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#172e6e] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
                    >
                      {loadingInsights ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      <span>Buat Analisis AI</span>
                    </button>
                  </div>

                  {insightsError && (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
                      {insightsError}
                    </div>
                  )}

                  {insights ? (
                    <div className="mt-5 space-y-4 border-t border-slate-200 pt-4">
                      <div>
                        <div className="text-xs font-semibold text-[#0D9488]">Ringkasan Utama</div>
                        <h3 className="mt-0.5 text-base font-bold text-slate-900">
                          {insights.headline}
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">Temuan Pola Lapangan</h4>
                          <ul className="mt-2 space-y-2 text-xs text-slate-700">
                            {insights.observations.map((obs, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1E3A8A]" />
                                <span>{obs}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">
                            Rencana Tindak Lanjut
                          </h4>
                          <ul className="mt-2 space-y-2 text-xs text-slate-700">
                            {insights.actionPlan.map((act, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0D9488]" />
                                <span>{act}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600">
                      Klik tombol <strong>Buat Analisis AI</strong> di atas untuk merangkum pola kesalahan berkas terkini menjadi rekomendasi tindak lanjut bagi Kecamatan Prambon.
                    </div>
                  )}
                </section>
              </div>

              {/* Logika Insight & Prioritas (§8.3 PRD): Spike Alerts & Negative Feedback */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-6">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <h2 className="text-sm font-bold text-slate-900">
                      Deteksi Lonjakan Topik (&gt;30%) &amp; Prioritas
                    </h2>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {stats.spikeAlerts.length > 0 ? (
                      stats.spikeAlerts.map((alert, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs"
                        >
                          <div className="flex items-center justify-between font-bold text-amber-900">
                            <span>{alert.serviceName}</span>
                            <span className="font-mono-tabular">+{alert.growthPercent}%</span>
                          </div>
                          <p className="mt-1 text-amber-900/90 leading-relaxed">
                            {alert.reason}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">
                        Belum ada lonjakan pertanyaan di atas 30% periode ini.
                      </p>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900">
                      Antrean Review Feedback Negatif Warga
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('live_chat')}
                      className="text-xs font-semibold text-[#0D9488] hover:underline"
                    >
                      Tindak Lanjuti di Inbox →
                    </button>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {stats.negativeFeedbackSessions.length > 0 ? (
                      stats.negativeFeedbackSessions.map((item) => (
                        <div
                          key={item.sessionId}
                          className="rounded-lg border border-red-200 bg-red-50/60 p-3 text-xs"
                        >
                          <div className="flex items-center justify-between font-semibold text-red-900">
                            <span>
                              {item.channel} · {item.citizenAlias}
                            </span>
                            <span className="font-mono-tabular text-[11px]">
                              {item.sessionId}
                            </span>
                          </div>
                          <p className="mt-1 text-red-900/90">{item.comment}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">
                        Tidak ada ulasan negatif warga yang belum tertangani.
                      </p>
                    )}
                  </div>
                </section>
              </div>

              {/* Management Brief Camat Prambon (Lampiran D PRD) */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#0D9488]">
                      Ringkasan Eksekutif Pimpinan (Format Standar Kecamatan Prambon)
                    </div>
                    <h2 className="mt-0.5 text-base font-bold text-slate-900">
                      Generator Management Brief Camat Prambon (AI)
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {managementBrief && (
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Cetak Brief</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={loadingBrief}
                      onClick={handleGenerateBrief}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D9488] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0b7c72] disabled:opacity-60 whitespace-nowrap"
                    >
                      {loadingBrief ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      <span>Susun Management Brief Camat</span>
                    </button>
                  </div>
                </div>

                {briefError && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
                    {briefError}
                  </div>
                )}

                {managementBrief ? (
                  <div className="mt-5 space-y-5 text-xs">
                    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                      <div className="font-bold text-[#1E3A8A]">
                        1. Executive Summary ({managementBrief.periodLabel})
                      </div>
                      <p className="mt-1 leading-relaxed text-slate-800">
                        {managementBrief.executiveSummary}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 p-4">
                        <div className="font-bold text-slate-900">
                          2. Kinerja Operasional &amp; KPI Utama
                        </div>
                        <ul className="mt-2 space-y-1.5 text-slate-700">
                          {managementBrief.kpiHighlights.map((item, i) => (
                            <li key={i}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-4">
                        <div className="font-bold text-slate-900">
                          3. Distribusi Topik Pertanyaan
                        </div>
                        <p className="mt-2 leading-relaxed text-slate-700">
                          {managementBrief.topicDistributionInsight}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-4">
                        <div className="font-bold text-slate-900">
                          4. Pola Jam Akses (Peak Hour)
                        </div>
                        <p className="mt-2 leading-relaxed text-slate-700">
                          {managementBrief.peakHourInsight}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-4">
                        <div className="font-bold text-slate-900">
                          5. Evaluasi Eskalasi &amp; Kesenjangan Berkas
                        </div>
                        <p className="mt-2 leading-relaxed text-slate-700">
                          {managementBrief.escalationAndDocGapInsight}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-teal-200 bg-teal-50/60 p-4">
                      <div className="font-bold text-[#0D9488]">
                        6. Rekomendasi Tindak Lanjut Manajemen
                      </div>
                      <ol className="mt-2 space-y-1.5 text-slate-800">
                        {managementBrief.actionRecommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="font-mono-tabular font-bold text-[#1E3A8A]">
                              {i + 1}.
                            </span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-slate-500">
                    Klik <strong>Susun Management Brief Camat</strong> untuk menyusun laporan eksekutif 6 bagian secara otomatis dari data interaksi omnichannel, peak hour, eskalasi, CSAT, dan pra-validasi berkas.
                  </p>
                )}
              </section>
            </div>
          )}

          {/* VIEW 4: MANAJEMEN FAQ AI */}
          {activeTab === 'faqs' && (
            <div className="space-y-6">
              {/* Info Jam Operasional (Read-only for Admin Biasa, Quick Jump for Super Admin) */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 text-[#1E3A8A] shrink-0" />
                  <div className="text-xs text-slate-600">
                    <div className="font-bold text-slate-900">
                      Informasi Operasional &amp; Master Syarat Layanan ({knowledgeBase.services.length} layanan terdaftar)
                    </div>
                    <div className="mt-0.5">
                      Senin–Kamis {knowledgeBase.operatingHours.seninKamis} · Jumat{' '}
                      {knowledgeBase.operatingHours.jumat} · {knowledgeBase.operatingHours.lokasi}
                    </div>
                  </div>
                </div>
                {isSuperAdmin ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab('master_data')}
                    className="rounded-lg border border-[#0D9488] px-3 py-1.5 text-xs font-semibold text-[#0D9488] hover:bg-teal-50 whitespace-nowrap shrink-0"
                  >
                    Kelola Master Data &amp; Regulasi →
                  </button>
                ) : (
                  <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                    Master regulasi dikelola oleh Super Admin
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
                  <h2 className="text-sm font-bold text-slate-900">
                    {editingFaqId ? 'Ubah Entri FAQ' : 'Tambah FAQ Tanya Jawab AI'}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    FAQ aktif otomatis menjadi rujukan Asisten Virtual SIAP Prambon.
                  </p>

                  {faqError && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                      {faqError}
                    </div>
                  )}

                  <form onSubmit={handleSaveFaq} className="mt-4 space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Kategori</label>
                      <select
                        value={faqCategory}
                        onChange={(e) => setFaqCategory(e.target.value as FaqCategory)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#1E3A8A] focus:outline-none"
                      >
                        {FAQ_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Pertanyaan Warga *
                      </label>
                      <input
                        type="text"
                        required
                        value={faqQuestion}
                        onChange={(e) => setFaqQuestion(e.target.value)}
                        placeholder="Contoh: Apakah cetak ulang KK rusak butuh surat desa?"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#1E3A8A] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Jawaban Resmi Kecamatan *
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={faqAnswer}
                        onChange={(e) => setFaqAnswer(e.target.value)}
                        placeholder="Tuliskan penjelasan lengkap dan jelas sesuai regulasi Dispendukcapil Sidoarjo..."
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#1E3A8A] focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={faqActive}
                          onChange={(e) => setFaqActive(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-[#0D9488]"
                        />
                        <span>Aktif di Asisten Virtual</span>
                      </label>
                      {editingFaqId && (
                        <button
                          type="button"
                          onClick={resetFaqForm}
                          className="text-xs font-medium text-slate-500 hover:text-slate-900"
                        >
                          Batal Edit
                        </button>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={savingFaq}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#1E3A8A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#172e6e] disabled:opacity-60 transition-colors"
                    >
                      {savingFaq ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      <span>
                        {editingFaqId ? 'Simpan Perubahan FAQ' : 'Tambahkan ke Knowledge Base'}
                      </span>
                    </button>
                  </form>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
                  <h2 className="text-sm font-bold text-slate-900">
                    Daftar Pengetahuan FAQ ({faqs.length})
                  </h2>
                  <div className="mt-4 divide-y divide-slate-200">
                    {faqs.map((faq) => (
                      <div key={faq.id} className="py-3.5 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              <span className="font-semibold text-[#0D9488]">{faq.category}</span>
                              <span className="text-slate-300">·</span>
                              <span
                                className={`font-semibold ${
                                  faq.isActive ? 'text-emerald-700' : 'text-slate-400'
                                }`}
                              >
                                {faq.isActive ? 'Aktif untuk AI' : 'Nonaktif'}
                              </span>
                              <span className="text-slate-300">·</span>
                              <span className="font-mono-tabular text-slate-400">
                                {faq.updatedAt}
                              </span>
                            </div>
                            <h3 className="mt-1 text-xs font-bold text-slate-900">{faq.question}</h3>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600">
                              {faq.answer}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => startEditFaq(faq)}
                              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#1E3A8A]"
                              title="Edit FAQ"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFaq(faq.id)}
                              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              title="Hapus FAQ"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* VIEW 5 (SUPER ADMIN): MANAJEMEN AKUN PETUGAS */}
          {isSuperAdmin && activeTab === 'accounts' && (
            <AccountsPanel
              authToken={authToken}
              currentUserId={currentUser.id}
              onAuditUpdated={bumpAudit}
            />
          )}

          {/* VIEW 6 (SUPER ADMIN): MASTER DATA & REGULASI */}
          {isSuperAdmin && activeTab === 'master_data' && (
            <MasterDataPanel
              knowledgeBase={knowledgeBase}
              onUpdateOperatingHours={async (patch) => {
                await onUpdateOperatingHours(patch);
                bumpAudit();
              }}
              onUpdateServiceKnowledge={async (serviceId, patch) => {
                await onUpdateServiceKnowledge(serviceId, patch);
                bumpAudit();
              }}
              onCreateServiceKnowledge={async (input) => {
                await onCreateServiceKnowledge(input);
                bumpAudit();
              }}
            />
          )}

          {/* VIEW 7 (SUPER ADMIN): AUDIT LOG SISTEM */}
          {isSuperAdmin && activeTab === 'audit_logs' && (
            <AuditLogPanel authToken={authToken} refreshSignal={auditRefreshSignal} />
          )}

          {/* VIEW 8 (SUPER ADMIN): LAPORAN GLOBAL */}
          {isSuperAdmin && activeTab === 'reports' && (
            <GlobalReportPanel authToken={authToken} onAuditUpdated={bumpAudit} />
          )}
        </div>
      </div>

      {/* Modal Detail & Verifikasi Tiket Petugas */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-start gap-4">
                <QrCodeSvg
                  value={`SIAP-PRAMBON|${selectedTicket.id}|${selectedTicket.nik}|${selectedTicket.overallStatus}`}
                  size={72}
                />
                <div>
                  <div className="font-mono-tabular text-xs font-bold text-[#0D9488]">
                    {selectedTicket.id} · {selectedTicket.serviceName}
                  </div>
                  <h2 className="mt-0.5 text-lg font-bold text-slate-900">
                    {selectedTicket.citizenName} (Desa {selectedTicket.village})
                  </h2>
                  <div className="font-mono-tabular text-xs text-slate-500">
                    NIK: {selectedTicket.nik} · {selectedTicket.documentCount} berkas dilampirkan
                  </div>
                  {selectedTicket.expiresAt && (
                    <div className="mt-0.5 font-mono-tabular text-[11px] text-slate-500">
                      Retensi Foto 24 Jam Auto-Delete:{' '}
                      {new Date(selectedTicket.expiresAt).toLocaleString('id-ID')}
                    </div>
                  )}
                  {selectedTicket.verifiedBy && (
                    <div className="mt-1 text-[11px] font-medium text-slate-500">
                      Terakhir diperbarui oleh{' '}
                      <span className="font-semibold text-slate-700">
                        {selectedTicket.verifiedBy}
                      </span>
                      {selectedTicket.verifiedAt
                        ? ` (${new Date(selectedTicket.verifiedAt).toLocaleString('id-ID')})`
                        : ''}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-5">
              <ValidationStatusBanner
                status={selectedTicket.overallStatus}
                summary={selectedTicket.summary}
              />

              {selectedTicket.documentMatrix && selectedTicket.documentMatrix.length > 0 ? (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Tabel Perbandingan Data Lintas Berkas
                  </h3>
                  <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Elemen</th>
                          <th className="px-3 py-2 font-semibold">KK</th>
                          <th className="px-3 py-2 font-semibold">Akta</th>
                          <th className="px-3 py-2 font-semibold">Buku Nikah</th>
                          <th className="px-3 py-2 font-semibold">Ijazah</th>
                          <th className="px-3 py-2 font-semibold">Pengantar</th>
                          <th className="px-3 py-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedTicket.documentMatrix.map((row, idx) => (
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
                            <td className="px-3 py-2 font-semibold text-slate-900">{row.field}</td>
                            <td className="px-3 py-2 text-slate-700">{row.kkValue}</td>
                            <td className="px-3 py-2 text-slate-700">{row.aktaValue}</td>
                            <td className="px-3 py-2 text-slate-700">{row.nikahValue}</td>
                            <td className="px-3 py-2 text-slate-700">{row.ijazahValue}</td>
                            <td className="px-3 py-2 text-slate-700">{row.pengantarValue}</td>
                            <td className="px-3 py-2">
                              <ConsistencyCellLabel status={row.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Hasil Pengecekan Konsistensi AI
                  </h3>
                  <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Elemen</th>
                          <th className="px-3 py-2 font-semibold">Dokumen A</th>
                          <th className="px-3 py-2 font-semibold">Dokumen B</th>
                          <th className="px-3 py-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedTicket.consistencyChecks.map((c, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-semibold text-slate-900">{c.field}</td>
                            <td className="px-3 py-2 text-slate-700">{c.valueDocA}</td>
                            <td className="px-3 py-2 text-slate-700">{c.valueDocB}</td>
                            <td className="px-3 py-2">
                              <ConsistencyCellLabel status={c.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <form
                onSubmit={handleSaveTicketUpdate}
                className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <h3 className="text-sm font-bold text-slate-900">
                  Tindak Lanjut &amp; Verifikasi Petugas Loket
                </h3>

                {ticketSaveError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                    {ticketSaveError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Status Pelayanan Loket
                    </label>
                    <select
                      value={editOfficerStatus}
                      onChange={(e) => setEditOfficerStatus(e.target.value as OfficerTicketStatus)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#1E3A8A] focus:outline-none"
                    >
                      {OFFICER_STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Kategori Temuan Utama
                    </label>
                    <input
                      type="text"
                      disabled
                      value={selectedTicket.commonIssueCategory}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Catatan Petugas (Dapat Dilihat Warga Saat Cek Tiket)
                  </label>
                  <textarea
                    rows={2}
                    value={editOfficerNotes}
                    onChange={(e) => setEditOfficerNotes(e.target.value)}
                    placeholder="Contoh: Berkas fisik sudah diterima di Loket 2, estimasi KK selesai besok pukul 11.00 WIB."
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#1E3A8A] focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={savingTicket}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E3A8A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#172e6e] disabled:opacity-60"
                  >
                    {savingTicket && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Simpan Status Verifikasi</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
