import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  Clock,
  Headset,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Star,
} from 'lucide-react';
import type { ChatSessionRecord, ChatSessionStatus } from '../types.ts';

interface LiveChatEscalationPanelProps {
  authToken: string;
  onAuditUpdated: () => void;
}

const SOP_SNIPPETS = [
  {
    label: 'Jam Layanan & Gratis Rp 0',
    text: 'Selamat pagi/siang Bapak/Ibu. Loket Adminduk Kecamatan Prambon buka Senin–Kamis pukul 08.00–15.00 WIB dan Jumat 08.00–14.30 WIB (istirahat 12.00–13.00 WIB). Seluruh layanan GRATIS Rp 0.',
  },
  {
    label: 'Bawa Berkas Asli & Tiket QR',
    text: 'Silakan bawa dokumen asli (KK, Akta Kelahiran/Ijazah, Buku Nikah, dan Pengantar Desa) beserta kode Tiket Pra-Validasi SIAP Prambon ke loket agar langsung diverifikasi petugas tanpa antre ulang.',
  },
  {
    label: 'Panduan Pembetulan Data (F-1.06)',
    text: 'Karena terdapat perbedaan ejaan nama/TTL antar-dokumen, silakan isi Formulir F-1.02 dan Surat Pernyataan Perubahan Elemen Data (F-1.06) dengan membawa Akta Kelahiran atau Ijazah asli sebagai rujukan utama.',
  },
];

