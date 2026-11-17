import type {
  ChatSessionRecord,
  FaqItem,
  OfficialFormTemplate,
  PreValidationTicket,
  ServiceCatalogItem,
  ServiceId,
} from '../types.ts';

export const PRAMBON_VILLAGES: string[] = [
  'Bendotretek',
  'Bulang',
  'Cangkringturi',
  'Gampang',
  'Gedangrowo',
  'Jati Alun-Alun',
  'Jatikalang',
  'Jedongcangkring',
  'Kajartengguli',
  'Kedungkembar',
  'Kedungsugo',
  'Kedungwonokerto',
  'Pejangkungan',
  'Prambon',
  'Simogirang',
  'Simpang',
  'Temu',
  'Watutulis',
  'Wirobiting',
  'Wonoplintahan',
];

export interface DocumentSlotSpec {
  slotKey: string;
  label: string;
  helper: string;
}

export const SUPPORTING_DOCUMENT_SLOTS: DocumentSlotSpec[] = [
  {
    slotKey: 'kk',
    label: '1. Kartu Keluarga (KK)',
    helper: 'Foto/scan KK asli atau KK terbaru ber-barcode TTE.',
  },
  {
    slotKey: 'akta',
    label: '2. Akta Kelahiran',
    helper: 'Untuk pencocokan nama lengkap, tempat, dan tanggal lahir.',
  },
  {
    slotKey: 'nikah',
    label: '3. Surat / Buku Nikah',
    helper: 'Buku nikah KUA atau akta perkawinan (jika sudah menikah / untuk KK & Akta anak).',
  },
  {
    slotKey: 'ijazah',
    label: '4. Ijazah Terakhir',
    helper: 'Dokumen pembanding utama penulisan nama, tempat, dan tanggal lahir.',
  },
  {
    slotKey: 'pengantar',
    label: '5. Surat Pengantar RT/RW / Desa',
    helper: 'Surat pengantar resmi berstempel dari RT/RW atau Pemerintah Desa.',
  },
];

export const PRAMBON_SERVICES: ServiceCatalogItem[] = [
  {
    id: 'KTP_EL',
    name: 'Perekaman / Cetak Ulang KTP-el',
    shortName: 'KTP-el',
    sla: '1 Hari Kerja (Sesuai Ketersediaan Blanko)',
    fee: 'Gratis (Rp 0)',
    description:
      'Perekaman biometrik pemula usia 17 tahun, penggantian KTP-el rusak, pembaruan elemen data, atau hilang.',
    requiredDocs: [
      'Kartu Keluarga (KK) terbaru dengan barcode/TTE',
      'Akta Kelahiran / Ijazah Terakhir (untuk verifikasi ejaan nama & TTL)',
      'KTP-el lama asli (jika rusak/ubah data) atau Surat Kehilangan Polsek Prambon (jika hilang)',
      'Surat Pengantar RT/RW/Desa & Formulir F-1.02',
    ],
    commonPitfall:
      'Perbedaan ejaan nama atau tempat lahir antara KK dan Ijazah/Akta Kelahiran saat update elemen data KTP-el.',
    formCode: 'F-1.02',
    processSteps: [
      'Siapkan berkas asli dan isi Formulir F-1.02.',
      'Lakukan Pra-Validasi Berkas AI untuk memastikan ejaan nama/TTL sinkron.',
      'Ambil antrean di Loket KTP-el Kecamatan Prambon untuk verifikasi/foto biometrik.',
      'KTP-el dicetak dan diserahkan kepada pemohon (Gratis Rp 0).',
    ],
  },
  {
    id: 'KK_PERUBAHAN',
    name: 'Pembuatan / Perubahan / Pecah Kartu Keluarga (KK)',
    shortName: 'Kartu Keluarga',
    sla: '1–2 Hari Kerja',
    fee: 'Gratis (Rp 0)',
    description:
      'Pembuatan KK baru, pecah KK karena menikah/pindah, penambahan anggota keluarga, atau perbaikan elemen data KK.',
    requiredDocs: [
      'Kartu Keluarga (KK) Asli sebelumnya',
      'KTP-el Pemohon / Kepala Keluarga & Buku Nikah / Akta Cerai',
      'Akta Kelahiran / Ijazah anggota keluarga yang diubah atau ditambahkan',
      'Surat Pengantar RT/RW / Pemerintah Desa & Formulir F-1.02',
    ],
    commonPitfall:
      'Penulisan nama atau tanggal lahir di KK lama berbeda dengan Ijazah Terakhir atau Buku Nikah.',
    formCode: 'F-1.02',
    processSteps: [
      'Lengkapi Formulir F-1.02 (dan F-1.06 jika ada perubahan elemen nama/TTL).',
      'Jalankan Pra-Validasi Lintas Berkas (KK, Akta, Buku Nikah, Ijazah).',
      'Serahkan berkas fisik beserta Tiket Pra-Validasi di Loket KK Kecamatan Prambon.',
      'KK baru ber-barcode Tanda Tangan Elektronik (TTE) selesai dalam 1–2 hari kerja.',
    ],
  },
  {
    id: 'KIA',
    name: 'Kartu Identitas Anak (KIA) — Usia 0–5 & 5–17 Tahun',
    shortName: 'KIA Anak',
    sla: '1–2 Hari Kerja',
    fee: 'Gratis (Rp 0)',
    description:
      'Penerbitan kartu identitas resmi anak usia 0–5 tahun (tanpa pas foto) dan usia 5–17 tahun kurang 1 hari (dengan pas foto berwarna).',
    requiredDocs: [
      'Kartu Keluarga (KK) asli orang tua',
      'Kutipan Akta Kelahiran anak',
      'KTP-el kedua orang tua & Buku Nikah orang tua',
      'Pas foto anak berwarna ukuran 2x3 sebanyak 2 lembar (KHUSUS usia 5–17 tahun; usia 0–5 tahun tanpa foto)',
    ],
    commonPitfall:
      'Penulisan nama anak atau tempat lahir di Akta Kelahiran berbeda dengan data yang tercantum di KK.',
    formCode: 'F-1.02',
    processSteps: [
      'Pastikan usia anak sesuai kategori (0–5 tahun tanpa foto; 5–17 tahun wajib pas foto 2x3 warna latar sesuai tahun lahir).',
      'Cek kesesuaian nama & TTL anak antara KK dan Akta Kelahiran.',
      'Ajukan ke Loket KIA Kecamatan Prambon dengan membawa dokumen asli.',
    ],
  },
  {
    id: 'AKTA_LAHIR',
    name: 'Penerbitan Akta Kelahiran',
    shortName: 'Akta Kelahiran',
    sla: '2–3 Hari Kerja',
    fee: 'Gratis (Rp 0)',
    description:
      'Pencatatan kelahiran baru maupun keterlambatan pelaporan kelahiran warga Kecamatan Prambon.',
    requiredDocs: [
      'Surat Keterangan Lahir asli dari Bidan/Puskesmas Prambon/RS',
      'Kartu Keluarga (KK) & KTP-el kedua orang tua',
      'Buku Nikah / Akta Perkawinan orang tua',
      'Surat Pengantar RT/RW/Desa, Formulir F-2.01 & fotokopi KTP 2 saksi',
    ],
    commonPitfall:
      'Nama ibu/ayah di Surat Keterangan Lahir berbeda ejaan dengan di KK dan Buku Nikah.',
    formCode: 'F-2.01',
    processSteps: [
      'Isi Formulir F-2.01 (Pelaporan Pencatatan Sipil) dan siapkan 2 KTP saksi.',
      'Cocokkan ejaan nama ayah/ibu di Surat Keterangan Lahir, KK, dan Buku Nikah.',
      'Serahkan ke petugas Pencatatan Sipil di Desa atau Loket Kecamatan Prambon.',
    ],
  },
  {
    id: 'PINDAH_SKPWNI',
    name: 'Surat Keterangan Pindah Datang (SKPWNI)',
    shortName: 'Pindah Domisili',
    sla: '1–2 Hari Kerja',
    fee: 'Gratis (Rp 0)',
    description:
      'Pengurusan pindah keluar antar kecamatan/kabupaten maupun kedatangan penduduk baru ke desa di Kecamatan Prambon.',
    requiredDocs: [
      'Kartu Keluarga (KK) Asli & KTP-el asli',
      'Surat Pengantar Pindah dari RT/RW dan Pemerintah Desa setempat',
      'Formulir F-1.03 (Pendaftaran Perpindahan Penduduk)',
      'Surat Pernyataan Persetujuan Kepala Keluarga (jika menumpang KK tujuan)',
    ],
    commonPitfall:
      'Alamat tujuan RT/RW tidak lengkap atau surat pengantar desa belum dibubuhi stempel resmi.',
    formCode: 'F-1.03',
    processSteps: [
      'Minta Surat Pengantar RT/RW dan register Pemerintah Desa asal.',
      'Isi Formulir F-1.03 lengkap dengan alamat RT/RW tujuan.',
      'Ajukan penerbitan SKPWNI di Loket Adminduk Kecamatan Prambon.',
    ],
  },
  {
    id: 'AKTA_KEMATIAN',
    name: 'Penerbitan Akta Kematian',
    shortName: 'Akta Kematian',
    sla: '2 Hari Kerja',
    fee: 'Gratis (Rp 0)',
    description:
      'Pelaporan peristiwa kematian untuk penerbitan Kutipan Akta Kematian dan pembaruan KK keluarga yang ditinggalkan.',
    requiredDocs: [
      'Surat Keterangan Kematian dari RS/Puskesmas atau Kepala Desa',
      'KK & KTP-el asli almarhum/almarhumah',
      'KTP-el Pelapor (ahli waris/keluarga) & 2 orang saksi',
      'Formulir F-2.01',
    ],
    commonPitfall:
      'Tanggal kematian pada surat desa berbeda dengan surat keterangan rumah sakit.',
    formCode: 'F-2.01',
    processSteps: [
      'Dapatkan Surat Keterangan Kematian dari RS/Puskesmas atau Kepala Desa.',
      'Isi Formulir F-2.01 bersama data pelapor dan 2 saksi.',
      'Serahkan berkas di loket untuk penerbitan Akta Kematian sekaligus pembaruan KK.',
    ],
  },
  {
    id: 'SURAT_KETERANGAN',
    name: 'Legalisasi & Surat Keterangan Kecamatan',
    shortName: 'Surat Keterangan',
    sla: 'Selesai Hari Sama (30–60 Menit)',
    fee: 'Gratis (Rp 0)',
    description:
      'Pengesahan/register surat keterangan domisili, surat keterangan tidak mampu (SKTM), keterangan usaha, dan surat ahli waris.',
    requiredDocs: [
      'Surat Pengantar resmi dari RT/RW & Kepala Desa/Sekdes',
      'KTP-el asli pemohon & Kartu Keluarga (KK)',
      'Dokumen pendukung sesuai jenis surat (misal: Surat Kematian untuk Ahli Waris)',
    ],
    commonPitfall:
      'Surat pengantar dari desa belum ditandatangani pejabat berwenang atau nomor register desa kosong.',
    formCode: 'PENGANTAR-RTRW',
    processSteps: [
      'Pastikan surat pengantar telah diregister dan ditandatangani Kepala Desa/Sekdes.',
      'Bawa KTP-el & KK asli ke Loket Pelayanan Umum Kecamatan Prambon.',
      'Petugas memverifikasi dan memberikan nomor register serta pengesahan Camat/Kasi.',
    ],
  },
];

