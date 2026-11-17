export type AppMode = 'warga' | 'petugas' | 'login';

export type CitizenTab = 'pravalidasi' | 'asisten' | 'tiket';

export type UserRole = 'admin' | 'super_admin';

export type OfficerTab =
  | 'overview'
  | 'live_chat'
  | 'tickets'
  | 'trends'
  | 'faqs'
  | 'accounts'
  | 'master_data'
  | 'audit_logs'
  | 'reports';

export type ServiceId = string;

export type ValidationLevel = 'LENGKAP_COCOK' | 'PERHATIAN_MINOR' | 'TIDAK_LENGKAP';

export type OfficerTicketStatus =
  | 'Menunggu Kedatangan'
  | 'Terverifikasi Loket'
  | 'Perlu Revisi Warga'
  | 'Selesai';

export type ChatChannel = 'WhatsApp' | 'Instagram DM' | 'Web Portal';

export type ChatSessionStatus =
  | 'Ditangani AI'
  | 'Menunggu Petugas'
  | 'Sedang Dibalas Petugas'
  | 'Selesai';

export interface ChatSessionMessage {
  id: string;
  senderType: 'warga' | 'ai' | 'petugas' | 'system';
  senderName?: string;
  text: string;
  timestamp: string;
  responseTimeMs?: number;
  detectedIntent?: string;
  suggestedServiceId?: ServiceId;
  formCodes?: string[];
}

