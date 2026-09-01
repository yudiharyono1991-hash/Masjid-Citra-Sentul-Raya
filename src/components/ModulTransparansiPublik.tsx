import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Book, HeartHandshake, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TransparansiUmumProps {
  onClose: () => void;
  appSettings: any;
}

export const ModulTransparansiPublik: React.FC<TransparansiUmumProps> = ({ onClose, appSettings }) => {
  const [kasEntries, setKasEntries] = useState<any[]>([]);
  const [donations, setDonations] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'kas' | 'ziswaf'>(appSettings?.show_transparansi_kas ? 'kas' : 'ziswaf');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resIn, resOut, resDonations, resPrograms] = await Promise.all([
          supabase.from('pemasukan').select('*'),
          supabase.from('pengeluaran').select('*'),
          supabase.from('donations').select('*').eq('status', 'Berhasil'),
          supabase.from('programs').select('*')
        ]);

        const formattedIn = (resIn.data || []).map(d => ({ ...d, date: new Date(d.tanggal || d.created_at).toLocaleDateString('id-ID'), type: 'in', amount: Number(d.nominal), desc: d.keterangan }));
        const formattedOut = (resOut.data || []).map(d => ({ ...d, date: new Date(d.tanggal || d.created_at).toLocaleDateString('id-ID'), type: 'out', amount: Number(d.nominal), desc: d.keterangan }));
        
        setKasEntries([...formattedIn, ...formattedOut].sort((a, b) => new Date(b.date.split('/').reverse().join('-')).getTime() - new Date(a.date.split('/').reverse().join('-')).getTime()));
        setDonations(resDonations.data || []);
        setPrograms(resPrograms.data || []);
      } catch (err) {
        console.error('Error fetching transparansi', err);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const totalIn = kasEntries.filter(e => e.type === 'in').reduce((sum, e) => sum + e.amount, 0);
  const totalOut = kasEntries.filter(e => e.type === 'out').reduce((sum, e) => sum + e.amount, 0);
  const totalSaldo = totalIn - totalOut;

  const totalZiswaf = donations.reduce((sum, d) => sum + Number(d.nominal), 0);

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[9999] overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-4 py-12">
        <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-lime-500 p-6 sm:p-8 flex items-start justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/arabesque.png')] opacity-10 mix-blend-overlay"></div>
            <div className="relative z-10 text-white">
              <h2 className="text-2xl sm:text-4xl font-black mb-2 tracking-tight">Transparansi Keuangan</h2>
              <p className="text-emerald-50 text-sm sm:text-base opacity-90 max-w-2xl">
                Laporan terbuka dan real-time dana umat Masjid Citra Sentul Raya. Transparansi adalah amanah kami.
              </p>
            </div>
            <button 
              onClick={onClose}
              className="relative z-10 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            {appSettings?.show_transparansi_kas !== false && (
              <button 
                onClick={() => setActiveTab('kas')}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                  activeTab === 'kas' ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Book className="w-4 h-4" /> Kas & Operasional
              </button>
            )}
            {appSettings?.show_transparansi_ziswaf !== false && (
              <button 
                onClick={() => setActiveTab('ziswaf')}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                  activeTab === 'ziswaf' ? 'border-emerald-500 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <HeartHandshake className="w-4 h-4" /> Dana ZISWAF
              </button>
            )}
          </div>

          <div className="p-6 sm:p-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                <p className="text-slate-500 mt-4 font-medium animate-pulse">Menyiapkan data sinkronisasi...</p>
              </div>
            ) : (
              <>
                {/* Tab Kas */}
                {activeTab === 'kas' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-md">
                        <p className="text-emerald-100 text-xs font-bold uppercase mb-1">Saldo Akhir</p>
                        <h3 className="text-2xl sm:text-3xl font-black truncate">Rp {totalSaldo.toLocaleString('id-ID')}</h3>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-center">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-500" /> Total Pemasukan</p>
                        <h3 className="text-xl font-bold text-slate-800 truncate">Rp {totalIn.toLocaleString('id-ID')}</h3>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-center">
                        <p className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3 text-red-500" /> Total Pengeluaran</p>
                        <h3 className="text-xl font-bold text-slate-800 truncate">Rp {totalOut.toLocaleString('id-ID')}</h3>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="bg-slate-50 px-5 py-4 border-b border-slate-200">
                        <h3 className="font-bold text-slate-800 text-sm">Riwayat Transaksi Terakhir</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                              <th className="px-5 py-3 font-semibold w-32">Tanggal</th>
                              <th className="px-5 py-3 font-semibold">Keterangan</th>
                              <th className="px-5 py-3 font-semibold w-40 text-right">Nominal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {kasEntries.slice(0, 50).map((entry, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-5 py-4 text-slate-500">{entry.date}</td>
                                <td className="px-5 py-4 text-slate-800 font-medium">
                                  <div className="flex items-center gap-2">
                                    {entry.type === 'in' ? <div className="w-2 h-2 rounded-full bg-emerald-500" /> : <div className="w-2 h-2 rounded-full bg-red-500" />}
                                    {entry.desc}
                                  </div>
                                </td>
                                <td className={`px-5 py-4 font-bold text-right ${entry.type === 'in' ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {entry.type === 'in' ? '+' : '-'} Rp {entry.amount.toLocaleString('id-ID')}
                                </td>
                              </tr>
                            ))}
                            {kasEntries.length === 0 && (
                              <tr>
                                <td colSpan={3} className="px-5 py-8 text-center text-slate-500">Belum ada riwayat transaksi.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab ZISWAF */}
                {activeTab === 'ziswaf' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-gradient-to-br from-lime-500 to-lime-600 rounded-2xl p-6 text-white shadow-md text-center max-w-sm mx-auto">
                      <p className="text-lime-100 text-xs font-bold uppercase mb-1">Total Penyaluran & Titipan ZISWAF</p>
                      <h3 className="text-3xl sm:text-4xl font-black truncate">Rp {totalZiswaf.toLocaleString('id-ID')}</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {programs.map(prog => {
                        const terkumpul = donations.filter(d => d.programId === prog.id).reduce((sum, d) => sum + Number(d.nominal), 0);
                        const progress = prog.targetAmount ? Math.min((terkumpul / prog.targetAmount) * 100, 100) : 0;
                        return (
                          <div key={prog.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-slate-800 leading-tight pr-4">{prog.title}</h4>
                                <span className="bg-lime-100 text-lime-700 text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0">{prog.category}</span>
                              </div>
                            </div>
                            <div className="mt-4">
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2">
                                <div className="bg-lime-500 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                              </div>
                              <div className="flex justify-between items-end">
                                <div>
                                  <p className="text-slate-400 text-[10px] font-bold uppercase">Terkumpul</p>
                                  <p className="font-bold text-slate-800">Rp {terkumpul.toLocaleString('id-ID')}</p>
                                </div>
                                {prog.targetAmount && (
                                  <div className="text-right">
                                    <p className="text-slate-400 text-[10px] font-bold uppercase">Target</p>
                                    <p className="text-xs font-bold text-slate-500">Rp {prog.targetAmount.toLocaleString('id-ID')}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
