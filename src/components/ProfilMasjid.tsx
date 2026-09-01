import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Building,
  Users,
  BookOpen,
  Heart,
  Car,
  Accessibility,
  Compass,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const ProfilMasjid: React.FC = () => {
  const [pengurus, setPengurus] = useState<any[]>([]);

  useEffect(() => {
    const fetchPengurus = async () => {
      try {
        const { data, error } = await supabase
          .from('masjid_pengurus_inti')
          .select('*')
          .order('urutan', { ascending: true });
        
        if (data) {
          setPengurus(data);
        }
      } catch (e) {
        console.error('Failed to fetch pengurus:', e);
      }
    };
    fetchPengurus();
  }, []);
  const fasilitas = [
    {
      title: 'Ruang Shalat Utama',
      desc: 'Kapasitas hingga 2.500 jamaah dengan karpet Turki 14mm, AC pendingin sejuk, dan tata suara Line Array berkualitas tinggi.',
      icon: Building,
    },
    {
      title: 'Area Wudhu & Toilet Ramah Lansia/Disabilitas',
      desc: 'Desain sanitasi syariah ramah air, bidang miring (ramp) untuk kursi roda, serta tempat duduk wudhu lansia.',
      icon: Accessibility,
    },
    {
      title: 'Taman Pendidikan Al-Qur\'an (TPQ)',
      desc: 'Ruang belajar generasi muda dengan metode pembinaan hafalan, tahsin, dan adab islami.',
      icon: BookOpen,
    },
    {
      title: 'Ruang Konseling Syariah & Ekonomi',
      desc: 'Layanan konsultasi syariah, muamalah, dan pendampingan UMKM halal berbasis prinsip Keuangan Syariah Modern.',
      icon: Heart,
    },
    {
      title: 'Perpustakaan Islam & Ruang Digital',
      desc: 'Koleksi kitab klasik, buku ilmu pengetahuan, serta akses e-library gratis untuk warga dan santri.',
      icon: Compass,
    },
    {
      title: 'Area Parkir Luas & Taman Edukasi',
      desc: 'Kapasitas parkir hingga 120 kendaraan roda empat dan 300 roda dua dengan penghijauan asri.',
      icon: Car,
    },
  ];

  return (
    <div id="profil" className="py-12 bg-lime-50/50 border-y border-lime-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-100 text-lime-800 text-xs font-bold uppercase tracking-wider">
            <Building className="w-3.5 h-3.5 text-lime-600" />
            <span>Pusat Ibadah, Peradaban & Dakwah</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Profil & Fasilitas Masjid Citra Sentul Raya
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Dirancang tidak hanya sebagai tempat shalat berjamaah, namun sebagai pusat pembinaan umat, pendidikan Al-Qur'an, dan pemberdayaan masyarakat Citra Sentul Raya Sirkuit Sentul.
          </p>
        </div>

        {/* Vision & Mission Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-lime-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-lime-800 text-lime-300 flex items-center justify-center font-bold text-xl">
              🎯
            </div>
            <h3 className="text-xl font-bold text-slate-900">Visi Pembangunan</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              "Menjadi masjid makmur, modern, ramah lingkungan, dan mandiri yang menjadi pusat kebangkitan keimanan, keilmuan, dan keharmonisan masyarakat di kawasan Citra Sentul Raya."
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-lime-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-lime-800 text-lime-300 flex items-center justify-center font-bold text-xl">
              🌱
            </div>
            <h3 className="text-xl font-bold text-slate-900">Misi Utama</h3>
            <ul className="space-y-2 text-xs text-slate-700 font-medium">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-lime-600 shrink-0 mt-0.5" />
                <span>Menyelenggarakan ibadah shalat berjamaah lima waktu dan shalat Jumat yang khusyuk dan nyaman.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-lime-600 shrink-0 mt-0.5" />
                <span>Membina generasi Rabbani melalui TPQ, Rumah Qur'an, dan kajian ilmiah berkala.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-lime-600 shrink-0 mt-0.5" />
                <span>Mengembangkan jejaring kepedulian sosial, zakat, infak, dan wakaf yang akuntabel.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Facilities Grid */}
        <div className="space-y-6">
          <h3 className="text-2xl font-black text-slate-900 text-center">
            Fasilitas Masjid
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fasilitas.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-lime-400 hover:shadow-lg transition-all space-y-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-lime-100 text-lime-800 flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">{f.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
        {/* Pengurus Grid */}
        {pengurus.length > 0 && (
          <div className="space-y-6 pt-12 border-t border-lime-200">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h3 className="text-2xl font-black text-slate-900">
                Susunan Pengurus DKM
              </h3>
              <p className="text-slate-600 text-sm">
                Dewan kemakmuran masjid yang mengelola dan melayani jamaah.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {pengurus.map((p, i) => (
                <div key={i} className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col items-center text-center hover:border-lime-400 hover:shadow-xl transition-all group">
                  {p.foto_url ? (
                    <img src={p.foto_url} alt={p.nama} className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-lime-100 group-hover:scale-110 transition-transform shadow-md" />
                  ) : (
                    <div className="w-24 h-24 bg-lime-100 text-lime-700 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md">
                      <Users className="w-10 h-10" />
                    </div>
                  )}
                  <h4 className="font-bold text-slate-900 text-lg mb-1">{p.nama}</h4>
                  <div className="px-3 py-1 bg-lime-100 text-lime-800 text-xs font-bold rounded-full uppercase tracking-wider mb-3">
                    {p.jabatan || 'Pengurus'}
                  </div>
                  {p.biodata && (
                    <p className="text-sm text-slate-600 line-clamp-4">
                      {p.biodata}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