export interface ChatFeedback {
  isHelpful: boolean;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ChatSessionRecord {
  id: string;
  channel: ChatChannel;
  citizenAlias: string;
  topicLabel: string;
  status: ChatSessionStatus;
  assignedAgentName?: string;
  escalatedReason?: string;
  startedAt: string;
  updatedAt: string;
  closedAt?: string;
  messages: ChatSessionMessage[];
  feedback?: ChatFeedback;
}

export interface OfficialFormTemplate {
  code: string;
  title: string;
  serviceName: string;
  description: string;
  fields: string[];
  notes: string[];
}

export interface StaffAccountPublic {
  id: string;
  username: string;
  email: string;
  fullName: string;
  title: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export type AuditCategory =
  | 'AUTH'
  | 'VERIFIKASI_TIKET'
  | 'MASTER_DATA'
  | 'AKUN_PETUGAS'
  | 'LAPORAN'
  | 'LIVE_CHAT';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorUsername: string;
  actorName: string;
  actorRole: UserRole | 'SYSTEM';
  category: AuditCategory;
  action: string;
  target: string;
  detail: string;
}

export interface ServiceCatalogItem {
  id: ServiceId;
  name: string;
  shortName: string;
  sla: string;
  fee: string;
  description: string;
  requiredDocs: string[];
  commonPitfall: string;
  processSteps?: string[];
  formCode?: string;
}

export interface OperatingHoursConfig {
  seninKamis: string;
  jumat: string;
  istirahat: string;
  lokasi: string;
  catatanLayanan: string;
  updatedAt: string;
}

export interface KnowledgeBaseState {
  operatingHours: OperatingHoursConfig;
  services: ServiceCatalogItem[];
}

export interface ImageQualityCheckItem {
  docName: string;
  docType: string;
  qualityStatus: 'JELAS' | 'PERLU_PERBAIKAN';
  note: string;
}

export interface DocumentMatrixRow {
  field: string;
  kkValue: string;
  aktaValue: string;
  nikahValue: string;
  ijazahValue: string;
  pengantarValue: string;
  status: 'COCOK' | 'PERBEDAAN_MINOR' | 'TIDAK_COCOK';
  impactAndFix: string;
}

export interface ConsistencyCheckItem {
  field: string;
  valueDocA: string;
  valueDocB: string;
  status: 'COCOK' | 'PERBEDAAN_MINOR' | 'TIDAK_COCOK';
  note: string;
}

export interface ChecklistItem {
  item: string;
  required: boolean;
  status: 'TERPENUHI' | 'PERLU_CEK' | 'BELUM_ADA';
  note: string;
}

export interface PreValidationTicket {
  id: string;
  createdAt: string;
  expiresAt?: string;
  citizenName: string;
  nik: string;
  village: string;
  serviceId: ServiceId;
  serviceName: string;
  overallStatus: ValidationLevel;
  officerStatus: OfficerTicketStatus;
  summary: string;
  documentCount: number;
  uploadedDocNames: string[];
  imageQualityChecks?: ImageQualityCheckItem[];
  documentMatrix?: DocumentMatrixRow[];
  consistencyChecks: ConsistencyCheckItem[];
  checklist: ChecklistItem[];
  recommendations: string[];
  commonIssueCategory: string;
  officerNotes: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export type FaqCategory =
  | 'KTP-el'
  | 'Kartu Keluarga'
  | 'KIA Anak'
  | 'Akta Sipil'
  | 'Pindah Datang'
  | 'Jam Layanan & Umum';

export interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
  serviceTag: string;
  updatedAt: string;
  isActive: boolean;
}

export interface UploadedDocumentInput {
  id: string;
  slotKey?: string;
  name: string;
  docType: string;
  mimeType: string;
  base64Data?: string;
  previewUrl?: string;
  simulatedText?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'officer' | 'system';
  senderName?: string;
  content: string;
  timestamp: string;
  responseTimeMs?: number;
  suggestedServiceId?: ServiceId;
  formCodes?: string[];
}

export interface PeakHourSlot {
  slot: string;
  count: number;
  percentage: number;
  isAfterHours: boolean;
}

export interface DashboardStats {
  totalTickets: number;
  lengkapCount: number;
  minorCount: number;
  tidakLengkapCount: number;
  verifiedCount: number;
  aiQuestionsAnswered: number;
  docsCheckedToday: number;
  prevalidationsToday: number;
  passRatePercent: number;
  identityMismatchCount: number;
  channelBreakdown: {
    whatsapp: number;
    instagram: number;
    web: number;
  };
  aiResolutionRatePercent: number;
  avgResponseTimeSec: number;
  activeEscalationCount: number;
  escalationRatePercent: number;
  csatScore: number;
  csatPositivePercent: number;
  totalFeedbackCount: number;
  peakHours: PeakHourSlot[];
  spikeAlerts: Array<{
    serviceName: string;
    growthPercent: number;
    reason: string;
  }>;
  negativeFeedbackSessions: Array<{
    sessionId: string;
    channel: ChatChannel;
    citizenAlias: string;
    comment: string;
    createdAt: string;
  }>;
  topAskedServices: Array<{ serviceName: string; count: number; percentage: number }>;
  serviceBreakdown: Array<{ serviceId: ServiceId; serviceName: string; count: number; issueCount: number }>;
  issueTrends: Array<{ category: string; count: number; percentage: number }>;
  villageBreakdown: Array<{ village: string; total: number; issues: number }>;
}

export interface ManagementBrief {
  periodLabel: string;
  executiveSummary: string;
  kpiHighlights: string[];
  topicDistributionInsight: string;
  peakHourInsight: string;
  escalationAndDocGapInsight: string;
  actionRecommendations: string[];
}

export interface GlobalMonthlyReport {
  periodLabel: string;
  generatedAt: string;
  generatedBy: string;
  summaryMetrics: {
    totalConsultationsAi: number;
    totalPreValidations: number;
    totalDocsVerified: number;
    passRatePercent: number;
    mismatchCasesPrevented: number;
    verifiedAtCounter: number;
    aiResolutionRatePercent: number;
    csatScore: number;
  };
  serviceUtilization: Array<{
    serviceName: string;
    consultations: number;
    preValidations: number;
    utilizationPercent: number;
  }>;
  topDocumentErrors: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  villageSummary: Array<{
    village: string;
    total: number;
    issues: number;
  }>;
}
