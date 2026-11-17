import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { PRAMBON_SERVICES, PRAMBON_VILLAGES } from '../src/data/prambonCatalog.ts';
import type {
  ChecklistItem,
  ConsistencyCheckItem,
  DashboardStats,
  DocumentMatrixRow,
  FaqItem,
  ImageQualityCheckItem,
  KnowledgeBaseState,
  ManagementBrief,
  ServiceId,
  ValidationLevel,
} from '../src/types.ts';

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY belum dikonfigurasi. Pastikan API key tersedia di panel Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes('503') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('429') ||
        msg.includes('RESOURCE_EXHAUSTED');
      if (!isTransient || attempt === maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export interface ChatTurnInput {
  role: 'user' | 'assistant';
  content: string;
}

export async function runVirtualAssistantChat(params: {
  message: string;
  history: ChatTurnInput[];
  selectedServiceId?: ServiceId;
  activeFaqs: FaqItem[];
  knowledgeBase?: KnowledgeBaseState;
}): Promise<{
  reply: string;
  suggestedServiceId?: ServiceId;
  formCodes: string[];
  shouldEscalate: boolean;
  escalationReason?: string;
  responseTimeMs: number;
}> {
  const startedAt = Date.now();

  // §12 Minimisasi Data (Data Minimization) Guardrail:
  // Bot melarang warga mengirimkan 16 digit NIK atau foto KTP lewat chat umum.
  const hasNikPattern = /\b\d{16}\b/.test(params.message);
  if (hasNikPattern) {
    return {
      reply:
        'Demi keamanan **Pelindungan Data Pribadi (UU PDP)**, Asisten Chat **SIAP Prambon** tidak menerima atau menyimpan nomor **NIK (16 digit) maupun foto KTP/KK** di dalam percakapan chat.\n\n- Untuk memeriksa kelengkapan & kesinkronan data NIK/KK secara aman, silakan gunakan menu **Pra-Validasi Berkas AI** (dokumen terenkripsi dan otomatis terhapus maksimal 24 jam).\n- Jika tetap ingin bertanya tentang prosedur layanan, silakan kirim pertanyaan tanpa menuliskan nomor NIK.',
      formCodes: [],
      shouldEscalate: false,
      responseTimeMs: Math.max(120, Date.now() - startedAt),
    };
  }

  const ai = getClient();

  const servicesList = params.knowledgeBase?.services ?? PRAMBON_SERVICES;
  const hours = params.knowledgeBase?.operatingHours;

  const serviceDirectoryText = servicesList
    .map(
      (s) =>
        `- [${s.id}] ${s.name} | Estimasi: ${s.sla} | Biaya: ${s.fee} | Formulir: ${s.formCode ?? 'F-1.02'}\n  Syarat: ${s.requiredDocs.join('; ')}\n  Alur: ${(s.processSteps ?? []).join(' -> ')}\n  Catatan umum: ${s.commonPitfall}`
    )
    .join('\n');

  const faqKnowledgeText = params.activeFaqs
    .map((f) => `- (${f.category}) Tanya: ${f.question}\n  Jawab: ${f.answer}`)
    .join('\n');

  const systemInstruction = `Anda adalah Asisten Virtual Resmi SIAP Prambon (Sistem Informasi Administrasi Publik Kecamatan Prambon, Kabupaten Sidoarjo, Jawa Timur).
Sapaan pembuka yang hangat dan santun: gunakan "Halo Warga Prambon!" (untuk Bahasa Indonesia) atau "Sugeng rawuh Warga Prambon!" (untuk Bahasa Jawa).
Tugas Anda adalah membantu warga Kecamatan Prambon memahami persyaratan, alur, jam layanan, dan estimasi waktu pembuatan dokumen Adminduk (KTP-el, Kartu Keluarga/KK, KIA usia 0–5 tahun & 5–17 tahun, Akta Kelahiran, Akta Kematian, dan Surat Pindah).

Kemampuan Bahasa (WAJIB):
- Jika warga bertanya dalam **Bahasa Indonesia** sehari-hari, jawab dalam Bahasa Indonesia yang sopan, hangat, dan mudah dipahami.
- Jika warga bertanya dalam **Bahasa Jawa** (Ngoko maupun Krama/Sidoarjoan, misal "piye carane", "syarate nopo", "kulo ajeng damel KTP/KIA", "pecah KK"), WAJIB balas menggunakan **Bahasa Jawa yang sopan dan akrab (Krama Alus / Ngoko Alus khas Jawa Timur yang santun)**!

Aturan Akurasi & Anti-Halusinasi (NFR-03):
- HANYA jawab berdasarkan Direktori Layanan & FAQ Resmi di bawah ini. Jangan pernah mengarang prosedur, tarif, atau syarat di luar SOP resmi.
- Selalu tegaskan bahwa seluruh layanan Adminduk **GRATIS (Rp 0)**.
- Jika pertanyaan warga berada di luar cakupan SOP Adminduk Kecamatan Prambon, bernada komplain/urgensi tinggi, meminta pengecekan data NIK/kasus khusus, atau warga meminta berbicara dengan manusia/petugas, set \`shouldEscalate: true\` dan jelaskan secara sopan bahwa percakapan siap dialihkan ke Petugas Loket Kecamatan Prambon.

Informasi Resmi Kecamatan Prambon (Terbaru dari Petugas):
- Lokasi: ${hours?.lokasi ?? 'Kantor Kecamatan Prambon, Jl. Raya Prambon No. 12, Kabupaten Sidoarjo'}.
- Jam Layanan Loket Adminduk: Senin–Kamis pukul ${hours?.seninKamis ?? '08.00 – 15.00 WIB'}, Jumat pukul ${hours?.jumat ?? '08.00 – 14.30 WIB'} (istirahat ${hours?.istirahat ?? '12.00 – 13.00 WIB'}).
- Catatan Layanan: ${hours?.catatanLayanan ?? 'Seluruh layanan Adminduk GRATIS (Rp 0) tanpa pungutan.'}
- Catatan khusus KIA (Kartu Identitas Anak):
  * Usia 0–5 tahun: KK orang tua, Akta Kelahiran anak, KTP orang tua, Buku Nikah (TANPA pas foto).
  * Usia 5–17 tahun kurang 1 hari: sama dengan di atas + Pas foto anak berwarna ukuran 2x3 sebanyak 2 lembar (latar merah untuk tahun lahir ganjil, latar biru untuk tahun lahir genap).
- Cakupan 20 Desa: ${PRAMBON_VILLAGES.join(', ')}.

Direktori Layanan & Persyaratan Resmi:
${serviceDirectoryText}

Basis Pengetahuan FAQ Aktif (Dikelola Petugas Kecamatan):
${faqKnowledgeText}

Kode Formulir Resmi yang Tersedia untuk Diunduh Warga:
- F-1.01 (Biodata Keluarga KK Baru)
- F-1.02 (Pendaftaran Peristiwa Kependudukan: KTP-el, KK, KIA)
- F-1.03 (Pendaftaran Perpindahan Penduduk / SKPWNI)
- F-1.06 (Surat Pernyataan Perubahan Elemen Data / Beda Nama-TTL)
- F-2.01 (Pelaporan Pencatatan Sipil: Akta Kelahiran / Kematian)
- PENGANTAR-RTRW (Contoh Format Surat Pengantar Resmi RT/RW & Desa)

Pedoman Menjawab:
1. Gunakan format terstruktur dengan bullet list dan penebalan pada poin penting agar mudah dibaca masyarakat.
2. Sertakan kode formulir yang relevan di \`formCodes\` apabila warga perlu mengunduh formulir resmi.
3. Jawab padat dan langsung membantu (maksimal ~230 kata).`;

  const contents = [
    ...params.history.slice(-8).map((turn) => ({
      role: turn.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: turn.content }],
    })),
    {
      role: 'user' as const,
      parts: [
        {
          text: params.selectedServiceId
            ? `[Konteks layanan dipilih warga: ${params.selectedServiceId}]\n${params.message}`
            : params.message,
        },
      ],
    },
  ];

  const response = await callWithRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description:
                'Jawaban lengkap, ramah, dan terstruktur dalam Bahasa Indonesia atau Bahasa Jawa (menyesuaikan bahasa pertanyaan warga).',
            },
            suggestedServiceId: {
              type: Type.STRING,
              description:
                'ID layanan relevan dari direktori (misal KTP_EL, KK_PERUBAHAN, KIA, AKTA_LAHIR, PINDAH_SKPWNI, AKTA_KEMATIAN, SURAT_KETERANGAN), atau string kosong.',
            },
            formCodes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                'Daftar kode formulir yang relevan untuk diunduh warga (F-1.01, F-1.02, F-1.03, F-1.06, F-2.01, PENGANTAR-RTRW).',
            },
            shouldEscalate: {
              type: Type.BOOLEAN,
              description:
                'true jika pertanyaan di luar SOP, kasus sengketa/kompleks, keluhan/komplain, atau warga meminta petugas manusia.',
            },
            escalationReason: {
              type: Type.STRING,
              description: 'Alasan singkat jika shouldEscalate true.',
            },
          },
          required: ['reply', 'formCodes', 'shouldEscalate'],
        },
      },
    })
  );

  const rawText = (response.text ?? '').trim();
  const parsed = JSON.parse(rawText) as {
    reply: string;
    suggestedServiceId?: string;
    formCodes?: string[];
    shouldEscalate?: boolean;
    escalationReason?: string;
  };
  const validIds: ServiceId[] = servicesList.map((s) => s.id);
  const matchedService = validIds.find((id) => id === parsed.suggestedServiceId);
  const allowedForms = new Set([
    'F-1.01',
    'F-1.02',
    'F-1.03',
    'F-1.06',
    'F-2.01',
    'PENGANTAR-RTRW',
  ]);
  const formCodes = Array.isArray(parsed.formCodes)
    ? parsed.formCodes.filter((c) => allowedForms.has(c))
    : [];

  return {
    reply: parsed.reply,
    ...(matchedService ? { suggestedServiceId: matchedService } : {}),
    formCodes,
    shouldEscalate: Boolean(parsed.shouldEscalate),
    ...(parsed.escalationReason ? { escalationReason: parsed.escalationReason } : {}),
    responseTimeMs: Math.max(150, Date.now() - startedAt),
  };
}

