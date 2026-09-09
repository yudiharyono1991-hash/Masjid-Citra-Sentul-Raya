import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, PlusCircle, Search, Download, Eye, Trash2, X, Upload, 
  CheckCircle, AlertTriangle, Filter, Printer, Database, RefreshCw, Info 
} from 'lucide-react';
import { PENGURUS_DKM, ROLE_LABELS } from '../data/pengurusData';
import { toLocalDateString } from '../utils/formatters';
import { supabase } from '../lib/supabase';
import { Pagination } from './Pagination';

export interface SuratItem {
  id: string;
  nomorSurat: string;
  jenis: 'keluar' | 'masuk' | 'sk' | 'undangan' | 'berita_acara';
  perihal: string;
  tanggal: string;
  pengirimPenerima: string;
  penandatangan: string;
  jabatanTtd: string;
  keterangan: string;
  fileUrl: string | null; // base64 or object URL
  fileName: string;
  status: 'draft' | 'final';
  dibuatOleh: string;
  dibuatPada: string;
}

interface ModulSuratMenyuratProps {
  adminRole?: string;
}

const BULAN_ROMAWI = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

const JENIS_SURAT = [
  { id: 'keluar', label: 'Surat Keluar' },
  { id: 'masuk', label: 'Surat Masuk' },
  { id: 'sk', label: 'Surat Keputusan (SK)' },
  { id: 'undangan', label: 'Surat Undangan' },
  { id: 'berita_acara', label: 'Berita Acara' },
];

const generateNomorSurat = (jenis: string, suratList: SuratItem[]): string => {
  const now = new Date();
  const tahun = now.getFullYear();
  const bulanRomawi = BULAN_ROMAWI[now.getMonth()];
  const jenisMap: Record<string, string> = {
    keluar: 'SK',
    masuk: 'SM',
    sk: 'SK.Kep',
    undangan: 'UND',
    berita_acara: 'BA',
  };
  const prefix = jenisMap[jenis] || 'S';
  // Count existing surat of same type in same year
  const count = suratList.filter(s => {
    const yr = s.nomorSurat.split('/').pop();
    return s.jenis === jenis && yr === String(tahun);
  }).length + 1;
  const seq = String(count).padStart(3, '0');
  return `${seq}/${prefix}/DKM-CSR/${bulanRomawi}/${tahun}`;
};

const LOCAL_STORAGE_KEY = 'dkm_surat_menyurat';

const getLocalSurat = (): SuratItem[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error reading surat from localStorage:', e);
    return [];
  }
};

const saveLocalSurat = (items: SuratItem[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('LocalStorage quota warning, trimming heavy files:', e);
    try {
      const stripped = items.map(item => ({
        ...item,
        fileUrl: item.fileUrl && item.fileUrl.length > 100000 ? null : item.fileUrl
      }));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stripped));
    } catch (e2) {
      console.error('Failed to save surat to localStorage:', e2);
    }
  }
};