export const OFFICIAL_FORMS: OfficialFormTemplate[] = [
  {
    code: 'F-1.01',
    title: 'Formulir F-1.01 — Biodata Keluarga',
    serviceName: 'Pembuatan KK Baru & Pencatatan Biodata Penduduk',
    description:
      'Formulir resmi Disdukcapil untuk pencatatan biodata kepala keluarga dan seluruh anggota keluarga pada pengajuan KK baru.',
    fields: [
      'Data Kepala Keluarga & Alamat Domisili (Desa, RT/RW, Kecamatan Prambon)',
      'Nomor Induk Kependudukan (NIK), Nama Lengkap, Jenis Kelamin, Tempat & Tanggal Lahir',
      'Status Perkawinan, Agama, Pendidikan Terakhir, Jenis Pekerjaan, dan Golongan Darah',
      'Nama Ayah & Ibu Kandung serta Tanda Tangan Pemohon',
    ],
    notes: [
      'Diisi dengan huruf kapital menggunakan tinta hitam.',
      'Pastikan ejaan nama sama dengan Akta Kelahiran atau Ijazah.',
    ],
  },
  {
    code: 'F-1.02',
    title: 'Formulir F-1.02 — Pendaftaran Peristiwa Kependudukan',
    serviceName: 'KTP-el, Kartu Keluarga (KK), dan Kartu Identitas Anak (KIA)',
    description:
      'Formulir terpadu permohonan penerbitan KTP-el baru/penggantian, perubahan KK, pecah KK, maupun pengajuan KIA anak.',
    fields: [
      'Data Pemohon (Nama Lengkap, NIK, Nomor KK, Nomor HP Aktif)',
      'Jenis Permohonan (KTP-el / KK Baru / Perubahan KK / KIA)',
      'Daftar Dokumen Persyaratan yang Dilampirkan',
      'Tanda Tangan Pemohon & Register Petugas Kecamatan Prambon',
    ],
    notes: [
      'Seluruh layanan pendaftaran menggunakan F-1.02 gratis tanpa biaya (Rp 0).',
      'Lampirkan Tiket Pra-Validasi SIAP Prambon untuk percepatan verifikasi loket.',
    ],
  },
  {
    code: 'F-1.03',
    title: 'Formulir F-1.03 — Pendaftaran Perpindahan Penduduk (SKPWNI)',
    serviceName: 'Surat Keterangan Pindah Datang (Antar Desa/Kecamatan/Kabupaten)',
    description:
      'Formulir permohonan pindah alamat atau datang penduduk lengkap dengan rincian alamat asal, alamat tujuan, dan daftar pengikut.',
    fields: [
      'Nomor KK & Nama Kepala Keluarga Asal',
      'Alamat Asal & Alamat Tujuan Lengkap (Desa/Kelurahan, RT/RW, Kecamatan, Kabupaten)',
      'Alasan Pindah & Klasifikasi Kepindahan (Dalam Satu Desa / Antar Kecamatan / Antar Kab/Kota)',
      'Daftar Anggota Keluarga yang Ikut Pindah',
    ],
    notes: [
      'Wajib mencantumkan nomor RT/RW tujuan secara lengkap dan benar.',
    ],
  },
  {
    code: 'F-1.06',
    title: 'Formulir F-1.06 — Surat Pernyataan Perubahan Elemen Data Kependudukan',
    serviceName: 'Koreksi / Pembetulan Ejaan Nama, Tempat, & Tanggal Lahir',
    description:
      'Formulir pernyataan resmi untuk menyinkronkan perbedaan ejaan nama, tempat lahir, tanggal lahir, pendidikan, atau pekerjaan pada KK dan KTP-el.',
    fields: [
      'Identitas Pemohon & Nomor KK',
      'Elemen Data Semula vs Elemen Data Perubahan yang Diusulkan',
      'Dokumen Bukti Pendukung (Akta Kelahiran / Ijazah / Buku Nikah)',
      'Pernyataan Tanggung Jawab Mutlak & Tanda Tangan di Atas Materai Rp 10.000',
    ],
    notes: [
      'Digunakan apabila Pra-Validasi AI mendeteksi perbedaan data antara KK dan Akta/Ijazah.',
    ],
  },
  {
    code: 'F-2.01',
    title: 'Formulir F-2.01 — Pelaporan Pencatatan Sipil (Akta Kelahiran / Kematian)',
    serviceName: 'Penerbitan Kutipan Akta Kelahiran & Akta Kematian',
    description:
      'Formulir pelaporan peristiwa penting kelahiran atau kematian di wilayah Kecamatan Prambon.',
    fields: [
      'Data Subjek Peristiwa (Anak yang Lahir / Almarhum)',
      'Data Pelapor, Orang Tua (Ayah & Ibu), serta Dua Orang Saksi',
      'Nomor Surat Keterangan Lahir / Kematian dari Bidan, Puskesmas, RS, atau Desa',
      'Tanda Tangan Pelapor dan Pengesahan Petugas Pencatatan Sipil',
    ],
    notes: [
      'Wajib melampirkan fotokopi KTP-el 2 orang saksi.',
    ],
  },
  {
    code: 'PENGANTAR-RTRW',
    title: 'Contoh Format Surat Pengantar Resmi RT / RW & Pemerintah Desa',
    serviceName: 'Seluruh Layanan Kecamatan Prambon & Legalisasi Surat Keterangan',
    description:
      'Template contoh format Surat Pengantar RT/RW dan Register Desa yang sah untuk warga dari 20 desa se-Kecamatan Prambon.',
    fields: [
      'Kop & Nomor Register Surat RT/RW dan Pemerintah Desa',
      'Nama Lengkap, NIK, Tempat/Tanggal Lahir, Pekerjaan, dan Alamat RT/RW Pemohon',
      'Maksud / Keperluan Pengurusan Administrasi Kependudukan',
      'Tanda Tangan Ketua RT/RW, Kepala Desa/Sekdes, dan Stempel Basah',
    ],
    notes: [
      'Pastikan surat pengantar sudah berstempel basah dan bertanda tangan pejabat desa yang berwenang.',
    ],
  },
];

