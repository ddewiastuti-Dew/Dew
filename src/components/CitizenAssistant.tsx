import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  Headset,
  Loader2,
  MapPin,
  Mic,
  MicOff,
  Send,
  ShieldAlert,
  Star,
  ThumbsDown,
  ThumbsUp,
  UserCheck,
} from 'lucide-react';
import { PRAMBON_SERVICES } from '../data/prambonCatalog.ts';
import type {
  ChatChannel,
  ChatMessage,
  ChatSessionRecord,
  KnowledgeBaseState,
  ServiceId,
} from '../types.ts';
import FormDownloadModal from './FormDownloadModal.tsx';

interface CitizenAssistantProps {
  onJumpToPreValidation: (serviceId?: ServiceId) => void;
  knowledgeBase?: KnowledgeBaseState;
}

const QUICK_REPLIES = [
  {
    label: 'Syarat KTP Baru',
    question:
      'Apa saja syarat, alur, dan estimasi waktu pembuatan KTP-el baru (pemula usia 17 tahun maupun cetak ulang) di Kecamatan Prambon?',
    actionType: 'chat' as const,
  },
  {
    label: 'Bikin KIA Anak',
    question:
      'Apa syarat dan perbedaan pembuatan KIA (Kartu Identitas Anak) untuk anak usia 0-5 tahun dan usia 5-17 tahun di Kecamatan Prambon?',
    actionType: 'chat' as const,
  },
  {
    label: 'Pecah KK',
    question:
      'Bagaimana alur, syarat dokumen, dan estimasi waktu mengurus pecah Kartu Keluarga (KK) baru di Kecamatan Prambon?',
    actionType: 'chat' as const,
  },
  {
    label: 'Akta & Surat Pindah',
    question:
      'Apa saja persyaratan Akta Kelahiran dan Surat Pindah (SKPWNI) serta formulir yang diperlukan di Kecamatan Prambon?',
    actionType: 'chat' as const,
  },
  {
    label: 'Jam Buka & Lokasi',
    question:
      'Jam buka pelayanan loket Adminduk Kecamatan Prambon, jam istirahat, tarif layanan, dan alamat lengkap kantor kecamatan di mana?',
    actionType: 'chat' as const,
  },
  {
    label: 'Unduh Formulir Resmi',
    question: '',
    actionType: 'forms' as const,
  },
  {
    label: 'Takon Basa Jawa',
    question:
      'Nuwun sewu Pak/Bu petugas, kulo ajeng tanglet syaratipun ngurus pecah KK lan damel KIA anak teng Kecamatan Prambon niku nopo mawon nggih? Jadwale buka jam pinten?',
    actionType: 'chat' as const,
  },
  {
    label: 'Cek Kelengkapan Berkas',
    question: '',
    actionType: 'precheck' as const,
  },
];

const CHANNELS: Array<{ id: ChatChannel; label: string }> = [
  { id: 'Web Portal', label: 'Web Portal' },
  { id: 'WhatsApp', label: 'WhatsApp' },
  { id: 'Instagram DM', label: 'Instagram DM' },
];

function renderFormattedReply(text: string) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;
        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
        const clean = isBullet ? trimmed.slice(2) : trimmed;
        const parts = clean.split(/(\*\*.*?\*\*)/g);
        const formatted = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} className="font-semibold text-slate-950">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <span key={pIdx}>{part}</span>;
        });

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0D9488]" />
              <span>{formatted}</span>
            </div>
          );
        }
        return <p key={idx}>{formatted}</p>;
      })}
    </div>
  );
}

function mapSessionMessages(session: ChatSessionRecord): ChatMessage[] {
  return session.messages.map((m) => ({
    id: m.id,
    role:
      m.senderType === 'warga'
        ? 'user'
        : m.senderType === 'petugas'
          ? 'officer'
          : m.senderType === 'system'
            ? 'system'
            : 'assistant',
    senderName: m.senderName,
    content: m.text,
    timestamp: m.timestamp,
    responseTimeMs: m.responseTimeMs,
    suggestedServiceId: m.suggestedServiceId,
    formCodes: m.formCodes,
  }));
}