export async function transcribeVoiceNote(
  audioBase64: string,
  mimeType: string
): Promise<string> {
  const ai = getClient();
  const response = await callWithRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: audioBase64,
            },
          },
          {
            text: 'Transkripsikan rekaman suara warga Kecamatan Prambon, Sidoarjo ini menjadi teks pertanyaan yang jelas dan rapi. Pertahankan bahasa aslinya (Bahasa Indonesia maupun Bahasa Jawa). Keluarkan hanya teks hasil transkripsi tanpa komentar tambahan.',
          },
        ],
      },
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    })
  );
  return (response.text ?? '').trim();
}

export interface PreValidateRequestInput {
  serviceId: ServiceId;
  citizenInfo: {
    nama: string;
    nik: string;
    tempatTanggalLahir: string;
    alamat: string;
    desa: string;
    nomorKK: string;
  };
  documents: Array<{
    name: string;
    docType: string;
    mimeType: string;
    base64Data?: string;
    simulatedText?: string;
  }>;
  extraNotes?: string;
  knowledgeBase?: KnowledgeBaseState;
}

export interface PreValidateResult {
  overallStatus: ValidationLevel;
  summary: string;
  imageQualityChecks: ImageQualityCheckItem[];
  documentMatrix: DocumentMatrixRow[];
  consistencyChecks: ConsistencyCheckItem[];
  checklist: ChecklistItem[];
  recommendations: string[];
  commonIssueCategory: string;
}

