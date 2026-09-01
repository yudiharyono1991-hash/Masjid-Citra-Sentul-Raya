import React, { useState, useRef } from 'react';
import { FileText, PlusCircle, Search, Download, Eye, Trash2, X, Upload, CheckCircle, AlertTriangle, Filter, Printer } from 'lucide-react';
import { PENGURUS_DKM, ROLE_LABELS } from '../data/pengurusData';
import { toLocalDateString } from '../utils/formatters';
import { supabase } from '../lib/supabase';

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

const INITIAL_SURAT: SuratItem[] = [];

export const ModulSuratMenyurat: React.FC<ModulSuratMenyuratProps> = ({ adminRole = 'direktur' }) => {
  const [suratList, setSuratList] = useState<SuratItem[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchSurat();
  }, []);

  const fetchSurat = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dkm_surat_menyurat')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (data && !error) {
        const mapped: SuratItem[] = data.map(d => ({
          id: d.id,
          nomorSurat: d.nomor_surat,
          jenis: d.jenis as any,
          perihal: d.perihal,
          tanggal: d.tanggal,
          pengirimPenerima: d.pengirim_penerima,
          penandatangan: d.penandatangan,
          jabatanTtd: d.jabatan_ttd,
          keterangan: d.keterangan,
          fileUrl: d.file_url,
          fileName: d.file_name,
          status: d.status as any,
          dibuatOleh: d.dibuat_oleh,
          dibuatPada: d.created_at
        }));
        setSuratList(mapped);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<SuratItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterJenis, setFilterJenis] = useState('semua');
  const [filterStatus, setFilterStatus] = useState('semua');
  const [previewSurat, setPreviewSurat] = useState<SuratItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

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

    let nomorSurat = editItem ? editItem.nomorSurat : generateNomorSurat(formJenis, suratList);
    
    const pengurus = PENGURUS_DKM.find(p => p.nama === formPenandatangan);
    const jabatanTtd = formJabatanTtd || pengurus?.jabatan || '';

    const newSurat: SuratItem = {
      id: editItem ? editItem.id : '',
      nomorSurat,
      jenis: formJenis,
      perihal: formPerihal.trim(),
      tanggal: formTanggal,
      pengirimPenerima: formPengirimPenerima.trim(),
      penandatangan: formPenandatangan,
      jabatanTtd,
      keterangan: formKeterangan.trim(),
      fileUrl: formFileUrl,
      fileName: formFileName,
      status: formStatus,
      dibuatOleh: adminRole,
      dibuatPada: toLocalDateString(),
    };

    try {
      const dbPayload = {
        nomor_surat: newSurat.nomorSurat,
        jenis: newSurat.jenis,
        perihal: newSurat.perihal,
        tanggal: newSurat.tanggal,
        pengirim_penerima: newSurat.pengirimPenerima,
        penandatangan: newSurat.penandatangan,
        jabatan_ttd: newSurat.jabatanTtd,
        keterangan: newSurat.keterangan,
        file_url: newSurat.fileUrl,
        file_name: newSurat.fileName,
        status: newSurat.status,
        dibuat_oleh: newSurat.dibuatOleh
      };

      if (editItem) {
        const { error } = await supabase.from('dkm_surat_menyurat').update(dbPayload).eq('id', editItem.id);
        if (error) throw error;
        setSuratList(prev => prev.map(s => s.id === editItem.id ? {...newSurat, id: editItem.id} : s));
      } else {
        const { data, error } = await supabase.from('dkm_surat_menyurat').insert([dbPayload]).select();
        if (error) throw error;
        if (data && data.length > 0) {
          setSuratList(prev => [{...newSurat, id: data[0].id}, ...prev]);
        }
      }
      
      setShowForm(false);
      resetForm();
      setSuccessMsg(editItem ? 'Surat berhasil diperbarui!' : 'Surat berhasil disimpan!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setFormError('Gagal menyimpan surat ke database Supabase. Pastikan tabel dkm_surat_menyurat sudah dibuat.');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('dkm_surat_menyurat').delete().eq('id', id);
      if (error) throw error;
      setSuratList(prev => prev.filter(s => s.id !== id));
      setDeleteConfirm(null);
      setSuccessMsg('Surat berhasil dihapus!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert('Gagal menghapus surat');
      console.error(err);
    }
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
    return matchSearch && matchJenis && matchStatus;
  });

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-lime-600" size={22} />
            Manajemen Surat Menyurat
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            DKM Masjid Citra Sentul Raya · Total {suratList.length} surat tersimpan
          </p>
        </div>
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
                {filteredSurat.map(surat => (
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
                        {surat.fileUrl && (
                          <>
                            <button
                              onClick={() => setPreviewSurat(surat)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Preview"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleDownload(surat)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Download"
                            >
                              <Download size={14} />
                            </button>
                          </>
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

      {/* Preview Modal */}
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