export interface SimulationPreset {
  id: string;
  label: string;
  badgeText: string;
  serviceId: ServiceId;
  citizenInfo: {
    nama: string;
    nik: string;
    tempatTanggalLahir: string;
    alamat: string;
    desa: string;
    nomorKK: string;
  };
  extraNotes: string;
  simulatedDocs: Array<{
    slotKey: string;
    name: string;
    docType: string;
    simulatedText: string;
  }>;
}

export const SIMULATION_PRESETS: SimulationPreset[] = [
  {
    id: 'preset_cocok',
    label: 'Contoh Data Simulasi: Lengkap & Konsisten',
    badgeText: 'Siap Terbit Tiket QR',
    serviceId: 'KK_PERUBAHAN',
    citizenInfo: {
      nama: 'Ahmad Fauzi Pratama',
      nik: '3515031405920004',
      tempatTanggalLahir: 'Sidoarjo, 14 Mei 1992',
      alamat: 'Dusun Krajan RT 003 RW 002',
      desa: 'Kedungwonokerto',
      nomorKK: '3515032108190011',
    },
    extraNotes: 'Pecah KK / pembuatan KK baru setelah menikah dengan data lengkap di 5 berkas.',
    simulatedDocs: [
      {
        slotKey: 'kk',
        name: 'KK_Asli_Ahmad_Fauzi.jpg',
        docType: 'Kartu Keluarga (KK)',
        simulatedText:
          '[Kualitas Foto: Jelas, tajam, seluruh tepi terbaca]. No. KK: 3515032108190011. Nama: AHMAD FAUZI PRATAMA, NIK 3515031405920004, Tempat Lahir: SIDOARJO, Tanggal Lahir: 14-05-1992. Alamat: Dusun Krajan RT 003 RW 002 Desa Kedungwonokerto Kec. Prambon.',
      },
      {
        slotKey: 'akta',
        name: 'Akta_Kelahiran_Ahmad_Fauzi.jpg',
        docType: 'Akta Kelahiran',
        simulatedText:
          '[Kualitas Foto: Jelas, pencahayaan baik]. Kutipan Akta Kelahiran atas nama AHMAD FAUZI PRATAMA, lahir di SIDOARJO pada tanggal 14 Mei 1992.',
      },
      {
        slotKey: 'nikah',
        name: 'Buku_Nikah_Fauzi_Siti.jpg',
        docType: 'Surat / Buku Nikah',
        simulatedText:
          '[Kualitas Foto: Jelas, stempel KUA terbaca]. Suami: Ahmad Fauzi Pratama, Tempat/Tgl Lahir: Sidoarjo, 14 Mei 1992. Istri: Siti Nurhaliza, Sidoarjo, 22 Agustus 1994.',
      },
      {
        slotKey: 'ijazah',
        name: 'Ijazah_Terakhir_Ahmad_Fauzi.jpg',
        docType: 'Ijazah Terakhir',
        simulatedText:
          '[Kualitas Foto: Jelas, nama & TTL terbaca]. Nama: AHMAD FAUZI PRATAMA. Tempat dan Tanggal Lahir: Sidoarjo, 14 Mei 1992.',
      },
      {
        slotKey: 'pengantar',
        name: 'Surat_Pengantar_RTRW_Kedungwonokerto.jpg',
        docType: 'Surat Pengantar RT/RW',
        simulatedText:
          '[Kualitas Foto: Jelas, bertanda tangan Ketua RT 003 / RW 002 dan berstempel Desa Kedungwonokerto]. Nama: Ahmad Fauzi Pratama, NIK 3515031405920004, keperluan: Pembuatan/Pecah KK baru.',
      },
    ],
  },
  {
    id: 'preset_mismatch',
    label: 'Simulasi Beda Ejaan, Tempat & Tahun Lahir',
    badgeText: 'Deteksi Ketidaksesuaian',
    serviceId: 'KTP_EL',
    citizenInfo: {
      nama: 'Mochamad Arifin',
      nik: '3515030809920002',
      tempatTanggalLahir: 'Sidoarjo, 08 September 1992',
      alamat: 'Jl. Diponegoro RT 002 RW 001',
      desa: 'Watutulis',
      nomorKK: '3515031104180007',
    },
    extraNotes: 'Ingin perbarui KTP-el & KK, namun nama dan tanggal lahir di ijazah dan akta sedikit berbeda.',
    simulatedDocs: [
      {
        slotKey: 'kk',
        name: 'KK_Mochamad_Arifin.jpg',
        docType: 'Kartu Keluarga (KK)',
        simulatedText:
          '[Kualitas Foto: Jelas]. Nama: MOCHAMAD ARIFIN. Tempat Lahir: SIDOARJO. Tanggal Lahir: 08-09-1992. NIK: 3515030809920002.',
      },
      {
        slotKey: 'akta',
        name: 'Akta_Lahir_Arifin.jpg',
        docType: 'Akta Kelahiran',
        simulatedText:
          '[Kualitas Foto: Jelas]. Nama: MOCHAMAD ARIFIN. Tempat Lahir: PRAMBON (tertulis kecamatan, bukan kabupaten Sidoarjo). Tanggal Lahir: 08 September 1992.',
      },
      {
        slotKey: 'nikah',
        name: 'Buku_Nikah_Arifin.jpg',
        docType: 'Surat / Buku Nikah',
        simulatedText:
          '[Kualitas Foto: Jelas]. Nama Suami: Moch. Arifin (disingkat "Moch."). Tempat/Tgl Lahir: Sidoarjo, 08 September 1992.',
      },
      {
        slotKey: 'ijazah',
        name: 'Ijazah_SMA_Arifin.jpg',
        docType: 'Ijazah Terakhir',
        simulatedText:
          '[Kualitas Foto: Jelas]. Nama: MUHAMMAD ARIFIN (tertulis "Muhammad" bukan "Mochamad"). Tempat/Tgl Lahir: Sidoarjo, 08 September 1993 (tahun lahir tertulis 1993, selisih 1 tahun dari KK 1992).',
      },
      {
        slotKey: 'pengantar',
        name: 'Pengantar_RTRW_Watutulis.jpg',
        docType: 'Surat Pengantar RT/RW',
        simulatedText:
          '[Kualitas Foto: Jelas, ada stempel RT 002 RW 001 Watutulis]. Nama: Mochamad Arifin, lahir Sidoarjo 08-09-1992.',
      },
    ],
  },
  {
    id: 'preset_blurry',
    label: 'Simulasi Foto Buram & Berkas Kurang',
    badgeText: 'Cek Kualitas Foto',
    serviceId: 'KIA',
    citizenInfo: {
      nama: 'Nadia Putri Maharani',
      nik: '3515036504180003',
      tempatTanggalLahir: 'Sidoarjo, 25 April 2018',
      alamat: 'Dusun Tengah RT 004 RW 001',
      desa: 'Prambon',
      nomorKK: '3515031005160004',
    },
    extraNotes: 'Pengajuan KIA anak usia 8 tahun (kategori 5–17 tahun).',
    simulatedDocs: [
      {
        slotKey: 'kk',
        name: 'Foto_KK_Gelap_Terpotong.jpg',
        docType: 'Kartu Keluarga (KK)',
        simulatedText:
          '[Kualitas Foto: BURAM, pencahayaan gelap, dan bagian kiri kolom NIK terpotong di foto]. Sebagian teks terbaca: ...DIA PUTRI MAHARANI, Tgl Lahir 25-04-2018.',
      },
      {
        slotKey: 'akta',
        name: 'Akta_Lahir_Nadia.jpg',
        docType: 'Akta Kelahiran',
        simulatedText:
          '[Kualitas Foto: Jelas]. Nama Anak: NADIA PUTRI MAHARANI, lahir di Sidoarjo tanggal 25 April 2018.',
      },
    ],
  },
];

