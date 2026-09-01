import React, { useState, useEffect } from 'react';
import { Newspaper, Calendar, User, Clock, ArrowRight, X, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BeritaInfo } from '../types';
import { formatTanggalIndo } from '../utils/formatters';

export const BeritaInformasi: React.FC = () => {
  const [beritaList, setBeritaList] = useState<BeritaInfo[]>([]);
  const [selectedBerita, setSelectedBerita] = useState<BeritaInfo | null>(null);
  const [activeKategori, setActiveKategori] = useState<string>('Semua');

  useEffect(() => {
    const fetchBerita = async () => {
      const { data, error } = await supabase.from('berita_masjid').select('*').order('tanggal', { ascending: false });
      if (!error && data) {
        setBeritaList(data.map(d => ({
          id: d.id,
          judul: d.judul,
          ringkasan: d.ringkasan,
          konten: d.konten,
          kategori: d.kategori,
          tanggal: d.tanggal,
          penulis: d.penulis,
          gambarUrl: d.gambar_url,
          bacaMenit: d.baca_menit
        })));
      }
    };
    fetchBerita();
  }, []);

  const kategoriList = ['Semua', 'Pembangunan', 'Kegiatan', 'Pengumuman'];

  const filteredBerita = beritaList.filter(
    (b) => activeKategori === 'Semua' || b.kategori === activeKategori
  );

  return (
    <div id="berita" className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">
              <Newspaper className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kabar & Informasi Terkini</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Berita Masjid Citra Sentul Raya
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm mt-1">
              Dapatkan berita terbaru seputar progres pembangunan, kegiatan majelis taklim, dan pengumuman panitia.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {kategoriList.map((kat) => (
              <button
                key={kat}
                onClick={() => setActiveKategori(kat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeKategori === kat
                    ? 'bg-emerald-800 text-lime-300 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {kat}
              </button>
            ))}
          </div>
        </div>

        {/* News Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {filteredBerita.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl hover:border-emerald-300 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="relative h-48 overflow-hidden bg-slate-900">
                  <img
                    src={b.gambarUrl}
                    alt={b.judul}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-emerald-900/90 text-lime-300 border border-emerald-600/50 text-xs font-extrabold px-3 py-1 rounded-full backdrop-blur-xs">
                    {b.kategori}
                  </span>
                </div>

                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{formatTanggalIndo(b.tanggal)}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{b.bacaMenit} menit baca</span>
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2">
                    {b.judul}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {b.ringkasan}
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-2">
                <button
                  onClick={() => setSelectedBerita(b)}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Baca Selengkapnya</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reader Modal */}
      {selectedBerita && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden my-8 animate-in zoom-in-95">
            <div className="relative h-64 sm:h-80 bg-slate-900">
              <img
                src={selectedBerita.gambarUrl}
                alt={selectedBerita.judul}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

              <button
                onClick={() => setSelectedBerita(null)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white shadow-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
                <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {selectedBerita.kategori}
                </span>
                <h3 className="text-xl sm:text-2xl font-black">{selectedBerita.judul}</h3>
                <div className="flex items-center gap-4 text-xs text-slate-300">
                  <span>Penulis: {selectedBerita.penulis}</span>
                  <span>• {formatTanggalIndo(selectedBerita.tanggal)}</span>
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-4 max-h-[50vh] overflow-y-auto text-slate-700 text-sm leading-relaxed whitespace-pre-line">
              {selectedBerita.konten}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedBerita(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-900"
              >
                Tutup Berita
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
