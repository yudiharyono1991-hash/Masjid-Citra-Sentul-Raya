import React, { useState } from 'react';
import {
  MapPin,
  PhoneCall,
  MessageSquare,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Share2,
  ExternalLink,
  Building,
} from 'lucide-react';

export const LokasiKontak: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Bagaimana cara konfirmasi donasi setelah melakukan transfer ke BSI?',
      a: 'Setelah melakukan transfer ke Rekening BSI 7257159102 a.n. Masjid Citra Sentul Raya, Anda dapat mengirimkan foto bukti transfer melalui WhatsApp kepada Pak Leo (+62 812-1920-0400). Anda juga dapat menggunakan tombol "Konfirmasi Wakaf" di website ini yang secara otomatis membuat pesan konfirmasi resmi.',
    },
    {
      q: 'Apakah bisa berwakaf atas nama orang tua atau keluarga yang sudah wafat?',
      a: 'Sangat bisa dan disunnahkan. Wakaf atas nama almarhum/almarhumah keluarga akan menjadi amal jariyah yang pahalanya mengalir tiada henti kepada beliau di alam kubur. Anda dapat mencantumkan niat tersebut pada form wakaf online.',
    },
    {
      q: 'Berapa target dana dan kapan Masjid Citra Sentul Raya mulai digunakan?',
      a: 'Target total dana pembangunan adalah Rp 15.000.000.000 (15 Miliar Rupiah). Saat ini pembangunan telah memasuki Tahap 3 (Struktur Utama & Pilar). InsyaAllah masjid ditargetkan siap digunakan untuk shalat berjamaah secara bertahap pada pertengahan 2027.',
    },
    {
      q: 'Di mana lokasi persis Masjid Citra Sentul Raya?',
      a: 'Masjid berlokasi di kawasan perumahan Citra Sentul Raya, kawasan Sirkuit Sentul, Desa Sentul, Kecamatan Babakan Madang, Kabupaten Bogor, Jawa Barat. Lokasi sangat strategis dekat akses Tol Sentul Circuit.',
    },
  ];

  return (
    <div id="kontak" className="py-12 bg-slate-50 border-t border-lime-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-100 text-lime-800 text-xs font-bold uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5 text-lime-600" />
            <span>Lokasi, Kontak & Tanya Jawab</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Hubungi Panitia & Informasi Lokasi
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Panitia pembangunan Masjid Citra Sentul Raya siap melayani konsultasi wakaf, kunjungan lokasi, serta silaturahmi jamaah.
          </p>
        </div>

        {/* Contact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pak Leo Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-lime-400 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-lime-800 text-lime-300 flex items-center justify-center font-bold text-lg">
              📱
            </div>
            <div>
              <span className="text-xs text-lime-700 font-extrabold uppercase block">
                Panitia Konfirmasi Donasi
              </span>
              <h3 className="text-xl font-bold text-slate-900">Pak Leo</h3>
              <p className="text-xs text-slate-500 font-medium">+62 812-1920-0400</p>
            </div>
            <a
              href="https://wa.me/6281219200400"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-lime-600 hover:bg-lime-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-lime-300" />
              <span>Chat WhatsApp Pak Leo</span>
            </a>
          </div>



          {/* Sekretariat Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-lime-400 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-lime-800 text-lime-300 flex items-center justify-center font-bold text-lg">
              🕌
            </div>
            <div>
              <span className="text-xs text-lime-700 font-extrabold uppercase block">
                Sekretariat Pembangunan
              </span>
              <h3 className="text-xl font-bold text-slate-900">Kawasan Citra Sentul Raya</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Sirkuit Sentul, Babakan Madang, Kab. Bogor - Jawa Barat
              </p>
            </div>
            <a
              href="https://maps.google.com/?q=Citra+Sentul+Raya+Bogor"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <MapPin className="w-4 h-4 text-lime-400" />
              <span>Buka Google Maps</span>
            </a>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-6 pt-4">
          <div className="text-center space-y-1">
            <h3 className="text-2xl font-black text-slate-900">
              Pertanyaan yang Sering Diajukan (FAQ)
            </h3>
            <p className="text-xs text-slate-500">
              Jawaban seputar legalitas, rekening BSI, dan transparansi penyaluran wakaf.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full p-4 sm:p-5 text-left font-bold text-xs sm:text-sm text-slate-900 flex items-center justify-between gap-4 hover:bg-slate-50"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-lime-600 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-5 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
