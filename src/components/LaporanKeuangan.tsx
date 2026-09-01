import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Building,
  ShieldCheck,
  TrendingUp,
  HeartHandshake,
  FileText,
} from 'lucide-react';
import { Muwakif } from '../types';
import { formatRupiah, formatTanggalIndo } from '../utils/formatters';

interface LaporanKeuanganProps {
  muwakifList: Muwakif[];
  targetDana: number;
  terkumpul: number;
}

export const LaporanKeuangan: React.FC<LaporanKeuanganProps> = ({
  muwakifList,
  targetDana,
  terkumpul,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMetode, setFilterMetode] = useState<string>('semua');

  const filteredMuwakif = muwakifList.filter((m) => {
    const matchesSearch =
      m.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.pesanDoa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.paket && m.paket.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter =
      filterMetode === 'semua' ||
      (filterMetode === 'hambaAllah' && m.isHambaAllah) ||
      (filterMetode === 'BSI' && m.metode === 'BSI') ||
      (filterMetode === 'QRIS' && m.metode === 'QRIS');

    return matchesSearch && matchesFilter;
  });

  return (
    <div id="transparansi" className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Transparansi & Akuntabilitas Publik</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Laporan Keuangan & Daftar Muwakif
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Sebagai bentuk amanah, setiap rupiah yang disalurkan dicatat secara transparan dan terverifikasi oleh Tim Keuangan DKM Masjid Citra Sentul Raya.
          </p>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-900 to-emerald-950 text-white shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-300 font-semibold uppercase">Total Wakaf Terkumpul</span>
              <TrendingUp className="w-5 h-5 text-lime-400" />
            </div>
            <span className="text-2xl sm:text-3xl font-black text-lime-300 block">
              {formatRupiah(terkumpul)}
            </span>
            <p className="text-xs text-emerald-200">
              Disalurkan via BSI 7257159102 & QRIS
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase">Target Pembangunan</span>
              <Building className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-2xl sm:text-3xl font-black text-white block">
              {formatRupiah(targetDana)}
            </span>
            <p className="text-xs text-slate-400">
              Kebutuhan Hingga Finishing Selesai
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-800 font-semibold uppercase">Jumlah Donatur (Muwakif)</span>
              <Users className="w-5 h-5 text-emerald-700" />
            </div>
            <span className="text-2xl sm:text-3xl font-black text-emerald-900 block">
              {muwakifList.length.toLocaleString('id-ID')} Donatur
            </span>
            <p className="text-xs text-emerald-700 font-medium">
              Barakallah fiikum atas partisipasinya
            </p>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama muwakif atau pesan doa..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-600">Filter:</span>
            <select
              value={filterMetode}
              onChange={(e) => setFilterMetode(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="semua">Semua Donatur</option>
              <option value="hambaAllah">Hamba Allah Saja</option>
              <option value="BSI">Via BSI</option>
              <option value="QRIS">Via QRIS</option>
            </select>
          </div>
        </div>

        {/* Muwakif List */}
        <div className="space-y-3">
          {filteredMuwakif.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMuwakif.map((m) => (
                <div
                  key={m.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-sm flex items-center justify-center">
                        {m.isHambaAllah ? '🕌' : m.nama.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {m.nama}
                        </h3>
                        <span className="text-[11px] text-slate-500 font-medium block">
                          {formatTanggalIndo(m.tanggal)} • {m.metode}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black text-emerald-800 block">
                        {formatRupiah(m.nominal)}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {m.paket || 'Wakaf Bebas'}
                      </span>
                    </div>
                  </div>

                  {m.pesanDoa && (
                    <p className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      "{m.pesanDoa}"
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      <span>Terverifikasi Panitia</span>
                    </span>
                    <span className="font-mono">{m.id}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200">
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">Tidak ada data muwakif yang cocok dengan pencarian.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
