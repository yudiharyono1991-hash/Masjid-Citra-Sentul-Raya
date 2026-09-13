import { Muwakif, MilestonePembangunan, BeritaInfo, VideoDakwah } from '../types';

export const INITIAL_STATS = {
  targetDana: 0, // Rp 0
  terkumpul: 0,   // Rp 0
  totalMuwakif: 1284,
  luasBangunan: '1.800 m²',
  kapasitasJamaah: '2.500 Jamaah',
  progresKeseluruhan: 32,
};

export const INITIAL_MUWAKIF: Muwakif[] = [
  {
    id: 'mw-1',
    nama: 'H. Bambang Sugianto & Keluarga',
    nominal: 50000000,
    paket: 'Paket Tiang Utama (Pilar Masjid)',
    tanggal: '2026-07-28',
    pesanDoa: 'Bismillah, wujud cinta untuk orang tua tercinta. Semoga menjadi penerang kubur.',
    isHambaAllah: false,
    isVerified: true,
    metode: 'BSI',
  },
  {
    id: 'mw-2',
    nama: 'Hamba Allah (Warga Cluster Citra Sentul)',
    nominal: 15000000,
    paket: 'Paket 10m² Lantai Shalat',
    tanggal: '2026-07-28',
    pesanDoa: 'Semoga anak-anak kami tumbuh menjadi hafiz Al-Qur\'an dan istiqomah.',
    isHambaAllah: true,
    isVerified: true,
    metode: 'BSI',
  },
  {
    id: 'mw-3',
    nama: 'Ibu Hj. Ratna Dewi',
    nominal: 5000000,
    paket: 'Paket Tiang Utama',
    tanggal: '2026-07-27',
    pesanDoa: 'Niat ikhlas wakaf atas nama almarhum suami tercinta. Al-Fatihah.',
    isHambaAllah: false,
    isVerified: true,
    metode: 'QRIS',
  },
  {
    id: 'mw-4',
    nama: 'Ahmad Fauzi & Rekan Warga Citra Sentul',
    nominal: 3000000,
    paket: 'Paket 2m² Lantai Shalat',
    tanggal: '2026-07-26',
    pesanDoa: 'Barakallah, semoga Masjid Citra Sentul Raya menjadi pusat kebangkitan ekonomi syariah dan dakwah.',
    isHambaAllah: false,
    isVerified: true,
    metode: 'BSI',
  },
  {
    id: 'mw-5',
    nama: 'Hamba Allah',
    nominal: 1500000,
    paket: 'Paket 1m² Lantai Shalat',
    tanggal: '2026-07-25',
    pesanDoa: 'Semoga diberikan kelancaran pembangunan masjid dan keutuhan NKRI.',
    isHambaAllah: true,
    isVerified: true,
    metode: 'BSI',
  },
  {
    id: 'mw-6',
    nama: 'Bpk. Hendra Gunawan',
    nominal: 500000,
    paket: 'Paket Semen & Batako',
    tanggal: '2026-07-24',
    pesanDoa: 'Sedekah subuh rutin untuk keberkahan usaha dan kesehatan keluarga.',
    isHambaAllah: false,
    isVerified: true,
    metode: 'QRIS',
  },
];

