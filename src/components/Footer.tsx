import React from 'react';
import { HeartHandshake, PhoneCall, Youtube, ShieldCheck, ArrowUp } from 'lucide-react';

interface FooterProps {
  onNavigate: (sectionId: string) => void;
  onOpenWakafModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenWakafModal }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-lime-950 text-white pt-12 pb-8 border-t border-lime-800 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 pb-8 border-b border-lime-800/80">
          {/* Col 1: Brand Info */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-lime-400 text-lime-950 flex items-center justify-center font-bold text-xl shadow-md">
                🕌
              </div>
              <div>
                <h3 className="text-lg font-black text-white leading-tight">
                  MASJID CITRA SENTUL RAYA
                </h3>
                <span className="text-xs text-lime-300 block">
                  Kawasan Sirkuit Sentul, Kabupaten Bogor
                </span>
              </div>
            </div>

            <p className="text-xs text-lime-200 leading-relaxed max-w-md">
              Program Resmi Wakaf Pembangunan Masjid Citra Sentul Raya. Mari berinvestasi akhirat dengan membangun rumah Allah untuk keberkahan keluarga dan pahala jariyah yang mengalir selamanya.
            </p>

            <div className="bg-lime-900/90 border border-lime-700/80 p-3.5 rounded-2xl space-y-1 max-w-sm">
              <span className="text-xs text-lime-300 block font-semibold">Rekening Resmi BSI (Bank Syariah Indonesia)</span>
              <span className="text-xl font-mono font-black text-lime-300">7257159102</span>
              <span className="text-xs text-lime-200 block">a.n. Masjid Citra Sentul Raya</span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-lime-300 uppercase tracking-wider">
              Tautan Cepat
            </h4>
            <ul className="space-y-2 text-xs font-medium text-lime-200">
              <li>
                <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-lime-300 transition-colors">
                  • Beranda
                </button>
              </li>
              <li>
                <button onClick={() => { const el = document.getElementById('quran'); if(el) el.scrollIntoView({behavior: 'smooth'}) }} className="hover:text-lime-300 transition-colors">
                  • Al-Qur'an Digital
                </button>
              </li>
              <li>
                <button onClick={() => { const el = document.getElementById('ziswaf'); if(el) el.scrollIntoView({behavior: 'smooth'}) }} className="hover:text-lime-300 transition-colors">
                  • Program ZISWAF
                </button>
              </li>
              <li>
                <button onClick={() => { const el = document.getElementById('media'); if(el) el.scrollIntoView({behavior: 'smooth'}) }} className="hover:text-lime-300 transition-colors">
                  • Media Sosial
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Contact & Ayah */}
          <div className="lg:col-span-4 space-y-3">
            <h4 className="text-xs font-bold text-lime-300 uppercase tracking-wider">
              Konfirmasi & Sosial Media
            </h4>

            <div className="space-y-2 text-xs text-lime-200">
              <a
                href="https://wa.me/6281219200400"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-xl bg-lime-900 hover:bg-lime-800 transition-colors"
              >
                <PhoneCall className="w-4 h-4 text-lime-400 shrink-0" />
                <span>Pak Leo: +62 812-1920-0400</span>
              </a>



              <a
                href="https://youtube.com/@ashabulyamintv?si=2BVXSTrBwoouBi_9"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-xl bg-red-950 border border-red-800 text-red-200 hover:bg-red-900 transition-colors"
              >
                <Youtube className="w-4 h-4 text-red-400 shrink-0" />
                <span>Ashabul Yamin TV (YouTube)</span>
              </a>
            </div>

            <div className="pt-2 text-xs text-lime-300 italic border-t border-lime-800/80">
              "Perumpamaan orang yang menafkahkan hartanya di jalan Allah adalah serupa dengan sebutir benih yang menumbuhkan tujuh bulir..." (QS. Al-Baqarah: 261)
            </div>
          </div>
        </div>

        {/* Bottom copyright & Scroll to Top */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-lime-400">
          <div className="space-y-1 text-center sm:text-left">
            <p className="font-bold flex items-center gap-1.5 justify-center sm:justify-start">
              <ShieldCheck className="w-3.5 h-3.5" /> © 2026 Masjid Citra Sentul Raya. All Rights Reserved.
            </p>
            <p className="text-[10px] text-lime-500/80 max-w-sm">
              Hak Cipta Dilindungi Undang-Undang. Portal Sistem Informasi & ZISWAF Digital Resmi DKM Masjid Citra Sentul Raya.
            </p>
          </div>

          <button
            onClick={scrollToTop}
            className="p-2.5 rounded-xl bg-lime-900 hover:bg-lime-800 text-lime-300 transition-colors flex items-center gap-1 font-semibold text-xs"
          >
            <span>Ke Atas</span>
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
};
