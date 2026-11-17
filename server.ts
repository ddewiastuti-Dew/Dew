import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  requireAuth,
  requireSuperAdmin,
  signSessionToken,
  type AuthenticatedRequest,
} from './server/auth.ts';
import {
  appendAuditLog,
  authenticateStaff,
  buildGlobalMonthlyReport,
  computeStats,
  createFaq,
  createServiceKnowledge,
  createStaffAccount,
  createTicket,
  deleteFaq,
  escalateChatSession,
  getChatSessionById,
  getKnowledgeBase,
  getStaffById,
  getTicketById,
  listAuditLogs,
  listChatSessions,
  listFaqs,
  listStaffAccounts,
  listTickets,
  replyToChatSession,
  submitChatFeedback,
  updateChatSessionStatus,
  updateFaq,
  updateOperatingHours,
  updateServiceKnowledge,
  updateStaffAccount,
  updateTicket,
  upsertChatTurn,
} from './server/store.ts';
import {
  runManagementBrief,
  runOfficerInsights,
  runPreValidation,
  runVirtualAssistantChat,
  transcribeVoiceNote,
  type ChatTurnInput,
  type PreValidateRequestInput,
} from './server/gemini.ts';
import { OFFICIAL_FORMS } from './src/data/prambonCatalog.ts';
import type {
  ChatChannel,
  ChatSessionStatus,
  OfficerTicketStatus,
  ServiceId,
  UserRole,
} from './src/types.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'SIAP Prambon' });
  });

  // --- Authentication Routes ---
  app.post('/api/auth/login', (req, res) => {
    const { identifier, password } = req.body as {
      identifier?: string;
      password?: string;
    };
    if (!identifier || !password) {
      res.status(400).json({ error: 'Username/Email dan Password wajib diisi.' });
      return;
    }
    const result = authenticateStaff(identifier, password);
    if (!result.ok) {
      res.status(401).json({ error: result.error });
      return;
    }
    const token = signSessionToken(result.account);
    res.json({ token, account: result.account });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const account = req.user ? getStaffById(req.user.userId) : null;
    if (!account || !account.isActive) {
      res.status(401).json({ error: 'Akun tidak aktif atau sesi tidak valid.' });
      return;
    }
    res.json({ account });
  });

  app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res) => {
    if (req.user) {
      appendAuditLog({
        actorUsername: req.user.username,
        actorName: req.user.fullName,
        actorRole: req.user.role,
        category: 'AUTH',
        action: 'Logout Sistem',
        target: req.user.username,
        detail: 'Petugas keluar dari sesi dashboard.',
      });
    }
    res.json({ ok: true });
  });

  // --- Public Citizen & Shared Read Routes ---
  app.get('/api/tickets', (_req, res) => {
    res.json({ tickets: listTickets() });
  });

  app.get('/api/tickets/:id', (req, res) => {
    const ticket = getTicketById(req.params.id);
    if (!ticket) {
      res.status(404).json({ error: 'Tiket pra-validasi tidak ditemukan.' });
      return;
    }
    res.json({ ticket });
  });

  app.get('/api/stats', (_req, res) => {
    res.json({ stats: computeStats() });
  });

  app.get('/api/knowledge-base', (_req, res) => {
    res.json({ knowledgeBase: getKnowledgeBase() });
  });

  app.get('/api/faqs', (req, res) => {
    const activeOnly = req.query.active === 'true';
    res.json({ faqs: listFaqs(activeOnly) });
  });

  // --- Officer (Admin & Super Admin) Protected Routes ---
  app.patch('/api/tickets/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const { officerStatus, officerNotes } = req.body as {
      officerStatus?: OfficerTicketStatus;
      officerNotes?: string;
    };
    const updated = updateTicket(
      req.params.id,
      { officerStatus, officerNotes },
      req.user
        ? {
            username: req.user.username,
            fullName: req.user.fullName,
            role: req.user.role,
          }
        : undefined
    );
    if (!updated) {
      res.status(404).json({ error: 'Tiket tidak ditemukan.' });
      return;
    }
    res.json({ ticket: updated });
  });

  app.post('/api/faqs', requireAuth, (req: AuthenticatedRequest, res) => {
    const { category, question, answer, serviceTag, isActive } = req.body;
    if (!question || !answer) {
      res.status(400).json({ error: 'Pertanyaan dan jawaban FAQ wajib diisi.' });
      return;
    }
    const created = createFaq(
      {
        category: category || 'Jam Layanan & Umum',
        question: String(question).trim(),
        answer: String(answer).trim(),
        serviceTag: String(serviceTag || 'Umum').trim(),
        isActive: isActive !== false,
      },
      req.user
        ? {
            username: req.user.username,
            fullName: req.user.fullName,
            role: req.user.role,
          }
        : undefined
    );
    res.status(201).json({ faq: created });
  });

  app.patch('/api/faqs/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const updated = updateFaq(
      req.params.id,
      req.body,
      req.user
        ? {
            username: req.user.username,
            fullName: req.user.fullName,
            role: req.user.role,
          }
        : undefined
    );
    if (!updated) {
      res.status(404).json({ error: 'FAQ tidak ditemukan.' });
      return;
    }
    res.json({ faq: updated });
  });

  app.delete('/api/faqs/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const deleted = deleteFaq(
      req.params.id,
      req.user
        ? {
            username: req.user.username,
            fullName: req.user.fullName,
            role: req.user.role,
          }
        : undefined
    );
    if (!deleted) {
      res.status(404).json({ error: 'FAQ tidak ditemukan.' });
      return;
    }
    res.json({ ok: true });
  });

  app.post('/api/insights', requireAuth, async (_req, res) => {
    try {
      const stats = computeStats();
      const insights = await runOfficerInsights(stats);
      res.json({ insights });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat ringkasan tren AI.';
      console.error('Error /api/insights:', err);
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/insights/brief', requireAuth, async (_req, res) => {
    try {
      const stats = computeStats();
      const brief = await runManagementBrief(stats);
      res.json({ brief });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyusun Management Brief AI.';
      console.error('Error /api/insights/brief:', err);
      res.status(500).json({ error: msg });
    }
  });

  // --- Officer Live Chat Escalation (Human Handover) ---
  app.get('/api/officer/chats', requireAuth, (_req, res) => {
    res.json({ sessions: listChatSessions() });
  });

  app.post('/api/officer/chats/:id/reply', requireAuth, (req: AuthenticatedRequest, res) => {
    const { text, closeSession } = req.body as { text?: string; closeSession?: boolean };
    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Isi balasan petugas tidak boleh kosong.' });
      return;
    }
    const updated = replyToChatSession(
      req.params.id,
      text,
      {
        username: req.user!.username,
        fullName: req.user!.fullName,
        role: req.user!.role,
      },
      Boolean(closeSession)
    );
    if (!updated) {
      res.status(404).json({ error: 'Sesi percakapan tidak ditemukan.' });
      return;
    }
    res.json({ session: updated });
  });

  app.patch('/api/officer/chats/:id/status', requireAuth, (req: AuthenticatedRequest, res) => {
    const { status } = req.body as { status?: ChatSessionStatus };
    if (!status) {
      res.status(400).json({ error: 'Status percakapan wajib diisi.' });
      return;
    }
    const updated = updateChatSessionStatus(req.params.id, status, {
      username: req.user!.username,
      fullName: req.user!.fullName,
      role: req.user!.role,
    });
    if (!updated) {
      res.status(404).json({ error: 'Sesi percakapan tidak ditemukan.' });
      return;
    }
    res.json({ session: updated });
  });

  // --- Super Admin Exclusive Routes ---
  app.patch(
    '/api/knowledge-base/hours',
    requireSuperAdmin,
    (req: AuthenticatedRequest, res) => {
      const updated = updateOperatingHours(
        req.body,
        req.user
          ? {
              username: req.user.username,
              fullName: req.user.fullName,
              role: req.user.role,
            }
          : undefined
      );
      res.json({ operatingHours: updated });
    }
  );

  app.patch(
    '/api/knowledge-base/services/:id',
    requireSuperAdmin,
    (req: AuthenticatedRequest, res) => {
      const updated = updateServiceKnowledge(
        req.params.id as ServiceId,
        req.body,
        req.user
          ? {
              username: req.user.username,
              fullName: req.user.fullName,
              role: req.user.role,
            }
          : undefined
      );
      if (!updated) {
        res.status(404).json({ error: 'Layanan tidak ditemukan.' });
        return;
      }
      res.json({ service: updated });
    }
  );

  app.post(
    '/api/knowledge-base/services',
    requireSuperAdmin,
    (req: AuthenticatedRequest, res) => {
      const { name, shortName, sla, fee, description, requiredDocs, commonPitfall } = req.body;
      if (!name || !shortName || !Array.isArray(requiredDocs) || requiredDocs.length === 0) {
        res.status(400).json({
          error: 'Nama layanan, nama singkat, dan minimal 1 syarat dokumen wajib diisi.',
        });
        return;
      }
      const created = createServiceKnowledge(
        {
          name: String(name),
          shortName: String(shortName),
          sla: String(sla || '1–2 Hari Kerja'),
          fee: String(fee || 'Gratis (Rp 0)'),
          description: String(description || ''),
          requiredDocs: requiredDocs.map(String).filter(Boolean),
          commonPitfall: String(commonPitfall || ''),
        },
        {
          username: req.user!.username,
          fullName: req.user!.fullName,
          role: req.user!.role,
        }
      );
      res.status(201).json({ service: created });
    }
  );

  app.get('/api/admin/accounts', requireSuperAdmin, (_req, res) => {
    res.json({ accounts: listStaffAccounts() });
  });

  app.post('/api/admin/accounts', requireSuperAdmin, (req: AuthenticatedRequest, res) => {
    const { username, email, fullName, title, role, password } = req.body as {
      username?: string;
      email?: string;
      fullName?: string;
      title?: string;
      role?: UserRole;
      password?: string;
    };
    if (!username || !fullName || !password) {
      res.status(400).json({ error: 'Username, nama lengkap, dan kata sandi wajib diisi.' });
      return;
    }
    const created = createStaffAccount(
      {
        username,
        email: email || '',
        fullName,
        title: title || 'Petugas Loket Adminduk',
        role: role === 'super_admin' ? 'super_admin' : 'admin',
        password,
      },
      {
        username: req.user!.username,
        fullName: req.user!.fullName,
        role: req.user!.role,
      }
    );
    if (!created.ok) {
      res.status(400).json({ error: created.error });
      return;
    }
    res.status(201).json({ account: created.account });
  });

  app.patch('/api/admin/accounts/:id', requireSuperAdmin, (req: AuthenticatedRequest, res) => {
    const updated = updateStaffAccount(req.params.id, req.body, {
      userId: req.user!.userId,
      username: req.user!.username,
      fullName: req.user!.fullName,
      role: req.user!.role,
    });
    if (!updated.ok) {
      res.status(400).json({ error: updated.error });
      return;
    }
    res.json({ account: updated.account });
  });

  app.get('/api/admin/audit-logs', requireSuperAdmin, (_req, res) => {
    res.json({ auditLogs: listAuditLogs() });
  });

  app.get('/api/admin/report', requireSuperAdmin, (req: AuthenticatedRequest, res) => {
    const report = buildGlobalMonthlyReport(req.user!.fullName);
    res.json({ report });
  });

  app.post('/api/admin/report/export', requireSuperAdmin, (req: AuthenticatedRequest, res) => {
    const { format } = req.body as { format?: string };
    appendAuditLog({
      actorUsername: req.user!.username,
      actorName: req.user!.fullName,
      actorRole: req.user!.role,
      category: 'LAPORAN',
      action: 'Unduh Rekapitulasi Laporan Global',
      target: format || 'CSV',
      detail: `Mengunduh laporan bulanan SIAP Prambon dalam format ${format || 'CSV'}.`,
    });
    res.json({ ok: true });
  });

  // --- Official Form Download Endpoint (FR-05) ---
  app.get('/api/forms/:code/download', (req, res) => {
    const code = decodeURIComponent(req.params.code).toUpperCase();
    const form = OFFICIAL_FORMS.find((f) => f.code.toUpperCase() === code);
    if (!form) {
      res.status(404).json({ error: 'Formulir resmi tidak ditemukan.' });
      return;
    }
    const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>${form.title} — SIAP Prambon</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; max-width: 780px; margin: 32px auto; padding: 24px; line-height: 1.5; }
    .header { border-bottom: 3px double #0f294a; padding-bottom: 12px; margin-bottom: 20px; text-align: center; }
    .header h1 { font-size: 16px; margin: 0; text-transform: uppercase; }
    .header h2 { font-size: 14px; margin: 4px 0 0; }
    .header p { font-size: 11px; margin: 4px 0 0; color: #475569; }
    .badge { display: inline-block; border: 1px solid #0f294a; padding: 4px 10px; font-weight: bold; font-size: 12px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    td, th { border: 1px solid #cbd5e1; padding: 10px 12px; font-size: 12px; text-align: left; }
    th { background: #f8fafc; width: 38%; }
    .notes { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; font-size: 12px; margin-top: 20px; }
    .sig { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; }
    .sig div { width: 42%; text-align: center; }
    .sig-line { margin-top: 64px; border-top: 1px solid #334155; padding-top: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Pemerintah Kabupaten Sidoarjo — Kecamatan Prambon</h1>
    <h2>Pelayanan Administrasi Kependudukan &amp; Pencatatan Sipil</h2>
    <p>Jl. Raya Prambon No. 12, Kecamatan Prambon, Kabupaten Sidoarjo · Seluruh Layanan Adminduk GRATIS (Rp 0)</p>
  </div>
  <div class="badge">KODE FORMULIR: ${form.code}</div>
  <h3 style="margin:4px 0 6px;font-size:16px;">${form.title}</h3>
  <p style="font-size:12px;color:#334155;margin-top:0;">Layanan Terkait: <strong>${form.serviceName}</strong><br/>${form.description}</p>
  <table>
    <tbody>
      ${form.fields
        .map(
          (field, i) =>
            `<tr><th>${i + 1}. ${field}</th><td style="height:26px;"></td></tr>`
        )
        .join('')}
      <tr><th>Tanggal Pengajuan &amp; Desa</th><td>Desa _______________________, Tanggal ____ / ____ / 2026</td></tr>
    </tbody>
  </table>
  <div class="notes">
    <strong>Petunjuk Pengisian:</strong>
    <ul>
      ${form.notes.map((n) => `<li>${n}</li>`).join('')}
    </ul>
  </div>
  <div class="sig">
    <div>Mengetahui,<br/>Petugas Loket Kecamatan Prambon<div class="sig-line">( ............................................ )</div></div>
    <div>Prambon, ____ / ____ / 2026<br/>Pemohon<div class="sig-line">( ............................................ )</div></div>
  </div>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Formulir_${form.code}_SIAP_Prambon.html"`
    );
    res.send(html);
  });

  // --- Citizen AI & Omnichannel Chat Routes ---
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, history, selectedServiceId, sessionId, channel, citizenAlias } =
        req.body as {
          message?: string;
          history?: ChatTurnInput[];
          selectedServiceId?: ServiceId;
          sessionId?: string;
          channel?: ChatChannel;
          citizenAlias?: string;
        };
      if (!message || !message.trim()) {
        res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
        return;
      }
      const activeFaqs = listFaqs(true);
      const knowledgeBase = getKnowledgeBase();
      const result = await runVirtualAssistantChat({
        message: message.trim(),
        history: Array.isArray(history) ? history : [],
        selectedServiceId,
        activeFaqs,
        knowledgeBase,
      });

      const safeUserText = message
        .trim()
        .replace(/\b\d{16}\b/g, '[NIK DIRAHASIAKAN - UU PDP]');

      const session = upsertChatTurn({
        sessionId,
        channel: channel || 'Web Portal',
        citizenAlias,
        userText: safeUserText,
        aiReply: result.reply,
        responseTimeMs: result.responseTimeMs,
        suggestedServiceId: result.suggestedServiceId,
        formCodes: result.formCodes,
        shouldEscalate: result.shouldEscalate,
        escalationReason: result.escalationReason,
      });

      res.json({
        ...result,
        session,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghubungi layanan AI.';
      console.error('Error /api/chat:', err);
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/chat/voice', async (req, res) => {
    try {
      const { audioBase64, mimeType } = req.body as {
        audioBase64?: string;
        mimeType?: string;
      };
      if (!audioBase64) {
        res.status(400).json({ error: 'Data rekaman suara tidak ditemukan.' });
        return;
      }
      const transcript = await transcribeVoiceNote(audioBase64, mimeType || 'audio/webm');
      if (!transcript) {
        res.status(422).json({ error: 'Suara tidak terdengar jelas. Silakan rekam ulang.' });
        return;
      }
      res.json({ transcript });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses pesan suara.';
      console.error('Error /api/chat/voice:', err);
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/chat/sessions/:id', (req, res) => {
    const session = getChatSessionById(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Sesi percakapan tidak ditemukan.' });
      return;
    }
    res.json({ session });
  });

  app.post('/api/chat/sessions/:id/escalate', (req, res) => {
    const { reason } = req.body as { reason?: string };
    const session = escalateChatSession(req.params.id, reason);
    if (!session) {
      res.status(404).json({ error: 'Sesi percakapan tidak ditemukan.' });
      return;
    }
    res.json({ session });
  });

  app.post('/api/chat/sessions/:id/feedback', (req, res) => {
    const { isHelpful, rating, comment } = req.body as {
      isHelpful?: boolean;
      rating?: number;
      comment?: string;
    };
    const session = submitChatFeedback(req.params.id, {
      isHelpful: Boolean(isHelpful),
      rating: typeof rating === 'number' ? rating : isHelpful ? 5 : 2,
      comment: comment || '',
    });
    if (!session) {
      res.status(404).json({ error: 'Sesi percakapan tidak ditemukan.' });
      return;
    }
    res.json({ session });
  });

  app.post('/api/prevalidate', async (req, res) => {
    try {
      const payload = req.body as PreValidateRequestInput;
      if (!payload?.serviceId || !payload?.citizenInfo?.nama || !payload?.citizenInfo?.nik) {
        res.status(400).json({
          error: 'Data jenis layanan, nama lengkap, dan NIK pemohon wajib dilengkapi.',
        });
        return;
      }

      const knowledgeBase = getKnowledgeBase();
      const aiResult = await runPreValidation({
        ...payload,
        knowledgeBase,
      });
      const serviceMeta =
        knowledgeBase.services.find((s) => s.id === payload.serviceId) ??
        knowledgeBase.services[0];

      const ticket = createTicket({
        citizenName: payload.citizenInfo.nama.trim(),
        nik: payload.citizenInfo.nik.trim(),
        village: payload.citizenInfo.desa || 'Prambon',
        serviceId: payload.serviceId,
        serviceName: serviceMeta.name,
        overallStatus: aiResult.overallStatus,
        summary: aiResult.summary,
        documentCount: Array.isArray(payload.documents) ? payload.documents.length : 0,
        uploadedDocNames: Array.isArray(payload.documents)
          ? payload.documents.map((d) => d.name)
          : [],
        imageQualityChecks: aiResult.imageQualityChecks,
        documentMatrix: aiResult.documentMatrix,
        consistencyChecks: aiResult.consistencyChecks,
        checklist: aiResult.checklist,
        recommendations: aiResult.recommendations,
        commonIssueCategory: aiResult.commonIssueCategory,
      });

      res.status(201).json({ ticket });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menjalankan pra-validasi AI.';
      console.error('Error /api/prevalidate:', err);
      res.status(500).json({ error: msg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SIAP Prambon server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