export const MILESTONES_PEMBANGUNAN: MilestonePembangunan[] = [
  {
    id: 1,
    judul: 'Pembebasan Lahan & Perencanaan Arsitektur',
    deskripsi: 'Pengurusan legalitas wakaf tanah, site plan kawasan Citra Sentul Raya, penetapan arah kiblat resmi, dan desain 3D Masjid.',
    persentase: 100,
    status: 'Selesai',
    targetSelesai: 'Januari 2026',
    fotoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b2?auto=format&fit=crop&w=800&q=80',
    rincianPekerjaan: [
      'Persetujuan IMB & Izin Gangguan',
      'Pengukuran Kiblat Kemenag Bogor',
      'Masterplan Lingkungan Citra Sentul Raya',
      'Pematangan Lahan & Cut/Fill'
    ]
  },
  {
    id: 2,
    judul: 'Pekerjaan Fondasi Pancak & Ground Floor',
    deskripsi: 'Pemasangan tiang pancang, pekerjaan besi beton bertulang ultra-heavy duty, pengecoran basement wudhu dan lantai dasar.',
    persentase: 100,
    status: 'Selesai',
    targetSelesai: 'Mei 2026',
    fotoUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80',
    rincianPekerjaan: [
      'Pemasangan 64 Titik Bore Pile',
      'Pengecoran Sloof & Pile Cap',
      'Instalasi Ground Tank Air Wudhu 30.000 Liter',
      'Drainase Keliling Komposisi Syariah'
    ]
  },
  {
    id: 3,
    judul: 'Struktur Utama, Pilar & Plat Floor 2',
    deskripsi: 'Pembangunan 12 pilar penyangga mega struktur, balok gantung, lantai utama shalat, dan tangga akses mezzanine wanita.',
    persentase: 65,
    status: 'Sedang Berjalan',
    targetSelesai: 'Oktober 2026',
    fotoUrl: 'https://images.unsplash.com/photo-1590073844006-33379778ae09?auto=format&fit=crop&w=800&q=80',
    rincianPekerjaan: [
      'Pengecoran Pilar Utama Ruang Shalat (Selesai 8/12)',
      'Bekisting Plat Lantai Mezzanine',
      'Pemasangan Besi D22 Ulir Balok Utama',
      'Perikatan Struktur Mihrab Utama'
    ]
  },
  {
    id: 4,
    judul: 'Kubah Utama, Menara & Rangka Atap Stainless',
    deskripsi: 'Pemasangan rangka baja space frame kubah diameter 18 meter, menara setinggi 33 meter, dan penutup atap kedap suara.',
    persentase: 15,
    status: 'Akan Datang',
    targetSelesai: 'Februari 2027',
    fotoUrl: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=800&q=80',
    rincianPekerjaan: [
      'Fabrikasi Rangka Baja Kubah Enamel',
      'Pembangunan Menara Azan 33M',
      'Sistem Penangkal Petir Radius 100M',
      'Pemasangan Kaca Inovasi Tempered Low-E'
    ]
  },
  {
    id: 5,
    judul: 'Finishing Interior, Marmer, Sound & Lanskap',
    deskripsi: 'Pemasangan lantai marmer motif geometris, Ornamen Kaligrafi Kufi, Sound System Line-Array, Pendingin AC, & Taman Sejuk.',
    persentase: 0,
    status: 'Akan Datang',
    targetSelesai: 'Juni 2027',
    fotoUrl: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80',
    rincianPekerjaan: [
      'Marmer Import Lampung & Makassar',
      'Kaligrafi Handmade Ornamen Kayu Jati',
      'Karpet Shalat Turki Grade A 14mm',
      'Lanskap Taman Edukasi & Area Parkir 120 Mobil'
    ]
  }
];

export const BERITA_LIST: BeritaInfo[] = [
  {
    id: 'news-1',
    judul: 'Perkembangan Pengecoran Pilar Utama Masjid Citra Sentul Raya Tahap 3',
    ringkasan: 'Alhamdulillah, tim teknis pembangunan telah menyelesaikan 8 dari 12 pilar penyangga utama ruang shalat utama.',
    konten: `Assalamu'alaikum Warahmatullahi Wabarakatuh.
    
Para muwakif dan dermawan yang dirahmati Allah, kami sampaikan laporan perkembangan fisik pembangunan Masjid Citra Sentul Raya per minggu ini. 

Proses pengecoran pilar utama ruang shalat utama telah mencapai 65%. Tim insinyur dari Tim Konstruksi Masjid beserta kontraktor lokal bekerja dengan teliti memastikan ketahanan gempa dan presisi struktur. Pengecoran menggunakan beton mutu K-350 dengan sistem curing terlindungi.

Kami mengucapkan terima kasih yang sebesar-besarnya kepada seluruh dermawan yang terus menyalurkan wakafnya. Mari terus kita doakan agar pembangunan berjalan lancar tanpa kendala.`,
    kategori: 'Pembangunan',
    tanggal: '2026-07-27',
    penulis: 'Panitia Pembangunan (Pak Leo)',
    gambarUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b2?auto=format&fit=crop&w=800&q=80',
    bacaMenit: 3,
  },
  {
    id: 'news-2',
    judul: 'Keutamaan Wakaf Pembangunan Masjid: Tabungan Terbaik Menuju Akhirat',
    ringkasan: 'Mengapa wakaf masjid disebut sebagai amal jariyah yang pahalanya tidak pernah terputus? Simak ulasan fiqih wakaf ringkas.',
    konten: `Nabi Muhammad SAW bersabda: "Apabila manusia meninggal dunia, maka terputuslah amalnya kecuali tiga perkara: sedekah jariyah, ilmu yang bermanfaat, atau anak saleh yang mendoakannya." (HR. Muslim).

Wakaf pembangunan masjid merupakan salah satu wujud sedekah jariyah paling nyata. Setiap sujud jamaah, setiap huruf Al-Qur'an yang dibaca santri, dan setiap kalimat thoyyibah yang berkumandang di Masjid Citra Sentul Raya akan memancarkan pahala mengalir kepada para muwakif.

Bagi Bapak/Ibu yang berniat mewakafkan sebagian rezekinya atas nama diri sendiri maupun orang tua tercinta yang telah wafat, pintu wakaf senantiasa terbuka lebar.`,
    kategori: 'Pengumuman',
    tanggal: '2026-07-22',
    penulis: 'Tim Dakwah Ashabul Yamin',
    gambarUrl: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80',
    bacaMenit: 4,
  },
  {
    id: 'news-3',
    judul: 'Silaturahmi & Doa Bersama Tokoh Masyakarat Sentul Sirkuit bersama DKM Masjid',
    ringkasan: 'Acara keakraban warga kompleks Citra Sentul Raya untuk mematangkan agenda sosial dan pembentukan pengurus DKM pendamping.',
    konten: `Berlokasi di sekretariat panitia pembangunan Sirkuit Sentul, telah dilaksanakan silaturahmi tokoh warga Citra Sentul Raya bersama Pak Grandis dan jajaran pengurus DKM Masjid.

Dalam pertemuan ini disepakati skema transparansi keuangan berbasis digital, jadwal audit berkala, serta program kerja awal DKM seperti Pelatihan Tahsin Al-Qur'an dan Bazar UMKM Halal.`,
    kategori: 'Kegiatan',
    tanggal: '2026-07-18',
    penulis: 'Humas Masjid Citra Sentul',
    gambarUrl: 'https://images.unsplash.com/photo-1590073844006-33379778ae09?auto=format&fit=crop&w=800&q=80',
    bacaMenit: 2,
  },
];