export async function runPreValidation(input: PreValidateRequestInput): Promise<PreValidateResult> {
  const ai = getClient();
  const servicesList = input.knowledgeBase?.services ?? PRAMBON_SERVICES;
  const service = servicesList.find((s) => s.id === input.serviceId) ?? servicesList[0];

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  const docDescriptions: string[] = [];
  for (let i = 0; i < input.documents.length; i++) {
    const doc = input.documents[i];
    if (doc.base64Data && doc.mimeType) {
      docDescriptions.push(
        `Dokumen #${i + 1}: ${doc.name} (Jenis: ${doc.docType}) — terlampir sebagai gambar/file.`
      );
      parts.push({
        inlineData: {
          mimeType: doc.mimeType,
          data: doc.base64Data,
        },
      });
    } else if (doc.simulatedText) {
      docDescriptions.push(
        `Dokumen #${i + 1}: ${doc.name} (Jenis: ${doc.docType})\nIsi & Kondisi Dokumen Terbaca: ${doc.simulatedText}`
      );
    } else {
      docDescriptions.push(`Dokumen #${i + 1}: ${doc.name} (Jenis: ${doc.docType}) — metadata saja.`);
    }
  }

  const promptText = `Lakukan Pra-Validasi & Koreksi Konsistensi Berkas Mandiri untuk warga Kecamatan Prambon, Kabupaten Sidoarjo.

JENIS LAYANAN YANG DIAJUKAN:
- ID: ${service.id}
- Nama Layanan: ${service.name}
- Dokumen Persyaratan Wajib:
${service.requiredDocs.map((d, idx) => `  ${idx + 1}. ${d}`).join('\n')}

DATA PEMOHON YANG DIINPUT WARGA:
- Nama Lengkap: ${input.citizenInfo.nama}
- NIK: ${input.citizenInfo.nik}
- Tempat/Tanggal Lahir: ${input.citizenInfo.tempatTanggalLahir}
- Alamat: ${input.citizenInfo.alamat}
- Desa (Kec. Prambon): ${input.citizenInfo.desa}
- Nomor KK: ${input.citizenInfo.nomorKK || '(tidak diisi)'}
- Catatan Tambahan Warga: ${input.extraNotes || '(tidak ada)'}

BERKAS YANG DILAMPIRKAN (${input.documents.length} berkas):
${docDescriptions.length > 0 ? docDescriptions.join('\n\n') : '(Belum ada berkas yang diunggah!)'}

TUGAS ANALISIS WAJIB:
1. Kualitas Gambar (imageQualityChecks): Evaluasi setiap dokumen yang dilampirkan. Cek apakah foto/scan JELAS ("JELAS") atau buram, gelap, silau, maupun terpotong ("PERLU_PERBAIKAN").
2. Tabel Perbandingan Data Lintas Dokumen (documentMatrix): Ekstrak dan bandingkan minimal 3 elemen identitas wajib di bawah ini di antara Kartu Keluarga (kkValue), Akta Kelahiran (aktaValue), Surat/Buku Nikah (nikahValue), Ijazah Terakhir (ijazahValue), dan Surat Pengantar RT/RW (pengantarValue) — isi dengan "-" jika dokumen tersebut tidak diunggah atau tidak memuat kolom itu:
   a) Penulisan Nama Lengkap (deteksi beda ejaan misal "Mochamad" vs "Muhammad", singkatan misal "Moch.", gelar, atau huruf ganda)
   b) Tempat Lahir (deteksi perbedaan penulisan kabupaten/kota vs kecamatan, misal "Sidoarjo" vs "Prambon")
   c) Tanggal, Bulan, Tahun Lahir (deteksi selisih tanggal/bulan/tahun antar-dokumen)
   Untuk setiap baris, tulis impactAndFix yang menjelaskan secara ramah dampak perbedaan data tersebut (misal potensi tertunda/ditolak saat sinkronisasi SIAK/perbankan/paspor) serta langkah koreksi konkret sebelum ke kantor kecamatan.
3. Status Keseluruhan (overallStatus):
   - "LENGKAP_COCOK": Seluruh berkas persyaratan utama ada, kualitas gambar semua "JELAS", dan Nama, Tempat Lahir, serta Tanggal Lahir konsisten di semua dokumen.
   - "PERHATIAN_MINOR": Dokumen utama tersedia dan terbaca, namun ditemukan perbedaan ejaan minor, singkatan nama, perbedaan kabupaten vs kecamatan pada tempat lahir, atau 1 dokumen pendukung perlu konfirmasi.
   - "TIDAK_LENGKAP": Ada foto buram/gelap/terpotong (PERLU_PERBAIKAN), dokumen wajib utama belum diunggah, atau ada ketidaksesuaian fatal pada NIK/tahun lahir/identitas.
4. Pilih SATU kategori commonIssueCategory:
   - "Lengkap Tanpa Kendala"
   - "Perbedaan Ejaan Nama"
   - "Berkas Pengantar Kurang"
   - "NIK Tidak Sinkron"
   - "Alamat RT/RW Belum Mutakhir"
   - "Kualitas Foto / Dokumen Kurang Jelas"
5. Isi juga consistencyChecks, checklist, dan recommendations dalam Bahasa Indonesia yang ramah dan mudah dipahami warga.`;

  parts.push({ text: promptText });

  const response = await callWithRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts },
      config: {
        systemInstruction:
          'Anda adalah sistem validator ahli Administrasi Kependudukan (Adminduk) Kecamatan Prambon, Kabupaten Sidoarjo. Lakukan pemeriksaan kualitas gambar dan cross-check lintas dokumen (KK, Akta Kelahiran, Buku Nikah, Ijazah, Surat Pengantar RT/RW) secara teliti, jujur, dan ramah warga.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallStatus: {
              type: Type.STRING,
              description: 'LENGKAP_COCOK, PERHATIAN_MINOR, atau TIDAK_LENGKAP',
            },
            summary: {
              type: Type.STRING,
              description: 'Ringkasan ramah bagi warga mengenai kelengkapan, kualitas foto, dan konsistensi data.',
            },
            commonIssueCategory: { type: Type.STRING },
            imageQualityChecks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  docName: { type: Type.STRING },
                  docType: { type: Type.STRING },
                  qualityStatus: {
                    type: Type.STRING,
                    description: 'JELAS atau PERLU_PERBAIKAN',
                  },
                  note: { type: Type.STRING },
                },
                required: ['docName', 'docType', 'qualityStatus', 'note'],
              },
            },
            documentMatrix: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  field: { type: Type.STRING },
                  kkValue: { type: Type.STRING },
                  aktaValue: { type: Type.STRING },
                  nikahValue: { type: Type.STRING },
                  ijazahValue: { type: Type.STRING },
                  pengantarValue: { type: Type.STRING },
                  status: {
                    type: Type.STRING,
                    description: 'COCOK, PERBEDAAN_MINOR, atau TIDAK_COCOK',
                  },
                  impactAndFix: { type: Type.STRING },
                },
                required: [
                  'field',
                  'kkValue',
                  'aktaValue',
                  'nikahValue',
                  'ijazahValue',
                  'pengantarValue',
                  'status',
                  'impactAndFix',
                ],
              },
            },
            consistencyChecks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  field: { type: Type.STRING },
                  valueDocA: { type: Type.STRING },
                  valueDocB: { type: Type.STRING },
                  status: { type: Type.STRING },
                  note: { type: Type.STRING },
                },
                required: ['field', 'valueDocA', 'valueDocB', 'status', 'note'],
              },
            },
            checklist: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  item: { type: Type.STRING },
                  required: { type: Type.BOOLEAN },
                  status: { type: Type.STRING },
                  note: { type: Type.STRING },
                },
                required: ['item', 'required', 'status', 'note'],
              },
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            'overallStatus',
            'summary',
            'commonIssueCategory',
            'imageQualityChecks',
            'documentMatrix',
            'consistencyChecks',
            'checklist',
            'recommendations',
          ],
        },
      },
    })
  );

  const raw = (response.text ?? '{}').trim();
  const parsed = JSON.parse(raw) as PreValidateResult;

  const validStatuses: ValidationLevel[] = ['LENGKAP_COCOK', 'PERHATIAN_MINOR', 'TIDAK_LENGKAP'];
  if (!validStatuses.includes(parsed.overallStatus)) {
    parsed.overallStatus = 'PERHATIAN_MINOR';
  }
  return parsed;
}

