import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calculator, CheckCircle, TrendingDown, Save, AlertTriangle } from 'lucide-react';
import { JurnalEntry } from '../data/akuntansiData';

interface ModulPenyusutanAsetProps {
  onAutoPostJournal: (entry: JurnalEntry) => void;
  adminRole: string;
}

export const ModulPenyusutanAset: React.FC<ModulPenyusutanAsetProps> = ({ onAutoPostJournal, adminRole }) => {
  const [asetList, setAsetList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchAset();
  }, []);

  const fetchAset = async () => {
    try {
      const { data, error } = await supabase.from('masjid_inventaris').select('*').in('kategori', ['Elektronik & Sound System', 'Kendaraan Operasional', 'Peralatan & Furniture', 'Aset Tetap']);
      if (data) {
        setAsetList(data.map(d => ({
          ...d,
          nilaiBeli: d.nilai_beli || 0,
          umurEkonomis: d.umur_ekonomis || 0,
          nilaiSisa: d.nilai_sisa || 0,
          akumulasiPenyusutan: d.akumulasi_penyusutan || 0,
        })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDepresiasi = async (id: string, field: string, value: number) => {
    setAsetList(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const handleSimpanData = async (aset: any) => {
    try {
      const { error } = await supabase.from('masjid_inventaris').update({
        nilai_beli: aset.nilaiBeli,
        umur_ekonomis: aset.umurEkonomis,
        nilai_sisa: aset.nilaiSisa
      }).eq('id', aset.id);
      
      if (error) {
        alert('Gagal menyimpan ke database. Harap pastikan kolom nilai_beli, umur_ekonomis, nilai_sisa sudah ditambahkan ke tabel masjid_inventaris di Supabase dengan menjalankan SQL Migration.');
      } else {
        alert('Data parameter penyusutan aset berhasil disimpan!');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi saat menyimpan.');
    }
  };

  const handlePostingJurnal = (aset: any) => {
    if (!aset.nilaiBeli || !aset.umurEkonomis) {
      alert('Lengkapi Nilai Perolehan (Beli) dan Umur Ekonomis terlebih dahulu!');
      return;
    }
    
    // Perhitungan penyusutan metode Garis Lurus (Straight-line depreciation)
    const bebanPerTahun = (aset.nilaiBeli - (aset.nilaiSisa || 0)) / aset.umurEkonomis;
    const bebanPerBulan = Math.round(bebanPerTahun / 12);
    
    if (bebanPerBulan <= 0) {
      alert('Perhitungan beban penyusutan tidak valid (<= 0).');
      return;
    }

    const newJournal: JurnalEntry = {
      id: `JU-DEP-${Date.now()}`,
      tanggal: new Date().toISOString().split('T')[0],
      noBukti: `DEP-${aset.id.substring(0, 8)}`,
      keterangan: `Beban Penyusutan Bulan Ini: ${aset.nama}`,
      sumber: 'Modul Aset',
      baris: [
        { kodeAkun: '6-1100', namaAkun: 'Beban Penyusutan Aset (Debit)', debit: bebanPerBulan, kredit: 0 },
        { kodeAkun: '1-2100', namaAkun: 'Akumulasi Penyusutan Aset (Kredit)', debit: 0, kredit: bebanPerBulan }
      ],
      status: 'Posted',
      dibuatOleh: adminRole,
      tanggalBuat: new Date().toISOString().split('T')[0],
    };

    onAutoPostJournal(newJournal);
    alert(`Jurnal Beban Penyusutan untuk ${aset.nama} sebesar Rp${bebanPerBulan.toLocaleString('id-ID')} berhasil diposting ke Jurnal Umum!`);
  };

  if (adminRole !== 'bendahara' && adminRole !== 'direktur') {
    return (
      <div className="p-8 text-center bg-red-50 text-red-700 rounded-xl border border-red-200 animate-in fade-in">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold mb-2">Akses Ditolak (403 Forbidden)</h2>
        <p>Anda tidak memiliki otorisasi untuk mengakses Modul Depresiasi Aset. Hanya <strong>Bendahara</strong> dan <strong>Direktur</strong> yang diizinkan untuk mengelola penyusutan finansial.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-200 pb-4">
        <div className="p-3 bg-amber-100 rounded-xl">
          <TrendingDown className="w-8 h-8 text-amber-600" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800">Manajemen Penyusutan Aset</h2>
          <p className="text-sm text-slate-500">Kalkulasi Penyusutan Metode Garis Lurus & Auto-Posting Jurnal Akuntansi</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b">
            <tr>
              <th className="px-4 py-3">Nama Aset & Kategori</th>
              <th className="px-4 py-3 w-40 text-right">Nilai Perolehan (Rp)</th>
              <th className="px-4 py-3 w-28 text-center">Umur (Thn)</th>
              <th className="px-4 py-3 w-40 text-right">Nilai Sisa (Rp)</th>
              <th className="px-4 py-3 w-48 text-right">Beban Depresiasi/Bulan</th>
              <th className="px-4 py-3 text-center">Aksi Tata Kelola</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {asetList.map(aset => {
              const bebanPerTahun = (aset.nilaiBeli - (aset.nilaiSisa || 0)) / (aset.umurEkonomis || 1);
              const bebanPerBulan = (aset.nilaiBeli > 0 && aset.umurEkonomis > 0) ? Math.round(bebanPerTahun / 12) : 0;
              
              return (
                <tr key={aset.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-800">{aset.nama}</p>
                    <p className="text-xs uppercase font-bold text-slate-400">{aset.kategori}</p>
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="number" 
                      value={aset.nilaiBeli || ''} 
                      onChange={(e) => handleUpdateDepresiasi(aset.id, 'nilaiBeli', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-right font-mono focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="number" 
                      value={aset.umurEkonomis || ''} 
                      onChange={(e) => handleUpdateDepresiasi(aset.id, 'umurEkonomis', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-center font-mono focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                      placeholder="5"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="number" 
                      value={aset.nilaiSisa || ''} 
                      onChange={(e) => handleUpdateDepresiasi(aset.id, 'nilaiSisa', Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-right font-mono focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                      placeholder="0"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono font-black text-amber-600 text-right">
                    Rp{bebanPerBulan.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleSimpanData(aset)}
                        className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors" title="Simpan Parameter"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handlePostingJurnal(aset)}
                        disabled={bebanPerBulan <= 0}
                        className="px-3 py-2 bg-lime-100 text-lime-700 hover:bg-lime-200 disabled:opacity-50 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                        title="Posting Jurnal Beban Bulan Ini"
                      >
                        <Calculator className="w-4 h-4" /> Posting Jurnal
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {asetList.length === 0 && !loading && (
              <tr><td colSpan={6} className="text-center py-8 text-slate-500 font-medium bg-slate-50">Belum ada aset tetap yang dapat disusutkan.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
