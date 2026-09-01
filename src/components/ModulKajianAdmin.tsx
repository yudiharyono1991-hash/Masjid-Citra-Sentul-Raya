import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Calendar, Clock, Plus, Trash2, Edit, Save, X, BookOpen, AlertCircle } from 'lucide-react';

export const ModulKajianAdmin: React.FC = () => {
  const [kajianList, setKajianList] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ id: '', judul: '', ustadz: '', tanggal: '', waktu: '', kuota: 0, deskripsi: '' });
  
  // View Registrants State
  const [viewKajianId, setViewKajianId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch Kajian
      const { data: kData, error: kErr } = await supabase.from('kajian').select('*').order('tanggal', { ascending: false });
      if (kErr) throw kErr;
      if (kData) setKajianList(kData);

      // Fetch Registrations
      const { data: rData, error: rErr } = await supabase.from('kegiatan_registrations').select('*').order('created_at', { ascending: false });
      if (rErr) throw rErr;
      if (rData) setRegistrations(rData);
    } catch (err) {
      console.error('Error fetching kajian data:', err);
    }
    setIsLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.id) {
        // Update
        const { error } = await supabase.from('kajian').update({
          judul: formData.judul,
          ustadz: formData.ustadz,
          tanggal: formData.tanggal,
          waktu: formData.waktu,
          kuota: formData.kuota,
          deskripsi: formData.deskripsi
        }).eq('id', formData.id);
        if (error) throw error;
        alert('Kajian berhasil diupdate!');
      } else {
        // Insert
        const { error } = await supabase.from('kajian').insert([{
          judul: formData.judul,
          ustadz: formData.ustadz,
          tanggal: formData.tanggal,
          waktu: formData.waktu,
          kuota: formData.kuota,
          deskripsi: formData.deskripsi,
          status: 'Aktif'
        }]);
        if (error) throw error;
        alert('Kajian baru berhasil ditambahkan!');
      }
      setShowForm(false);
      setFormData({ id: '', judul: '', ustadz: '', tanggal: '', waktu: '', kuota: 0, deskripsi: '' });
      fetchData();
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus kajian ini? Data pendaftar juga akan terhapus.')) {
      try {
        await supabase.from('kegiatan_registrations').delete().eq('kegiatan_id', id);
        await supabase.from('kajian').delete().eq('id', id);
        alert('Kajian dihapus!');
        fetchData();
      } catch (err: any) {
        alert('Error: ' + err.message);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-lime-600" /> Manajemen Kajian & Pendaftaran
          </h2>
          <p className="text-slate-500 text-xs mt-1">Kelola jadwal kajian rutin/tematik dan lihat daftar jamaah yang mendaftar (beserta pengaturan kuota).</p>
        </div>
        <button
          onClick={() => {
            setFormData({ id: '', judul: '', ustadz: '', tanggal: '', waktu: '', kuota: 0, deskripsi: '' });
            setShowForm(true);
          }}
          className="px-4 py-2 bg-lime-600 hover:bg-lime-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Tambah Kajian Baru
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm relative animate-in slide-in-from-top-4">
          <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
          <h3 className="text-lg font-bold text-slate-800 mb-4">{formData.id ? 'Edit Kajian' : 'Buat Kajian Baru'}</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Judul Kajian</label>
                <input required type="text" value={formData.judul} onChange={e => setFormData({...formData, judul: e.target.value})} className="w-full p-2 border rounded-lg text-sm" placeholder="Contoh: Kajian Tafsir" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nama Ustadz</label>
                <input required type="text" value={formData.ustadz} onChange={e => setFormData({...formData, ustadz: e.target.value})} className="w-full p-2 border rounded-lg text-sm" placeholder="Contoh: Ust. Fulan" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal</label>
                <input required type="date" value={formData.tanggal} onChange={e => setFormData({...formData, tanggal: e.target.value})} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Waktu</label>
                <input required type="text" value={formData.waktu} onChange={e => setFormData({...formData, waktu: e.target.value})} className="w-full p-2 border rounded-lg text-sm" placeholder="Contoh: Ba'da Maghrib" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">Batas Kuota Jamaah (0 = Tanpa Batas)</label>
                <input required type="number" min="0" value={formData.kuota} onChange={e => setFormData({...formData, kuota: Number(e.target.value)})} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">Deskripsi/Keterangan Tambahan</label>
                <textarea value={formData.deskripsi} onChange={e => setFormData({...formData, deskripsi: e.target.value})} className="w-full p-2 border rounded-lg text-sm" rows={3}></textarea>
              </div>
            </div>
            <button type="submit" className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> Simpan Kajian
            </button>
          </form>
        </div>
      )}

      {/* List Kajian */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <p className="text-slate-500 col-span-3 text-center py-8">Memuat data kajian...</p>
        ) : kajianList.length === 0 ? (
          <p className="text-slate-500 col-span-3 text-center py-8 bg-white border border-slate-200 rounded-2xl">Belum ada jadwal kajian. Silakan tambah baru.</p>
        ) : (
          kajianList.map((k) => {
            const registered = registrations.filter(r => r.kegiatan_id === k.id);
            const isFull = k.kuota > 0 && registered.length >= k.kuota;
            
            return (
              <div key={k.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                <div className="p-5 border-b border-slate-100 flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <span className="px-2 py-0.5 bg-lime-100 text-lime-700 text-xs font-bold rounded uppercase">Kajian</span>
                    <div className="flex gap-1">
                      <button onClick={() => {
                        setFormData({ id: k.id, judul: k.judul, ustadz: k.ustadz, tanggal: k.tanggal, waktu: k.waktu, kuota: k.kuota, deskripsi: k.deskripsi || '' });
                        setShowForm(true);
                        window.scrollTo(0, 0);
                      }} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md"><Edit className="w-3.5 h-3.5"/></button>
                      <button onClick={() => handleDelete(k.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md"><Trash2 className="w-3.5 h-3.5"/></button>
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{k.judul}</h3>
                  <p className="text-lime-700 font-semibold text-sm mb-3">{k.ustadz}</p>
                  
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {new Date(k.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-slate-400" /> {k.waktu}</div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-slate-400" /> 
                      Pendaftar: <span className="font-bold text-slate-800">{registered.length}</span> {k.kuota > 0 ? `/ ${k.kuota}` : '(Tanpa Batas Kuota)'}
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-slate-50 flex gap-2">
                  <button 
                    onClick={() => setViewKajianId(k.id)}
                    className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-xl transition-colors"
                  >
                    Lihat Daftar Jamaah
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Daftar Jamaah */}
      {viewKajianId && (() => {
        const kajian = kajianList.find(k => k.id === viewKajianId);
        const jamaahList = registrations.filter(r => r.kegiatan_id === viewKajianId);
        if (!kajian) return null;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Daftar Jamaah - {kajian.judul}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Total Pendaftar: {jamaahList.length} {kajian.kuota > 0 ? `/ ${kajian.kuota} Kuota` : ''}</p>
                </div>
                <button onClick={() => setViewKajianId(null)} className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-5 flex-1 overflow-y-auto">
                {jamaahList.length === 0 ? (
                  <div className="text-center py-10">
                    <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 font-medium">Belum ada jamaah yang mendaftar.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="pb-2 font-semibold">No</th>
                        <th className="pb-2 font-semibold">Nama Jamaah</th>
                        <th className="pb-2 font-semibold">Kontak (No. HP)</th>
                        <th className="pb-2 font-semibold">Waktu Daftar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jamaahList.map((j, idx) => (
                        <tr key={j.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 text-slate-400">{idx + 1}</td>
                          <td className="py-3 font-bold text-slate-800">{j.nama}</td>
                          <td className="py-3 text-slate-600 font-mono text-xs">{j.kontak}</td>
                          <td className="py-3 text-slate-500 text-xs">{new Date(j.tanggal_daftar || j.created_at).toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