export const ModulSuratMenyurat: React.FC<ModulSuratMenyuratProps> = ({ adminRole = 'direktur' }) => {
  const [suratList, setSuratList] = useState<SuratItem[]>(() => getLocalSurat());
  const [loading, setLoading] = useState(false);
  const [cloudSynced, setCloudSynced] = useState<boolean | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  useEffect(() => {
    fetchSurat();
  }, []);

  const fetchSurat = async () => {
    setLoading(true);
    const localData = getLocalSurat();
    if (localData.length > 0) {
      setSuratList(localData);
    }

    try {
      const { data, error } = await supabase
        .from('dkm_surat_menyurat')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setCloudSynced(true);
        const mapped: SuratItem[] = data.map(d => ({
          id: d.id,
          nomorSurat: d.nomor_surat,
          jenis: d.jenis as any,
          perihal: d.perihal,
          tanggal: d.tanggal,
          pengirimPenerima: d.pengirim_penerima || '',
          penandatangan: d.penandatangan || '',
          jabatanTtd: d.jabatan_ttd || '',
          keterangan: d.keterangan || '',
          fileUrl: d.file_url || null,
          fileName: d.file_name || '',
          status: (d.status as any) || 'final',
          dibuatOleh: d.dibuat_oleh || 'direktur',
          dibuatPada: d.created_at ? d.created_at.split('T')[0] : toLocalDateString()
        }));

        // Gabungkan data: jangan hilangkan surat lokal yang belum masuk cloud
        const cloudIds = new Set(mapped.map(m => m.id));
        const cloudNomor = new Set(mapped.map(m => m.nomorSurat));
        const unsyncedLocals = localData.filter(l => !cloudIds.has(l.id) && !cloudNomor.has(l.nomorSurat));
        const combined = [...mapped, ...unsyncedLocals];

        setSuratList(combined);
        saveLocalSurat(combined);
      } else {
        if (error) {
          console.warn('Supabase fetch notice:', error.message);
          setCloudSynced(false);
        }
      }
    } catch (e) {
      console.warn('Supabase fetch caught error:', e);
      setCloudSynced(false);
    } finally {
      setLoading(false);
    }
  };

  const syncUnsyncedToCloud = async () => {
    setIsSyncingCloud(true);
    let syncedCount = 0;
    try {
      for (const s of suratList) {
        const { data: existing } = await supabase
          .from('dkm_surat_menyurat')
          .select('id')
          .eq('nomor_surat', s.nomorSurat);

        if (!existing || existing.length === 0) {
          const dbPayload = {
            nomor_surat: s.nomorSurat,
            jenis: s.jenis,
            perihal: s.perihal,
            tanggal: s.tanggal,
            pengirim_penerima: s.pengirimPenerima,
            penandatangan: s.penandatangan,
            jabatan_ttd: s.jabatanTtd,
            keterangan: s.keterangan,
            file_url: s.fileUrl,
            file_name: s.fileName,
            status: s.status,
            dibuat_oleh: s.dibuatOleh
          };
          const { error } = await supabase.from('dkm_surat_menyurat').insert([dbPayload]);
          if (!error) syncedCount++;
        }
      }
      setCloudSynced(true);
      setSuccessMsg(syncedCount > 0 ? `${syncedCount} surat berhasil disinkronkan ke cloud Supabase!` : 'Semua surat sudah tersinkronisasi di cloud.');
    } catch (err: any) {
      console.warn('Cloud sync error:', err);
      setCloudSynced(false);
      alert('Gagal menyinkronkan ke cloud: ' + (err.message || 'Pastikan skrip SQL sudah dijalankan di Supabase.'));
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<SuratItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState('semua');
  const [filterStatus, setFilterStatus] = useState('semua');
  const [previewSurat, setPreviewSurat] = useState<SuratItem | null>(null);
  const [detailSurat, setDetailSurat] = useState<SuratItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Pagination & Date Filter
  const [suratPage, setSuratPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const toLocalISODate = (d: Date) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
  };
  const todayLocal = new Date();
  const firstOfMonthLocal = new Date(todayLocal.getFullYear(), todayLocal.getMonth(), 1);
  const [filterStart, setFilterStart] = useState(toLocalISODate(firstOfMonthLocal));
  const [filterEnd, setFilterEnd] = useState(toLocalISODate(todayLocal));

  // Form state
  const [formJenis, setFormJenis] = useState<SuratItem['jenis']>('keluar');
  const [formPerihal, setFormPerihal] = useState('');
  const [formTanggal, setFormTanggal] = useState(toLocalDateString());
  const [formPengirimPenerima, setFormPengirimPenerima] = useState('');
  const [formPenandatangan, setFormPenandatangan] = useState('');
  const [formJabatanTtd, setFormJabatanTtd] = useState('');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formStatus, setFormStatus] = useState<'draft' | 'final'>('final');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formFileUrl, setFormFileUrl] = useState<string | null>(null);
  const [formFileName, setFormFileName] = useState('');
  const [formError, setFormError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormJenis('keluar');
    setFormPerihal('');
    setFormTanggal(toLocalDateString());
    setFormPengirimPenerima('');
    setFormPenandatangan('');
    setFormJabatanTtd('');
    setFormKeterangan('');
    setFormStatus('final');
    setFormFile(null);
    setFormFileUrl(null);
    setFormFileName('');
    setFormError('');
    setEditItem(null);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (surat: SuratItem) => {
    setEditItem(surat);
    setFormJenis(surat.jenis);
    setFormPerihal(surat.perihal);
    setFormTanggal(surat.tanggal);
    setFormPengirimPenerima(surat.pengirimPenerima);
    setFormPenandatangan(surat.penandatangan);
    setFormJabatanTtd(surat.jabatanTtd);
    setFormKeterangan(surat.keterangan);
    setFormStatus(surat.status);
    setFormFileUrl(surat.fileUrl);
    setFormFileName(surat.fileName);
    setShowForm(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setFormError('Hanya file PDF yang diizinkan!');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFormError('Ukuran file maksimal 10MB!');
      return;
    }
    setIsUploading(true);
    setFormError('');
    setFormFile(file);
    setFormFileName(file.name);
    // Convert to base64 for localStorage storage
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormFileUrl(ev.target?.result as string);
      setIsUploading(false);
    };
    reader.onerror = () => {
      setFormError('Gagal membaca file. Coba lagi.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSurat = async () => {
    setFormError('');
    if (!formPerihal.trim()) { setFormError('Perihal surat wajib diisi!'); return; }
    if (!formTanggal) { setFormError('Tanggal wajib diisi!'); return; }
    if (!formPenandatangan) { setFormError('Penandatangan wajib dipilih!'); return; }

    const nomorSurat = editItem ? editItem.nomorSurat : generateNomorSurat(formJenis, suratList);
    const pengurus = PENGURUS_DKM.find(p => p.nama === formPenandatangan);
    const jabatanTtd = formJabatanTtd || pengurus?.jabatan || '';

    // ID fallback jika offline atau Supabase RLS belum dibuka
    const fallbackId = editItem 
      ? editItem.id 
      : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'srt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8));

    let finalId = fallbackId;
    let savedToCloud = false;
    let finalFileUrl = formFileUrl;

    // Jika ada file fisik PDF yang di-upload, simpan ke Supabase Storage (masjid-assets)
    if (formFile) {
      setIsUploading(true);
      try {
        const fileExt = formFile.name.split('.').pop() || 'pdf';
        const cleanName = formFile.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
        const filePath = `surat/${Date.now()}_${cleanName}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('masjid-assets')
          .upload(filePath, formFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('masjid-assets')
            .getPublicUrl(filePath);
          if (publicUrlData?.publicUrl) {
            finalFileUrl = publicUrlData.publicUrl;
          }
        } else {
          console.warn('Supabase storage upload notice (menggunakan fallback):', uploadError.message);
        }
      } catch (uploadErr) {
        console.warn('Supabase storage upload error (menggunakan fallback):', uploadErr);
      } finally {
        setIsUploading(false);
      }
    }

    const dbPayload = {
      nomor_surat: nomorSurat,
      jenis: formJenis,
      perihal: formPerihal.trim(),
      tanggal: formTanggal,
      pengirim_penerima: formPengirimPenerima.trim(),
      penandatangan: formPenandatangan,
      jabatan_ttd: jabatanTtd,
      keterangan: formKeterangan.trim(),
      file_url: finalFileUrl,
      file_name: formFileName,
      status: formStatus,
      dibuat_oleh: adminRole
    };

    // Percobaan simpan ke Supabase Cloud
    try {
      if (editItem) {
        const { error } = await supabase.from('dkm_surat_menyurat').update(dbPayload).eq('id', editItem.id);
        if (!error) {
          savedToCloud = true;
          setCloudSynced(true);
        } else {
          console.warn('Supabase update notice (RLS / offline):', error.message);
          setCloudSynced(false);
        }
      } else {
        const { data, error } = await supabase.from('dkm_surat_menyurat').insert([dbPayload]).select();
        if (!error && data && data.length > 0) {
          finalId = data[0].id;
          savedToCloud = true;
          setCloudSynced(true);
        } else {
          console.warn('Supabase insert notice (RLS / offline):', error?.message);
          setCloudSynced(false);
        }
      }
    } catch (err) {
      console.warn('Supabase save error:', err);
      setCloudSynced(false);
    }

    const savedSurat: SuratItem = {
      id: finalId,
      nomorSurat,
      jenis: formJenis,
      perihal: formPerihal.trim(),
      tanggal: formTanggal,
      pengirimPenerima: formPengirimPenerima.trim(),
      penandatangan: formPenandatangan,
      jabatanTtd,
      keterangan: formKeterangan.trim(),
      fileUrl: finalFileUrl,
      fileName: formFileName,
      status: formStatus,
      dibuatOleh: adminRole,
      dibuatPada: editItem?.dibuatPada || toLocalDateString(),
    };

    // Selalu simpan ke state lokal & LocalStorage agar form tidak terkunci/error!
    setSuratList(prev => {
      const updated = editItem
        ? prev.map(s => s.id === editItem.id ? savedSurat : s)
        : [savedSurat, ...prev];
      saveLocalSurat(updated);
      return updated;
    });

    setShowForm(false);
    resetForm();

    if (savedToCloud) {
      setSuccessMsg(editItem ? 'Surat berhasil diperbarui di cloud database!' : 'Surat berhasil disimpan ke cloud database!');
    } else {
      setSuccessMsg(editItem 
        ? 'Surat berhasil diperbarui (tersimpan di peramban). Jalankan skrip SQL Supabase untuk sinkronisasi antar perangkat.' 
        : 'Surat berhasil disimpan (tersimpan di peramban). Jalankan skrip SQL Supabase untuk sinkronisasi antar perangkat.');
    }
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('dkm_surat_menyurat').delete().eq('id', id);
      if (error) {
        console.warn('Supabase delete notice (RLS / offline):', error.message);
      }
    } catch (err) {
      console.warn('Supabase delete error:', err);
    }

    setSuratList(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveLocalSurat(updated);
      return updated;
    });
    setDeleteConfirm(null);
    setSuccessMsg('Surat berhasil dihapus!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDownload = (surat: SuratItem) => {
    if (!surat.fileUrl) { alert('File PDF tidak tersedia.'); return; }
    const a = document.createElement('a');
    a.href = surat.fileUrl;
    a.download = surat.fileName || `${surat.nomorSurat.replace(/\//g, '-')}.pdf`;
    a.click();
  };

  const filteredSurat = suratList.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || s.perihal.toLowerCase().includes(q) || s.nomorSurat.toLowerCase().includes(q) || s.pengirimPenerima.toLowerCase().includes(q);
    const matchJenis = filterJenis === 'semua' || s.jenis === filterJenis;
    const matchStatus = filterStatus === 'semua' || s.status === filterStatus;
    
    let matchDate = true;
    if (filterStart && filterEnd) {
      const sDate = new Date(s.tanggal).getTime();
      const start = new Date(filterStart).getTime();
      const end = new Date(filterEnd).setHours(23, 59, 59, 999);
      matchDate = sDate >= start && sDate <= end;
    }

    return matchSearch && matchJenis && matchStatus && matchDate;
  });

  const paginatedSurat = filteredSurat.slice(
    (suratPage - 1) * ITEMS_PER_PAGE,
    suratPage * ITEMS_PER_PAGE
  );

  const getJenisLabel = (jenis: string) => JENIS_SURAT.find(j => j.id === jenis)?.label || jenis;
  const getJenisBadgeColor = (jenis: string) => {
    const map: Record<string, string> = {
      keluar: 'bg-blue-100 text-blue-700',
      masuk: 'bg-green-100 text-green-700',
      sk: 'bg-purple-100 text-purple-700',
      undangan: 'bg-orange-100 text-orange-700',
      berita_acara: 'bg-gray-100 text-gray-700',
    };
    return map[jenis] || 'bg-gray-100 text-gray-700';
  };

  const formatTanggal = (dateStr: string) => {
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch { return dateStr; }
  };

  const canEdit = ['direktur', 'sekretaris', 'admin'].includes(adminRole.toLowerCase());

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-lime-600" size={22} />
            Manajemen Surat Menyurat
          </h2>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <span>DKM Masjid Citra Sentul Raya · Total {suratList.length} surat tersimpan</span>
            {cloudSynced === true && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                <Database size={12} /> Cloud Aktif
              </span>
            )}
            {cloudSynced === false && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                <Info size={12} /> Mode Penyimpanan Lokal
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <button
              id="btn-tambah-surat"
              onClick={openAddForm}
              className="flex items-center gap-2 bg-lime-600 hover:bg-lime-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all shadow-md"
            >
              <PlusCircle size={16} /> Tambah Surat
            </button>
          )}
        </div>
      </div>

      {/* Cloud Status Notice if Local Mode */}
      {cloudSynced === false && (
        <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-amber-900 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="text-amber-600 shrink-0" size={18} />
            <div className="text-xs sm:text-sm">
              <span className="font-bold">Mode Penyimpanan Lokal Aktif:</span> Surat tersimpan aman di browser ini. Hubungkan koneksi untuk menyinkronkan ke cloud Supabase.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={syncUnsyncedToCloud}
              disabled={isSyncingCloud}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-xl font-medium text-xs transition-colors"
            >
              <RefreshCw size={13} className={isSyncingCloud ? 'animate-spin' : ''} />
              {isSyncingCloud ? 'Menyinkronkan...' : 'Sinkron ke Cloud'}
            </button>
          </div>
        </div>
      )}

      {/* Success message */}
      {successMsg && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}

      {/* Filter & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Cari nomor surat, perihal, pengirim/penerima..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-lime-500"
            />
          </div>
          <select
            value={filterJenis}
            onChange={e => setFilterJenis(e.target.value)}
            className="px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-lime-500 bg-white"
          >
            <option value="semua">Semua Jenis</option>
            {JENIS_SURAT.map(j => <option key={j.id} value={j.id}>{j.label}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-lime-500 bg-white"
          >
            <option value="semua">Semua Status</option>
            <option value="final">Final</option>
            <option value="draft">Draft</option>
          </select>
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200">
            <span className="text-xs font-bold text-slate-700">Tanggal:</span>
            <input type="date" value={filterStart} onChange={e => { setFilterStart(e.target.value); setSuratPage(1); }} className="bg-transparent text-slate-700 font-medium text-xs focus:outline-none focus:ring-0" />
            <span className="text-xs font-bold text-slate-400">-</span>
            <input type="date" value={filterEnd} onChange={e => { setFilterEnd(e.target.value); setSuratPage(1); }} className="bg-transparent text-slate-700 font-medium text-xs focus:outline-none focus:ring-0" />
          </div>
        </div>
      </div>

      {/* Surat Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredSurat.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <FileText size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Belum ada surat tersimpan</p>
            <p className="text-sm mt-1">Klik "Tambah Surat" untuk menambahkan surat pertama</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">No. Surat</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Jenis</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Perihal</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold hidden md:table-cell">Tanggal</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold hidden lg:table-cell">Penandatangan</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-semibold">Status</th>
                  <th className="text-center px-4 py-3 text-slate-600 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedSurat.map(surat => (
                  <tr key={surat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-700 font-medium">{surat.nomorSurat}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getJenisBadgeColor(surat.jenis)}`}>
                        {getJenisLabel(surat.jenis)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 text-sm line-clamp-1">{surat.perihal}</p>
                      {surat.pengirimPenerima && (
                        <p className="text-xs text-slate-400 mt-0.5">{surat.jenis === 'masuk' ? 'Dari' : 'Kepada'}: {surat.pengirimPenerima}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-600 text-xs">{formatTanggal(surat.tanggal)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-xs font-medium text-slate-700">{surat.penandatangan}</p>
                      <p className="text-xs text-slate-400">{surat.jabatanTtd}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${surat.status === 'final' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {surat.status === 'final' ? 'Final' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* Tombol Lihat Detail - selalu tampil */}
                        <button
                          onClick={() => setDetailSurat(surat)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Lihat Detail Surat"
                        >
                          <Eye size={14} />
                        </button>
                        {surat.fileUrl && (
                          <button
                            onClick={() => handleDownload(surat)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Download PDF"
                          >
                            <Download size={14} />
                          </button>
                        )}
                        {canEdit && (
                          <>
                            <button
                              onClick={() => openEditForm(surat)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <FileText size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(surat.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filteredSurat.length > 0 && (
        <div className="mt-4">
          <Pagination
            currentPage={suratPage}
            totalItems={filteredSurat.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setSuratPage}
          />
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl">
              <h3 className="text-lg font-bold text-slate-800">
                {editItem ? 'Edit Surat' : 'Tambah Surat Baru'}
              </h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertTriangle size={15} /> {formError}
                </div>
              )}

              {/* Nomor otomatis info */}
              {!editItem && (
                <div className="p-3 bg-lime-50 border border-lime-200 rounded-xl text-sm text-lime-700">
                  <span className="font-semibold">Nomor surat akan dibuat otomatis:</span>{' '}
                  <span className="font-mono">{generateNomorSurat(formJenis, suratList)}</span>
                </div>
              )}
              {editItem && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">
                  <span className="font-semibold">Nomor Surat:</span>{' '}
                  <span className="font-mono">{editItem.nomorSurat}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Jenis Surat */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Jenis Surat *</label>
                  <select
                    value={formJenis}
                    onChange={e => setFormJenis(e.target.value as SuratItem['jenis'])}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-lime-500 bg-white"
                  >
                    {JENIS_SURAT.map(j => <option key={j.id} value={j.id}>{j.label}</option>)}
                  </select>
                </div>

                {/* Tanggal */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tanggal Surat *</label>
                  <input
                    type="date"
                    value={formTanggal}
                    onChange={e => setFormTanggal(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-lime-500"
                  />
                </div>
              </div>

              {/* Perihal */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Perihal *</label>
                <input
                  type="text"
                  value={formPerihal}
                  onChange={e => setFormPerihal(e.target.value)}
                  placeholder="Perihal / judul surat"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-lime-500"
                />
              </div>

              {/* Pengirim/Penerima */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {formJenis === 'masuk' ? 'Pengirim' : 'Penerima / Ditujukan Kepada'}
                </label>
                <input
                  type="text"
                  value={formPengirimPenerima}
                  onChange={e => setFormPengirimPenerima(e.target.value)}
                  placeholder={formJenis === 'masuk' ? 'Nama/instansi pengirim' : 'Nama/instansi penerima'}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-lime-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Penandatangan */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Penandatangan *</label>
                  <select
                    value={formPenandatangan}
                    onChange={e => {
                      setFormPenandatangan(e.target.value);
                      const p = PENGURUS_DKM.find(px => px.nama === e.target.value);
                      if (p) setFormJabatanTtd(p.jabatan + (p.bidang !== 'Pimpinan' ? ` - ${p.bidang}` : ''));
                    }}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-lime-500 bg-white"
                  >
                    <option value="">-- Pilih Penandatangan --</option>
                    {PENGURUS_DKM.map(p => (
                      <option key={p.id} value={p.nama}>{p.nama} ({ROLE_LABELS[p.role] || p.jabatan})</option>
                    ))}
                  </select>
                </div>

                {/* Jabatan TTD */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Jabatan Penandatangan</label>
                  <input
                    type="text"
                    value={formJabatanTtd}
                    onChange={e => setFormJabatanTtd(e.target.value)}
                    placeholder="Jabatan (otomatis diisi)"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-lime-500"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
                <div className="flex gap-3">
                  {(['final', 'draft'] as const).map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value={s}
                        checked={formStatus === s}
                        onChange={() => setFormStatus(s)}
                        className="accent-lime-600"
                      />
                      <span className="text-sm text-slate-700 capitalize">{s === 'final' ? 'Final / Resmi' : 'Draft'}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Keterangan / Catatan</label>
                <textarea
                  value={formKeterangan}
                  onChange={e => setFormKeterangan(e.target.value)}
                  placeholder="Keterangan tambahan (opsional)"
                  rows={2}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-lime-500 resize-none"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Upload File PDF</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:border-lime-500 hover:bg-lime-50 transition-all"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {isUploading ? (
                    <p className="text-sm text-slate-500">Memproses file...</p>
                  ) : formFileName ? (
                    <div className="flex items-center justify-center gap-2 text-green-700">
                      <CheckCircle size={16} />
                      <span className="text-sm font-medium">{formFileName}</span>
                    </div>
                  ) : (
                    <div className="text-slate-400">
                      <Upload size={24} className="mx-auto mb-1" />
                      <p className="text-sm">Klik untuk upload PDF</p>
                      <p className="text-xs mt-0.5">Maks. 10MB</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-slate-200 sticky bottom-0 bg-white rounded-b-2xl">
              <button
                onClick={() => { setShowForm(false); resetForm(); }}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSaveSurat}
                disabled={isUploading}
                className="flex-1 py-2.5 bg-lime-600 hover:bg-lime-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {editItem ? 'Simpan Perubahan' : 'Simpan Surat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Surat Modal */}
      {detailSurat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Detail Surat</h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">{detailSurat.nomorSurat}</p>
              </div>
              <div className="flex items-center gap-2">
                {detailSurat.fileUrl && (
                  <button
                    onClick={() => handleDownload(detailSurat)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-lime-600 hover:bg-lime-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Download size={14} /> Download PDF
                  </button>
                )}
                <button onClick={() => setDetailSurat(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto flex-1">
              {/* Info Grid */}
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Jenis Surat</p>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getJenisBadgeColor(detailSurat.jenis)}`}>
                    {getJenisLabel(detailSurat.jenis)}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    detailSurat.status === 'final' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {detailSurat.status === 'final' ? 'Final / Resmi' : 'Draft'}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Perihal</p>
                  <p className="text-sm font-semibold text-slate-800">{detailSurat.perihal}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Tanggal</p>
                  <p className="text-sm font-semibold text-slate-800">{formatTanggal(detailSurat.tanggal)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    {detailSurat.jenis === 'masuk' ? 'Pengirim' : 'Ditujukan Kepada'}
                  </p>
                  <p className="text-sm font-semibold text-slate-800">{detailSurat.pengirimPenerima || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Penandatangan</p>
                  <p className="text-sm font-semibold text-slate-800">{detailSurat.penandatangan || '-'}</p>
                  <p className="text-xs text-slate-500">{detailSurat.jabatanTtd}</p>
                </div>
                {detailSurat.keterangan && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Keterangan</p>
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{detailSurat.keterangan}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">File PDF</p>
                  <p className="text-sm text-slate-700">
                    {detailSurat.fileName ? (
                      <span className="flex items-center gap-1.5 text-green-700">
                        <CheckCircle size={13} /> {detailSurat.fileName}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Tidak ada file</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Dibuat Oleh</p>
                  <p className="text-sm text-slate-700 capitalize">{detailSurat.dibuatOleh} · {formatTanggal(detailSurat.dibuatPada)}</p>
                </div>
              </div>

              {/* PDF Preview inline */}
              {detailSurat.fileUrl ? (
                <div className="p-5">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Preview Isi Surat (PDF)</p>
                  <iframe
                    src={detailSurat.fileUrl}
                    className="w-full rounded-xl border border-slate-200 shadow-sm"
                    style={{ height: '480px' }}
                    title="Preview PDF Surat"
                  />
                </div>
              ) : (
                <div className="p-5 flex flex-col items-center justify-center text-center text-slate-400 py-10">
                  <FileText size={40} className="mb-3 opacity-30" />
                  <p className="text-sm font-medium">File PDF belum diunggah</p>
                  <p className="text-xs mt-1">Klik tombol Edit untuk menambahkan file PDF surat ini.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal (fullscreen PDF) */}
      {previewSurat && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80">
          <div className="flex items-center justify-between p-3 bg-slate-900 text-white">
            <div>
              <p className="font-semibold text-sm">{previewSurat.perihal}</p>
              <p className="text-xs text-slate-400 font-mono">{previewSurat.nomorSurat}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleDownload(previewSurat)} className="flex items-center gap-1.5 px-3 py-1.5 bg-lime-600 hover:bg-lime-700 rounded-lg text-sm font-medium transition-colors">
                <Download size={14} /> Download
              </button>
              <button onClick={() => setPreviewSurat(null)} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>
          {previewSurat.fileUrl ? (
            <iframe
              src={previewSurat.fileUrl}
              className="flex-1 w-full"
              title="Preview Surat"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-white text-center">
              <div>
                <FileText size={48} className="mx-auto mb-3 opacity-40" />
                <p>File PDF tidak tersedia untuk surat ini.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <h3 className="font-bold text-slate-800">Hapus Surat?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-5">Surat ini akan dihapus permanen dan tidak dapat dikembalikan.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors">Batal</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-sm transition-colors">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
