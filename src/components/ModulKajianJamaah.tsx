import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Calendar, Clock, BookOpen, UserPlus, CheckCircle, AlertCircle, X } from 'lucide-react';

export const ModulKajianJamaah: React.FC = () => {
  const [kajianList, setKajianList] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [selectedKajian, setSelectedKajian] = useState<any>(null);
  const [formData, setFormData] = useState({ nama: '', kontak: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: kData, error: kErr } = await supabase.from('kajian').select('*').eq('status', 'Aktif').order('tanggal', { ascending: true });
      if (kErr) throw kErr;
      // Filter out past kajian
      const futureKajian = (kData || []).filter((k: any) => new Date(k.tanggal) >= new Date(new Date().setHours(0,0,0,0)));
      setKajianList(futureKajian);

      const { data: rData, error: rErr } = await supabase.from('kegiatan_registrations').select('kegiatan_id');
      if (rErr) throw rErr;
      if (rData) setRegistrations(rData);
    } catch (err) {
      console.error('Error fetching kajian data:', err);
    }
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKajian) return;
    setIsSubmitting(true);
    setSuccessMsg('');
    
    try {
      const { error } = await supabase.from('kegiatan_registrations').insert([{
        id: `reg-${Date.now()}`,
        kegiatan_id: selectedKajian.id,
        nama: formData.nama,
        kontak: formData.kontak,
        kategori: 'Kajian',
      }]);
      if (error) throw error;
      setSuccessMsg('Alhamdulillah, pendaftaran berhasil! Silakan hadir tepat waktu.');
      setFormData({ nama: '', kontak: '' });
      fetchData(); // refresh kuota
    } catch (err: any) {
      alert('Gagal mendaftar: ' + err.message);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center justify-center gap-3">
          <BookOpen className="w-8 h-8 text-lime-600" /> Jadwal Kajian Masjid
        </h2>
        <p className="text-slate-600 mt-2">Daftarkan diri Anda pada majelis ilmu dan kajian rutin yang diselenggarakan oleh DKM Masjid Citra Sentul Raya.</p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3 text-emerald-800 font-bold mx-auto max-w-2xl animate-in fade-in">
          <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0" />
          <p>{successMsg}</p>
        </div>
      )}

      {/* List Kajian */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <p className="text-slate-500 col-span-3 text-center py-8">Memuat jadwal kajian...</p>
        ) : kajianList.length === 0 ? (
          <div className="col-span-3 text-center py-12 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Belum ada jadwal kajian dalam waktu dekat.</p>
          </div>
        ) : (
          kajianList.map((k) => {
            const registeredCount = registrations.filter(r => r.kegiatan_id === k.id).length;
            const isFull = k.kuota > 0 && registeredCount >= k.kuota;
            
            return (
              <div key={k.id} className="bg-white rounded-3xl border-2 border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:border-lime-200 transition-all flex flex-col relative group">
                <div className="absolute top-0 right-0 bg-lime-100 text-lime-700 px-3 py-1 rounded-bl-xl text-xs font-black uppercase tracking-wider">
                  Tersedia
                </div>
                <div className="p-6 border-b border-slate-50 flex-1">
                  <h3 className="font-black text-slate-800 text-xl leading-tight mb-2 group-hover:text-lime-700 transition-colors">{k.judul}</h3>
                  <p className="text-lime-600 font-bold text-sm mb-4 bg-lime-50 inline-block px-3 py-1 rounded-lg">{k.ustadz}</p>
                  
                  <div className="space-y-2.5 text-sm text-slate-600 font-medium">
                    <div className="flex items-center gap-3"><Calendar className="w-4 h-4 text-slate-400" /> {new Date(k.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <div className="flex items-center gap-3"><Clock className="w-4 h-4 text-slate-400" /> {k.waktu}</div>
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-slate-400" /> 
                      {k.kuota > 0 ? (
                        <span>Kuota: <strong className={isFull ? 'text-red-500' : 'text-slate-800'}>{registeredCount} / {k.kuota}</strong> terisi</span>
                      ) : (
                        <span>Kuota: <strong className="text-slate-800">Terbuka untuk Umum</strong></span>
                      )}
                    </div>
                  </div>
                  {k.deskripsi && (
                    <p className="mt-4 text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 line-clamp-3">
                      {k.deskripsi}
                    </p>
                  )}
                </div>
                <div className="p-4 bg-slate-50/50">
                  <button 
                    onClick={() => { setSelectedKajian(k); setSuccessMsg(''); window.scrollTo(0, 0); }}
                    disabled={isFull}
                    className={`w-full py-3.5 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${
                      isFull 
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed' 
                        : 'bg-lime-600 hover:bg-lime-700 text-white shadow-md hover:shadow-lg active:scale-95'
                    }`}
                  >
                    {isFull ? (
                      <>Pendaftaran Penuh</>
                    ) : (
                      <><UserPlus className="w-4 h-4" /> Daftar Kajian Ini</>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Form Pendaftaran Kajian Modal/Section */}
      {selectedKajian && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 fade-in">
            <div className="bg-gradient-to-r from-lime-800 to-lime-900 p-6 text-white text-center relative">
              <button onClick={() => setSelectedKajian(null)} className="absolute top-4 right-4 text-lime-200 hover:text-white bg-white/10 p-1.5 rounded-full"><X className="w-4 h-4"/></button>
              <h3 className="font-extrabold text-xl mb-1">Form Pendaftaran Kajian</h3>
              <p className="text-lime-200 text-sm font-medium">{selectedKajian.judul}</p>
            </div>
            <div className="p-6">
              <div className="bg-lime-50 text-lime-800 text-xs p-3 rounded-xl mb-5 font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Silakan isi data diri Anda untuk mendaftar. Simpan bukti pendaftaran ini (screenshot) untuk ditunjukkan jika diperlukan.</p>
              </div>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label>
                  <input required type="text" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-lime-500 focus:ring-2 focus:ring-lime-200 rounded-xl text-sm transition-all" placeholder="Masukkan nama Anda" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp / HP</label>
                  <input required type="tel" value={formData.kontak} onChange={e => setFormData({...formData, kontak: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-lime-500 focus:ring-2 focus:ring-lime-200 rounded-xl text-sm transition-all" placeholder="Contoh: 08123456789" />
                </div>
                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setSelectedKajian(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors">Batal</button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-lime-600 hover:bg-lime-700 text-white font-bold rounded-xl text-sm transition-colors shadow-md flex items-center justify-center gap-2">
                    {isSubmitting ? 'Memproses...' : <><CheckCircle className="w-4 h-4" /> Daftar Sekarang</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
