// Data Pengurus DKM Masjid Citra Sentul Raya Periode 2026-2028

export interface Pengurus {
  id: string;
  jabatan: string;
  bidang: string;
  nama: string;
  role: string;
  username: string;
  urutan: number;
}

export const PENGURUS_DKM: Pengurus[] = [
  { id: 'p1', jabatan: 'Penasehat', bidang: 'Dewan Penasehat', nama: 'Sumajianto', role: 'penasehat', username: 'sumajianto', urutan: 1 },
  { id: 'p2', jabatan: 'Penasehat', bidang: 'Dewan Penasehat', nama: 'Wahyudi Sandji Idrus', role: 'penasehat', username: 'wahyudi', urutan: 2 },
  { id: 'p3', jabatan: 'Ketua DKM', bidang: 'Pimpinan', nama: 'Leo D Rustiyanto', role: 'direktur', username: 'ketua', urutan: 3 },
  { id: 'p4', jabatan: 'Bendahara', bidang: 'Pimpinan', nama: 'Grandis Imama Hendra', role: 'bendahara', username: 'bendahara', urutan: 4 },
  { id: 'p5', jabatan: 'Sekretaris', bidang: 'Sekretariat & Administrasi', nama: 'Muh. Zaid', role: 'sekretaris', username: 'sekretaris', urutan: 5 },
  { id: 'p6', jabatan: 'Koordinator', bidang: 'Bidang Peribadatan', nama: 'Choir Yuzarsif', role: 'peribadatan', username: 'choir', urutan: 6 },
  { id: 'p7', jabatan: 'Anggota', bidang: 'Bidang Peribadatan', nama: 'Gani', role: 'peribadatan', username: 'gani', urutan: 7 },
  { id: 'p8', jabatan: 'Koordinator', bidang: 'Bidang Pembangunan & Pengembangan', nama: 'Andi Rahman', role: 'pembangunan', username: 'andirm', urutan: 8 },
  { id: 'p9', jabatan: 'Anggota', bidang: 'Bidang Pembangunan & Pengembangan', nama: 'Sahrul', role: 'pembangunan', username: 'sahrul', urutan: 9 },
  { id: 'p10', jabatan: 'Koordinator', bidang: 'Bidang Umum', nama: 'Didi', role: 'umum', username: 'didi', urutan: 10 },
  { id: 'p11', jabatan: 'Anggota', bidang: 'Bidang Umum', nama: 'Satria', role: 'umum', username: 'satria', urutan: 11 },
  { id: 'p12', jabatan: 'Koordinator', bidang: 'Bidang Muslimah', nama: 'Dewi Okty', role: 'muslimah', username: 'dewi', urutan: 12 },
  { id: 'p13', jabatan: 'Anggota', bidang: 'Bidang Muslimah', nama: 'Sutji', role: 'muslimah', username: 'sutji', urutan: 13 },
];

export const PENGURUS_BY_BIDANG = (): Record<string, Pengurus[]> => {
  const grouped: Record<string, Pengurus[]> = {};
  PENGURUS_DKM.forEach(p => {
    if (!grouped[p.bidang]) grouped[p.bidang] = [];
    grouped[p.bidang].push(p);
  });
  return grouped;
};

export const ROLE_LABELS: Record<string, string> = {
  direktur: 'Ketua DKM',
  bendahara: 'Bendahara',
  sekretaris: 'Sekretaris',
  peribadatan: 'Bidang Peribadatan',
  pembangunan: 'Bidang Pembangunan & Pengembangan',
  umum: 'Bidang Umum',
  muslimah: 'Bidang Muslimah',
  penasehat: 'Penasehat',
  staff: 'Staf / Petugas',
  admin: 'Administrator',
};

export const getPengurusByRole = (role: string): Pengurus[] =>
  PENGURUS_DKM.filter(p => p.role === role);

export const getPrimaryPengurus = (role: string): Pengurus | undefined =>
  PENGURUS_DKM.find(p => p.role === role);
