import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Calendar, Clock, MapPin, User, Tag } from 'lucide-react';

export const ModulKalenderAdmin = () => {
  const [kegiatanList, setKegiatanList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<any>({
    id: '',
    judul: '',
    tipe: 'Kajian',
    waktu_rutin: '',
    waktu_jam: '',
    lokasi: '',
    penceramah: '',
    deskripsi: ''
  });

  useEffect(() => {
    fetchKegiatan();
  }, []);

  const fetchKegiatan = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('masjid_kegiatan').select('*').order('created_at', { ascending: false });
      if (data) setKegiatanList(data);
    } catch (e) {
      console.error('Fetch kegiatan error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await supabase.from('masjid_kegiatan').update({
          judul: formData.judul,
          tipe: formData.tipe,
          waktu_rutin: formData.waktu_rutin,
          waktu_jam: formData.waktu_jam,
          lokasi: formData.lokasi,
          penceramah: formData.penceramah,
          deskripsi: formData.deskripsi
        }).eq('id', formData.id);
      } else {
        await supabase.from('masjid_kegiatan').insert([{
          judul: formData.judul,
          tipe: formData.tipe,
          waktu_rutin: formData.waktu_rutin,
          waktu_jam: formData.waktu_jam,
          lokasi: formData.lokasi,
          penceramah: formData.penceramah,
          deskripsi: formData.deskripsi
        }]);
      }
      setShowModal(false);
      fetchKegiatan();
    } catch (e) {
      console.error('Save kegiatan error:', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Yakin ingin menghapus kegiatan ini?')) {
      try {
        await supabase.from('masjid_kegiatan').delete().eq('id', id);
        fetchKegiatan();
      } catch (e) {
        console.error('Delete kegiatan error:', e);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-200 flex justify-between items-center shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
            <Calendar className="text-emerald-600" /> Manajemen Kalender Kegiatan
          </h2>
          <p className="text-slate-600 text-sm">Kelola jadwal kajian rutin, event besar, dan kegiatan edukasi.</p>
        </div>
        <button onClick={() => {
          setFormData({ id: '', judul: '', tipe: 'Kajian', waktu_rutin: '', waktu_jam: '', lokasi: '', penceramah: '', deskripsi: '' });
          setShowModal(true);
        }} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-md cursor-pointer">
          <Plus className="w-5 h-5 inline-block mr-1" /> Tambah Kegiatan
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-bold text-slate-700">Kegiatan</th>
                <th className="p-4 font-bold text-slate-700">Waktu</th>
                <th className="p-4 font-bold text-slate-700">Lokasi / Pemateri</th>
                <th className="p-4 font-bold text-slate-700 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Memuat data...</td></tr>
              ) : kegiatanList.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Belum ada kegiatan terdaftar.</td></tr>
              ) : kegiatanList.map(k => (
                <tr key={k.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <div className="font-bold text-slate-800 mb-1">{k.judul}</div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-md">
                      <Tag className="w-3 h-3" /> {k.tipe}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600">
                    <div className="flex items-center gap-1 mb-1"><Calendar className="w-3 h-3" /> {k.waktu_rutin}</div>
                    <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {k.waktu_jam}</div>
                  </td>
                  <td className="p-4 text-slate-600">
                    <div className="flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" /> {k.lokasi}</div>
                    {k.penceramah && <div className="flex items-center gap-1 font-semibold"><User className="w-3 h-3" /> {k.penceramah}</div>}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => { setFormData(k); setShowModal(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 cursor-pointer">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(k.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50/50">
              <h3 className="text-xl font-bold text-slate-800">{formData.id ? 'Edit Kegiatan' : 'Tambah Kegiatan Baru'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Judul Kegiatan</label>
                  <input required type="text" value={formData.judul} onChange={e => setFormData({...formData, judul: e.target.value})} className="w-full border-slate-300 rounded-xl" placeholder="Kajian Subuh" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategori/Tipe</label>
                  <select value={formData.tipe} onChange={e => setFormData({...formData, tipe: e.target.value})} className="w-full border-slate-300 rounded-xl">
                    <option value="Kajian">Kajian</option>
                    <option value="Edukasi">Edukasi / Kelas</option>
                    <option value="Event Besar">Event Besar / Tabligh Akbar</option>
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jadwal (Contoh: Setiap Ahad)</label>
                  <input required type="text" value={formData.waktu_rutin} onChange={e => setFormData({...formData, waktu_rutin: e.target.value})} className="w-full border-slate-300 rounded-xl" placeholder="Setiap Hari Ahad" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Waktu (Jam)</label>
                  <input required type="text" value={formData.waktu_jam} onChange={e => setFormData({...formData, waktu_jam: e.target.value})} className="w-full border-slate-300 rounded-xl" placeholder="18:30 - Selesai" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lokasi</label>
                  <input required type="text" value={formData.lokasi} onChange={e => setFormData({...formData, lokasi: e.target.value})} className="w-full border-slate-300 rounded-xl" placeholder="Ruang Utama Masjid" />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pemateri/Penceramah</label>
                  <input type="text" value={formData.penceramah} onChange={e => setFormData({...formData, penceramah: e.target.value})} className="w-full border-slate-300 rounded-xl" placeholder="Ust. Fulan" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Singkat</label>
                  <textarea value={formData.deskripsi} onChange={e => setFormData({...formData, deskripsi: e.target.value})} className="w-full border-slate-300 rounded-xl" rows={3}></textarea>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 cursor-pointer">Batal</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold cursor-pointer">Simpan Kegiatan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
