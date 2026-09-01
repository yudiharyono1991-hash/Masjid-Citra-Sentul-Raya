import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Calculator, Clock, Calendar, ChevronRight, ChevronDown, LogOut, Download, Activity, Image as ImageIcon, LayoutDashboard, Settings, Bell, Camera, Wallet, BookOpen, Volume2, VolumeX, BookMarked, Sparkles, Play, Award, Heart, RefreshCw, Send, Smartphone, CheckCircle2, ShieldCheck, Zap, MessageSquare } from 'lucide-react';
import jsPDF from 'jspdf';
import { AlQuranDigital, BookmarkData } from './AlQuranDigital';
import { BukuPanduanModal } from './BukuPanduanModal';
import { triggerWaApp, sendWaViaGateway, generateWaReminderMessage, formatWaPhone, triggerDeviceNotification, requestDeviceNotificationPermission } from '../utils/whatsappReminder';
import { supabase } from '../lib/supabase';
import { getPrayerTimesSentul, getNextPrayerInfo } from '../utils/prayerTimes';
interface JamaahDashboardProps {
  onBack: () => void;
  nama: string;
  kontak: string;
  donasiHistory?: any[];
  programs?: any[];
}

export const JamaahDashboard: React.FC<JamaahDashboardProps> = ({ onBack, nama, kontak, donasiHistory = [], programs = [] }) => {
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'donasi' | 'laporan' | 'histori' | 'profil' | 'jadwal' | 'quran' | 'tanya' | 'kajian'>('ringkasan');
  const [penghasilan, setPenghasilan] = useState('');
  const [bonus, setBonus] = useState('');
  const [showKalkulator, setShowKalkulator] = useState(false);
  const [showPanduanModal, setShowPanduanModal] = useState(false);
  const [profilePic, setProfilePic] = useState<string>('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const jadwalShalat = getPrayerTimesSentul();
  const nextPrayer = getNextPrayerInfo(jadwalShalat);

  // Load profile from localStorage if present
  const [profilName, setProfilName] = useState<string>(nama || 'Hamba Allah');
  const [profilContact, setProfilContact] = useState<string>(kontak || '');
  
  // Al-Quran Digital State
  const [isQuranModalOpen, setIsQuranModalOpen] = useState(false);
  const [selectedSurahNomor, setSelectedSurahNomor] = useState<number | null>(null);
  const [initialQuranTab, setInitialQuranTab] = useState<'surah' | 'dzikir'>('surah');
  const [bookmark, setBookmark] = useState<BookmarkData | null>(null);
  const [khatamCount, setKhatamCount] = useState<number>(0);

  // Aspirasi & Tanya DKM State
  const [formKategori, setFormKategori] = useState('Fiqih & Ibadah');
  const [formJudul, setFormJudul] = useState('');
  const [formPesan, setFormPesan] = useState('');
  const [isAnonim, setIsAnonim] = useState(false);

  // Dropdown Category Navigation State (1-word categories: Utama, Layanan, Keuangan, Akun)
  const [openDropdown, setOpenDropdown] = useState<'utama' | 'layanan' | 'keuangan' | 'akun' | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.jamaah-dropdown-container')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'ringkasan': return 'Ringkasan Utama';
      case 'quran': return 'Al-Qur\'an Digital';
      case 'jadwal': return 'Jadwal Shalat Presisi';
      case 'kajian': return 'Jadwal & Pendaftaran Kajian';
      case 'tanya': return 'Tanya DKM & Aspirasi';
      case 'donasi': return 'Pengingat Donasi & E-Wallet';
      case 'laporan': return 'Progress ZISWAF';
      case 'histori': return 'Histori Transaksi';
      case 'profil': return 'Pengaturan Profil';
      default: return tab;
    }
  };

  const [aspirasiList, setAspirasiList] = useState<any[]>([]);

  useEffect(() => {
    const fetchAspirasi = async () => {
      try {
        const { data, error } = await supabase.from('tanya_dkm').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          const formatted = data.map((d: any) => ({
            id: d.id,
            kategori: d.kategori,
            judul: d.judul,
            pesan: d.pesan,
            namaPenanya: d.nama_penanya,
            tanggal: d.tanggal,
            status: d.status,
            jawabanDkm: d.jawaban_dkm,
            penjawabDkm: d.penjawab_dkm,
            tanggalJawaban: d.tanggal_jawaban
          }));
          setAspirasiList(formatted);
          localStorage.setItem('masjid_tanya_dkm_list', JSON.stringify(formatted));
        } else {
          const saved = localStorage.getItem('masjid_tanya_dkm_list');
          if (saved) {
             setAspirasiList(JSON.parse(saved));
          }
        }
      } catch (err) {
        console.error('Error fetching aspirasi:', err);
      }
    };
    fetchAspirasi();
  }, []);

  const handleTambahAspirasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJudul.trim() || !formPesan.trim()) {
      alert('Mohon lengkapi judul dan isi pertanyaan!');
      return;
    }

    const newItem = {
      id: `tanya-${Date.now()}`,
      kategori: formKategori,
      judul: formJudul.trim(),
      pesan: formPesan.trim(),
      namaPenanya: isAnonim ? 'Hamba Allah (Anonim)' : profilName,
      tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      status: 'Menunggu',
      jawabanDkm: null,
      penjawabDkm: null,
      tanggalJawaban: null
    };

    const updated = [newItem, ...aspirasiList];
    setAspirasiList(updated);
    localStorage.setItem('masjid_tanya_dkm_list', JSON.stringify(updated));

    try {
      await supabase.from('tanya_dkm').insert([{
        id: newItem.id,
        kategori: newItem.kategori,
        judul: newItem.judul,
        pesan: newItem.pesan,
        nama_penanya: newItem.namaPenanya,
        tanggal: newItem.tanggal,
        status: newItem.status,
        jawaban_dkm: null,
        penjawab_dkm: null,
        tanggal_jawaban: null
      }]);

      await supabase.from('notifications').insert([{
        user_role: 'admin',
        title: `Pesan/Tanya Baru: ${newItem.kategori}`,
        message: `Dari ${newItem.namaPenanya}: ${newItem.judul}`,
        is_read: false
      }]);

    } catch (err) {
      console.error('Failed to insert aspirasi to Supabase', err);
    }

    setFormJudul('');
    setFormPesan('');
    alert('✅ Pertanyaan / Aspirasi Anda berhasil terkirim ke pengurus DKM! Tim kami akan meninjau dan memberikan jawaban segera.');
  };

  // Adzan Alarms State
  const [adzanAlarms, setAdzanAlarms] = useState<{ [key: string]: boolean }>({
    subuh: true,
    dzuhur: true,
    ashar: true,
    maghrib: true,
    isya: true,
    tahajjud: false,
    dhuha: false,
  });

  // Settings State for Routine Donation & Reminders
  const [tipeDonasi, setTipeDonasi] = useState<'otomatis' | 'pengingat'>(() => {
    return (localStorage.getItem('masjid_tipe_donasi') as 'otomatis' | 'pengingat') || 'pengingat';
  });
  const [tanggalPengingat, setTanggalPengingat] = useState<string>(() => {
    return localStorage.getItem('masjid_tanggal_pengingat') || '25';
  });
  const [targetNominal, setTargetNominal] = useState<string>(() => {
    return localStorage.getItem('masjid_target_nominal') || '100.000';
  });
  const [waGatewayToken, setWaGatewayToken] = useState<string>(() => {
    return localStorage.getItem('masjid_wa_gateway_token') || '';
  });
  const [showWaNotification, setShowWaNotification] = useState(false);
  const [waNotificationMsg, setWaNotificationMsg] = useState('');
  const [waSendingStatus, setWaSendingStatus] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Wallet Connection State
  const [connectedWallet, setConnectedWallet] = useState<string | null>(() => {
    return localStorage.getItem('masjid_connected_wallet') || null;
  });
  const [selectedWalletToConnect, setSelectedWalletToConnect] = useState('DANA');
  const [connectionStep, setConnectionStep] = useState<'select' | 'phone' | 'otp' | 'connected'>(() => {
    return localStorage.getItem('masjid_connected_wallet') ? 'connected' : 'select';
  });
  const [walletPhone, setWalletPhone] = useState(() => {
    return localStorage.getItem('masjid_wallet_phone') || kontak || '081517045406';
  });
  const [otpCode, setOtpCode] = useState('');

  // Registration date tracking ("Bergabung Sejak")
  const [joinDate, setJoinDate] = useState<string>(() => {
    const key = `masjid_created_at_${kontak || nama}`;
    const saved = localStorage.getItem(key);
    if (saved) return saved;

    const now = new Date();
    const formatted = now.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    if (kontak || nama) {
      localStorage.setItem(key, formatted);
    }
    return formatted;
  });

  useEffect(() => {
    if (nama && nama !== 'Hamba Allah') {
      setProfilName(nama);
      localStorage.setItem('masjid_user_name', nama);
    } else {
      const savedName = localStorage.getItem('masjid_user_name');
      if (savedName) setProfilName(savedName);
    }

    if (kontak) {
      setProfilContact(kontak);
      localStorage.setItem('masjid_user_phone', kontak);
    } else {
      const savedPhone = localStorage.getItem('masjid_user_phone');
      if (savedPhone) setProfilContact(savedPhone);
    }

    const savedPic = localStorage.getItem('masjid_user_pic');
    if (savedPic) setProfilePic(savedPic);

    const savedKhatam = localStorage.getItem('masjid_quran_khatam');
    if (savedKhatam) setKhatamCount(parseInt(savedKhatam, 10));

    const savedBookmark = localStorage.getItem('masjid_quran_bookmark');
    if (savedBookmark) {
      try {
        setBookmark(JSON.parse(savedBookmark));
      } catch (e) {
        console.error('Error parsing bookmark', e);
      }
    }
  }, [nama, kontak]);

  // Safe string values to prevent uncaught TypeError during render
  const safeName = (profilName || nama || 'Hamba Allah').toString().toLowerCase();
  const safeContact = (profilContact || kontak || '').toString().toLowerCase();

  // Filter transactions strictly for this user (starts empty [] for new users!)
  const userDonasiHistory = (donasiHistory || []).filter(d => {
    if (!d) return false;
    const matchContact = Boolean(d.kontakDonatur && safeContact && String(d.kontakDonatur).toLowerCase() === safeContact);
    const matchName = Boolean(d.namaDonatur && safeName && String(d.namaDonatur).toLowerCase() === safeName);
    return matchContact || matchName;
  });

  const totalGaji = (parseFloat(penghasilan) || 0) + (parseFloat(bonus) || 0);
  const nisabBulan = (85 * 1000000) / 12;
  const wajibZakat = totalGaji >= nisabBulan;
  const jumlahZakat = wajibZakat ? totalGaji * 0.025 : 0;

  const formatRp = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const generatePDF = (donasi: typeof donasiHistory[0]) => {
    const doc = new jsPDF();
    doc.setFillColor(6, 78, 59);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('MASJID CITRA SENTUL RAYA', 15, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Kuitansi Resmi Penerimaan ZISWAF Digital', 15, 28);
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('BUKTI TRANSAKSI DONASI', 15, 55);
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 60, 195, 60);

    const startY = 70;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('No. Referensi:', 15, startY);
    doc.setFont('helvetica', 'normal');
    doc.text(`CSR-ZISWAF-${donasi.id}009823`, 60, startY);

    doc.setFont('helvetica', 'bold');
    doc.text('Tanggal Transaksi:', 15, startY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(donasi.tanggal, 60, startY + 10);

    doc.setFont('helvetica', 'bold');
    doc.text('Nama Donatur:', 15, startY + 20);
    doc.setFont('helvetica', 'normal');
    doc.text(profilName, 60, startY + 20);

    doc.setFont('helvetica', 'bold');
    doc.text('Nomor Kontak:', 15, startY + 30);
    doc.setFont('helvetica', 'normal');
    doc.text(profilContact, 60, startY + 30);

    doc.setFont('helvetica', 'bold');
    doc.text('Program ZISWAF:', 15, startY + 40);
    doc.setFont('helvetica', 'normal');
    doc.text(donasi.programName, 60, startY + 40);

    doc.setFont('helvetica', 'bold');
    doc.text('Nominal Donasi:', 15, startY + 50);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 78, 59);
    doc.text(formatRp(donasi.nominal), 60, startY + 50);

    doc.setTextColor(51, 51, 51);
    doc.setFont('helvetica', 'bold');
    doc.text('Status:', 15, startY + 60);
    doc.setTextColor(16, 185, 129);
    doc.text(donasi.status.toUpperCase(), 60, startY + 60);

    doc.setDrawColor(226, 232, 240);
    doc.line(15, startY + 75, 195, startY + 75);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('Terima kasih atas infaq dan sedekah Anda. Semoga menjadi pembersih harta dan pendorong keberkahan.', 15, startY + 85);
    doc.text('Dokumen ini diterbitkan secara otomatis oleh Portal Resmi Masjid Citra Sentul Raya.', 15, startY + 92);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 78, 59);
    doc.text('DKM MASJID CITRA SENTUL RAYA', 140, startY + 120);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Tersetujui Sistem Digital', 145, startY + 126);

    doc.save(`Kuitansi_Donasi_${donasi.id}_MasjidCitraSentul.pdf`);
  };

  const TabButton = ({ id, icon: Icon, label }: { id: typeof activeTab; icon: any; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all cursor-pointer whitespace-nowrap ${
        activeTab === id
          ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
          : 'text-slate-600 hover:text-emerald-900 hover:bg-emerald-50/60'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );

  const MobileNavButton = ({ id, icon: Icon, label }: { id: typeof activeTab; icon: any; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex flex-col items-center justify-center flex-1 py-2 px-1 text-[11px] font-semibold transition-colors cursor-pointer ${
        activeTab === id ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      <Icon className={`w-5 h-5 mb-0.5 ${activeTab === id ? 'text-emerald-700' : 'text-slate-400'}`} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans text-slate-800 pb-20 md:pb-12">
      {/* Top Navbar */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-emerald-800 text-xs md:text-sm font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPanduanModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white hover:bg-emerald-800 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-lime-300" /> Buku Panduan
            </button>
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline-block">Portal Resmi Jamaah</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              Versi 2.4 Active
            </span>
          </div>
        </div>
      </div>

      <BukuPanduanModal
        isOpen={showPanduanModal}
        onClose={() => setShowPanduanModal(false)}
        defaultRole="jamaah"
      />

      {/* Profile Banner - Serene Emerald Gradient */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-xl relative overflow-hidden border border-emerald-800/40">
          {/* Avatar */}
          <div className="relative group">
            <img 
              src={profilePic} 
              alt="Profil Jamaah" 
              className="w-24 h-24 rounded-full border-4 border-emerald-500/30 object-cover shadow-lg"
            />
            <div className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-950 p-1.5 rounded-full shadow-md">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left z-10 w-full">
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Anggota Terverifikasi
              </span>
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                <Award className="w-3 h-3" /> Muhsinin Aktif
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 tracking-tight">{profilName}</h2>
            <p className="text-emerald-200/80 text-xs md:text-sm mb-4 font-medium">{profilContact} • Masjid Citra Sentul Raya</p>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <div className="bg-emerald-800/50 backdrop-blur-md rounded-xl px-4 py-2 border border-emerald-700/50 text-center">
                <p className="text-[9px] text-emerald-300 font-bold uppercase tracking-wider mb-0.5">Total Infaq</p>
                <p className="text-base md:text-lg font-bold text-amber-300">
                  {formatRp(userDonasiHistory.filter(d => d.status === 'Berhasil').reduce((acc, curr) => acc + curr.nominal, 0) || 0)}
                </p>
              </div>
              <div className="bg-emerald-800/50 backdrop-blur-md rounded-xl px-4 py-2 border border-emerald-700/50 text-center">
                <p className="text-[9px] text-emerald-300 font-bold uppercase tracking-wider mb-0.5">Bergabung Sejak</p>
                <p className="text-base md:text-lg font-bold text-white">{joinDate}</p>
              </div>
              <div className="bg-emerald-800/50 backdrop-blur-md rounded-xl px-4 py-2 border border-emerald-700/50 text-center">
                <p className="text-[9px] text-emerald-300 font-bold uppercase tracking-wider mb-0.5">Jadwal Pengingat</p>
                <p className="text-base md:text-lg font-bold text-white">Tgl {tanggalPengingat}</p>
              </div>
              <button 
                onClick={() => {
                  if (isRefreshing) return;
                  setIsRefreshing(true);
                  setTimeout(() => setIsRefreshing(false), 500);
                }} 
                className={`bg-white/10 hover:bg-white/20 rounded-xl px-3.5 py-2 border border-white/10 flex flex-col items-center justify-center text-emerald-100 transition-colors cursor-pointer ${isRefreshing ? 'opacity-70' : ''}`}
              >
                <RefreshCw className={`w-3.5 h-3.5 mb-0.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="text-[9px] font-bold uppercase">{isRefreshing ? 'Loading' : 'Refresh'}</span>
              </button>
              <button 
                onClick={onBack} 
                className="bg-rose-500/20 hover:bg-rose-500/30 rounded-xl px-3.5 py-2 border border-rose-500/30 flex flex-col items-center justify-center text-rose-200 transition-colors cursor-pointer ml-auto md:ml-2"
              >
                <LogOut className="w-3.5 h-3.5 mb-0.5" />
                <span className="text-[9px] font-bold uppercase">Keluar</span>
              </button>
            </div>
          </div>
          
          <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>
      </div>

      {/* 1-Word Dropdown Category Navigation */}
      <div className="max-w-7xl mx-auto px-4 mt-6 jamaah-dropdown-container relative z-40">
        <div className="bg-white rounded-3xl p-3 shadow-md border border-slate-200/80">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            
            {/* 1. Category: UTAMA */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'utama' ? null : 'utama')}
                className={`w-full p-3 rounded-2xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer border ${
                  activeTab === 'ringkasan' || activeTab === 'quran' || activeTab === 'jadwal'
                    ? 'bg-emerald-800 text-white border-emerald-700 shadow-md'
                    : 'bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                  <span>Utama</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === 'utama' ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Options */}
              {openDropdown === 'utama' && (
                <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <p className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">Pilihan Menu Utama</p>
                  <button
                    onClick={() => { setActiveTab('ringkasan'); setOpenDropdown(null); }}
                    className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center gap-2.5 hover:bg-emerald-50 transition-colors cursor-pointer ${
                      activeTab === 'ringkasan' ? 'text-emerald-800 bg-emerald-50/80 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <Activity className="w-4 h-4 text-emerald-600" /> Ringkasan Utama
                  </button>
                  <button
                    onClick={() => { setActiveTab('quran'); setOpenDropdown(null); }}
                    className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center gap-2.5 hover:bg-emerald-50 transition-colors cursor-pointer ${
                      activeTab === 'quran' ? 'text-emerald-800 bg-emerald-50/80 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-teal-600" /> Al-Qur'an Digital 30 Juz
                  </button>
                  <button
                    onClick={() => { setActiveTab('jadwal'); setOpenDropdown(null); }}
                    className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center gap-2.5 hover:bg-emerald-50 transition-colors cursor-pointer ${
                      activeTab === 'jadwal' ? 'text-emerald-800 bg-emerald-50/80 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-indigo-600" /> Jadwal Shalat Presisi
                  </button>
                </div>
              )}
            </div>

            {/* 2. Category: LAYANAN */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'layanan' ? null : 'layanan')}
                className={`w-full p-3 rounded-2xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer border ${
                  activeTab === 'tanya' || activeTab === 'kajian'
                    ? 'bg-emerald-800 text-white border-emerald-700 shadow-md'
                    : 'bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-lime-300" />
                  <span>Layanan</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === 'layanan' ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Options */}
              {openDropdown === 'layanan' && (
                <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <p className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">Pilihan Layanan</p>
                  <button
                    onClick={() => { setActiveTab('tanya'); setOpenDropdown(null); }}
                    className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center gap-2.5 hover:bg-emerald-50 transition-colors cursor-pointer ${
                      activeTab === 'tanya' ? 'text-emerald-800 bg-emerald-50/80 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-600" /> Tanya DKM & Aspirasi
                  </button>
                </div>
              )}
            </div>

            {/* 3. Category: KEUANGAN */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'keuangan' ? null : 'keuangan')}
                className={`w-full p-3 rounded-2xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer border ${
                  activeTab === 'donasi' || activeTab === 'laporan' || activeTab === 'histori'
                    ? 'bg-emerald-800 text-white border-emerald-700 shadow-md'
                    : 'bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-300" />
                  <span>Keuangan</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === 'keuangan' ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Options */}
              {openDropdown === 'keuangan' && (
                <div className="absolute left-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <p className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">Pilihan Menu Keuangan</p>
                  <button
                    onClick={() => { setActiveTab('donasi'); setOpenDropdown(null); }}
                    className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center gap-2.5 hover:bg-emerald-50 transition-colors cursor-pointer ${
                      activeTab === 'donasi' ? 'text-emerald-800 bg-emerald-50/80 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <Bell className="w-4 h-4 text-amber-600" /> Pengingat Donasi & E-Wallet
                  </button>
                  <button
                    onClick={() => { setActiveTab('laporan'); setOpenDropdown(null); }}
                    className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center gap-2.5 hover:bg-emerald-50 transition-colors cursor-pointer ${
                      activeTab === 'laporan' ? 'text-emerald-800 bg-emerald-50/80 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-emerald-600" /> Progress ZISWAF Masjid
                  </button>
                  <button
                    onClick={() => { setActiveTab('histori'); setOpenDropdown(null); }}
                    className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center gap-2.5 hover:bg-emerald-50 transition-colors cursor-pointer ${
                      activeTab === 'histori' ? 'text-emerald-800 bg-emerald-50/80 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-blue-600" /> Histori Donasi Anda
                  </button>
                </div>
              )}
            </div>

            {/* 4. Category: AKUN */}
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'akun' ? null : 'akun')}
                className={`w-full p-3 rounded-2xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer border ${
                  activeTab === 'profil'
                    ? 'bg-emerald-800 text-white border-emerald-700 shadow-md'
                    : 'bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-300" />
                  <span>Akun</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === 'akun' ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Options */}
              {openDropdown === 'akun' && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <p className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">Pilihan Menu Akun</p>
                  <button
                    onClick={() => { setActiveTab('profil'); setOpenDropdown(null); }}
                    className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center gap-2.5 hover:bg-emerald-50 transition-colors cursor-pointer ${
                      activeTab === 'profil' ? 'text-emerald-800 bg-emerald-50/80 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <Settings className="w-4 h-4 text-slate-600" /> Pengaturan Profil Saya
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Active Sub-Menu Pill Breadcrumb */}
          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200/60 mt-2">
            <span className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5">
              Tampilan Aktif: <strong className="text-emerald-800 font-bold">{getTabLabel(activeTab)}</strong>
            </span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full uppercase">
              {activeTab === 'ringkasan' || activeTab === 'quran' || activeTab === 'jadwal' ? 'Kelompok: UTAMA' :
               activeTab === 'tanya' ? 'Kelompok: LAYANAN' :
               activeTab === 'donasi' || activeTab === 'laporan' || activeTab === 'histori' ? 'Kelompok: KEUANGAN' : 'Kelompok: AKUN'}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-between px-2 py-1 z-50 overflow-x-auto gap-1 shadow-lg">
        <MobileNavButton id="ringkasan" icon={LayoutDashboard} label="Utama" />
        <MobileNavButton id="quran" icon={BookOpen} label="Quran" />
        <MobileNavButton id="tanya" icon={MessageSquare} label="Tanya DKM" />
        <MobileNavButton id="donasi" icon={Wallet} label="Donasi" />
        <MobileNavButton id="histori" icon={Calendar} label="Histori" />
        <MobileNavButton id="profil" icon={Settings} label="Profil" />
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 mt-6">
        
        {/* TAB 1: RINGKASAN UTAMA */}
        {activeTab === 'ringkasan' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Top 4 Clean Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Donasi Anda</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">
                    {formatRp(userDonasiHistory.filter(d => d.status === 'Berhasil').reduce((acc, curr) => acc + curr.nominal, 0))}
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center shrink-0 text-teal-700">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Program Didukung</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">
                    {new Set(userDonasiHistory.filter(d => d.status === 'Berhasil').map(d => d.programName)).size} Program ZISWAF
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 text-amber-700">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jadwal Pengingat</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">
                    Tanggal {tanggalPengingat} / Bulan
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-700">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tingkat Keanggotaan</p>
                  <p className="text-xl font-bold text-slate-800 mt-0.5">
                    Bronze Muhsinin
                  </p>
                </div>
              </div>
            </div>

            {/* Jadwal Shalat Widget - Soft Light Clean Theme */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                <div>
                  <h3 className="text-slate-800 font-bold text-base md:text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-600" /> Jadwal Shalat Hari Ini
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Waktu shalat presisi untuk wilayah Sentul Raya & Bogor</p>
                </div>
                <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200">
                  📍 Sentul Raya, Bogor
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { id: 'Subuh', time: jadwalShalat.subuh },
                  { id: 'Dzuhur', time: jadwalShalat.dzuhur },
                  { id: 'Ashar', time: jadwalShalat.ashar },
                  { id: 'Maghrib', time: jadwalShalat.maghrib },
                  { id: 'Isya', time: jadwalShalat.isya }
                ].map((prayer) => {
                  const isActive = nextPrayer.name.includes(prayer.id);
                  return (
                    <div key={prayer.id} className={isActive ? 
                      "bg-emerald-800 rounded-2xl p-4 text-center text-white flex flex-col justify-center shadow-lg relative overflow-hidden" : 
                      "bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center text-slate-700 flex flex-col justify-center hover:bg-slate-100/80 transition-colors"
                    }>
                      {isActive && <div className="absolute top-0 right-0 p-2 opacity-20"><Zap className="w-8 h-8" /></div>}
                      <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isActive ? 'text-emerald-200 relative z-10' : 'text-slate-500'}`}>
                        {prayer.id}
                      </p>
                      <p className={`text-xl md:text-2xl font-bold ${!isActive && 'text-slate-800'}`}>
                        {prayer.time}
                      </p>
                      {isActive && (
                        <span className="text-[9px] bg-emerald-800 border border-emerald-600 text-emerald-200 py-0.5 px-2 rounded-full mt-1.5 font-semibold z-10 relative self-center">
                          Berikutnya
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Al-Quran Quick Access Card */}
              <div className="bg-gradient-to-br from-emerald-900 to-teal-900 text-white rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-5 h-5 text-emerald-300" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Al-Qur'an Digital</span>
                  </div>
                  <h3 className="text-xl font-bold mb-1">Khatam & Tilawah Harian</h3>
                  <p className="text-xs text-emerald-100/80 leading-relaxed mb-4">
                    Terakhir dibaca: <strong className="text-white">{bookmark ? `${bookmark.surahNama} (Ayat ${bookmark.ayatNomor})` : 'Surah Al-Fatihah'}</strong>
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setSelectedSurahNomor(bookmark ? bookmark.surahNomor : 1); setInitialQuranTab('surah'); setIsQuranModalOpen(true); }}
                    className="flex-1 bg-white text-emerald-900 font-bold py-2.5 px-4 rounded-xl text-xs hover:bg-emerald-50 transition-colors shadow-sm cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Baca Al-Qur'an
                  </button>
                  <button
                    onClick={() => { setSelectedSurahNomor(null); setInitialQuranTab('dzikir'); setIsQuranModalOpen(true); }}
                    className="bg-emerald-800/80 hover:bg-emerald-800 text-emerald-100 font-bold py-2.5 px-4 rounded-xl text-xs border border-emerald-700 transition-colors cursor-pointer"
                  >
                    Dzikir & Doa
                  </button>
                </div>
              </div>

              {/* Tanya DKM Access Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Layanan Aspirasi</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">Tanya DKM & Konsultasi</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Sampaikan pertanyaan fiqih, saran kegiatan, atau aspirasi perbaikan ke pengurus DKM.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('tanya')}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Buat Pertanyaan Baru
                </button>
              </div>

              {/* Zakat Calculator Access Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-amber-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Hitung Nisab</span>
                    </div>
                    <button 
                      onClick={() => setShowKalkulator(!showKalkulator)} 
                      className="text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 cursor-pointer"
                    >
                      {showKalkulator ? 'Tutup Kalkulator' : 'Buka Kalkulator'}
                    </button>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1">Kalkulator Zakat Maal & Penghasilan</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Hitung dengan tepat kewajiban zakat 2.5% berdasarkan pendapatan bulanan Anda.
                  </p>
                </div>

                {showKalkulator ? (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Gaji Bulanan</label>
                        <input type="text" value={penghasilan} onChange={(e) => setPenghasilan(e.target.value.replace(/\D/g, ''))} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold" placeholder="Rp" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Bonus/Pendapatan</label>
                        <input type="text" value={bonus} onChange={(e) => setBonus(e.target.value.replace(/\D/g, ''))} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold" placeholder="Rp" />
                      </div>
                    </div>
                    <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-600">Kewajiban Zakat (2.5%):</span>
                      <span className="text-sm font-bold text-emerald-700">{wajibZakat ? formatRp(jumlahZakat) : 'Belum Wajib Zakat'}</span>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowKalkulator(true)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Simulasi Hitung Zakat Sekarang
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB: TANYA & ASPIRASI DKM */}
        {activeTab === 'tanya' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-800/40">
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-lime-300" /> Layanan Aspirasi & Tanya Jawab
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Layanan Tanya DKM Masjid</h2>
                  <p className="text-emerald-100/90 text-xs md:text-sm max-w-2xl leading-relaxed">
                    Sampaikan pertanyaan fiqih, konsultasi ibadah, saran kegiatan, maupun aspirasi perbaikan fasilitas masjid. Pengurus DKM siap melayani jamaah dengan ikhlas & cepat.
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shrink-0 text-center w-full md:w-auto">
                  <p className="text-xs font-bold text-lime-300 uppercase tracking-wider">Hotline WA DKM</p>
                  <p className="text-base font-extrabold text-white mt-0.5">0812-1920-0400</p>
                  <a
                    href="https://wa.me/6281219200400?text=Assalamu'alaikum%20Pengurus%20DKM%20Masjid%20Citra%20Sentul%20Raya,%20saya%20ingin%20bertanya:"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2.5 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold rounded-xl transition-all shadow-sm w-full cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Chat WA DKM Direct
                  </a>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Kirim Pertanyaan / Aspirasi (1 Col) */}
              <div className="lg:col-span-1 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-600" /> Kirim Pertanyaan / Aspirasi Baru
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">Isi formulir di bawah ini untuk mengirimkan pertanyaan Anda ke pengurus DKM.</p>

                  <form onSubmit={handleTambahAspirasi} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Layanan <span className="text-red-500">*</span></label>
                      <select
                        value={formKategori}
                        onChange={(e) => setFormKategori(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="Fiqih & Ibadah">🕌 Fiqih & Tata Cara Ibadah</option>
                        <option value="Keuangan & ZISWAF">💰 Keuangan & Wakaf Digital</option>
                        <option value="Kegiatan & Kajian">📢 Saran Kegiatan / Pengajian</option>
                        <option value="Fasilitas & Kebersihan">🔧 Kebersihan & Fasilitas Masjid</option>
                        <option value="Umum & Aspirasi">💬 Aspirasi Umum Jamaah</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Judul / Subjek <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formJudul}
                        onChange={(e) => setFormJudul(e.target.value)}
                        placeholder="Contoh: Hukum Masbuk dalam Shalat Jumat"
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Isi Pertanyaan / Aspirasi <span className="text-red-500">*</span></label>
                      <textarea
                        rows={4}
                        value={formPesan}
                        onChange={(e) => setFormPesan(e.target.value)}
                        placeholder="Tuliskan pertanyaan atau masukan Anda secara jelas..."
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                        required
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={isAnonim}
                          onChange={(e) => setIsAnonim(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                        />
                        <span>Kirim sebagai Hamba Allah (Anonim)</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" /> Kirim Pertanyaan ke DKM
                    </button>
                  </form>
                </div>
              </div>

              {/* List Pertanyaan & Respon DKM (2 Cols) */}
              <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-600" /> Daftar Pertanyaan & Respon DKM
                      </h3>
                      <p className="text-xs text-slate-500">Riwayat aspirasi jamaah beserta jawaban resmi dari pengurus & ustadz DKM.</p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full">
                      {aspirasiList.length} Diskusi
                    </span>
                  </div>

                  <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
                    {aspirasiList.map((item) => (
                      <div key={item.id} className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3 hover:border-emerald-200 transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase">
                              {item.kategori}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">{item.tanggal}</span>
                          </div>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                            item.status === 'Dijawab' ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {item.status === 'Dijawab' ? '✓ Telah Dijawab DKM' : '⏳ Menunggu Jawaban'}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-slate-800">{item.judul}</h4>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.pesan}</p>
                          <p className="text-xs text-slate-400 mt-1 font-semibold">Oleh: {item.namaPenanya}</p>
                        </div>

                        {/* Jawaban DKM Box */}
                        {item.jawabanDkm && (
                          <div className="mt-3 p-3.5 bg-emerald-50/90 rounded-xl border border-emerald-200 text-xs space-y-1">
                            <div className="flex items-center justify-between text-emerald-900 font-bold text-[11px] flex-wrap gap-1">
                              <span className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Respon Resmi DKM ({item.penjawabDkm || 'Tim Syariah DKM'})
                              </span>
                              <span className="text-xs text-emerald-700 font-normal">{item.tanggalJawaban}</span>
                            </div>
                            <p className="text-slate-700 text-xs leading-relaxed pt-1">{item.jawabanDkm}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KEUANGAN & PENGINGAT */}
        {activeTab === 'donasi' && (
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 p-6 md:p-8 animate-in fade-in duration-300">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-600" /> Pengaturan Donasi Rutin & Notifikasi WA
              </h2>
              <p className="text-xs text-slate-500 mt-1">Kelola bagaimana Anda ingin menerima pengingat atau melakukan donasi rutin secara otomatis.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <label className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${tipeDonasi === 'pengingat' ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200 hover:border-emerald-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input type="radio" checked={tipeDonasi === 'pengingat'} onChange={() => setTipeDonasi('pengingat')} className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-slate-800 text-sm">Pengingat WhatsApp & Push Notification</h3>
                  </div>
                  <Bell className={`w-5 h-5 ${tipeDonasi === 'pengingat' ? 'text-emerald-600' : 'text-slate-400'}`} />
                </div>
                <p className="text-xs text-slate-600 ml-8 leading-relaxed">Sistem akan mempush notifikasi ke WhatsApp dan HP Anda pada tanggal yang ditentukan.</p>
              </label>

              <label className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${tipeDonasi === 'otomatis' ? 'border-emerald-600 bg-emerald-50/50' : 'border-slate-200 hover:border-emerald-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input type="radio" checked={tipeDonasi === 'otomatis'} onChange={() => setTipeDonasi('otomatis')} className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-slate-800 text-sm">Potong Saldo E-Wallet Otomatis</h3>
                  </div>
                  <Wallet className={`w-5 h-5 ${tipeDonasi === 'otomatis' ? 'text-emerald-600' : 'text-slate-400'}`} />
                </div>
                <p className="text-xs text-slate-600 ml-8 leading-relaxed">Hubungkan E-Wallet (GoPay, OVO, DANA) untuk penarikan infaq otomatis.</p>
              </label>
            </div>

            {tipeDonasi === 'pengingat' ? (
              <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200/80 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Pilih Tanggal Pengingat Setiap Bulan</label>
                    <select value={tanggalPengingat} onChange={(e) => setTanggalPengingat(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-800 font-semibold text-xs md:text-sm">
                      {[...Array(31)].map((_, i) => (
                        <option key={i+1} value={i+1}>Tanggal {i+1} Setiap Bulannya</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Target Nominal Infaq (Rp)</label>
                    <input 
                      type="text" 
                      value={targetNominal}
                      onChange={(e) => setTargetNominal(e.target.value)}
                      placeholder="Contoh: 100.000" 
                      className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-800 font-semibold text-xs md:text-sm" 
                    />
                  </div>
                </div>

                <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200/80 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div className="text-xs text-slate-700 leading-relaxed">
                    Pengingat terkirim otomatis oleh **Sistem Terpusat Masjid** ke nomor WA Anda (<span className="font-semibold text-emerald-950">{profilContact}</span>). Notifikasi ini dikirim pada tanggal {tanggalPengingat} setiap bulannya.
                  </div>
                </div>

                {waSendingStatus && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {waSendingStatus}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200/80 space-y-6 animate-in fade-in">
                
                {/* E-Wallet Selection Grid */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Pilih Layanan E-Wallet Terintegrasi (DANA, OVO, GoPay, ShopeePay, LinkAja)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {[
                      { id: 'DANA', name: 'DANA', color: 'bg-blue-600 border-blue-500 text-white', badge: 'DANA ID' },
                      { id: 'OVO', name: 'OVO', color: 'bg-purple-700 border-purple-600 text-white', badge: 'OVO Cash' },
                      { id: 'GoPay', name: 'GoPay', color: 'bg-cyan-600 border-cyan-500 text-white', badge: 'GoPay Auto' },
                      { id: 'ShopeePay', name: 'ShopeePay', color: 'bg-orange-600 border-orange-500 text-white', badge: 'ShopeePay' },
                      { id: 'LinkAja', name: 'LinkAja', color: 'bg-red-600 border-red-500 text-white', badge: 'LinkAja' },
                    ].map((w) => (
                      <button 
                        key={w.id} 
                        type="button"
                        onClick={() => {
                          setSelectedWalletToConnect(w.id);
                          if (connectedWallet !== w.id) {
                            setConnectionStep('phone');
                          }
                        }}
                        className={`p-3.5 rounded-2xl text-xs font-bold border-2 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                          selectedWalletToConnect === w.id 
                            ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/20 shadow-md text-emerald-950 scale-102' 
                            : 'border-slate-200 bg-white hover:border-emerald-300 text-slate-700'
                        }`}
                      >
                        <div className={`px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider ${w.color}`}>
                          {w.name}
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600">
                          {connectedWallet === w.id ? '✓ Terhubung' : 'Integrasi'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* CONNECTION STEPS */}
                
                {/* STEP 1: Phone Verification */}
                {connectionStep === 'phone' && connectedWallet !== selectedWalletToConnect && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-100">
                        1
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Otorisasi Akun {selectedWalletToConnect}</h4>
                        <p className="text-[11px] text-slate-500">Masukkan nomor handphone yang terdaftar di aplikasi {selectedWalletToConnect}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nomor HP {selectedWalletToConnect} <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={walletPhone}
                        onChange={(e) => setWalletPhone(e.target.value)}
                        placeholder="Contoh: 081517045406"
                        className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 font-semibold text-xs md:text-sm"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!walletPhone) {
                          alert('Masukkan nomor HP terlebih dahulu!');
                          return;
                        }
                        setWaSendingStatus(`Kode OTP telah dikirimkan via SMS/WA ke ${walletPhone}...`);
                        setConnectionStep('otp');
                        setTimeout(() => setWaSendingStatus(null), 5000);
                      }}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      Kirim Kode OTP Otorisasi {selectedWalletToConnect}
                    </button>
                  </div>
                )}

                {/* STEP 2: OTP Verification */}
                {connectionStep === 'otp' && connectedWallet !== selectedWalletToConnect && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm border border-amber-100">
                        2
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Verifikasi Kode OTP {selectedWalletToConnect}</h4>
                        <p className="text-[11px] text-slate-500">Masukkan 6 digit kode OTP yang terkirim ke {walletPhone}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Kode OTP / PIN Transaksi (Simulasi: 123456)</label>
                      <input 
                        type="text" 
                        value={otpCode}
                        maxLength={6}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="Masukkan 6 digit OTP"
                        className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 font-bold text-center tracking-widest text-base"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setConnectionStep('phone')}
                        className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Kembali
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConnectedWallet(selectedWalletToConnect);
                          setConnectionStep('connected');
                          localStorage.setItem('masjid_connected_wallet', selectedWalletToConnect);
                          localStorage.setItem('masjid_wallet_phone', walletPhone);
                          alert(`✅ Akun ${selectedWalletToConnect} Berhasil Terhubung ke Sistem Autodebet Masjid Citra Sentul Raya!`);
                        }}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        Verifikasi & Hubungkan {selectedWalletToConnect}
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Connected & Auto-Debit Configuration */}
                {(connectionStep === 'connected' || connectedWallet === selectedWalletToConnect) && (
                  <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-2xl p-5 space-y-4 animate-in fade-in">
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-emerald-200/60">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-emerald-950">Terhubung dengan {connectedWallet || selectedWalletToConnect}</h4>
                            <span className="bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full">Aktif</span>
                          </div>
                          <p className="text-[11px] text-emerald-800 mt-0.5">Nomor Terhubung: <strong>{walletPhone || profilContact}</strong></p>
                        </div>
                      </div>
                      <div className="bg-white px-3.5 py-1.5 rounded-xl border border-emerald-300/70 text-right">
                        <p className="text-[9px] font-bold text-slate-500 uppercase">Estimasi Saldo {connectedWallet || selectedWalletToConnect}</p>
                        <p className="text-xs font-extrabold text-emerald-700">Rp 1.250.000 (Cukup)</p>
                      </div>
                    </div>

                    {/* Auto Debit Schedule Configuration */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Tanggal Auto-Debit Tiap Bulan</label>
                        <select 
                          value={tanggalPengingat} 
                          onChange={(e) => setTanggalPengingat(e.target.value)} 
                          className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-800 font-semibold text-xs md:text-sm"
                        >
                          {[...Array(31)].map((_, i) => (
                            <option key={i+1} value={i+1}>Tanggal {i+1} Setiap Bulannya</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Nominal Auto-Debit Rutin (Rp)</label>
                        <input 
                          type="text" 
                          value={targetNominal}
                          onChange={(e) => setTargetNominal(e.target.value)}
                          placeholder="Contoh: 50.000" 
                          className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-800 font-semibold text-xs md:text-sm" 
                        />
                      </div>
                    </div>

                    {/* Action buttons for Auto Debit test */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setWaSendingStatus(`Mengolah potongan saldo Rp ${targetNominal} via ${connectedWallet || selectedWalletToConnect}...`);
                          setTimeout(() => {
                            setWaSendingStatus(`✅ [SIMULASI BERHASIL]: Saldo ${connectedWallet || selectedWalletToConnect} sebesar Rp ${targetNominal} berhasil dipotong secara otomatis untuk donasi rutin! Kuitansi PDF dapat diunduh di tab Histori Donasi.`);
                          }, 1500);
                        }}
                        className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4 text-amber-300" /> Uji Coba Potong Saldo Real-Time
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setConnectedWallet(null);
                          setConnectionStep('select');
                          localStorage.removeItem('masjid_connected_wallet');
                          alert(`Koneksi ${connectedWallet || selectedWalletToConnect} telah diputuskan.`);
                        }}
                        className="px-4 py-3 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Putuskan Hubungan
                      </button>
                    </div>

                  </div>
                )}

                {waSendingStatus && (
                  <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> {waSendingStatus}
                  </div>
                )}

              </div>
            )}

            <button 
              onClick={async () => {
                localStorage.setItem('masjid_tipe_donasi', tipeDonasi);
                localStorage.setItem('masjid_tanggal_pengingat', tanggalPengingat);
                localStorage.setItem('masjid_target_nominal', targetNominal);
                localStorage.setItem('masjid_wa_gateway_token', waGatewayToken);
                alert(`Pengaturan Berhasil Disimpan!\n\nNomor WA: ${profilContact}\nPengingat Setiap Tanggal ${tanggalPengingat} tiap bulan.`);
              }} 
              className="w-full mt-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 text-xs md:text-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> Simpan Pengaturan Donasi Rutin
            </button>
          </div>
        )}

        {/* TAB 3: AL-QURAN DIGITAL */}
        {activeTab === 'quran' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><BookOpen className="w-6 h-6 text-emerald-300" /> Al-Quran Digital & Tracker</h2>
                <p className="text-emerald-100 text-xs md:text-sm">Mari rutinkan membaca Al-Quran, sedikit demi sedikit namun konsisten.</p>
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <button 
                    onClick={() => { setSelectedSurahNomor(null); setInitialQuranTab('surah'); setIsQuranModalOpen(true); }}
                    className="inline-flex items-center justify-center gap-2 bg-white text-emerald-900 hover:bg-emerald-50 font-bold px-4 py-2.5 rounded-xl text-xs md:text-sm transition-all shadow-sm cursor-pointer"
                  >
                    Buka Al-Qur'an (114 Surah) <ChevronRight className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { setSelectedSurahNomor(null); setInitialQuranTab('dzikir'); setIsQuranModalOpen(true); }}
                    className="inline-flex items-center justify-center gap-2 bg-emerald-800/80 border border-emerald-700 hover:bg-emerald-800 font-bold px-4 py-2.5 rounded-xl text-xs md:text-sm transition-all shadow-sm cursor-pointer text-white"
                  >
                    Buka Dzikir & Doa <ChevronRight className="w-4 h-4 text-emerald-300" />
                  </button>
                </div>
              </div>

              <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-xs border border-white/20 w-full md:w-auto text-center md:text-left">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">Total Khatam</p>
                <p className="text-2xl font-bold">{khatamCount} Kali</p>
                <button 
                  onClick={() => {
                    const newCount = khatamCount + 1;
                    setKhatamCount(newCount);
                    localStorage.setItem('masjid_quran_khatam', newCount.toString());
                    alert(`Alhamdulillah! Catatan khatam Al-Quran diperbarui (${newCount}x).`);
                  }}
                  className="mt-3 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  + Catat Khatam
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200/80">
              <h3 className="font-bold text-slate-800 text-sm md:text-base mb-4 border-b border-slate-100 pb-3">Pilih Surah Populer</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { no: 1, name: 'Al-Fatihah', meaning: 'Pembukaan', ayahs: 7 },
                  { no: 2, name: 'Al-Baqarah', meaning: 'Sapi Betina', ayahs: 286 },
                  { no: 18, name: 'Al-Kahf', meaning: 'Gua', ayahs: 110 },
                  { no: 36, name: 'Ya Sin', meaning: 'Ya Sin', ayahs: 83 },
                  { no: 55, name: 'Ar-Rahman', meaning: 'Yang Maha Pemurah', ayahs: 78 },
                  { no: 67, name: 'Al-Mulk', meaning: 'Kerajaan', ayahs: 30 },
                  { no: 112, name: 'Al-Ikhlas', meaning: 'Ikhlas', ayahs: 4 },
                  { no: 114, name: 'An-Nas', meaning: 'Manusia', ayahs: 6 }
                ].map(surah => (
                  <div 
                    key={surah.no} 
                    onClick={() => { setSelectedSurahNomor(surah.no); setIsQuranModalOpen(true); }}
                    className="flex items-center justify-between p-3.5 border border-slate-200/80 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/40 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-xs text-slate-600 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                        {surah.no}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-800 group-hover:text-emerald-800">{surah.name}</p>
                        <p className="text-xs text-slate-500">{surah.ayahs} Ayat</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-700" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: JADWAL SHALAT */}
        {activeTab === 'jadwal' && (
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden animate-in fade-in duration-300">
            <div className="p-6 border-b border-slate-100 bg-slate-50/60">
              <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2"><Clock className="w-5 h-5 text-emerald-600" /> Jadwal Shalat & Alarm Adzan</h2>
              <p className="text-xs text-slate-500 mt-0.5">Aktifkan alarm untuk memutar adzan otomatis di perangkat Anda.</p>
            </div>
            <div className="p-6 space-y-3">
              {[
                { name: 'Subuh', time: `${jadwalShalat.subuh} WIB`, key: 'subuh', isSunnah: false },
                { name: 'Dhuha (Sunnah)', time: '07:30 WIB', key: 'dhuha', isSunnah: true },
                { name: 'Dzuhur', time: `${jadwalShalat.dzuhur} WIB`, key: 'dzuhur', isSunnah: false },
                { name: 'Ashar', time: `${jadwalShalat.ashar} WIB`, key: 'ashar', isSunnah: false },
                { name: 'Maghrib', time: `${jadwalShalat.maghrib} WIB`, key: 'maghrib', isSunnah: false },
                { name: 'Isya', time: `${jadwalShalat.isya} WIB`, key: 'isya', isSunnah: false },
              ].map((s) => (
                <div key={s.key} className={`flex items-center justify-between p-4 border rounded-2xl ${s.isSunnah ? 'bg-amber-50/40 border-amber-200/80' : 'bg-slate-50/60 border-slate-200/80'}`}>
                  <div>
                    <p className={`font-bold text-sm md:text-base ${s.isSunnah ? 'text-amber-900' : 'text-slate-800'}`}>{s.name}</p>
                    <p className={`text-xs font-semibold ${s.isSunnah ? 'text-amber-700' : 'text-slate-500'}`}>{s.time}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setAdzanAlarms(prev => ({ ...prev, [s.key]: !prev[s.key as keyof typeof adzanAlarms] }));
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-xs border cursor-pointer ${adzanAlarms[s.key as keyof typeof adzanAlarms] ? 'bg-emerald-700 border-emerald-800 text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}
                  >
                    {adzanAlarms[s.key as keyof typeof adzanAlarms] ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    {adzanAlarms[s.key as keyof typeof adzanAlarms] ? 'Adzan Aktif' : 'Mati'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: PROGRESS ZISWAF */}
        {activeTab === 'laporan' && (
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden animate-in fade-in duration-300 p-6 md:p-8">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
              <Activity className="w-5 h-5 text-emerald-600" /> Progress Program ZISWAF Masjid
            </h2>
            <div className="space-y-6">
              {programs.length > 0 ? programs.map((program, index) => {
                const percentage = program.targetRp > 0 ? Math.min(100, Math.round((program.terkumpulRp / program.targetRp) * 100)) : 0;
                return (
                  <div key={program.id || index} className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
                    <div className="md:flex">
                      <div className="md:w-1/3 h-48 md:h-auto relative bg-slate-100">
                        <img src={program.gambar || "https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=800&q=80"} alt={program.judul} className="w-full h-full object-cover opacity-80" />
                        <div className="absolute top-3 left-3 bg-emerald-700 text-white text-xs font-bold px-2.5 py-1 rounded-md uppercase">{program.kategori}</div>
                      </div>
                      <div className="p-6 md:w-2/3 flex flex-col justify-center">
                        <h3 className="text-base md:text-lg font-bold text-slate-800 mb-1">{program.judul}</h3>
                        <p className="text-xs text-emerald-700 font-bold mb-3">{program.donatur} Donatur Tergabung</p>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-xs font-bold mb-1">
                              <span className="text-emerald-700">Terkumpul {percentage}%</span>
                              <span className="text-slate-700">{formatRp(program.terkumpulRp)} / {formatRp(program.targetRp)}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5">
                              <div className="bg-emerald-600 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                            </div>
                          </div>
                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
                            Alhamdulillah, progres penggalangan dana terus berjalan. Jazakumullah khairan katsiran atas partisipasi para jamaah.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-10 text-slate-500">
                  <Activity className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                  <p>Belum ada program ZISWAF yang aktif.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: HISTORI */}
        {activeTab === 'histori' && (
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden animate-in fade-in duration-300">
            <div className="p-6 border-b border-slate-100 bg-slate-50/60">
              <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-600" /> Histori Transaksi Donasi</h2>
              <p className="text-xs text-slate-500 mt-0.5">Riwayat infaq dan sedekah tersimpan aman dan dapat diunduh kuitansinya.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm text-left text-slate-600">
                <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Tanggal</th>
                    <th className="px-6 py-3.5">Program</th>
                    <th className="px-6 py-3.5">Nominal</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Kuitansi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userDonasiHistory.map(d => (
                    <tr key={d.id} className="bg-white border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600">{d.tanggal}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{d.programName}</td>
                      <td className="px-6 py-4 text-emerald-700 font-bold">{formatRp(d.nominal)}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          d.status === 'Berhasil' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => generatePDF(d)} className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer font-bold text-xs">
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                  {userDonasiHistory.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-500 font-medium">
                        Belum ada histori donasi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: PROFIL */}
        {activeTab === 'profil' && (
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 animate-in fade-in duration-300 p-6 md:p-8">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
              <Settings className="w-5 h-5 text-emerald-600" /> Pengaturan Profil Jamaah
            </h2>
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex flex-col items-center gap-3">
                <img src={profilePic} alt="Profil" className="w-28 h-28 rounded-full border-4 border-slate-100 object-cover shadow-sm" />
                <button 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const url = event.target?.result as string;
                          setProfilePic(url);
                          localStorage.setItem('masjid_user_pic', url);
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }} 
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" /> Ganti Foto
                </button>
              </div>

              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label>
                    <input type="text" value={profilName} onChange={e => setProfilName(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp / HP</label>
                    <input type="text" value={profilContact} onChange={e => setProfilContact(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800" />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={async (e) => { 
                      e.preventDefault();
                      try {
                        const { error } = await supabase.from('registered_jamaah').update({ nama: profilName, kontak: profilContact }).eq('kontak', kontak);
                        if (error) throw error;
                        alert(`Profil berhasil diperbarui di database!\n\nNama: ${profilName}\nKontak: ${profilContact}`);
                      } catch (err) {
                        console.error('Failed to update profile in Supabase', err);
                        alert('Gagal memperbarui profil.');
                      }
                    }} 
                    className="px-6 py-2.5 bg-emerald-700 text-white font-bold rounded-xl hover:bg-emerald-800 transition-colors shadow-sm text-xs cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8 TELAH DIHAPUS - KAJIAN & PENDAFTARAN */}

      </div>

      {/* Al-Quran Digital Reader Modal */}
      <AlQuranDigital 
        isOpenModal={isQuranModalOpen} 
        initialSurahNomor={selectedSurahNomor}
        initialTab={initialQuranTab}
        onCloseModal={() => { setIsQuranModalOpen(false); setSelectedSurahNomor(null); setInitialQuranTab('surah'); }} 
      />
    </div>
  );
};