export const VIDEOS_DAKWAH: VideoDakwah[] = [
  {
    id: 'v1',
    youtubeId: '7Aty3iox3Zw', // Video asli dari Ashabul Yamin TV
    judul: 'Kajian Rutin Ashabul Yamin TV: Menata Hati dengan Amal Jariyah Wakaf',
    penceramah: 'Ust. H. Ahmad Farhan, M.A.',
    durasi: '45:12',
    kategori: 'Kajian',
    tanggal: '2026-07-25',
  },
  {
    id: 'v2',
    youtubeId: 'VfV_KljBMj4', // Video asli dari Ashabul Yamin TV
    judul: 'Update Rencana Desain & Visual 3D Masjid Citra Sentul Raya Sirkuit Sentul',
    penceramah: 'Tim Arsitek Masjid',
    durasi: '12:40',
    kategori: 'Progress Pembangunan',
    tanggal: '2026-07-20',
  },
  {
    id: 'v3',
    youtubeId: '6FdsRZRNEhw', // Video asli dari Ashabul Yamin TV
    judul: 'Doa Bersama Peletakan Batu Pertama & Pengecoran Fondasi Masjid',
    penceramah: 'Ustadz & Tokoh Warga Sentul',
    durasi: '28:15',
    kategori: 'Kajian',
    tanggal: '2026-07-10',
  },
];

export const PAKET_WAKAF_LIST = [
  {
    id: 'p-1',
    nama: 'Wakaf Keramik & Batako',
    nominal: 100000,
    deskripsi: 'Setara dengan 1 dus keramik lantai shalat atau 15 batako presisi.',
    populer: false,
    badge: 'Mudah & Berkah',
    icon: 'BrickWall',
  },
  {
    id: 'p-2',
    nama: 'Wakaf Semen & Besi Beton',
    nominal: 250000,
    deskripsi: 'Setara 3 sak semen mutu tinggi dan struktur penguat sloof.',
    populer: false,
    badge: 'Pilihan Favorit',
    icon: 'PackageCheck',
  },
  {
    id: 'p-3',
    nama: 'Wakaf 1 m² Lantai Shalat Utama',
    nominal: 1500000,
    deskripsi: 'Setara 1 meter persegi lantai shalat marmer, karpet Turki & instalasi.',
    populer: true,
    badge: 'Paling Banyak Dipilih',
    icon: 'Maximize2',
  },
  {
    id: 'p-4',
    nama: 'Wakaf Tiang Utama (Pilar Masjid)',
    nominal: 5000000,
    deskripsi: 'Pilar penyangga kokoh yang menopang kubah utama rumah Allah.',
    populer: false,
    badge: 'Amal Jariyah Utama',
    icon: 'Columns',
  },
];

export const KONTAK_PANITIA = [
  { nama: 'Leo', noTelepon: '+62 812-1920-0400', noWa: '6281219200400' },
  { nama: 'Andi', noTelepon: '+62 822-6066-7751', noWa: '6282260667751' },
  { nama: 'Hendra', noTelepon: '+62 858-8189-3650', noWa: '6285881893650' },
];
