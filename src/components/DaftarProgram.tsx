import React, { useState } from 'react';
import { Wallet, Upload, X, CheckCircle, ZoomIn, ZoomOut, Download, Copy, Check, QrCode, FileText, Smartphone } from 'lucide-react';
import jsPDF from 'jspdf';

interface Program {
  id: number;
  kategori: string;
  judul: string;
  deskripsi: string;
  terkumpulPersen: number;
  terkumpulRp: number;
  targetRp: number;
  donatur: number;
  gambar: string;
}

interface DaftarProgramProps {
  programs: Program[];
  onDonate?: (programId: number, nominal: number, metode: string, bukti: File | string | null, namaDonatur: string, kontakDonatur: string, tanggalTransaksi?: string, keterangan?: string) => void;
  loggedInName?: string;
  loggedInContact?: string;
}

export const DaftarProgram: React.FC<DaftarProgramProps> = ({ programs, onDonate, loggedInName, loggedInContact }) => {
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [nominal, setNominal] = useState('');
  const [metode, setMetode] = useState('QRIS');
  const [buktiDonasi, setBuktiDonasi] = useState<File | null>(null);
  const [namaDonatur, setNamaDonatur] = useState('');
  const [kontakDonatur, setKontakDonatur] = useState('');
  const [tanggalTransaksi, setTanggalTransaksi] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [keterangan, setKeterangan] = useState<string>('');
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [showQrisZoom, setShowQrisZoom] = useState(false);
  const [isQrisZoomed, setIsQrisZoomed] = useState(false);
  const [copiedNominal, setCopiedNominal] = useState(false);

  const handleCopyNominal = () => {
    navigator.clipboard.writeText(nominal);
    setCopiedNominal(true);
    setTimeout(() => setCopiedNominal(false), 2000);
  };

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
  const formatRp = (angka: number) => {
    if (angka >= 1000000000) {
      return `Rp ${(angka / 1000000000).toFixed(1).replace('.0', '')}M`;
    }
    if (angka >= 1000000) {
      return `Rp ${(angka / 1000000).toFixed(0)}Jt`;
    }
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(angka);
  };

  return (
    <section className="py-16 bg-white" id="ziswaf">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-lime-600 font-bold uppercase tracking-wider text-sm mb-2">Program Unggulan</p>
          <h2 className="text-3xl font-bold text-slate-900 font-serif mb-2">Daftar Program ZISWAF</h2>
          <p className="text-slate-600">Grafik Statistik Perolehan Zakat, Infaq, Sedekah & Wakaf</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {programs.map((prog) => (
            <div key={prog.id} className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden hover:shadow-xl transition-shadow flex flex-col">
              <div className="relative h-48 overflow-hidden">
                <img
                  src={prog.gambar}
                  alt={prog.judul}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-lime-800 text-lime-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {prog.kategori}
                </div>
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <h3 className="text-xl font-bold text-slate-900 mb-2 font-serif">{prog.judul}</h3>
                <p className="text-slate-600 text-sm mb-6 flex-grow">
                  {(() => {
                    try {
                      const parsed = JSON.parse(prog.deskripsi);
                      return parsed.desc || prog.deskripsi;
                    } catch {
                      return prog.deskripsi;
                    }
                  })()}
                </p>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-lime-700">Terkumpul {prog.targetRp > 0 ? `${prog.terkumpulPersen}%` : formatRp(prog.terkumpulRp)}</span>
                      <span className="text-slate-500">{prog.donatur} Donatur</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-lime-500 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${prog.targetRp > 0 ? Math.min(prog.terkumpulPersen, 100) : 100}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end pt-3 mt-4 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Terkumpul:</p>
                      <p className="font-bold text-lime-700">{formatRp(prog.terkumpulRp)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 mb-1">Target Donasi:</p>
                      <p className="font-bold text-slate-700">{prog.targetRp > 0 ? formatRp(prog.targetRp) : 'Tanpa Batas'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-lime-700 bg-lime-50 px-3 py-1.5 rounded-lg border border-lime-200">
                      <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse"></span>
                      Verifikasi DKM
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedProgramId(prog.id);
                        setStep('form');
                        setNominal('');
                        setMetode('QRIS');
                        setBuktiDonasi(null);
                        setNamaDonatur(loggedInName || '');
                        setKontakDonatur(loggedInContact || '');
                        setTanggalTransaksi(new Date().toISOString().split('T')[0]);
                        setKeterangan('');
                      }}
                      className="bg-lime-600 hover:bg-lime-700 text-white font-bold py-1.5 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                    >
                      Bayar Sekarang
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL DONASI */}
      {selectedProgramId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <button onClick={() => setSelectedProgramId(null)} className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
              <X className="w-5 h-5 text-slate-500" />
            </button>
            
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">
                {step === 'form' ? 'Mulai Berdonasi' : 'Alhamdulillah'}
              </h2>
              <p className="text-sm text-slate-500 mb-6 line-clamp-1">
                {programs.find(p => p.id === selectedProgramId)?.judul}
              </p>

              {step === 'form' ? (
                <div className="space-y-4 h-[60vh] overflow-y-auto no-scrollbar pb-10">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Nama Lengkap (Opsional)</label>
                    <input type="text" placeholder="Hamba Allah" value={namaDonatur} onChange={(e) => setNamaDonatur(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-lime-600" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">No. WhatsApp / Email</label>
                    <input type="text" placeholder="Untuk info konfirmasi" value={kontakDonatur} onChange={(e) => setKontakDonatur(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-lime-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Tanggal Transaksi</label>
                      <input type="date" value={tanggalTransaksi} onChange={(e) => setTanggalTransaksi(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-lime-600" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Keterangan (Opsional)</label>
                      <input type="text" placeholder="Mis: Wakaf Alm. Bapak" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-lime-600" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Nominal (Rp)</label>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {[50000, 100000, 500000].map(val => (
                        <button key={val} onClick={() => setNominal(val.toString())} className={`py-2 text-sm font-bold border rounded-xl transition-colors ${nominal === val.toString() ? 'border-lime-600 bg-lime-50 text-lime-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                          {formatRp(val)}
                        </button>
                      ))}
                    </div>
                    <input type="text" placeholder="Nominal Lainnya..." value={nominal} onChange={(e) => setNominal(e.target.value.replace(/\D/g, ''))} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-lime-600" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Metode Pembayaran</label>
                    <select value={metode} onChange={(e) => setMetode(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-semibold focus:outline-none focus:border-lime-600 mb-3">
                      <option value="QRIS">Scan QRIS Instant (Semua Bank & E-Wallet)</option>
                      <option value="Bank Transfer (BSI)">Bank BSI (7257159102 a.n Masjid Citra Sentul Raya)</option>
                    </select>
                    
                    {metode === 'QRIS' && (
                      <div className="bg-emerald-950 border border-emerald-700/60 rounded-2xl p-4 animate-in fade-in space-y-4">
                        <style>{`
                          @keyframes scanSmall {
                            0%, 100% { transform: translateY(0); }
                            50% { transform: translateY(96px); }
                          }
                          .scanner-laser-small {
                            animation: scanSmall 2.5s ease-in-out infinite;
                          }
                        `}</style>
                        <div className="flex flex-wrap items-center justify-between gap-1 pb-2 border-b border-emerald-800/80">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"></span>
                            <span className="text-[9px] font-black tracking-wider text-lime-300 uppercase">QRIS INSTAN</span>
                          </div>
                          <div className="flex gap-1">
                            <span className="text-[8px] bg-lime-400/20 text-lime-300 px-1.5 py-0.5 rounded-md font-bold border border-lime-400/30">
                              GPN
                            </span>
                            <span className="text-[8px] bg-emerald-850 text-emerald-200 px-1.5 py-0.5 rounded-md font-semibold border border-emerald-700/50">
                              BI VERIFIED
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          <div
                            onClick={() => { setIsQrisZoomed(false); setShowQrisZoom(true); }}
                            className="group relative cursor-pointer flex-shrink-0"
                            title="Klik perbesar"
                          >
                            <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-lime-400 via-emerald-500 to-teal-500 opacity-40 blur-xs group-hover:opacity-75 transition duration-300" />
                            <div className="relative bg-white p-2.5 rounded-xl shadow-lg border border-lime-300/30 w-32 sm:w-40 aspect-square overflow-hidden flex items-center justify-center">
                              <img
                                src="/images/qris-masjid.jpg"
                                alt="QRIS Masjid Citra Sentul Raya"
                                className="w-full h-full object-contain rounded-lg block transition-transform duration-300 group-hover:scale-105 select-none"
                              />
                              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-lime-400 to-transparent shadow-[0_0_6px_1.5px_#a3e635] scanner-laser-small pointer-events-none" />
                              
                              <div className="absolute inset-0 bg-emerald-950/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-0.5">
                                <ZoomIn className="w-4 h-4 text-lime-300" />
                                <span className="text-[8px] text-lime-200 font-bold uppercase tracking-wider">ZOOM</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex-1 space-y-2">
                            <div>
                              <p className="text-xs font-black text-white leading-tight">Scan & Bayar Sekarang</p>
                              <p className="text-xs text-emerald-300 mt-0.5">a.n. Masjid Citra Sentul Raya</p>
                            </div>
                            <div>
                              <span className="text-[8px] font-mono font-bold text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-800 inline-block">
                                NMID: ID1023304558381
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <span className="text-[8px] font-black px-1 py-0.2 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">GoPay</span>
                              <span className="text-[8px] font-black px-1 py-0.2 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">OVO</span>
                              <span className="text-[8px] font-black px-1 py-0.2 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">Dana</span>
                              <span className="text-[8px] font-black px-1 py-0.2 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">SPay</span>
                              <span className="text-[8px] font-black px-1 py-0.2 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">BSI</span>
                            </div>
                          </div>
                        </div>

                        {nominal && parseInt(nominal) > 0 && (
                          <div className="bg-emerald-900/30 border border-emerald-800/40 p-2 rounded-xl flex items-center justify-between text-xs">
                            <div>
                              <span className="text-[8px] text-emerald-400 uppercase font-semibold block">Nominal Donasi:</span>
                              <span className="text-sm font-black text-lime-300">
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(parseInt(nominal))}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={handleCopyNominal}
                              className="px-2 py-1 bg-lime-400 hover:bg-lime-300 text-emerald-950 text-xs font-black rounded-md flex items-center gap-1 active:scale-95 transition-all shadow-xs cursor-pointer"
                            >
                              {copiedNominal ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedNominal ? 'Tersalin' : 'Salin'}</span>
                            </button>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2 border-t border-emerald-800/60">
                          <button
                            type="button"
                            onClick={() => { setIsQrisZoomed(false); setShowQrisZoom(true); }}
                            className="flex-1 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-600 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                            <span>Perbesar QR</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadQris('jpg')}
                            className="flex-1 text-xs font-bold text-emerald-100 bg-emerald-800 hover:bg-emerald-700 px-2 py-1.5 rounded-lg border border-emerald-700 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>JPG</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadQris('pdf')}
                            className="flex-1 text-xs font-bold text-emerald-100 bg-emerald-800 hover:bg-emerald-700 px-2 py-1.5 rounded-lg border border-emerald-700 flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>PDF</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Upload Bukti Transfer <span className="text-red-500">*</span></label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50 hover:border-lime-400 transition-colors" onClick={() => document.getElementById('bukti-upload')?.click()}>
                      <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-500">{buktiDonasi ? buktiDonasi.name : 'Klik untuk memilih file foto/screenshot'}</p>
                      <input id="bukti-upload" type="file" accept="image/*" className="hidden" onChange={(e) => { if(e.target.files && e.target.files[0]) setBuktiDonasi(e.target.files[0]) }} />
                    </div>
                  </div>

                  <button 
                    disabled={!nominal || !buktiDonasi || !kontakDonatur}
                    onClick={() => {
                      if (onDonate) {
                        onDonate(selectedProgramId, parseInt(nominal) || 0, metode, buktiDonasi, namaDonatur, kontakDonatur, tanggalTransaksi, keterangan);
                      }
                      setStep('success');
                    }}
                    className="w-full mt-4 py-3 bg-lime-600 hover:bg-lime-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-lg cursor-pointer"
                  >
                    Kirim Konfirmasi Donasi
                  </button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <CheckCircle className="w-16 h-16 text-lime-500 mx-auto mb-4" />
                  <h3 className="font-bold text-slate-800 text-lg mb-2">Konfirmasi Diterima!</h3>
                  <p className="text-sm text-slate-500 mb-6">
                    Jazakumullah Khairan. Donasi Anda sedang menunggu verifikasi dari pengurus DKM (Admin). Status dapat dicek pada menu Histori.
                  </p>
                  <div className="flex flex-col gap-3 mb-6">
                    <button type="button" onClick={() => {
                       const doc = new jsPDF();
                       doc.setFontSize(16);
                       doc.text('Bukti Donasi Sementara', 105, 20, { align: 'center' });
                       doc.setFont('helvetica', 'normal');
                       doc.text(`Program: ${programs.find(p => p.id === selectedProgramId)?.judul}`, 20, 40);
                       doc.text(`Nominal: Rp ${nominal}`, 20, 50);
                       doc.text(`Nama Donatur: ${namaDonatur || 'Hamba Allah'}`, 20, 60);
                       doc.text(`Status: Menunggu Verifikasi`, 20, 70);
                       if (keterangan) {
                         doc.text(`Keterangan: ${keterangan}`, 20, 80);
                       }
                       
                       // TTD Section
                       doc.text('Bogor, ' + new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }), 130, 100);
                       doc.setFont('helvetica', 'bold');
                       doc.text('Ketua DKM Masjid Citra Sentul Raya', 130, 105);
                       doc.text('_____________________________', 130, 125);
                       
                       doc.setFont('helvetica', 'italic');
                       doc.setFontSize(10);
                       doc.text('Bukti ini adalah struk sementara sebelum diverifikasi Admin.', 20, 140);
                       doc.save(`Struk_Donasi_${namaDonatur || 'Hamba_Allah'}.pdf`);
                    }} className="w-full px-4 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 text-sm border border-emerald-200">
                      <FileText className="w-4 h-4" /> Unduh Bukti Sementara (PDF)
                    </button>
                    <button type="button" onClick={() => {
                       const msg = `Assalamu'alaikum Admin DKM,\n\nSaya ${namaDonatur || 'Hamba Allah'} telah berdonasi sebesar Rp ${new Intl.NumberFormat('id-ID').format(parseInt(nominal || '0'))} untuk program *${programs.find(p => p.id === selectedProgramId)?.judul}*.\n\nMohon verifikasinya, jazakumullah khairan.`;
                       window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                    }} className="w-full px-4 py-2.5 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 text-sm shadow-md">
                      <Smartphone className="w-4 h-4" /> Kirim Info ke WhatsApp
                    </button>
                  </div>
                  <button onClick={() => setSelectedProgramId(null)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer w-full">
                    Selesai & Tutup
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN / INTERACTIVE ZOOM QRIS MODAL (PROGRAMS) — Premium */}
      {showQrisZoom && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm sm:max-w-md relative shadow-2xl overflow-hidden my-auto">

            {/* Gradient Header */}
            <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 px-6 pt-6 pb-8 text-center relative">
              <button
                onClick={() => { setShowQrisZoom(false); setIsQrisZoomed(false); }}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 text-lime-300 text-[11px] font-bold px-3 py-1 rounded-full mb-3">
                QRIS Resmi & Terverifikasi BI
              </div>
              <h3 className="text-lg font-black text-white tracking-tight">MASJID CITRA SENTUL RAYA</h3>
              <p className="text-emerald-200 text-[11px] mt-0.5">Dewan Kemakmuran Masjid (DKM)</p>

              {/* QR Frame */}
              <div className="mt-5 flex justify-center">
                <div
                  onClick={() => setIsQrisZoomed(!isQrisZoomed)}
                  className={`relative cursor-pointer group transition-all duration-300 ${
                    isQrisZoomed ? 'scale-[1.18]' : ''
                  }`}
                  title="Klik untuk zoom"
                >
                  <div className="absolute -inset-2 rounded-2xl bg-lime-400/30 blur-md group-hover:bg-lime-400/50 transition-all" />
                  <div className="relative bg-white p-4 rounded-2xl shadow-2xl border-2 border-lime-300/60 w-full max-w-[280px] mx-auto overflow-hidden aspect-square flex items-center justify-center">
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
                  onClick={() => { setShowQrisZoom(false); setIsQrisZoomed(false); }}
                  className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer border border-slate-200"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