function getStatusColorClass(status: ChatSessionStatus): string {
  switch (status) {
    case 'Menunggu Petugas':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'Sedang Dibalas Petugas':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'Ditangani AI':
      return 'border-blue-200 bg-blue-50 text-[#1E3A8A]';
    case 'Selesai':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
}

export default function LiveChatEscalationPanel({
  authToken,
  onAuditUpdated,
}: LiveChatEscalationPanelProps) {
  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | ChatSessionStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSessions = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await fetch('/api/officer/chats', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal memuat antrean live chat.');
        const list = Array.isArray(data.sessions)
          ? (data.sessions as ChatSessionRecord[])
          : [];
        setSessions(list);
        setSelectedId((prev) => {
          if (prev && list.some((s) => s.id === prev)) return prev;
          const firstEscalated = list.find(
            (s) => s.status === 'Menunggu Petugas' || s.status === 'Sedang Dibalas Petugas'
          );
          return firstEscalated?.id ?? list[0]?.id ?? null;
        });
      } catch (err) {
        if (!silent) {
          setErrorMsg(
            err instanceof Error ? err.message : 'Gagal terhubung ke server.'
          );
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [authToken]
  );

  useEffect(() => {
    fetchSessions();
    const timer = setInterval(() => {
      fetchSessions(true);
    }, 8000);
    return () => clearInterval(timer);
  }, [fetchSessions]);

  const filteredSessions = sessions.filter((s) => {
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const q = searchTerm.trim().toLowerCase();
    const matchSearch =
      !q ||
      s.citizenAlias.toLowerCase().includes(q) ||
      s.topicLabel.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.channel.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const selectedSession =
    sessions.find((s) => s.id === selectedId) ?? filteredSessions[0] ?? null;

  const waitingCount = sessions.filter((s) => s.status === 'Menunggu Petugas').length;
  const activeCount = sessions.filter(
    (s) => s.status === 'Sedang Dibalas Petugas'
  ).length;

  const handleSendReply = async (closeSession: boolean) => {
    if (!selectedSession || !replyText.trim() || sending) return;
    setSending(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/officer/chats/${encodeURIComponent(selectedSession.id)}/reply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            text: replyText.trim(),
            closeSession,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim balasan.');
      setReplyText('');
      await fetchSessions(true);
      onAuditUpdated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengirim balasan.');
    } finally {
      setSending(false);
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSendReply(false);
  };

  const handleStatusChange = async (nextStatus: ChatSessionStatus) => {
    if (!selectedSession) return;
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/officer/chats/${encodeURIComponent(selectedSession.id)}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah status sesi.');
      await fetchSessions(true);
      onAuditUpdated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengubah status.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Status Strip */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1E3A8A] text-white">
            <Headset className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Kotak Masuk Eskalasi Omnichannel (WhatsApp · Instagram DM · Web Portal)
            </h2>
            <p className="text-xs text-slate-500">
              Ambil alih sesi yang membutuhkan klarifikasi khusus petugas loket dan tandai selesai setelah warga terbantu.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono-tabular rounded-md border border-red-200 bg-red-50 px-2.5 py-1 font-semibold text-red-700">
            {waitingCount} Menunggu Petugas
          </span>
          <span className="font-mono-tabular rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">
            {activeCount} Sedang Dibalas
          </span>
          <button
            type="button"
            onClick={() => fetchSessions(false)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Main Split Inbox */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Session Queue List */}
        <section className="flex h-[620px] flex-col rounded-xl border border-slate-200 bg-white lg:col-span-5">
          <div className="space-y-2.5 border-b border-slate-200 p-3.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari warga, topik, kode sesi, atau kanal..."
                className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-xs text-slate-900 focus:border-[#1E3A8A] focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  'ALL',
                  'Menunggu Petugas',
                  'Sedang Dibalas Petugas',
                  'Ditangani AI',
                  'Selesai',
                ] as const
              ).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    statusFilter === st
                      ? 'bg-[#1E3A8A] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'Semua' : st}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Memuat daftar sesi warga...
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Tidak ada sesi percakapan pada filter ini.
              </div>
            ) : (
              filteredSessions.map((sess) => {
                const isSelected = selectedSession?.id === sess.id;
                const lastMsg = sess.messages[sess.messages.length - 1];
                return (
                  <button
                    key={sess.id}
                    type="button"
                    onClick={() => setSelectedId(sess.id)}
                    className={`w-full p-3.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-blue-50/70 border-l-4 border-l-[#1E3A8A]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-tabular text-[11px] font-bold text-[#0D9488]">
                        {sess.channel} · {sess.id}
                      </span>
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${getStatusColorClass(
                          sess.status
                        )}`}
                      >
                        {sess.status}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-xs font-bold text-slate-900">
                      {sess.citizenAlias}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] font-semibold text-slate-700">
                      Topik: {sess.topicLabel}
                    </div>
                    {lastMsg && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                        {lastMsg.text}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-mono-tabular">
                        {new Date(sess.updatedAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        WIB
                      </span>
                      {sess.feedback && (
                        <span
                          className={`inline-flex items-center gap-0.5 font-semibold ${
                            sess.feedback.isHelpful ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          <Star className="h-3 w-3 fill-current" />
                          {sess.feedback.rating}/5
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Active Conversation Thread */}
        <section className="flex h-[620px] flex-col rounded-xl border border-slate-200 bg-white lg:col-span-7">
          {selectedSession ? (
            <>
              {/* Thread Header */}
              <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono-tabular text-xs font-bold text-[#1E3A8A]">
                      {selectedSession.id}
                    </span>
                    <span className="text-xs font-semibold text-[#0D9488]">
                      {selectedSession.channel}
                    </span>
                    <span
                      className={`rounded border px-2 py-0.5 text-[10px] font-bold ${getStatusColorClass(
                        selectedSession.status
                      )}`}
                    >
                      {selectedSession.status}
                    </span>
                  </div>
                  <h3 className="mt-0.5 truncate text-sm font-bold text-slate-900">
                    {selectedSession.citizenAlias} — {selectedSession.topicLabel}
                  </h3>
                  {selectedSession.escalatedReason && (
                    <p className="mt-0.5 text-[11px] text-red-700">
                      Alasan Eskalasi: {selectedSession.escalatedReason}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {selectedSession.status !== 'Selesai' ? (
                    <button
                      type="button"
                      onClick={() => handleStatusChange('Selesai')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 whitespace-nowrap"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Tandai Selesai</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStatusChange('Sedang Dibalas Petugas')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>Buka Kembali</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4">
                {selectedSession.messages.map((msg) => {
                  if (msg.senderType === 'system') {
                    return (
                      <div key={msg.id} className="text-center">
                        <span className="inline-block rounded-md border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-500">
                          {msg.text} · {msg.timestamp}
                        </span>
                      </div>
                    );
                  }
                  const isOfficer = msg.senderType === 'petugas';
                  const isCitizen = msg.senderType === 'warga';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isOfficer ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          isOfficer
                            ? 'bg-[#0D9488] text-white'
                            : isCitizen
                              ? 'border border-blue-200 bg-blue-50/70 text-slate-900'
                              : 'border border-slate-200 bg-white text-slate-800'
                        }`}
                      >
                        <div
                          className={`mb-1 text-[10px] font-bold ${
                            isOfficer
                              ? 'text-teal-100'
                              : isCitizen
                                ? 'text-[#1E3A8A]'
                                : 'text-[#0D9488]'
                          }`}
                        >
                          {msg.senderName ||
                            (isOfficer
                              ? 'Petugas Loket'
                              : isCitizen
                                ? 'Warga'
                                : 'Asisten AI')}
                        </div>
                        <p className="whitespace-pre-line">{msg.text}</p>
                      </div>
                      <span className="font-mono-tabular mt-1 px-1 text-[10px] text-slate-400">
                        {msg.timestamp}
                        {msg.responseTimeMs
                          ? ` · ${(msg.responseTimeMs / 1000).toFixed(1)}s`
                          : ''}
                      </span>
                    </div>
                  );
                })}

                {selectedSession.feedback && (
                  <div
                    className={`rounded-lg border p-3 text-xs ${
                      selectedSession.feedback.isHelpful
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-red-200 bg-red-50 text-red-900'
                    }`}
                  >
                    <div className="font-bold">
                      Feedback Warga ({selectedSession.feedback.rating}/5 ·{' '}
                      {selectedSession.feedback.isHelpful
                        ? 'Terbantu'
                        : 'Belum Terbantu'}
                      )
                    </div>
                    {selectedSession.feedback.comment && (
                      <p className="mt-1">{selectedSession.feedback.comment}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Officer Reply Composer */}
              <form
                onSubmit={handleFormSubmit}
                className="border-t border-slate-200 bg-white p-3.5 space-y-2.5"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Template SOP:
                  </span>
                  {SOP_SNIPPETS.map((snip) => (
                    <button
                      key={snip.label}
                      type="button"
                      onClick={() => setReplyText(snip.text)}
                      className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-[#0D9488] hover:text-[#1E3A8A]"
                    >
                      {snip.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Ketik balasan resmi petugas loket untuk dikirim ke warga..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A8A] focus:outline-none"
                />

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E3A8A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#172e6e] disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    <span>Kirim Balasan</span>
                  </button>
                  <button
                    type="button"
                    disabled={sending || !replyText.trim()}
                    onClick={() => handleSendReply(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D9488] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0b7c72] disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Kirim &amp; Tandai Selesai</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-500">
              <MessageSquare className="h-8 w-8 text-slate-300" />
              <div className="mt-2 text-xs font-semibold">
                Pilih sesi percakapan warga di sebelah kiri untuk merespons.
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