export const INITIAL_TICKETS: PreValidationTicket[] = [
  {
    id: 'PRB-2026-0412',
    createdAt: '2026-11-16T08:15:00.000Z',
    citizenName: 'Siti Aminah',
    nik: '3515034506910003',
    village: 'Wirobiting',
    serviceId: 'KK_PERUBAHAN',
    serviceName: 'Pembuatan / Perubahan / Pecah Kartu Keluarga (KK)',
    overallStatus: 'LENGKAP_COCOK',
    officerStatus: 'Terverifikasi Loket',
    summary:
      'Seluruh 5 dokumen wajib memiliki kualitas foto jelas serta data Nama, Tempat Lahir, dan Tanggal Lahir 100% konsisten di KK, Akta Kelahiran, Buku Nikah, Ijazah, dan Pengantar RT/RW.',
    documentCount: 5,
    uploadedDocNames: [
      'KK_Siti_Aminah.jpg',
      'Akta_Siti_Aminah.jpg',
      'Buku_Nikah.jpg',
      'Ijazah_Siti.jpg',
      'Pengantar_RTRW_Wirobiting.jpg',
    ],
    imageQualityChecks: [
      { docName: 'KK_Siti_Aminah.jpg', docType: 'Kartu Keluarga (KK)', qualityStatus: 'JELAS', note: 'Foto tajam, barcode TTE terbaca utuh.' },
      { docName: 'Akta_Siti_Aminah.jpg', docType: 'Akta Kelahiran', qualityStatus: 'JELAS', note: 'Teks lengkap dan tidak terpotong.' },
      { docName: 'Buku_Nikah.jpg', docType: 'Surat / Buku Nikah', qualityStatus: 'JELAS', note: 'Halaman identitas terbaca jelas.' },
      { docName: 'Ijazah_Siti.jpg', docType: 'Ijazah Terakhir', qualityStatus: 'JELAS', note: 'Nama & TTL terbaca jelas.' },
      { docName: 'Pengantar_RTRW_Wirobiting.jpg', docType: 'Surat Pengantar RT/RW', qualityStatus: 'JELAS', note: 'Tanda tangan & stempel jelas.' },
    ],
    documentMatrix: [
      {
        field: 'Penulisan Nama Lengkap',
        kkValue: 'SITI AMINAH',
        aktaValue: 'SITI AMINAH',
        nikahValue: 'Siti Aminah',
        ijazahValue: 'SITI AMINAH',
        pengantarValue: 'Siti Aminah',
        status: 'COCOK',
        impactAndFix: 'Penulisan huruf dan spasi identik di seluruh 5 berkas. Tidak perlu koreksi.',
      },
      {
        field: 'Tempat Lahir',
        kkValue: 'SIDOARJO',
        aktaValue: 'Sidoarjo',
        nikahValue: 'Sidoarjo',
        ijazahValue: 'Sidoarjo',
        pengantarValue: 'Sidoarjo',
        status: 'COCOK',
        impactAndFix: 'Penulisan kabupaten/kota tempat lahir konsisten.',
      },
      {
        field: 'Tanggal, Bulan, Tahun Lahir',
        kkValue: '05-06-1991',
        aktaValue: '05 Juni 1991',
        nikahValue: '05 Juni 1991',
        ijazahValue: '05 Juni 1991',
        pengantarValue: '05-06-1991',
        status: 'COCOK',
        impactAndFix: 'Tanggal, bulan, dan tahun lahir sama persis di semua dokumen.',
      },
    ],
    consistencyChecks: [
      {
        field: 'Penulisan Nama Lengkap',
        valueDocA: 'SITI AMINAH (KK & Akta)',
        valueDocB: 'SITI AMINAH (Ijazah & Buku Nikah)',
        status: 'COCOK',
        note: 'Penulisan huruf dan spasi identik di seluruh berkas.',
      },
      {
        field: 'Tempat & Tanggal Lahir',
        valueDocA: 'Sidoarjo, 05-06-1991',
        valueDocB: 'Sidoarjo, 05 Juni 1991',
        status: 'COCOK',
        note: 'Tempat dan tanggal lahir konsisten.',
      },
    ],
    checklist: [
      { item: 'Kartu Keluarga (KK) Asli', required: true, status: 'TERPENUHI', note: 'Terlampir jelas' },
      { item: 'Akta Kelahiran & Ijazah', required: true, status: 'TERPENUHI', note: 'Terlampir dan konsisten' },
      { item: 'Buku Nikah', required: true, status: 'TERPENUHI', note: 'Terlampir' },
      { item: 'Surat Pengantar RT/RW / Desa', required: true, status: 'TERPENUHI', note: 'Ada stempel desa' },
    ],
    recommendations: [
      'Bawa seluruh dokumen asli dan Tiket Pra-Validasi PRB-2026-0412 ke Loket Pelayanan Kecamatan Prambon.',
    ],
    commonIssueCategory: 'Lengkap Tanpa Kendala',
    officerNotes: 'Berkas fisik sudah diterima di Loket 2 dan sedang proses cetak KK TTE.',
  },
  {
    id: 'PRB-2026-0413',
    createdAt: '2026-11-16T09:05:00.000Z',
    citizenName: 'Mochamad Arifin',
    nik: '3515030809920002',
    village: 'Watutulis',
    serviceId: 'KTP_EL',
    serviceName: 'Perekaman / Cetak Ulang KTP-el',
    overallStatus: 'PERHATIAN_MINOR',
    officerStatus: 'Menunggu Kedatangan',
    summary:
      'Ditemukan perbedaan ejaan nama ("Mochamad" di KK vs "Muhammad" di Ijazah), perbedaan tempat lahir ("Sidoarjo" vs "Prambon" di Akta), dan selisih tahun lahir (1992 vs 1993 di Ijazah).',
    documentCount: 5,
    uploadedDocNames: [
      'KK_Mochamad_Arifin.jpg',
      'Akta_Arifin.jpg',
      'Buku_Nikah_Arifin.jpg',
      'Ijazah_Arifin.jpg',
      'Pengantar_RTRW_Watutulis.jpg',
    ],
    documentMatrix: [
      {
        field: 'Penulisan Nama Lengkap',
        kkValue: 'MOCHAMAD ARIFIN',
        aktaValue: 'MOCHAMAD ARIFIN',
        nikahValue: 'Moch. Arifin',
        ijazahValue: 'MUHAMMAD ARIFIN',
        pengantarValue: 'Mochamad Arifin',
        status: 'TIDAK_COCOK',
        impactAndFix:
          'Perbedaan "Mochamad" vs "Muhammad" dan singkatan "Moch." berisiko ditolak saat sinkronisasi data bank/BPJS/paspor. Tentukan nama baku sesuai Akta Kelahiran lalu ajukan pembetulan atau buat surat keterangan beda nama.',
      },
      {
        field: 'Tempat Lahir',
        kkValue: 'SIDOARJO',
        aktaValue: 'PRAMBON',
        nikahValue: 'Sidoarjo',
        ijazahValue: 'Sidoarjo',
        pengantarValue: 'Sidoarjo',
        status: 'PERBEDAAN_MINOR',
        impactAndFix:
          'Akta mencantumkan nama kecamatan (Prambon) sedangkan KK/Ijazah mencantumkan kabupaten (Sidoarjo). Standar Adminduk menggunakan nama Kabupaten/Kota ("Sidoarjo").',
      },
      {
        field: 'Tanggal, Bulan, Tahun Lahir',
        kkValue: '08-09-1992',
        aktaValue: '08-09-1992',
        nikahValue: '08-09-1992',
        ijazahValue: '08-09-1993',
        pengantarValue: '08-09-1992',
        status: 'TIDAK_COCOK',
        impactAndFix:
          'Tahun lahir di Ijazah tertulis 1993 (selisih 1 tahun dari KK & Akta 1992). Bawa Akta Kelahiran asli sebagai rujukan utama atau mintakan surat keterangan ralat dari sekolah penerbit ijazah.',
      },
    ],
    consistencyChecks: [
      {
        field: 'Penulisan Nama Lengkap',
        valueDocA: 'MOCHAMAD ARIFIN (KK)',
        valueDocB: 'MUHAMMAD ARIFIN (Ijazah)',
        status: 'TIDAK_COCOK',
        note: 'Beda ejaan "Mochamad" vs "Muhammad".',
      },
      {
        field: 'Tempat Lahir',
        valueDocA: 'SIDOARJO (KK)',
        valueDocB: 'PRAMBON (Akta)',
        status: 'PERBEDAAN_MINOR',
        note: 'Penulisan Kabupaten vs Kecamatan.',
      },
      {
        field: 'Tanggal Lahir',
        valueDocA: '08-09-1992 (KK & Akta)',
        valueDocB: '08-09-1993 (Ijazah)',
        status: 'TIDAK_COCOK',
        note: 'Selisih 1 tahun lahir.',
      },
    ],
    checklist: [
      { item: 'Kartu Keluarga (KK)', required: true, status: 'TERPENUHI', note: 'Terlampir' },
      { item: 'Akta Kelahiran', required: true, status: 'PERLU_CEK', note: 'Tempat lahir tertulis Prambon' },
      { item: 'Ijazah Terakhir', required: false, status: 'PERLU_CEK', note: 'Beda nama & tahun lahir' },
      { item: 'Surat Pengantar RT/RW / Desa', required: true, status: 'TERPENUHI', note: 'Terlampir' },
    ],
    recommendations: [
      'Gunakan Akta Kelahiran asli sebagai dasar pencocokan atau siapkan Formulir F-1.06 (Surat Pernyataan Perubahan Elemen Data) jika ingin menyeragamkan ejaan nama.',
      'Jika data ijazah yang keliru, mintakan surat keterangan kesalahan penulisan ijazah dari sekolah asal sebelum ke loket Kecamatan Prambon.',
    ],
    commonIssueCategory: 'Perbedaan Ejaan Nama',
    officerNotes: '',
  },
  {
    id: 'PRB-2026-0414',
    createdAt: '2026-11-16T09:42:00.000Z',
    citizenName: 'Hendra Wijaya',
    nik: '3515031903940002',
    village: 'Bulang',
    serviceId: 'KIA',
    serviceName: 'Kartu Identitas Anak (KIA) — Usia 0–5 & 5–17 Tahun',
    overallStatus: 'TIDAK_LENGKAP',
    officerStatus: 'Perlu Revisi Warga',
    summary:
      'Foto Kartu Keluarga buram dan bagian kiri NIK terpotong, serta belum melampirkan Surat Pengantar RT/RW dan pas foto anak 2x3 (wajib untuk usia 5–17 tahun).',
    documentCount: 2,
    uploadedDocNames: ['Foto_KK_Buram.jpg', 'Akta_Anak.jpg'],
    consistencyChecks: [
      {
        field: 'Kualitas Foto KK',
        valueDocA: 'Buram & terpotong',
        valueDocB: 'Harus jelas seluruh halaman',
        status: 'TIDAK_COCOK',
        note: 'Unggah ulang foto KK di tempat terang tanpa terpotong.',
      },
    ],
    checklist: [
      { item: 'Kartu Keluarga (KK) Jelas', required: true, status: 'PERLU_CEK', note: 'Foto buram, perlu foto ulang' },
      { item: 'Akta Kelahiran Anak', required: true, status: 'TERPENUHI', note: 'Terlampir' },
      { item: 'Pas Foto 2x3 Berwarna (Usia 5–17 Tahun)', required: true, status: 'BELUM_ADA', note: 'Belum terlampir' },
    ],
    recommendations: [
      'Foto ulang KK asli secara mendatar di ruang terang agar seluruh 16 digit NIK terbaca.',
      'Siapkan pas foto berwarna ukuran 2x3 sebanyak 2 lembar karena usia anak di atas 5 tahun.',
    ],
    commonIssueCategory: 'Kualitas Foto / Dokumen Kurang Jelas',
    officerNotes: 'Diminta unggah ulang KK yang jelas dan bawa pas foto 2x3.',
  },
  {
    id: 'PRB-2026-0415',
    createdAt: '2026-11-16T10:18:00.000Z',
    citizenName: 'Dewi Lestari',
    nik: '3515036107960001',
    village: 'Temu',
    serviceId: 'PINDAH_SKPWNI',
    serviceName: 'Surat Keterangan Pindah Datang (SKPWNI)',
    overallStatus: 'PERHATIAN_MINOR',
    officerStatus: 'Menunggu Kedatangan',
    summary:
      'KK dan KTP-el cocok, namun alamat tujuan pindah pada Formulir F-1.03 belum mencantumkan nomor RT/RW tujuan di Desa Temu.',
    documentCount: 3,
    uploadedDocNames: ['KK_Asli_Dewi.jpg', 'KTP_Dewi.jpg', 'Form_F103_Pindah.jpg'],
    consistencyChecks: [
      {
        field: 'Nama & NIK Pemohon',
        valueDocA: 'DEWI LESTARI (3515036107960001)',
        valueDocB: 'DEWI LESTARI (3515036107960001)',
        status: 'COCOK',
        note: 'Identitas utama cocok.',
      },
      {
        field: 'Alamat Tujuan Pindah',
        valueDocA: 'Desa Temu Kec. Prambon (Tanpa RT/RW)',
        valueDocB: 'RT 004 RW 002 (Pengantar Desa)',
        status: 'PERBEDAAN_MINOR',
        note: 'Lengkapi penulisan RT 004 RW 002 pada Formulir F-1.03.',
      },
    ],
    checklist: [
      { item: 'KK & KTP-el Asli', required: true, status: 'TERPENUHI', note: 'Lengkap' },
      { item: 'Surat Pengantar Pindah Desa', required: true, status: 'TERPENUHI', note: 'Ada stempel desa' },
      { item: 'Formulir F-1.03 Lengkap RT/RW', required: true, status: 'PERLU_CEK', note: 'Kolom RT/RW tujuan perlu dilengkapi' },
    ],
    recommendations: [
      'Lengkapi kolom RT 004 / RW 002 pada Formulir F-1.03 agar proses penerbitan SKPWNI tidak tertunda.',
    ],
    commonIssueCategory: 'Alamat RT/RW Belum Mutakhir',
    officerNotes: '',
  },
  {
    id: 'PRB-2026-0416',
    createdAt: '2026-11-16T11:05:00.000Z',
    citizenName: 'Sutrisno Hadi',
    nik: '3515030402680005',
    village: 'Wonoplintahan',
    serviceId: 'AKTA_LAHIR',
    serviceName: 'Penerbitan Akta Kelahiran',
    overallStatus: 'LENGKAP_COCOK',
    officerStatus: 'Selesai',
    summary:
      'Semua berkas pengajuan Akta Kelahiran lengkap dan penulisan nama orang tua serta tanggal lahir konsisten di KK, Buku Nikah, dan Surat Lahir Bidan.',
    documentCount: 5,
    uploadedDocNames: ['KK_Sutrisno.jpg', 'Surat_Lahir_Bidan.jpg', 'Buku_Nikah.jpg', 'Ijazah.jpg', 'Pengantar_Desa.jpg'],
    consistencyChecks: [
      {
        field: 'Nama Orang Tua',
        valueDocA: 'Sutrisno Hadi (KK)',
        valueDocB: 'Sutrisno Hadi (Buku Nikah & Surat Lahir)',
        status: 'COCOK',
        note: 'Nama dan tanggal lahir sesuai.',
      },
    ],
    checklist: [
      { item: 'Surat Keterangan Lahir', required: true, status: 'TERPENUHI', note: 'Asli dari Bidan Prambon' },
      { item: 'KK & Buku Nikah Orang Tua', required: true, status: 'TERPENUHI', note: 'Terlampir' },
      { item: 'Pengantar RT/RW & F-2.01', required: true, status: 'TERPENUHI', note: 'Terlampir' },
    ],
    recommendations: [
      'Dokumen sudah lengkap dan siap diproses di loket Pencatatan Sipil Kecamatan Prambon.',
    ],
    commonIssueCategory: 'Lengkap Tanpa Kendala',
    officerNotes: 'Kutipan Akta Kelahiran TTE sudah diterbitkan.',
  },
  {
    id: 'PRB-2026-0417',
    createdAt: '2026-11-16T12:30:00.000Z',
    citizenName: 'Rina Kusumawati',
    nik: '3515035812890006',
    village: 'Kajartengguli',
    serviceId: 'SURAT_KETERANGAN',
    serviceName: 'Legalisasi & Surat Keterangan Kecamatan',
    overallStatus: 'TIDAK_LENGKAP',
    officerStatus: 'Perlu Revisi Warga',
    summary:
      'Surat Pengantar RT/RW dan Keterangan Desa belum memiliki tanda tangan Kepala Desa/Sekdes dan nomor register desa.',
    documentCount: 2,
    uploadedDocNames: ['Surat_Usaha_Draft.jpg', 'KTP_Rina.jpg'],
    consistencyChecks: [
      {
        field: 'Legalitas Pengantar Desa',
        valueDocA: 'Kolom tanda tangan Kades kosong',
        valueDocB: 'Wajib tanda tangan & stempel desa',
        status: 'TIDAK_COCOK',
        note: 'Harus disahkan oleh Balai Desa Kajartengguli terlebih dahulu.',
      },
    ],
    checklist: [
      { item: 'Pengantar Resmi Bertanda Tangan Kades', required: true, status: 'BELUM_ADA', note: 'Belum ditandatangani & distempel' },
      { item: 'KTP-el Asli', required: true, status: 'TERPENUHI', note: 'Terlampir' },
    ],
    recommendations: [
      'Kunjungi Balai Desa Kajartengguli terlebih dahulu untuk meminta nomor register, tanda tangan Kepala Desa/Sekdes, dan stempel basah sebelum ke Kecamatan Prambon.',
    ],
    commonIssueCategory: 'Berkas Pengantar Kurang',
    officerNotes: 'Mohon dilegalisir di Balai Desa Kajartengguli terlebih dulu.',
  },
];