export async function runOfficerInsights(stats: DashboardStats): Promise<{
  headline: string;
  observations: string[];
  actionPlan: string[];
}> {
  const ai = getClient();

  const prompt = `Analisis data statistik pra-validasi berkas Adminduk Kecamatan Prambon, Kabupaten Sidoarjo berikut ini dan berikan ringkasan strategis untuk Petugas/Camat Prambon:

Total Tiket Pra-Validasi: ${stats.totalTickets}
- Lengkap & Cocok (Siap Loket): ${stats.lengkapCount}
- Perlu Perhatian Minor: ${stats.minorCount}
- Tidak Lengkap / Ditolak Pra-Cek: ${stats.tidakLengkapCount}
- Sudah Terverifikasi / Selesai di Loket: ${stats.verifiedCount}

Tren Kategori Masalah:
${stats.issueTrends.map((t) => `- ${t.category}: ${t.count} kasus (${t.percentage}%)`).join('\n')}

Distribusi per Desa:
${stats.villageBreakdown.map((v) => `- Desa ${v.village}: ${v.total} pengajuan (${v.issues} bermasalah)`).join('\n')}

Buat rekomendasi operasional praktis untuk koordinasi antara loket Kecamatan Prambon dengan operator/perangkat desa di 20 desa.`;

  const response = await callWithRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            observations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            actionPlan: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['headline', 'observations', 'actionPlan'],
        },
      },
    })
  );

  const raw = (response.text ?? '{}').trim();
  return JSON.parse(raw) as {
    headline: string;
    observations: string[];
    actionPlan: string[];
  };
}

