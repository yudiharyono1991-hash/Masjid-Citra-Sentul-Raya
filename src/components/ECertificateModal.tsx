import React from 'react';
import { X, Printer, Download, Sparkles, ShieldCheck } from 'lucide-react';
import { Muwakif } from '../types';
import { formatRupiah, formatTanggalIndo } from '../utils/formatters';

interface ECertificateModalProps {
  muwakif: Muwakif | null;
  onClose: () => void;
}

export const ECertificateModal: React.FC<ECertificateModalProps> = ({ muwakif, onClose }) => {
  if (!muwakif) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-4 border-amber-400 overflow-hidden my-8 animate-in zoom-in-95">
        {/* Top Control Bar */}
        <div className="bg-emerald-950 text-white px-6 py-4 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-bold tracking-wide">
              E-Sertifikat Resmi Wakaf Masjid Citra Sentul Raya
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-lime-300 text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Cetak atau Simpan PDF"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Cetak / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Certificate Canvas */}
        <div className="p-8 sm:p-12 text-center bg-[radial-gradient(#f1f5f9_1px,transparent_1px)] [background-size:16px_16px] relative">
          {/* Watermark Logo Background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <span className="text-9xl">🕌</span>
          </div>

          <div className="border-2 border-emerald-800/20 p-6 sm:p-8 rounded-2xl relative z-10 space-y-6">
            {/* Header Calligraphy */}
            <div className="space-y-1">
              <span className="text-xl sm:text-2xl font-serif text-emerald-900 font-bold tracking-widest">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </span>
              <span className="block text-xs text-slate-500 uppercase tracking-widest pt-1">
                SERTIFIKAT WAKAF PEMBANGUNAN MASJID
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-emerald-900 tracking-tight">
                MASJID CITRA SENTUL RAYA
              </h2>
              <p className="text-[11px] text-slate-600 font-medium">
                Sirkuit Sentul, Desa Sentul, Kab. Bogor - Jawa Barat
              </p>
            </div>

            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto"></div>

            {/* Certificate Body */}
            <div className="space-y-4">
              <p className="text-xs text-slate-600 font-serif">
                Sertifikat ini diterbitkan sebagai bukti penerimaan wakaf pembangunan rumah Allah kepada:
              </p>

              <div className="py-2">
                <span className="text-xl sm:text-3xl font-black text-emerald-900 border-b-2 border-amber-400 pb-1 inline-block px-4">
                  {muwakif.nama}
                </span>
              </div>

              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 max-w-lg mx-auto space-y-1.5 text-xs text-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nominal Wakaf:</span>
                  <span className="font-extrabold text-emerald-900 text-sm">{formatRupiah(muwakif.nominal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paket Wakaf:</span>
                  <span className="font-bold text-slate-800">{muwakif.paket}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal Penyaluran:</span>
                  <span className="font-medium">{formatTanggalIndo(muwakif.tanggal)}</span>
                </div>
                <div className="flex justify-between border-t border-emerald-200/60 pt-1">
                  <span className="text-slate-500">Nomor Referensi:</span>
                  <span className="font-mono font-bold text-emerald-800">{muwakif.id}</span>
                </div>
              </div>

              {muwakif.pesanDoa && (
                <div className="italic text-xs text-slate-600 bg-amber-50 border border-amber-200/60 p-3 rounded-xl max-w-lg mx-auto">
                  "{muwakif.pesanDoa}"
                </div>
              )}
            </div>

            {/* Hadits Quote */}
            <div className="pt-2">
              <p className="text-[11px] text-slate-600 italic">
                “Siapa yang membangun masjid karena Allah, maka Allah akan membangunkan baginya rumah di surga.”
              </p>
              <span className="text-xs text-emerald-800 font-bold block mt-0.5">(HR. Bukhari & Muslim)</span>
            </div>

            {/* Signatures & Stamp */}
            <div className="grid grid-cols-2 gap-4 pt-6 text-xs border-t border-slate-200/80">
              <div className="space-y-8">
                <span className="text-slate-500 block text-xs">Ketua Panitia Pembangunan</span>
                <div className="font-bold text-slate-900 underline">
                  Pak Leo / Bpk. Grandis
                </div>
              </div>
              <div className="space-y-8">
                <span className="text-slate-500 block text-xs">Ketua DKM Masjid Citra Sentul</span>
                <div className="font-bold text-slate-900 underline">
                  Pengurus DKM
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-emerald-700 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Rekening Resmi BSI 7257159102 a.n. Masjid Citra Sentul Raya</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