export const INITIAL_FAQS: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'Jam Layanan & Umum',
    question: 'Kapan jam operasional pelayanan Adminduk Kantor Kecamatan Prambon dan berapa biayanya?',
    answer:
      'Pelayanan Administrasi Kependudukan (Adminduk) Kecamatan Prambon beroperasi Senin–Kamis pukul 08.00–15.00 WIB dan Jumat pukul 08.00–14.30 WIB (istirahat 12.00–13.00 WIB). Seluruh layanan Adminduk adalah GRATIS (Rp 0) tanpa pungutan biaya apa pun sesuai ketentuan Dispendukcapil Kabupaten Sidoarjo.',
    serviceTag: 'Umum',
    updatedAt: '2026-11-10',
    isActive: true,
  },
  {
    id: 'faq-2',
    category: 'KTP-el',
    question: 'Apa syarat mengurus KTP-el baru, hilang, atau rusak di Kecamatan Prambon?',
    answer:
      'Untuk pemula usia 17 tahun: bawa fotokopi KK terbaru dan Akta Kelahiran/Ijazah untuk perekaman biometrik. Jika KTP-el hilang: lampirkan Surat Keterangan Kehilangan asli dari Polsek Prambon dan KK terbaru. Jika rusak: bawa KTP-el lama yang rusak dan fotokopi KK terbaru.',
    serviceTag: 'KTP-el',
    updatedAt: '2026-11-12',
    isActive: true,
  },
  {
    id: 'faq-3',
    category: 'KIA Anak',
    question: 'Apa perbedaan syarat pembuatan KIA untuk anak usia 0–5 tahun dan usia 5–17 tahun?',
    answer:
      'Untuk anak usia 0–5 tahun: cukup melampirkan KK orang tua, Akta Kelahiran anak, KTP-el kedua orang tua, dan Buku Nikah orang tua (KIA diterbitkan TANPA pas foto). Untuk anak usia 5 tahun sampai 17 tahun kurang 1 hari: syarat sama ditambah pas foto berwarna anak ukuran 2x3 sebanyak 2 lembar (latar merah untuk tahun lahir ganjil, biru untuk tahun lahir genap).',
    serviceTag: 'KIA',
    updatedAt: '2026-11-15',
    isActive: true,
  },
  {
    id: 'faq-4',
    category: 'Kartu Keluarga',
    question: 'Bagaimana jika ada perbedaan ejaan nama, tempat lahir, atau tahun lahir antara KK dengan Ijazah/Akta?',
    answer:
      'Jika terdapat perbedaan ejaan nama (misalnya "Mochamad" vs "Muhammad"), tempat lahir (kecamatan vs kabupaten), atau tanggal lahir, tentukan dokumen rujukan sah utama (umumnya Akta Kelahiran/Ijazah) lalu ajukan pembetulan elemen data KK dengan melampirkan Formulir F-1.02 dan Surat Pernyataan Perubahan Elemen Data (F-1.06).',
    serviceTag: 'Kartu Keluarga',
    updatedAt: '2026-11-14',
    isActive: true,
  },
  {
    id: 'faq-5',
    category: 'Akta Sipil',
    question: 'Berapa lama proses pembuatan Akta Kelahiran baru dan apakah harus datang ke Sidoarjo kota?',
    answer:
      'Tidak perlu ke kantor Dispendukcapil Sidoarjo kota. Warga dari 20 desa di Kecamatan Prambon cukup melengkapi Surat Keterangan Lahir dari Bidan/RS, KK, KTP orang tua, Buku Nikah, dan F-2.01 melalui desa atau loket Adminduk Kecamatan Prambon. Estimasi selesai 2–3 hari kerja.',
    serviceTag: 'Akta Kelahiran',
    updatedAt: '2026-11-15',
    isActive: true,
  },
  {
    id: 'faq-6',
    category: 'Pindah Datang',
    question: 'Apakah pindah antar desa dalam satu Kecamatan Prambon memerlukan SKPWNI?',
    answer:
      'Pindah antar desa dalam satu kecamatan maupun satu Kabupaten Sidoarjo tidak memerlukan SKPWNI keluar daerah, cukup mengurus Formulir F-1.03 beserta surat pengantar RT/RW & desa asal/tujuan dan KK asli untuk langsung diterbitkan KK dengan alamat desa yang baru.',
    serviceTag: 'Pindah Domisili',
    updatedAt: '2026-11-15',
    isActive: true,
  },
];