export async function runManagementBrief(stats: DashboardStats): Promise<ManagementBrief> {
  const ai = getClient();
  const nowLabel = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const prompt = `Susun Management Brief Bulanan resmi untuk Camat Prambon, Kabupaten Sidoarjo berdasarkan metrik aktual berikut (format Lampiran D PRD SIAP Prambon):

Periode: ${nowLabel}
Metrik Layanan:
- Total Interaksi Chat Warga: ${stats.aiQuestionsAnswered} (WhatsApp: ${stats.channelBreakdown.whatsapp}, Instagram DM: ${stats.channelBreakdown.instagram}, Web: ${stats.channelBreakdown.web})
- Tingkat Penyelesaian AI (Resolution Rate): ${stats.aiResolutionRatePercent}%
- Rata-rata Waktu Respons AI: ${stats.avgResponseTimeSec} detik
- Antrean / Tingkat Eskalasi Petugas: ${stats.activeEscalationCount} aktif (${stats.escalationRatePercent}%)
- Skor Kepuasan Warga (CSAT): ${stats.csatScore}/5.0 (${stats.csatPositivePercent}% terbantu)
- Total Tiket Pra-Validasi: ${stats.totalTickets} (${stats.lengkapCount} siap loket, ${stats.identityMismatchCount} kasus kendala terdeteksi)

Topik Terbanyak:
${stats.topAskedServices.map((s) => `- ${s.serviceName}: ${s.count} (${s.percentage}%)`).join('\n')}

Distribusi Jam Sibuk (Peak Hour):
${stats.peakHours.map((p) => `- ${p.slot}: ${p.count} sesi (${p.percentage}%)${p.isAfterHours ? ' [Di luar jam kantor]' : ''}`).join('\n')}

Kendala Berkas Terbanyak:
${stats.issueTrends.map((t) => `- ${t.category}: ${t.count} kasus (${t.percentage}%)`).join('\n')}

Buat ringkasan eksekutif, sorotan KPI, analisis topik, analisis jam sibuk, analisis eskalasi & kendala berkas, serta rekomendasi tindak lanjut kebijakan bagi Camat & Kasi Pelayanan Umum Prambon.`;

  const response = await callWithRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            periodLabel: { type: Type.STRING },
            executiveSummary: { type: Type.STRING },
            kpiHighlights: { type: Type.ARRAY, items: { type: Type.STRING } },
            topicDistributionInsight: { type: Type.STRING },
            peakHourInsight: { type: Type.STRING },
            escalationAndDocGapInsight: { type: Type.STRING },
            actionRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: [
            'periodLabel',
            'executiveSummary',
            'kpiHighlights',
            'topicDistributionInsight',
            'peakHourInsight',
            'escalationAndDocGapInsight',
            'actionRecommendations',
          ],
        },
      },
    })
  );

  const raw = (response.text ?? '{}').trim();
  return JSON.parse(raw) as ManagementBrief;
}
