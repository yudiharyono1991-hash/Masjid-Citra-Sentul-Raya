import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  HeartHandshake,
  CreditCard,
  Copy,
  Check,
  Send,
  Sparkles,
  QrCode,
  Building,
  UserCheck,
  MessageSquare,
  FileCheck,
  PackageCheck,
  ShieldAlert,
  ZoomIn,
  ZoomOut,
  Download,
  X,
  FileText,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { supabase } from '../lib/supabase';
import { formatRupiah, buildWhatsAppLink, generateUniqueCode, toLocalDateString } from '../utils/formatters';
import { Muwakif } from '../types';

interface WakafFormProps {
  onAddMuwakif: (newMuwakif: Muwakif) => void;
  onShowCertificate: (muwakif: Muwakif) => void;
}

export const WakafForm: React.FC<WakafFormProps> = ({ onAddMuwakif, onShowCertificate }) => {
  const [paketList, setPaketList] = useState<any[]>([]);
  const [selectedPaket, setSelectedPaket] = useState<string>('');
  
  useEffect(() => {
    const fetchPaket = async () => {
      const { data, error } = await supabase.from('paket_wakaf').select('*').order('urutan', { ascending: true });
      if (!error && data) {
        setPaketList(data);
        if (data.length > 0) setSelectedPaket(data[0].id);
      }
    };
    fetchPaket();
  }, []);
  const [customNominal, setCustomNominal] = useState<string>('1500000');
  const [nama, setNama] = useState<string>('');
  const [isHambaAllah, setIsHambaAllah] = useState<boolean>(false);
  const [telepon, setTelepon] = useState<string>('');
  const [pesanDoa, setPesanDoa] = useState<string>('');
  const [tanggalTransaksi, setTanggalTransaksi] = useState<string>(() => toLocalDateString());
  const [keterangan, setKeterangan] = useState<string>('');
  const [metodePembayaran, setMetodePembayaran] = useState<'BSI' | 'QRIS'>('BSI');
  const [showQrisModal, setShowQrisModal] = useState<boolean>(false);
  const [isQrisZoomed, setIsQrisZoomed] = useState<boolean>(false);
  
  const [uniqueCode] = useState<number>(() => generateUniqueCode());
  const [copiedNominal, setCopiedNominal] = useState(false);
  const [copiedRek, setCopiedRek] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [lastSubmittedMuwakif, setLastSubmittedMuwakif] = useState<Muwakif | null>(null);

  const handleDownloadQris = async (format: 'jpg' | 'pdf' = 'jpg') => {
    try {
      if (format === 'pdf') {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        doc.setFontSize(16);
        doc.text('QRIS - Masjid Citra Sentul Raya', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text('NMID: ID1023304558381', 105, 30, { align: 'center' });
        
        const imgObj = new Image();
        imgObj.src = '/images/qris-masjid.jpg';
        await new Promise((resolve, reject) => {
          imgObj.onload = resolve;
          imgObj.onerror = reject;
        });
        
        doc.addImage(imgObj, 'JPEG', 55, 40, 100, 100);
        doc.setFontSize(10);
        doc.text('Terima kasih atas infak dan sedekah Anda. Jazakumullah Khairan.', 105, 150, { align: 'center' });
        doc.save('QRIS-Masjid-Citra-Sentul-Raya.pdf');
        return;
      }

      const response = await fetch('/images/qris-masjid.jpg');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'QRIS-Masjid-Citra-Sentul-Raya.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      if (format === 'jpg') {
        const link = document.createElement('a');
        link.href = '/images/qris-masjid.jpg';
        link.download = 'QRIS-Masjid-Citra-Sentul-Raya.jpg';
        link.target = '_blank';
        link.click();
      }
    }
  };

  // Compute base nominal
  const selectedPaketObj = paketList.find((p) => p.id === selectedPaket);
  const baseNominal = selectedPaket === 'custom'
    ? Math.max(10000, parseInt(customNominal || '0', 10))
    : selectedPaketObj ? selectedPaketObj.nominal : 100000;

  const totalTransfer = baseNominal + uniqueCode;

  const handleSelectPaket = (id: string, nominal: number) => {
    setSelectedPaket(id);
    if (id !== 'custom') {
      setCustomNominal(nominal.toString());
    }
  };

  const handleCopy = (text: string, type: 'nominal' | 'rek') => {
    navigator.clipboard.writeText(text);
    if (type === 'nominal') {
      setCopiedNominal(true);
      setTimeout(() => setCopiedNominal(false), 2000);
    } else {
      setCopiedRek(true);
      setTimeout(() => setCopiedRek(false), 2000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const donorName = isHambaAllah ? 'Hamba Allah' : (nama.trim() || 'Hamba Allah');
    
    const newMuwakif: Muwakif = {
      id: 'mw-' + Date.now(),
      nama: donorName,
      nominal: totalTransfer,
      paket: selectedPaketObj ? selectedPaketObj.nama : 'Wakaf Nominal Bebas',
      tanggal: tanggalTransaksi,
      pesanDoa: pesanDoa.trim() || 'Semoga wakaf ini membawa keberkahan dan pahala yang tak terputus.',
      keterangan: keterangan.trim(),
      isHambaAllah,
      isVerified: true,
      metode: metodePembayaran,
    };

    onAddMuwakif(newMuwakif);
    setLastSubmittedMuwakif(newMuwakif);
    setIsSubmitted(true);

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#84cc16', '#10b981', '#059669', '#d97706'],
      });
    } catch {
      // Ignore if canvas confetti isn't supported
    }
  };

  return (
    <div id="wakaf" className="bg-white rounded-3xl border border-emerald-100 shadow-xl overflow-hidden my-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900 text-white p-6 sm:p-8 relative">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 text-lime-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-lime-400" />
              <span>Pilihan Paket Wakaf Cepat & Otomatis</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Kalkulator & Form Wakaf Online
            </h2>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-2xl">
              Salurkan wakaf terbaik Anda untuk pembangunan Masjid Citra Sentul Raya. Pilih paket atau masukkan nominal kustom secara bebas.
            </p>
          </div>

          <div className="bg-emerald-950/80 border border-emerald-600/60 rounded-2xl p-3 text-right">
            <span className="text-xs text-emerald-300 block">Nomor Rekening Resmi BSI</span>
            <span className="text-xl font-mono font-black text-lime-300">7257159102</span>
            <span className="text-xs text-emerald-200 block font-semibold">a.n. Masjid Citra Sentul Raya</span>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* STEP 1: Pilih Paket Wakaf */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-emerald-600" />
                <span>1. Pilih Paket Wakaf Pembangunan</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {paketList.map((paket) => {
                  const isSelected = selectedPaket === paket.id;
                  return (
                    <button
                      key={paket.id}
                      type="button"
                      onClick={() => handleSelectPaket(paket.id, paket.nominal)}
                      className={`text-left p-4 rounded-2xl border-2 transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-50/90 border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                          : 'bg-slate-50/60 border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                      }`}
                    >
                      {paket.populer && (
                        <span className="absolute -top-2.5 right-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-extrabold px-2 py-0.5 rounded-full shadow-2xs">
                          {paket.badge}
                        </span>
                      )}

                      <div>
                        <span className="text-xs font-bold text-emerald-800 block mb-1">
                          {paket.nama}
                        </span>
                        <span className="text-lg font-black text-slate-900 block">
                          {formatRupiah(paket.nominal)}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          {paket.deskripsi}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold">
                        <span className={isSelected ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                          {isSelected ? '✓ Terpilih' : 'Pilih Paket'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Nominal Option */}
              <div className="pt-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPaket('custom')}
                    className={`px-4 py-2.5 rounded-xl border-2 text-xs font-bold transition-colors ${
                      selectedPaket === 'custom'
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    Atur Nominal Bebas
                  </button>

                  {selectedPaket === 'custom' && (
                    <div className="flex-1 relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                        Rp
                      </span>
                      <input
                        type="number"
                        min="10000"
                        step="10000"
                        value={customNominal}
                        onChange={(e) => setCustomNominal(e.target.value)}
                        placeholder="Contoh: 500000"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* STEP 2: Data Wakif / Donatur */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>2. Identitas Wakif / Donatur</span>
                </label>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-600">Nama Lengkap</label>
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isHambaAllah}
                          onChange={(e) => setIsHambaAllah(e.target.checked)}
                          className="rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                        />
                        <span>Sembunyikan Nama (Hamba Allah)</span>
                      </label>
                    </div>
                    <input
                      type="text"
                      disabled={isHambaAllah}
                      value={isHambaAllah ? 'Hamba Allah' : nama}
                      onChange={(e) => setNama(e.target.value)}
                      placeholder="Masukkan nama lengkap Anda / Keluarga"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 disabled:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Nomor WhatsApp (Opsional, untuk e-sertifikat)
                    </label>
                    <input
                      type="tel"
                      value={telepon}
                      onChange={(e) => setTelepon(e.target.value)}
                      placeholder="Contoh: 08123456789"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Tanggal Transaksi (Bisa disesuaikan)
                    </label>
                    <input
                      type="date"
                      value={tanggalTransaksi}
                      onChange={(e) => setTanggalTransaksi(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>3. Pesan & Keterangan Tambahan</span>
                </label>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Keterangan Transfer (Mis: Wakaf Alm Bapak, Transfer ke BCA, dll)</label>
                    <input
                      type="text"
                      value={keterangan}
                      onChange={(e) => setKeterangan(e.target.value)}
                      placeholder="Contoh: Transfer ke rekening BCA 5 juta"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Pesan Niat & Doa Keberkahan</label>
                    <textarea
                      rows={3}
                      value={pesanDoa}
                      onChange={(e) => setPesanDoa(e.target.value)}
                      placeholder="Tuliskan niat wakaf atau doa untuk diri sendiri, keluarga, atau almarhum/almarhumah tercinta..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 3: Metode Pembayaran & Kode Unik Transfer */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>4. Metode Pembayaran & Rincian Transfer</span>
              </label>

              {/* Toggle Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setMetodePembayaran('BSI')}
                  className={`flex-1 p-3 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                    metodePembayaran === 'BSI'
                      ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Building className="w-4 h-4 text-lime-400" />
                  <span>Transfer BSI (Bank Syariah Indonesia)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMetodePembayaran('QRIS')}
                  className={`flex-1 p-3 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                    metodePembayaran === 'QRIS'
                      ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-lime-400" />
                  <span>QRIS Instant (Mobile Banking / E-Wallet)</span>
                </button>
              </div>

              {/* Summary Transfer Card */}
              <div className="bg-emerald-950 text-white p-5 rounded-2xl border-2 border-emerald-600 space-y-4">
                {metodePembayaran === 'BSI' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-emerald-800 pb-3">
                      <div>
                        <span className="text-xs text-emerald-300 block">Bank Tujuan</span>
                        <span className="text-sm font-bold text-white">Bank Syariah Indonesia (BSI)</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-emerald-300 block">Atas Nama Rekening</span>
                        <span className="text-sm font-bold text-lime-300">Masjid Citra Sentul Raya</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-emerald-900 p-3.5 rounded-xl border border-emerald-700">
                      <div>
                        <span className="text-[11px] text-emerald-300 block font-semibold uppercase">Nomor Rekening BSI</span>
                        <span className="text-2xl font-mono font-black text-lime-300 tracking-wider">
                          7257159102
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy('7257159102', 'rek')}
                        className="px-4 py-2 bg-lime-400 hover:bg-lime-300 text-emerald-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        {copiedRek ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedRek ? 'Tersalin!' : 'Salin No. Rek'}</span>
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-emerald-900/60 p-3.5 rounded-xl border border-emerald-800">
                      <div>
                        <span className="text-[11px] text-emerald-300 block font-semibold">Total Nominal Transfer (+Kode Unik)</span>
                        <span className="text-2xl font-black text-white">
                          {formatRupiah(totalTransfer)}
                        </span>
                        <span className="text-xs text-emerald-400 block mt-0.5">
                          *Termasuk kode unik verifikasi otomatis Rp {uniqueCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(totalTransfer.toString(), 'nominal')}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-emerald-500"
                      >
                        {copiedNominal ? <Check className="w-4 h-4 text-lime-300" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedNominal ? 'Tersalin!' : 'Salin Nominal Exact'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* QRIS Card — Premium Redesign */
                  <div className="flex flex-col gap-5">
                    {/* Scanner laser animation */}
                    <style>{`
                      @keyframes scan {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(148px); }
                      }
                      .scanner-laser {
                        animation: scan 2.5s ease-in-out infinite;
                      }
                    `}</style>

                    {/* Top: Header Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-emerald-800/80">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse"></span>
                        <span className="text-xs font-black tracking-wider text-lime-300 uppercase">QRIS INSTAN</span>
                      </div>
                      <div className="flex gap-1.5">
                        <span className="text-[9px] bg-lime-400/20 text-lime-300 px-2 py-0.5 rounded-md font-bold border border-lime-400/30">
                          GPN STANDAR
                        </span>
                        <span className="text-[9px] bg-emerald-850 text-emerald-200 px-2 py-0.5 rounded-md font-semibold border border-emerald-700/50">
                          BI VERIFIED
                        </span>
                      </div>
                    </div>

                    {/* Middle: QR + Instructions Side-by-Side */}
                    <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                      {/* Left: QR Frame with laser scanner */}
                      <div className="flex-shrink-0 flex flex-col items-center">
                        <div
                          onClick={() => { setIsQrisZoomed(false); setShowQrisModal(true); }}
                          className="group relative cursor-pointer"
                          title="Klik untuk memperbesar QRIS"
                        >
                          {/* Outer glow aura */}
                          <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-tr from-lime-400 via-emerald-500 to-teal-400 opacity-40 blur-md group-hover:opacity-75 transition duration-300" />
                          
                          {/* Inner white container */}
                          <div className="relative bg-white p-3 rounded-2xl shadow-2xl border border-lime-300/40 w-40 sm:w-48 aspect-square overflow-hidden flex items-center justify-center">
                            <img
                              src="/images/qris-masjid.jpg"
                              alt="QRIS Masjid Citra Sentul Raya"
                              className="w-full h-full object-contain rounded-xl select-none block transition-transform duration-300 group-hover:scale-105"
                            />
                            {/* Scanning laser line overlay */}
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-lime-400 to-transparent shadow-[0_0_8px_2px_#a3e635] scanner-laser pointer-events-none" />
                            
                            {/* Hover overlay with zoom icon */}
                            <div className="absolute inset-0 bg-emerald-950/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg flex flex-col items-center justify-center gap-1">
                              <ZoomIn className="w-5 h-5 text-lime-300" />
                              <span className="text-[9px] text-lime-200 font-black tracking-wider uppercase">PERBESAR</span>
                            </div>
                          </div>
                        </div>

                        {/* NMID Badge */}
                        <div className="mt-2.5">
                          <span className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded-md border border-emerald-800">
                            NMID: ID1023304558381
                          </span>
                        </div>
                      </div>

                      {/* Right: Instructions & Supported Brands */}
                      <div className="flex-grow space-y-3.5 text-center sm:text-left w-full">
                        <div>
                          <h4 className="text-sm font-extrabold text-white flex items-center justify-center sm:justify-start gap-1.5 leading-tight">
                            <span>Scan QRIS untuk Wakaf</span>
                            <span className="text-[9px] font-normal text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-800">DKM Resmi</span>
                          </h4>
                          <p className="text-xs text-emerald-300 mt-1 max-w-sm mx-auto sm:mx-0">
                            Pindai kode QR menggunakan aplikasi e-wallet atau mobile banking Anda untuk melakukan transfer instan.
                          </p>
                        </div>

                        {/* Step Guidelines */}
                        <div className="space-y-1.5 text-[11px] text-emerald-100 text-left max-w-sm mx-auto sm:mx-0">
                          <div className="flex items-start gap-2 bg-emerald-900/30 p-2 rounded-xl border border-emerald-800/40">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-lime-500/20 text-lime-300 flex items-center justify-center font-bold text-[9px]">1</span>
                            <p className="leading-tight">Klik gambar QR untuk memperbesar atau mengunduhnya.</p>
                          </div>
                          <div className="flex items-start gap-2 bg-emerald-900/30 p-2 rounded-xl border border-emerald-800/40">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-lime-500/20 text-lime-300 flex items-center justify-center font-bold text-[9px]">2</span>
                            <p className="leading-tight">Buka menu <strong>Scan / Bayar</strong> di E-Wallet atau M-Banking.</p>
                          </div>
                          <div className="flex items-start gap-2 bg-emerald-900/30 p-2 rounded-xl border border-emerald-800/40">
                            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-lime-500/20 text-lime-300 flex items-center justify-center font-bold text-[9px]">3</span>
                            <p className="leading-tight">Masukkan nominal transfer tepat sebesar: <strong className="text-lime-300">{formatRupiah(totalTransfer)}</strong>.</p>
                          </div>
                        </div>

                        {/* E-wallet brand chips with colored pill designs */}
                        <div className="space-y-1">
                          <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block">Mendukung Pembayaran:</span>
                          <div className="flex flex-wrap gap-1 justify-center sm:justify-start">
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">GoPay</span>
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">OVO</span>
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">Dana</span>
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">ShopeePay</span>
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">LinkAja</span>
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">BSI Mobile</span>
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-blue-600/10 text-blue-300 border border-blue-600/20">BCA</span>
                          </div>
                        </div>

                        {/* Nominal + Action buttons */}
                        <div className="pt-2.5 border-t border-emerald-800/80 flex flex-wrap items-center justify-between gap-3 bg-emerald-900/30 p-2.5 rounded-xl border border-emerald-800/40">
                          <div className="text-left">
                            <span className="text-[9px] text-emerald-400 uppercase font-semibold block">Total Nominal:</span>
                            <span className="text-lg font-black text-lime-300 tracking-wide">{formatRupiah(totalTransfer)}</span>
                          </div>
                          <div className="flex gap-1.5 ml-auto">
                            <button
                              type="button"
                              onClick={() => handleCopy(totalTransfer.toString(), 'nominal')}
                              className="px-2.5 py-1.5 bg-lime-400 hover:bg-lime-300 text-emerald-950 text-[11px] font-black rounded-lg transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-md"
                            >
                              {copiedNominal ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedNominal ? 'Tersalin' : 'Salin Nominal'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadQris('jpg')}
                              className="px-2.5 py-1.5 bg-emerald-850 hover:bg-emerald-700 text-emerald-100 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 border border-emerald-600 active:scale-95 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>JPG</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadQris('pdf')}
                              className="px-2.5 py-1.5 bg-emerald-850 hover:bg-emerald-700 text-emerald-100 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 border border-emerald-600 active:scale-95 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>PDF</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit & Confirm Button */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-lime-600 hover:from-emerald-700 hover:to-lime-700 text-white font-extrabold text-base tracking-wide shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <HeartHandshake className="w-5 h-5 text-lime-300" />
                <span>Niatkan & Konfirmasi Wakaf</span>
              </button>
            </div>
          </form>
        ) : (
          /* SUCCESS SUBMISSION PANEL */
          <div className="text-center py-6 space-y-6 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Sparkles className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-2 max-w-xl mx-auto">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">
                Alhamdulillah! Niat Wakaf Terdaftar
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                Jazakumullah Khairan Katsiran
              </h3>
              <p className="text-slate-600 text-sm">
                Terima kasih, <strong className="text-emerald-800 font-bold">{lastSubmittedMuwakif?.nama}</strong>. Semoga Allah melipatgandakan rezeki, melapangkan setiap urusan, dan membangunkan rumah di surga-Nya.
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 max-w-md mx-auto text-left space-y-2 text-xs text-slate-700">
              <div className="flex justify-between border-b border-emerald-200 pb-2">
                <span className="text-slate-500">Nominal Wakaf:</span>
                <span className="font-extrabold text-emerald-800 text-sm">{formatRupiah(lastSubmittedMuwakif?.nominal || 0)}</span>
              </div>
              <div className="flex justify-between border-b border-emerald-200 pb-2">
                <span className="text-slate-500">Paket:</span>
                <span className="font-semibold">{lastSubmittedMuwakif?.paket}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Metode:</span>
                <span className="font-bold text-slate-800">{lastSubmittedMuwakif?.metode}</span>
              </div>
            </div>

            {/* Actions: WA Confirm & View Digital Certificate */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              {lastSubmittedMuwakif && (
                <>
                  <a
                    href={buildWhatsAppLink('081219200400', {
                      nama: lastSubmittedMuwakif.nama,
                      nominal: lastSubmittedMuwakif.nominal,
                      paket: lastSubmittedMuwakif.paket,
                      pesanDoa: lastSubmittedMuwakif.pesanDoa,
                      keterangan: lastSubmittedMuwakif.keterangan,
                      metode: lastSubmittedMuwakif.metode,
                      tanggal: lastSubmittedMuwakif.tanggal,
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-transform hover:scale-105"
                  >
                    <Send className="w-4 h-4 text-lime-300" />
                    <span>Kirim Bukti via WhatsApp Pak Leo</span>
                  </a>

                  <button
                    onClick={() => onShowCertificate(lastSubmittedMuwakif)}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileCheck className="w-4 h-4" />
                    <span>Lihat & Cetak E-Sertifikat Wakaf</span>
                  </button>
                </>
              )}

              <button
                onClick={() => setIsSubmitted(false)}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-sm cursor-pointer"
              >
                Wakaf Lagi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FULLSCREEN / INTERACTIVE ZOOM QRIS MODAL — Premium */}
      {showQrisModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm sm:max-w-md relative shadow-2xl overflow-hidden my-auto">

            {/* Gradient Header */}
            <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 px-6 pt-6 pb-8 text-center relative">
              <button
                onClick={() => { setShowQrisModal(false); setIsQrisZoomed(false); }}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 text-lime-300 text-[11px] font-bold px-3 py-1 rounded-full mb-3">
                <ShieldAlert className="w-3 h-3" />
                QRIS Resmi & Terverifikasi BI
              </div>
              <h3 className="text-lg font-black text-white tracking-tight">MASJID CITRA SENTUL RAYA</h3>
              <p className="text-emerald-200 text-[11px] mt-0.5">Dewan Kemakmuran Masjid (DKM)</p>

              {/* Floating QR Frame — overlaps into white section */}
              <div className="mt-5 flex justify-center">
                <div
                  onClick={() => setIsQrisZoomed(!isQrisZoomed)}
                  className={`relative cursor-pointer group transition-all duration-300 ${
                    isQrisZoomed ? 'scale-[1.18]' : ''
                  }`}
                  title="Klik untuk zoom"
                >
                  {/* Glow */}
                  <div className="absolute -inset-2 rounded-2xl bg-lime-400/30 blur-md group-hover:bg-lime-400/50 transition-all" />
                  <div className="relative bg-white p-4 rounded-2xl shadow-2xl border-2 border-lime-300/60 w-full max-w-[280px] mx-auto aspect-square overflow-hidden flex items-center justify-center">
                    <img
                      src="/images/qris-masjid.jpg"
                      alt="QRIS Masjid Citra Sentul Raya Full"
                      className="w-full h-full object-contain rounded-xl mx-auto block select-none"
                    />
                    <div className="absolute inset-0 bg-emerald-900/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-1.5">
                      {isQrisZoomed
                        ? <><ZoomOut className="w-6 h-6 text-lime-300" /><span className="text-lime-200 text-xs font-bold">Kecilkan</span></>
                        : <><ZoomIn className="w-6 h-6 text-lime-300" /><span className="text-lime-200 text-xs font-bold">Zoom In</span></>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* White Body */}
            <div className="px-6 pt-5 pb-6 space-y-4">
              {/* NMID + GPN badge */}
              <div className="flex items-center justify-center gap-2">
                <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                  NMID: ID1023304558381
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                  GPN Verified
                </span>
              </div>

              {/* Zoom hint */}
              <p className="text-center text-[11px] text-slate-400">
                {isQrisZoomed ? 'Klik gambar lagi untuk kecilkan' : 'Klik gambar QR untuk memperbesar'}
              </p>

              {/* Supported apps */}
              <div>
                <p className="text-xs text-center text-slate-400 uppercase tracking-wider font-semibold mb-2">Didukung oleh</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {['GoPay','OVO','Dana','ShopeePay','LinkAja','BCA','Mandiri','BRI','BSI','BNI'].map(w => (
                    <span key={w} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold border border-slate-200">{w}</span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleDownloadQris()}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-lime-300" />
                  <span>Unduh QRIS</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setShowQrisModal(false); setIsQrisZoomed(false); }}
                  className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer border border-slate-200"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