export const INITIAL_CHAT_SESSIONS: ChatSessionRecord[] = [
  {
    id: 'SES-WA-8801',
    channel: 'WhatsApp',
    citizenAlias: 'Warga Desa Watutulis (+62 812-34xx-xx19)',
    topicLabel: 'Pembetulan Nama KK vs Ijazah',
    status: 'Menunggu Petugas',
    escalatedReason: 'Kasus khusus perbedaan ejaan nama di Ijazah & SK Penyetaraan dari sekolah lama.',
    startedAt: '2026-11-16T19:40:00.000Z',
    updatedAt: '2026-11-16T19:42:00.000Z',
    messages: [
      {
        id: 'm-1',
        senderType: 'warga',
        senderName: 'Bapak Arifin (WA)',
        text: 'Assalamualaikum, pak/bu admin. Nama saya di KK tertulis Mochamad Arifin, tapi di ijazah SD-SMA tertulis Muhammad Arifin dan tahun lahir beda 1 tahun. Apakah harus ke Dispendukcapil Sidoarjo atau cukup di Kecamatan Prambon?',
        timestamp: '19:40',
      },
      {
        id: 'm-2',
        senderType: 'ai',
        senderName: 'Asisten AI SIAP Prambon',
        text: 'Halo Warga Prambon! Untuk perbedaan ejaan nama dan tahun lahir antara KK dan Ijazah, pengajuan awal **perubahan elemen data KK (Formulir F-1.02 & F-1.06)** dapat dilayani melalui loket Kecamatan Prambon dengan dokumen dasar Akta Kelahiran asli. Namun karena terdapat selisih tahun lahir lintas dokumen pendidikan, sesi ini kami teruskan ke Petugas Loket Kecamatan agar diperiksa berkas acuannya.',
        timestamp: '19:40',
        responseTimeMs: 2150,
        detectedIntent: 'KK_PERUBAHAN',
        suggestedServiceId: 'KK_PERUBAHAN',
        formCodes: ['F-1.02', 'F-1.06'],
      },
      {
        id: 'm-3',
        senderType: 'system',
        text: 'Sesi dialihkan ke antrean Petugas Loket Kecamatan Prambon (Human Handover).',
        timestamp: '19:42',
      },
    ],
  },
  {
    id: 'SES-IG-8802',
    channel: 'Instagram DM',
    citizenAlias: '@putri_prambon (Desa Kedungwonokerto)',
    topicLabel: 'KIA Anak Usia 6 Tahun & Foto',
    status: 'Menunggu Petugas',
    escalatedReason: 'Warga menanyakan kasus khusus akta kelahiran terbitan luar provinsi sebelum pindah ke Prambon.',
    startedAt: '2026-11-16T20:10:00.000Z',
    updatedAt: '2026-11-16T20:11:00.000Z',
    messages: [
      {
        id: 'm-21',
        senderType: 'warga',
        senderName: '@putri_prambon (IG DM)',
        text: 'Min mau tanya dong, anakku umur 6 tahun mau bikin KIA di Prambon. Tapi akta lahirnya dulu terbit di luar Jawa Timur sebelum pindah KK ke sini. Bisa langsung diproses di kecamatan?',
        timestamp: '20:10',
      },
      {
        id: 'm-22',
        senderType: 'ai',
        senderName: 'Asisten AI SIAP Prambon',
        text: 'Halo Warga Prambon! Syarat KIA usia 5–17 tahun adalah KK orang tua, Akta Kelahiran anak, KTP orang tua, Buku Nikah, dan pas foto 2x3 sebanyak 2 lembar (latar merah/biru). Terkait sinkronisasi nomor akta kelahiran luar daerah pada sistem SIAK, petugas loket kami siap membantu pengecekan status datanya.',
        timestamp: '20:10',
        responseTimeMs: 2410,
        detectedIntent: 'KIA',
        suggestedServiceId: 'KIA',
        formCodes: ['F-1.02'],
      },
      {
        id: 'm-23',
        senderType: 'warga',
        senderName: '@putri_prambon (IG DM)',
        text: 'Oke min tolong sambungkan ke petugas loket ya biar saya pastikan dulu besok pagi nggak bolak-balik.',
        timestamp: '20:11',
      },
    ],
  },
  {
    id: 'SES-WA-8803',
    channel: 'WhatsApp',
    citizenAlias: 'Ibu Sumarni (+62 857-48xx-xx04)',
    topicLabel: 'Pecah KK & Surat Pindah Antar Desa',
    status: 'Sedang Dibalas Petugas',
    assignedAgentName: 'Siti Rahmawati, S.Sos',
    startedAt: '2026-11-16T10:15:00.000Z',
    updatedAt: '2026-11-16T10:22:00.000Z',
    messages: [
      {
        id: 'm-31',
        senderType: 'warga',
        senderName: 'Ibu Sumarni (WA)',
        text: 'Bu petugas, saya pindah dari Desa Bulang ke Desa Temu masih satu Kecamatan Prambon. Apa perlu surat SKPWNI?',
        timestamp: '10:15',
      },
      {
        id: 'm-32',
        senderType: 'petugas',
        senderName: 'Siti Rahmawati, S.Sos',
        text: 'Waalaikumsalam Ibu Sumarni. Untuk pindah antar desa dalam satu Kecamatan Prambon tidak perlu SKPWNI keluar daerah. Ibu cukup mengisi Formulir F-1.03 dengan pengantar Desa Bulang dan Desa Temu serta membawa KK asli. Layanan Gratis Rp 0.',
        timestamp: '10:22',
      },
    ],
  },
  {
    id: 'SES-WA-8804',
    channel: 'WhatsApp',
    citizenAlias: 'Mas Dimas (+62 813-59xx-xx82)',
    topicLabel: 'Syarat KTP-el Pemula Usia 17 Tahun',
    status: 'Selesai',
    startedAt: '2026-11-16T19:05:00.000Z',
    updatedAt: '2026-11-16T19:07:00.000Z',
    closedAt: '2026-11-16T19:07:00.000Z',
    messages: [
      {
        id: 'm-41',
        senderType: 'warga',
        senderName: 'Mas Dimas (WA)',
        text: 'Syarat gawe KTP anyar umur 17 tahun teng Kecamatan Prambon nopo mawon nggeh?',
        timestamp: '19:05',
      },
      {
        id: 'm-42',
        senderType: 'ai',
        senderName: 'Asisten AI SIAP Prambon',
        text: 'Sugeng dalu Warga Prambon! Kangge damel KTP-el pemula yuswa 17 taun wonten Kecamatan Prambon, syaratipun gampil sanget:\n- Fotokopi **Kartu Keluarga (KK)** paling enggal.\n- **Akta Kelahiran / Ijazah** kangge cocogaken ejaan nami lan tanggal lahir.\n- Rawuh langsung dhateng loket Kecamatan Prambon (Senin–Kamis 08.00–15.00 WIB, Jumat 08.00–14.30 WIB) kangge rekam foto & sidik jari.\nSedaya layanan **GRATIS (Rp 0)**.',
        timestamp: '19:05',
        responseTimeMs: 1980,
        detectedIntent: 'KTP_EL',
        suggestedServiceId: 'KTP_EL',
        formCodes: ['F-1.02'],
      },
    ],
    feedback: {
      isHelpful: true,
      rating: 5,
      comment: 'Penjelasan bahasa Jawanya sopan dan jelas sekali, langsung paham.',
      createdAt: '2026-11-16T19:07:00.000Z',
    },
  },
  {
    id: 'SES-IG-8805',
    channel: 'Instagram DM',
    citizenAlias: '@hendra_sidoarjo (Desa Simogirang)',
    topicLabel: 'Jam Layanan & Blanko KTP-el',
    status: 'Selesai',
    startedAt: '2026-11-16T20:45:00.000Z',
    updatedAt: '2026-11-16T20:48:00.000Z',
    closedAt: '2026-11-16T20:48:00.000Z',
    messages: [
      {
        id: 'm-51',
        senderType: 'warga',
        senderName: '@hendra_sidoarjo (IG DM)',
        text: 'Min apakah stok blanko KTP-el hari ini masih ada untuk cetak KTP rusak?',
        timestamp: '20:45',
      },
      {
        id: 'm-52',
        senderType: 'ai',
        senderName: 'Asisten AI SIAP Prambon',
        text: 'Halo Warga Prambon! Untuk pencetakan KTP-el rusak, silakan bawa KTP-el fisik yang rusak, KK terbaru, dan Formulir F-1.02 (Gratis Rp 0). Terkait ketersediaan kuota blanko harian di loket, Anda dapat menekan tombol Hubungi Petugas pada jam kerja.',
        timestamp: '20:45',
        responseTimeMs: 2640,
        detectedIntent: 'KTP_EL',
        suggestedServiceId: 'KTP_EL',
      },
    ],
    feedback: {
      isHelpful: false,
      rating: 2,
      comment: 'Belum bisa menampilkan jumlah sisa stok blanko real-time hari ini.',
      createdAt: '2026-11-16T20:48:00.000Z',
    },
  },
];