export default function CitizenAssistant({
  onJumpToPreValidation,
  knowledgeBase,
}: CitizenAssistantProps) {
  const welcomeMessage: ChatMessage = {
    id: 'welcome-1',
    role: 'assistant',
    senderName: 'Asisten AI SIAP Prambon',
    content:
      'Sugeng rawuh / Selamat datang di **Asisten Virtual SIAP Prambon** (Kecamatan Prambon, Kabupaten Sidoarjo).\n\nAnda dapat bertanya lewat **teks maupun pesan suara (Bahasa Indonesia & Bahasa Jawa)** mengenai persyaratan, alur, unduh formulir resmi (`F-1.01`, `F-1.02`, `F-1.03`, `F-1.06`, `F-2.01`), jam layanan, dan lokasi Kantor Kecamatan.\n\nJika butuh konfirmasi kasus khusus, Anda juga bisa menekan **Hubungi Petugas Loket**.',
    timestamp: new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  const [channel, setChannel] = useState<ChatChannel>('Web Portal');
  const [citizenAlias, setCitizenAlias] = useState('');
  const [session, setSession] = useState<ChatSessionRecord | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Form modal state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formModalCode, setFormModalCode] = useState<string | undefined>(undefined);

  // Escalation & Feedback state
  const [escalating, setEscalating] = useState(false);
  const [csatHelpful, setCsatHelpful] = useState<boolean | null>(null);
  const [csatRating, setCsatRating] = useState<number>(5);
  const [csatComment, setCsatComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const containsNikWarning = /\b\d{16}\b/.test(input);
  const hours = knowledgeBase?.operatingHours;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Poll session for live officer replies when escalated
  const refreshSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${encodeURIComponent(sessionId)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.session) {
        const nextSession = data.session as ChatSessionRecord;
        setSession(nextSession);
        setMessages((prev) => [prev[0], ...mapSessionMessages(nextSession)]);
      }
    } catch {
      // ignore background poll errors
    }
  }, []);

  useEffect(() => {
    if (
      !session ||
      (session.status !== 'Menunggu Petugas' &&
        session.status !== 'Sedang Dibalas Petugas')
    ) {
      return;
    }
    const timer = setInterval(() => {
      refreshSession(session.id);
    }, 3000);
    return () => clearInterval(timer);
  }, [session, refreshSession]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    const optimisticUser: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      senderName: citizenAlias.trim() || `Warga (${channel})`,
      content: trimmed,
      timestamp: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    const nextMessages = [...messages, optimisticUser];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          sessionId: session?.id,
          channel,
          citizenAlias: citizenAlias.trim() || undefined,
          history: nextMessages
            .slice(1)
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content,
            })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal mendapatkan jawaban Asisten Virtual.');
      }

      if (data.session) {
        const updatedSession = data.session as ChatSessionRecord;
        setSession(updatedSession);
        setMessages((prev) => [prev[0], ...mapSessionMessages(updatedSession)]);
      } else {
        const assistantMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          senderName: 'Asisten AI SIAP Prambon',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          responseTimeMs: data.responseTimeMs,
          suggestedServiceId: data.suggestedServiceId,
          formCodes: data.formCodes,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleToggleVoice = async () => {
    setErrorMsg(null);
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setErrorMsg('Browser ini tidak mendukung perekaman suara mikrofon.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 200) return;

        setTranscribing(true);
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const res = reader.result as string;
              const idx = res.indexOf(',');
              resolve(idx >= 0 ? res.slice(idx + 1) : res);
            };
            reader.onerror = () => reject(new Error('Gagal membaca rekaman audio.'));
            reader.readAsDataURL(blob);
          });

          const res = await fetch('/api/chat/voice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64: base64, mimeType }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Gagal menyalin pesan suara.');
          }
          if (data.transcript) {
            setInput((prev) => (prev ? `${prev} ${data.transcript}` : data.transcript));
          }
        } catch (err) {
          setErrorMsg(
            err instanceof Error ? err.message : 'Gagal menyalin pesan suara.'
          );
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      setErrorMsg(
        'Izin mikrofon ditolak atau tidak tersedia. Aktifkan izin mikrofon di browser untuk pesan suara.'
      );
    }
  };

  const handleEscalate = async () => {
    if (!session || escalating) return;
    setEscalating(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/chat/sessions/${encodeURIComponent(session.id)}/escalate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason: 'Warga meminta bantuan langsung Petugas Loket Kecamatan Prambon.',
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengalihkan ke petugas.');
      const nextSession = data.session as ChatSessionRecord;
      setSession(nextSession);
      setMessages((prev) => [prev[0], ...mapSessionMessages(nextSession)]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menghubungi petugas.');
    } finally {
      setEscalating(false);
    }
  };

  const handleSubmitFeedback = async (e: FormEvent) => {
    e.preventDefault();
    if (!session || csatHelpful === null || submittingFeedback) return;
    setSubmittingFeedback(true);
    try {
      const res = await fetch(
        `/api/chat/sessions/${encodeURIComponent(session.id)}/feedback`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isHelpful: csatHelpful,
            rating: csatRating,
            comment: csatComment.trim(),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim penilaian.');
      setSession(data.session);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const openFormModal = (code?: string) => {
    setFormModalCode(code);
    setFormModalOpen(true);
  };

  const canEscalate =
    Boolean(session) &&
    session?.status !== 'Menunggu Petugas' &&
    session?.status !== 'Sedang Dibalas Petugas' &&
    session?.status !== 'Selesai';

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Column: Omnichannel Context, Quick Topics, & Office Info */}
      <aside className="space-y-4 lg:col-span-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            {!avatarFailed ? (
              <img
                src="/src/assets/images/prambon_officer_avatar_1794887750508.jpg"
                alt="Petugas Virtual SIAP Prambon"
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
                className="h-12 w-12 rounded-lg object-cover border border-slate-200"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1E3A8A] text-white">
                <UserCheck className="h-6 w-6" />
              </div>
            )}
            <div>
              <h2 className="text-sm font-bold text-slate-900">Asisten Adminduk Prambon</h2>
              <p className="text-xs text-[#0D9488] font-medium">
                Teks &amp; Suara (Indonesia &amp; Basa Jawa)
              </p>
            </div>
          </div>

          {/* Omnichannel Selector */}
          <div className="mt-4 border-t border-slate-100 pt-3.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Simulasi Kanal Omnichannel
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
              {CHANNELS.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setChannel(ch.id)}
                  className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                    channel === ch.id
                      ? 'bg-[#1E3A8A] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={citizenAlias}
              onChange={(e) => setCitizenAlias(e.target.value)}
              placeholder="Nama/Akun Anda (opsional, mis. Bu Siti - Bulang)"
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0D9488] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Quick Topics */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pilihan Pertanyaan &amp; Aksi Cepat
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {QUICK_REPLIES.map((item) =>
              item.actionType === 'precheck' ? (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onJumpToPreValidation()}
                  className="flex items-center justify-between rounded-lg border border-[#0D9488] bg-teal-50/70 px-3.5 py-2 text-left text-xs font-semibold text-[#0D9488] hover:bg-teal-100/70 transition-colors"
                >
                  <span>{item.label}</span>
                  <FileCheck2 className="h-3.5 w-3.5 shrink-0" />
                </button>
              ) : item.actionType === 'forms' ? (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => openFormModal()}
                  className="flex items-center justify-between rounded-lg border border-[#1E3A8A]/40 bg-blue-50/60 px-3.5 py-2 text-left text-xs font-semibold text-[#1E3A8A] hover:bg-blue-100/60 transition-colors"
                >
                  <span>{item.label}</span>
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                </button>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  disabled={loading}
                  onClick={() => sendMessage(item.question)}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-left text-xs font-medium text-slate-800 hover:border-[#0D9488] hover:bg-teal-50/60 hover:text-[#1E3A8A] transition-colors disabled:opacity-50"
                >
                  {item.label}
                </button>
              )
            )}
          </div>
        </div>

        {/* Kantor Kecamatan Quick Info */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0D9488]" />
            <div>
              <div className="font-bold text-slate-900">
                Kantor Kecamatan Prambon
              </div>
              <div>
                {hours?.lokasi ??
                  'Jl. Raya Prambon No. 12, Kec. Prambon, Kab. Sidoarjo'}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Sen–Kam {hours?.seninKamis ?? '08.00–15.00 WIB'} · Jumat{' '}
                {hours?.jumat ?? '08.00–14.30 WIB'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Column: Chat Interface */}
      <section className="flex h-[680px] flex-col rounded-xl border border-slate-200 bg-white lg:col-span-8">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Asisten Tanya Jawab Adminduk ({channel})
              </h3>
              {session && (
                <span
                  className={`rounded border px-2 py-0.5 text-[10px] font-bold ${
                    session.status === 'Menunggu Petugas'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : session.status === 'Sedang Dibalas Petugas'
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : session.status === 'Selesai'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-blue-200 bg-blue-50 text-[#1E3A8A]'
                  }`}
                >
                  {session.status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Dukung Bahasa Indonesia &amp; Jawa · Contoh: &quot;Piye syarat gawe KIA anak umur 6 tahun?&quot;
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEscalate && (
              <button
                type="button"
                disabled={escalating}
                onClick={handleEscalate}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50 whitespace-nowrap"
              >
                <Headset className="h-3.5 w-3.5" />
                <span>
                  {escalating ? 'Mengalihkan...' : 'Hubungi Petugas Loket'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => openFormModal()}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#1E3A8A] hover:text-[#1E3A8A] whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Formulir</span>
            </button>
          </div>
        </div>

        {/* Message List */}
        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/50 p-5">
          {messages.map((msg) => {
            if (msg.role === 'system') {
              return (
                <div key={msg.id} className="text-center">
                  <span className="inline-block rounded-md border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-500">
                    {msg.content} · {msg.timestamp}
                  </span>
                </div>
              );
            }

            const isUser = msg.role === 'user';
            const isOfficer = msg.role === 'officer';
            const suggestedSvc = msg.suggestedServiceId
              ? (knowledgeBase?.services ?? PRAMBON_SERVICES).find(
                  (s) => s.id === msg.suggestedServiceId
                )
              : undefined;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-xl px-4 py-3 ${
                    isUser
                      ? 'bg-[#1E3A8A] text-white'
                      : isOfficer
                        ? 'border border-teal-300 bg-teal-50/80 text-slate-900'
                        : 'border border-slate-200 bg-white text-slate-800'
                  }`}
                >
                  {isOfficer && (
                    <div className="mb-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#0D9488]">
                      <Headset className="h-3.5 w-3.5" />
                      <span>{msg.senderName || 'Petugas Loket Kecamatan Prambon'}</span>
                    </div>
                  )}

                  {isUser ? (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  ) : (
                    renderFormattedReply(msg.content)
                  )}

                  {/* Clickable Form Downloads & Service Pre-Check CTA */}
                  {!isUser &&
                    ((msg.formCodes && msg.formCodes.length > 0) || suggestedSvc) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
                        {msg.formCodes?.map((code) => (
                          <button
                            key={code}
                            type="button"
                            onClick={() => openFormModal(code)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1E3A8A]/30 bg-blue-50/70 px-3 py-1.5 text-xs font-semibold text-[#1E3A8A] hover:bg-blue-100/70 transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Unduh Formulir {code}</span>
                          </button>
                        ))}

                        {suggestedSvc && (
                          <button
                            type="button"
                            onClick={() => onJumpToPreValidation(suggestedSvc.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D9488] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0b7c72] transition-colors"
                          >
                            <span>Cek Berkas {suggestedSvc.shortName}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                </div>

                <span className="font-mono-tabular mt-1 px-1 text-[11px] text-slate-400">
                  {isUser
                    ? citizenAlias.trim() || `Warga (${channel})`
                    : isOfficer
                      ? msg.senderName || 'Petugas Loket'
                      : 'Asisten SIAP Prambon'}{' '}
                  · {msg.timestamp}
                  {msg.responseTimeMs
                    ? ` · ${(msg.responseTimeMs / 1000).toFixed(1)}s`
                    : ''}
                </span>
              </div>
            );
          })}

          {session &&
            (session.status === 'Menunggu Petugas' ||
              session.status === 'Sedang Dibalas Petugas') && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-900">
                <strong>Mode Handover Aktif:</strong> Percakapan Anda berada di antrean Petugas Loket Kecamatan Prambon ({session.id}). Balasan petugas akan muncul otomatis di layar ini.
              </div>
            )}

          {loading && (
            <div className="flex items-start">
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin text-[#0D9488]" />
                <span>Sedang menyiapkan jawaban berdasarkan pedoman Adminduk Prambon...</span>
              </div>
            </div>
          )}

          {/* Inline CSAT Survey once citizen has an active session */}
          {session && !session.feedback && (
            <form
              onSubmit={handleSubmitFeedback}
              className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Apakah penjelasan ini membantu Anda?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCsatHelpful(true);
                      if (csatRating < 4) setCsatRating(5);
                    }}
                    className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-semibold transition-colors ${
                      csatHelpful === true
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-emerald-50/50'
                    }`}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    <span>Ya, Terbantu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCsatHelpful(false);
                      setCsatRating(2);
                    }}
                    className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1 text-xs font-semibold transition-colors ${
                      csatHelpful === false
                        ? 'border-red-400 bg-red-50 text-red-700'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-red-50/50'
                    }`}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    <span>Belum Terbantu</span>
                  </button>
                </div>
              </div>

              {csatHelpful !== null && (
                <div className="space-y-2 border-t border-slate-100 pt-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span>Rating layanan:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setCsatRating(star)}
                        className="p-0.5"
                        aria-label={`Beri bintang ${star}`}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            star <= csatRating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={csatComment}
                      onChange={(e) => setCsatComment(e.target.value)}
                      placeholder="Saran atau komentar singkat (opsional)..."
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-[#1E3A8A] focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={submittingFeedback}
                      className="rounded-lg bg-[#0D9488] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0b7c72] disabled:opacity-50"
                    >
                      {submittingFeedback ? 'Menyimpan...' : 'Kirim Penilaian'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}

          {session?.feedback && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Terima kasih atas penilaian Anda ({session.feedback.rating}/5 bintang). Masukan warga membantu peningkatan mutu layanan Kecamatan Prambon.
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-800">
              {errorMsg}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Footer + Data Minimization Guard + Voice Note */}
        <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5 text-[#0D9488]" />
              <span>
                Demi privasi UU PDP, jangan kirim 16 digit NIK/KK di chat umum; gunakan Pra-Validasi Berkas.
              </span>
            </span>
            {transcribing && (
              <span className="inline-flex items-center gap-1 font-semibold text-[#0D9488]">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Menyalin suara...</span>
              </span>
            )}
          </div>

          {containsNikWarning && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-900">
              Terdeteksi 16 digit angka menyerupai NIK/Nomor KK. Demi keamanan data pribadi, mohon hapus angka tersebut sebelum mengirim pertanyaan.
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleVoice}
              disabled={loading || transcribing}
              title={
                isRecording
                  ? 'Hentikan rekaman suara'
                  : 'Rekam pertanyaan suara (Indonesia/Jawa)'
              }
              className={`inline-flex items-center justify-center rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors shrink-0 ${
                isRecording
                  ? 'border-red-400 bg-red-50 text-red-700 animate-pulse'
                  : 'border-slate-300 bg-slate-50 text-slate-700 hover:border-[#0D9488] hover:text-[#0D9488]'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="h-4 w-4 mr-1" />
                  <span>Stop</span>
                </>
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isRecording
                  ? 'Sedang merekam suara Anda...'
                  : 'Ketik pertanyaan Bahasa Indonesia / Jawa, atau rekam suara...'
              }
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/15"
            />
            <button
              type="submit"
              disabled={loading || transcribing || !input.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E3A8A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#172e6e] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
            >
              <Send className="h-4 w-4" />
              <span>Kirim</span>
            </button>
          </div>
        </form>
      </section>

      <FormDownloadModal
        isOpen={formModalOpen}
        initialCode={formModalCode}
        onClose={() => setFormModalOpen(false)}
      />
    </div>
  );
}
