export interface Muwakif {
  id: string;
  nama: string;
  nominal: number;
  paket?: string;
  tanggal: string;
  pesanDoa: string;
  isHambaAllah: boolean;
  isVerified: boolean;
  metode: 'BSI' | 'QRIS' | 'Lainnya';
  keterangan?: string;
}

export interface MilestonePembangunan {
  id: number;
  judul: string;
  deskripsi: string;
  persentase: number;
  status: 'Selesai' | 'Sedang Berjalan' | 'Akan Datang';
  targetSelesai: string;
  fotoUrl: string;
  rincianPekerjaan: string[];
}

export interface BeritaInfo {
  id: string;
  judul: string;
  ringkasan: string;
  konten: string;
  kategori: 'Pembangunan' | 'Kegiatan' | 'Kajian' | 'Pengumuman';
  tanggal: string;
  penulis: string;
  gambarUrl: string;
  bacaMenit: number;
}

export interface VideoDakwah {
  id: string;
  youtubeId: string;
  judul: string;
  penceramah?: string;
  durasi: string;
  kategori: 'Kajian' | 'Progress Pembangunan' | 'Shorts';
  tanggal: string;
}

export interface JadwalWaktu {
  imsak: string;
  subuh: string;
  syuruq: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}
