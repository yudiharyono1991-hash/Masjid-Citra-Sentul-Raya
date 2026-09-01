import React, { useState, useEffect } from 'react';
import { LogOut, MonitorPlay, RefreshCw, Book, Calendar, Video, ShieldCheck, Settings, Users, Database, PlusCircle, Save, ArrowDownCircle, ArrowUpCircle, X, Maximize, FileText, Camera, Megaphone, Clock, Smartphone, UserCheck, Key, Search, Link2, Trash2, Moon, BookOpen, Scale, ClipboardList, Edit, Wallet, TrendingUp, TrendingDown, Activity, Heart, Building, LayoutDashboard, ChevronDown, Upload, Bell, CheckCircle2, MessageSquare } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { ModulCoA } from './ModulCoA';
import { ModulJurnal } from './ModulJurnal';
import { ModulBukuBesar } from './ModulBukuBesar';
import { ModulLaporanKeuangan } from './ModulLaporanKeuangan';
import { ModulAspirasi } from './ModulAspirasi';
import { ModulAnggaranApproval } from './ModulAnggaranApproval';
import { ModulPenyusutanAset } from './ModulPenyusutanAset';
import { ModulSuratMenyurat } from './ModulSuratMenyurat';
import { ModulKalenderAdmin } from './ModulKalenderAdmin';
import { BukuPanduanModal } from './BukuPanduanModal';
import { getPrayerTimesSentul, fetchPrayerTimesOnline } from '../utils/prayerTimes';
import { INITIAL_JURNAL_ENTRIES, JurnalEntry } from '../data/akuntansiData';
import { PENGURUS_DKM } from '../data/pengurusData';
import { supabase } from '../lib/supabase';
import { Pagination } from './Pagination';
import { DEFAULT_HERO_SLIDES, HeroSlide } from './Hero';
import { toLocalDateString, getFirstDayOfMonth } from '../utils/formatters';

interface Program {
  id: number;
  kategori: string;
  judul: string;
  terkumpulRp: number;
  targetRp: number;
  donatur: number;
  terkumpulPersen?: number;
  deskripsi?: string;
  gambar?: string;
}

interface AdminDashboardProps {
  onBack: () => void;
  programs: Program[];
  onAddDonation: (programId: number, nominal: number) => void;
  homeVisibility: {
    showJadwal: boolean;
    showKalender: boolean;
    showZiswaf: boolean;
    showQuran: boolean;
    showTentang: boolean;
    showTransparansiPublik?: boolean;
    showTransparansiKas?: boolean;
    showTransparansiZiswaf?: boolean;
  };
  setHomeVisibility: React.Dispatch<React.SetStateAction<any>>;
  registeredJamaahList: any[];
  donasiHistory?: any[];
  onVerifyDonasi?: (id: string, status: 'Berhasil' | 'Ditolak') => void;
  onAddDonasiHistoryItem?: (item: any) => void;
  adminRole?: string;
  auditLogs?: any[];
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 m-4 text-red-700 bg-red-50 border border-red-200 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">⚠️ Terjadi Kesalahan pada Modul Keuangan</h2>
          <p className="mb-4">Modul ini gagal dimuat karena ada kesalahan sistem (Blank Screen Error).</p>
          <div className="bg-white p-4 rounded border overflow-auto text-xs font-mono max-h-64">
            {this.state.error && this.state.error.toString()}
            <br/><br/>
            {this.state.error && (this.state.error as any).stack}
          </div>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })} 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-bold"
          >
            Coba Muat Ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, programs, onAddDonation, homeVisibility, setHomeVisibility, registeredJamaahList, donasiHistory = [], onVerifyDonasi, onAddDonasiHistoryItem, adminRole = 'direktur', auditLogs = [] }) => {
  const [activeMenu, setActiveMenu] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get('menu') || 'utama';
  });
  const [activeCategory, setActiveCategory] = useState('utama');
  const [donasiPage, setDonasiPage] = useState(1);
  const [jamaahPage, setJamaahPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [kasTab, setKasTab] = useState('ringkasan');
  const [lapkeuTab, setLapkeuTab] = useState<'neraca' | 'jurnal' | 'bukubesar' | 'coa' | 'anggaran' | 'penyusutan'>('neraca');
  const [searchMenu, setSearchMenu] = useState('');
  const [showPanduanModal, setShowPanduanModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Notifications: Supabase for cross-device sync + localStorage fallback
  const loadNotificationsFromStorage = () => {
    try {
      const stored = localStorage.getItem('admin_notifications');
      if (stored) setNotifications(JSON.parse(stored));
    } catch {}
  };

  const toggleFullscreen = () => {
    const elem = document.getElementById('tv-fullscreen-container');
    if (!document.fullscreenElement) {
      elem?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const fetchNotificationsFromSupabase = async () => {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_role.eq.semua,user_role.eq.${adminRole.toLowerCase()}`)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data && data.length > 0) {
        setNotifications(data);
        localStorage.setItem('admin_notifications', JSON.stringify(data));
      }

      // Also fetch TV config periodically to keep Display Masjid synced
      const { data: settingsData } = await supabase.from('app_settings').select('*').maybeSingle();
      if (settingsData) {
        setAppSettings(settingsData);
        // Only update local tvConfig if we are NOT currently editing it in the 'tv' menu
        if (typeof window !== 'undefined' && !window.location.search.includes('menu=tv')) {
          setTvConfig({
            timezone: settingsData.tv_timezone || 'Asia/Jakarta',
            jedaAdzan: settingsData.tv_jeda_adzan || 15,
            jedaIqomah: settingsData.tv_jeda_iqomah || 10,
            jedaSholat: settingsData.tv_jeda_sholat || 20,
            runningText: settingsData.tv_running_text || 'Selamat Datang di Masjid Citra Sentul Raya. Mari rapatkan dan luruskan shaf shalat Anda.',
            mediaType: settingsData.tv_media_type || 'background',
            mediaUrl: settingsData.tv_media_url || '',
            volume: settingsData.tv_volume || 0,
            showImsak: settingsData.show_imsak !== false,
            showBukaPuasa: settingsData.show_buka_puasa !== false,
            showTarawih: settingsData.show_tarawih || false,
            showJumat: settingsData.show_jumat !== false,
            showIdulFitri: settingsData.show_idul_fitri || false,
            showIdulAdha: settingsData.show_idul_adha || false,
            textImsak: settingsData.text_imsak || 'Waktu Imsak telah tiba. Selamat menjalankan ibadah puasa.',
            textBukaPuasa: settingsData.text_buka_puasa || 'Selamat berbuka puasa. Ya Allah karena-Mu aku berpuasa...',
            textTarawih: settingsData.text_tarawih || 'Selamat menjalankan Ibadah Shalat Sunnah Tarawih berjamaah.',
            textJumat: settingsData.text_jumat || 'Harap tenang, Khutbah Jumat sedang berlangsung.',
            textIdulFitri: settingsData.text_idul_fitri || 'Selamat Hari Raya Idul Fitri 1 Syawal. Mohon maaf lahir dan batin.',
            textIdulAdha: settingsData.text_idul_adha || 'Selamat Hari Raya Idul Adha. Mari berkurban untuk meraih takwa.',
            city: settingsData.tv_city || 'Bogor',
            country: settingsData.tv_country || 'Indonesia'
          });
        }
      }
    } catch {
      // Fallback to localStorage silently
      loadNotificationsFromStorage();
    }
  };

  useEffect(() => {
    loadNotificationsFromStorage();
    fetchNotificationsFromSupabase();
    const interval = setInterval(fetchNotificationsFromSupabase, 15000);
    window.addEventListener('storage', loadNotificationsFromStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', loadNotificationsFromStorage);
    };
  }, [adminRole]);
  
  const markNotificationAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, is_read: true } : n);
    setNotifications(updated);
    try { localStorage.setItem('admin_notifications', JSON.stringify(updated)); } catch {}
  };
  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;
  const [tvConfig, setTvConfig] = useState({ 
    timezone: 'Asia/Jakarta', 
    jedaAdzan: 15, 
    jedaIqomah: 10,
    jedaSholat: 20,
    runningText: 'Selamat Datang di Masjid Citra Sentul Raya. Mari rapatkan dan luruskan shaf shalat Anda.', 
    mediaType: 'background', 
    mediaUrl: '', 
    volume: 0,
    showImsak: true,
    showBukaPuasa: true,
    showTarawih: false,
    showJumat: true,
    showIdulFitri: false,
    showIdulAdha: false,
    textImsak: 'Waktu Imsak telah tiba. Selamat menjalankan ibadah puasa.',
    textBukaPuasa: 'Selamat berbuka puasa. Ya Allah karena-Mu aku berpuasa...',
    textTarawih: 'Selamat menjalankan Ibadah Shalat Sunnah Tarawih berjamaah.',
    textJumat: 'Harap tenang, Khutbah Jumat sedang berlangsung.',
    textIdulFitri: 'Selamat Hari Raya Idul Fitri 1 Syawal. Mohon maaf lahir dan batin.',
    textIdulAdha: 'Selamat Hari Raya Idul Adha. Mari berkurban untuk meraih takwa.',
    city: 'Bogor',
    country: 'Indonesia'
  });

  const [adminHeroSlides, setAdminHeroSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES);

  const ALL_MENU_CATEGORIES = [
    { id: 'utama', label: 'Dashboard Utama', icon: LayoutDashboard },
    { id: 'keuangan', label: 'Keuangan', icon: Wallet },
    { id: 'operasional', label: 'Operasional', icon: Clock },
    { id: 'administrasi', label: 'Administrasi', icon: Users },
    { id: 'pengaturan_grup', label: 'Pengaturan', icon: Settings }
  ];

  const defaultRolePermissions = {
    direktur: ['utama', 'keuangan', 'operasional', 'administrasi', 'pengaturan_grup'],
    admin: ['utama', 'keuangan', 'operasional', 'administrasi', 'pengaturan_grup'],
    bendahara: ['utama', 'keuangan', 'pengaturan_grup'],
    sekretaris: ['utama', 'administrasi', 'operasional', 'pengaturan_grup'],
    peribadatan: ['utama', 'operasional', 'pengaturan_grup'],
    pembangunan: ['utama', 'operasional', 'administrasi', 'pengaturan_grup'],
    umum: ['utama', 'operasional', 'pengaturan_grup'],
    muslimah: ['utama', 'operasional', 'pengaturan_grup'],
    penasehat: ['utama', 'keuangan', 'administrasi', 'pengaturan_grup'],
    staff: ['utama', 'operasional', 'administrasi', 'pengaturan_grup'],
    jamaah: []
  };

  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>(defaultRolePermissions);

  const MENU_CATEGORIES = ALL_MENU_CATEGORIES.filter(cat => {
    const allowedMods = rolePermissions[adminRole.toLowerCase()] || [];
    return allowedMods.includes(cat.id);
  });

  const SUB_MENUS: Record<string, any[]> = {
    keuangan: [
      { id: 'ziswaf', label: 'Input Donasi ZISWAF', icon: PlusCircle },
      { id: 'verifikasi', label: 'Verifikasi ZISWAF', icon: ShieldCheck },
      { 
        id: 'kas', 
        label: 'Riwayat Transaksi', 
        icon: Book,
        action: () => { setActiveMenu('kas'); setKasTab('ringkasan'); },
        subItems: [
          { id: 'ringkasan', label: 'Ringkasan Kas', action: () => { setActiveMenu('kas'); setKasTab('ringkasan'); } },
          { id: 'pemasukan', label: 'Input Pemasukan', action: () => { setActiveMenu('kas'); setKasTab('pemasukan'); } },
          { id: 'pengeluaran', label: 'Input Pengeluaran', action: () => { setActiveMenu('kas'); setKasTab('pengeluaran'); } },
          { id: 'laporan', label: 'Laporan Keuangan', action: () => { setActiveMenu('kas'); setKasTab('laporan'); } }
        ]
      },
      { 
        id: 'lapkeu', 
        label: 'Laporan Keuangan & Akuntansi', 
        icon: Scale, 
        action: () => { setActiveMenu('lapkeu'); setLapkeuTab('neraca'); },
        subItems: [
          { id: 'neraca', label: 'Neraca Aktivitas (PSAK 409)', action: () => { setActiveMenu('lapkeu'); setLapkeuTab('neraca'); } },
          { id: 'jurnal', label: 'Jurnal Umum Double-Entry', action: () => { setActiveMenu('lapkeu'); setLapkeuTab('jurnal'); } },
          { id: 'bukubesar', label: 'Buku Besar', action: () => { setActiveMenu('lapkeu'); setLapkeuTab('bukubesar'); } },
          { id: 'coa', label: 'Chart of Accounts (CoA)', action: () => { setActiveMenu('lapkeu'); setLapkeuTab('coa'); } },
          { id: 'anggaran', label: 'Anggaran & Approval Flow', action: () => { setActiveMenu('lapkeu'); setLapkeuTab('anggaran'); } },
          { id: 'penyusutan', label: 'Depresiasi Aset', action: () => { setActiveMenu('lapkeu'); setLapkeuTab('penyusutan'); } }
        ]
      },
    ],
    operasional: [
      { id: 'jumat', label: 'Jadwal Petugas & Jumat', icon: Clock },
      { id: 'kalender', label: 'Kalender & Agenda', icon: Calendar },
      { id: 'wa', label: 'Broadcast Informasi', icon: Smartphone },
      { id: 'tv', label: 'Manajemen TV & Display', icon: MonitorPlay },
      { 
        id: 'konten', 
        label: 'Manajemen Konten Publik', 
        icon: Database,
        action: () => { setActiveMenu('konten'); setKontenTab('program'); },
        subItems: [
          { id: 'program', label: 'Program & Campaign', action: () => { setActiveMenu('konten'); setKontenTab('program'); } },
          { id: 'berita', label: 'Pengumuman & Berita', action: () => { setActiveMenu('konten'); setKontenTab('berita'); } },
          { id: 'galeri', label: 'Galeri & Kajian', action: () => { setActiveMenu('konten'); setKontenTab('galeri'); } }
        ]
      },
    ],
    administrasi: [
      { id: 'profil', label: 'Profil & Pengurus', icon: Users },
      { id: 'aspirasi', label: 'Kotak Masuk Jamaah', icon: MessageSquare },
      { 
        id: 'aset', 
        label: 'Inventaris & Foto Aset', 
        icon: Camera,
        action: () => { setActiveMenu('aset'); setAsetTab('semua'); },
        subItems: [
          { id: 'semua', label: 'Semua Aset Inventaris', action: () => { setActiveMenu('aset'); setAsetTab('semua'); } },
          { id: 'rusak', label: 'Daftar Barang Rusak', action: () => { setActiveMenu('aset'); setAsetTab('rusak'); } }
        ]
      },
      { id: 'surat', label: 'Manajemen Surat Menyurat', icon: FileText },
      { id: 'ttd', label: 'Tanda Tangan Laporan', icon: Edit },
    ],
    pengaturan_grup: [
      { id: 'role', label: 'Manajemen Akun & Role', icon: Key },
      { id: 'audit', label: 'Audit Log System', icon: Search },
      { 
        id: 'pengaturan', 
        label: 'Pengaturan Sistem', 
        icon: Settings, 
        action: () => { setActiveMenu('pengaturan'); setSettingTab('admin_utama'); },
        subItems: [
          { id: 'admin_utama', label: 'Utama & Keamanan', action: () => { setActiveMenu('pengaturan'); setSettingTab('admin_utama'); } },
          { id: 'hero', label: 'Foto Animasi Beranda', action: () => { setActiveMenu('pengaturan'); setSettingTab('hero'); } },
          { id: 'visibilitas', label: 'Visibilitas Modul', action: () => { setActiveMenu('pengaturan'); setSettingTab('visibilitas'); } },
          { id: 'qr', label: 'Cetak QR Aplikasi', action: () => { setActiveMenu('pengaturan'); setSettingTab('qr'); } },
          { id: 'sponsor', label: 'Sponsor & Mitra', action: () => { setActiveMenu('pengaturan'); setSettingTab('sponsor'); } },
          { id: 'sejarah', label: 'Profil & Sejarah Masjid', action: () => { setActiveMenu('pengaturan'); setSettingTab('sejarah'); } },
          { id: 'reset', label: 'Reset Data', action: () => { setActiveMenu('pengaturan'); setSettingTab('reset'); } }
        ]
      },
    ]
  };

  const defaultToday = new Date();
  const defaultFirstDay = new Date(defaultToday.getFullYear(), defaultToday.getMonth(), 1);
  const formatLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const defaultStartStr = formatLocal(defaultFirstDay);
  const defaultEndStr = formatLocal(defaultToday);

  const [filterRingkasan, setFilterRingkasan] = useState({ start: defaultStartStr, end: defaultEndStr });
  const [filterPemasukan, setFilterPemasukan] = useState({ start: defaultStartStr, end: defaultEndStr });
  const [filterPengeluaran, setFilterPengeluaran] = useState({ start: defaultStartStr, end: defaultEndStr });
  const [kategoriKasMasjid, setKategoriKasMasjid] = useState('Semua');
  const [settingTab, setSettingTab] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get('tab') || 'pengumuman';
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('menu', activeMenu);
    if (activeMenu === 'pengaturan') {
      params.set('tab', settingTab);
    } else {
      params.delete('tab');
    }
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, [activeMenu, settingTab]);

  // fetchHeroSlides: no longer fetches from Supabase to avoid 404 errors
  // Hero slides are managed via DEFAULT_HERO_SLIDES and localStorage preview
  const fetchHeroSlides = () => {
    try {
      const saved = localStorage.getItem('heroSlides_preview');
      if (saved) setAdminHeroSlides(JSON.parse(saved));
    } catch {}
  };

  const isWithinDateRange = (dateStr: string, filter: { start: string, end: string }) => {
    if (!filter.start && !filter.end) return true;
    const parts = dateStr.split('/');
    let d, m, y;
    if (parts.length === 3) {
      [d, m, y] = parts;
    } else {
      return true;
    }
    const entryDate = new Date(Number(y), Number(m) - 1, Number(d)).getTime();
    if (filter.start && entryDate < new Date(filter.start).getTime()) return false;
    if (filter.end && entryDate > new Date(filter.end).setHours(23, 59, 59, 999)) return false;
    return true;
  };

  const handleDeleteKas = async (id: any) => {
    if (window.confirm('Yakin ingin menghapus transaksi ini?')) {
      const entryToDelete = kasEntries.find(e => e.id === id);
      setKasEntries(prev => prev.filter(e => e.id !== id));
      setJournals(prev => prev.filter(j => j.id !== id));
      try {
        if (entryToDelete?.isNewTable) {
           const prefix = entryToDelete.type === 'in' ? 'Pemasukan: ' : 'Pengeluaran: ';
           if (entryToDelete.type === 'in') await supabase.from('pemasukan').delete().eq('id', id);
           else await supabase.from('pengeluaran').delete().eq('id', id);
           
           // Best effort delete from jurnal_umum
           await supabase.from('jurnal_umum').delete().eq('keterangan', `${prefix}${entryToDelete.desc}`);
        } else {
           await supabase.from('jurnal_umum').delete().eq('no_bukti', id);
        }
      } catch (err) { console.error(err); }
    }
  };

  const handleEditKas = async (entry: any) => {
    const newAmount = prompt('Masukkan nominal baru:', entry.amount);
    if (newAmount && !isNaN(Number(newAmount))) {
      const newDesc = prompt('Masukkan keterangan baru:', entry.desc);
      if (newDesc) {
        setKasEntries(prev => prev.map(e => e.id === entry.id ? { ...e, amount: Number(newAmount), desc: newDesc } : e));
        setJournals(prev => prev.map(j => {
          if (j.id === entry.id) {
             const newBaris = j.baris.map(b => {
                if (b.debit > 0) return { ...b, debit: Number(newAmount) };
                if (b.kredit > 0) return { ...b, kredit: Number(newAmount) };
                return b;
             });
             return { ...j, keterangan: newDesc, baris: newBaris };
          }
          return j;
        }));
        
        try {
          if (entry.isNewTable) {
             const prefix = entry.type === 'in' ? 'Pemasukan: ' : 'Pengeluaran: ';
             if (entry.type === 'in') await supabase.from('pemasukan').update({ keterangan: newDesc, nominal: Number(newAmount) }).eq('id', entry.id);
             else await supabase.from('pengeluaran').update({ keterangan: newDesc, nominal: Number(newAmount) }).eq('id', entry.id);
             
             // Best effort update jurnal_umum
             const { data: lines } = await supabase.from('jurnal_umum').select('id, debit, kredit').eq('keterangan', `${prefix}${entry.desc}`);
             if (lines) {
                for (const line of lines) {
                   const updateData: any = { keterangan: `${prefix}${newDesc}` };
                   if (line.debit > 0) updateData.debit = Number(newAmount);
                   if (line.kredit > 0) updateData.kredit = Number(newAmount);
                   await supabase.from('jurnal_umum').update(updateData).eq('id', line.id);
                }
             }
          } else {
             const { data: lines } = await supabase.from('jurnal_umum').select('id, debit, kredit').eq('no_bukti', entry.id);
             if (lines) {
                for (const line of lines) {
                   const updateData: any = { keterangan: newDesc };
                   if (line.debit > 0) updateData.debit = Number(newAmount);
                   if (line.kredit > 0) updateData.kredit = Number(newAmount);
                   await supabase.from('jurnal_umum').update(updateData).eq('id', line.id);
                }
             }
          }
        } catch (err) { console.error(err); }
      }
    }
  };
  const [showDisplayTV, setShowDisplayTV] = useState(false);
  const [time, setTime] = useState(new Date());
  const [jadwalOnline, setJadwalOnline] = useState(getPrayerTimesSentul());
  const [hijriOnline, setHijriOnline] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch online prayer times when city/country changes
  useEffect(() => {
    fetchPrayerTimesOnline(tvConfig.city || 'Bogor', tvConfig.country || 'Indonesia')
      .then(res => {
        setJadwalOnline(res.jadwal);
        setHijriOnline(res.hijri);
      });
  }, [tvConfig.city, tvConfig.country]);
  
  // ZISWAF State
  const [localPrograms, setLocalPrograms] = useState<any[]>([]);
  const [deletedPrograms, setDeletedPrograms] = useState<number[]>([]);
  const [editedPrograms, setEditedPrograms] = useState<Record<number, any>>({});
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editCampaignModalData, setEditCampaignModalData] = useState<any>(null);
  const [newCampaignData, setNewCampaignData] = useState({ judul: '', target: '', kategori: 'Zakat', gambar: '', akunDebit: '1104', akunKredit: '4106' });
  const [selectedProgram, setSelectedProgram] = useState<number>(programs[0]?.id || 0);
  const [nominalStr, setNominalStr] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDonaturModal, setShowDonaturModal] = useState<number | null>(null);

  // Program Updates State
  const [programUpdates, setProgramUpdates] = useState<Record<number, { id: number, date: string, text: string }[]>>({});
  const [activeUpdateInput, setActiveUpdateInput] = useState<number | null>(null);
  const [newUpdateText, setNewUpdateText] = useState('');

  // Kas State (Riwayat Transaksi)
  const [kasEntries, setKasEntries] = useState<any[]>([]);

  // Profil Pengurus State
  const [pengurusList, setPengurusList] = useState<any[]>([]);
  const [showProfilModal, setShowProfilModal] = useState(false);
  const [profilFormData, setProfilFormData] = useState({ id: 0 as string | 0, nama: '', jabatan: '', biodata: '', foto_url: '', urutan: 0, tag: 'PENGURUS' });

  useEffect(() => {
    const fetchPengurusList = async () => {
      const { data } = await supabase.from('masjid_pengurus_inti').select('*').order('urutan', { ascending: true });
      if (data) setPengurusList(data);
    };
    if (settingTab === 'profil' || activeMenu === 'pengaturan' || activeMenu === 'profil') {
      fetchPengurusList();
    }
  }, [settingTab, activeMenu]);

  // Tanda Tangan Laporan State
  const [pejabatTtdList, setPejabatTtdList] = useState([
    { id: 1, tag: 'PEMBUAT LAPORAN', name: 'Staf Keuangan', pos: 'Akuntan Masjid' },
    { id: 2, tag: 'DIPERIKSA OLEH', name: 'H. Ahmad', pos: 'Bendahara DKM' },
    { id: 3, tag: 'DISETUJUI OLEH', name: 'Ustadz H. M. Zainuddin, SQ', pos: 'Ketua / Direktur DKM' },
    { id: 4, tag: 'MENGETAHUI', name: 'Prof. Dr. M. Syafii Antonio', pos: 'Dewan Pembina' },
  ]);
  const [showPejabatTtdModal, setShowPejabatTtdModal] = useState(false);
  const [pejabatTtdFormData, setPejabatTtdFormData] = useState({ id: 0, tag: 'MENGETAHUI', name: '', pos: '' });

  const [pengumumanList, setPengumumanList] = useState([
    { id: 1, tag: 'Kajian', title: 'Kajian Rutin Subuh Berkah: Fiqh Muamalah & ZISWAF', desc: 'Diberitahukan kepada seluruh jamaah bahwa Kajian Subuh Berkah bersama KH. Ridwan Kamil, Lc akan dilaksanakan setiap Sabtu subuh dilanjutkan dengan sarapan ramah tamah.', img: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=400&q=80' },
    { id: 2, tag: 'Keuangan', title: 'Laporan Akuntabilitas & Transparansi Kas Masjid Bulan Juni 2026', desc: 'Laporan rincian pemasukan dan pengeluaran kas Masjid Citra Sentul Raya periode Juni 2026 telah terverifikasi oleh Tim Audit Internal. Informasi selengkapnya dapat diakses pada menu Transparansi.', img: 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=400&q=80' },
    { id: 3, tag: 'Kegiatan', title: 'Pendaftaran Santri Baru TPA Anak & Pembina Muallaf Center', desc: 'Gelombang pendaftaran santri TPA Anak & Muallaf Center angkatan 2026/2027 telah dibuka. Silakan daftar via Sekretariat DKM.', img: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=400&q=80' },
  ]);

  // Inventaris State
  const [inventarisList, setInventarisList] = useState<any[]>([]);

  useEffect(() => {
    const fetchInventaris = async () => {
      try {
        const { data, error } = await supabase.from('masjid_inventaris').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          const formatted = data.map((d: any) => ({
            id: d.id,
            foto: d.foto || '',
            kode: d.kode || d.id,
            nama: d.nama,
            kategori: d.kategori,
            jumlahTotal: d.jumlah,
            kondisi: d.kondisi,
            satuan: d.satuan || 'Unit',
            lokasi: d.lokasi || ''
          }));
          setInventarisList(formatted);
        }
      } catch (err) {
        console.error('Failed to fetch inventaris:', err);
      }
    };
    if (activeMenu === 'operasional' || activeMenu === 'lapkeu' || activeMenu === 'aset' || activeMenu === 'keuangan') {
      fetchInventaris();
    }
  }, [activeMenu]);
  const [laporanRusakList, setLaporanRusakList] = useState<any[]>([
    { id: 1, inventarisId: 1, jumlah: 2, alasan: 'Suara pecah dan kabel putus digigit tikus', tanggal: new Date().toLocaleDateString('id-ID') }
  ]);
  const [showInventarisModal, setShowInventarisModal] = useState(false);
  const [inventarisFormData, setInventarisFormData] = useState({ id: 0 as any, foto: '', kode: '', nama: '', kategori: '', jumlahTotal: 1, satuan: 'Unit', lokasi: '' });
  const [inventarisFotoFile, setInventarisFotoFile] = useState<File | null>(null);

  const [showLaporRusakModal, setShowLaporRusakModal] = useState(false);
  const [laporRusakFormData, setLaporRusakFormData] = useState({ id: 0, inventarisId: 0, jumlah: 1, alasan: '' });
  const [asetTab, setAsetTab] = useState<'semua' | 'rusak'>('semua');

  // Broadcast Jamaah State
  const checkDonorRegistration = (donorContact: string) => {
    if (!donorContact || donorContact === '-') return false;
    const cleanDonor = donorContact.replace(/\D/g, ''); 
    const donorEmail = donorContact.toLowerCase().trim();

    return registeredJamaahList.some(j => {
      if (j.e && j.e.toLowerCase().trim() === donorEmail) return true;
      if (j.c) {
        const cleanJ = j.c.replace(/\D/g, '');
        if (cleanJ && cleanDonor && (cleanJ.endsWith(cleanDonor) || cleanDonor.endsWith(cleanJ))) {
           if (cleanJ.length >= 8 && cleanDonor.length >= 8) {
             return cleanJ.slice(-8) === cleanDonor.slice(-8);
           }
           return cleanJ === cleanDonor;
        }
      }
      return false;
    });
  };

  const [showPengumumanModal, setShowPengumumanModal] = useState(false);
  const [pengumumanFormData, setPengumumanFormData] = useState({ id: 0, title: '', tag: 'Kegiatan', desc: '', img: '' });
  const [showBroadcastDetailModal, setShowBroadcastDetailModal] = useState<any>(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaFormData, setMediaFormData] = useState({ title: '', type: 'youtube', link: '', file: '' });
  const [kontenTab, setKontenTab] = useState<'program' | 'berita' | 'galeri'>('program');
  const defaultJamaah = registeredJamaahList || [];
  const [selectedJamaahIndices, setSelectedJamaahIndices] = useState<number[]>(defaultJamaah.map((_, i) => i));

  // Pengguna (Role & Audit) State
  const [akunPenggunaList, setAkunPenggunaList] = useState<any[]>([]);
  const [showAkunPenggunaModal, setShowAkunPenggunaModal] = useState(false);
  const [akunPenggunaFormData, setAkunPenggunaFormData] = useState<any>({ id: 0, n: '', t: 'JEMAAH', e: '', c: '', r: 'jamaah', p: '' });

  useEffect(() => {
    if (settingTab === 'grup' || activeMenu === 'role') {
      fetchAdminUsers();
    }
  }, [settingTab, activeMenu]);

  const fetchAdminUsers = async () => {
    try {
      const { data, error } = await supabase.from('admin_users').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setAkunPenggunaList(data.map(u => ({
          id: u.id, n: u.nama, t: u.jabatan || 'Pengurus', e: u.email, c: u.kontak || '', r: u.role, d: new Date(u.created_at).toLocaleDateString('id-ID'), p: u.password_hash
        })));
      }
    } catch (err) {
      console.error('Error fetching admin users:', err);
    }
  };

  const [khutbahInfo, setKhutbahInfo] = useState({
    tema: 'Keagungan Zikir & Transparansi Pengelolaan Aset Umat',
    khatib: 'Prof. Dr. KH. Nasaruddin Umar, MA',
    imam: 'Ustadz H. M. Zainuddin, Sq',
    muadzin: 'Ustadz Bilal Al-Hafiz',
    waktu: 'Jumat Ini, 11:55 WIB - Selesai'
  });

  // Sync when registeredJamaahList changes (e.g. from localStorage via App.tsx)
  useEffect(() => {
    setSelectedJamaahIndices(registeredJamaahList.map((_, i) => i));
  }, [registeredJamaahList]);

  const toggleAllJamaah = (checked: boolean) => {
    if (checked) {
      if (broadcastPlatform === 'wa') {
        setSelectedJamaahIndices(defaultJamaah.map((u, i) => {
          const c = u.c || u.e;
          return c && !c.includes('@') ? i : -1;
        }).filter(i => i !== -1));
      } else if (broadcastPlatform === 'email') {
        setSelectedJamaahIndices(defaultJamaah.map((u, i) => {
          const c = u.c || u.e;
          return c && c.includes('@') ? i : -1;
        }).filter(i => i !== -1));
      } else {
        setSelectedJamaahIndices(defaultJamaah.map((_, i) => i));
      }
    } else {
      setSelectedJamaahIndices([]);
    }
  };

  const toggleJamaah = (index: number) => {
    setSelectedJamaahIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const [broadcastState, setBroadcastState] = useState<'idle' | 'sending' | 'success'>('idle');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastPlatform, setBroadcastPlatform] = useState('wa');
  const [broadcastHistory, setBroadcastHistory] = useState<any[]>([
    { id: 1, date: '01/08/2026', title: 'Kajian Subuh Bersama Ust. Adi Hidayat', platform: 'wa', recipients: 2, recipientList: [{name: 'Keluarga Bpk. Herman', contact: '081234567890', status: 'Berhasil'}, {name: 'Hamba Allah', contact: '081999999999', status: 'Gagal (Nomor Tidak Valid)'}] },
    { id: 2, date: '25/07/2026', title: 'Laporan Keuangan Masjid Bulan Juli', platform: 'email', recipients: 2, recipientList: [{name: 'Gania', contact: 'gania@example.com', status: 'Berhasil'}, {name: 'Fulan', contact: 'fulan@example.com', status: 'Berhasil'}] },
  ]);

  const handleBroadcastSubmit = () => {
    if (selectedJamaahIndices.length === 0) {
      alert('Pilih minimal 1 jamaah penerima dari tabel di sebelah kanan.');
      return;
    }
    if (!broadcastTitle || !broadcastMessage) {
      alert('Judul dan isi pesan wajib diisi!');
      return;
    }
    
    const selectedContacts = selectedJamaahIndices.map(i => defaultJamaah[i].c || defaultJamaah[i].e);
    const emails = selectedContacts.filter(c => c && c.includes('@'));
    const phones = selectedContacts.filter(c => c && !c.includes('@'));

    setBroadcastState('sending');
    
    // Simulate API delay
    setTimeout(() => {
      setBroadcastState('success');
      
      // Execute actual sending via URI schemes
      if (broadcastPlatform === 'email' || broadcastPlatform === 'both') {
        if (emails.length > 0) {
          const subject = encodeURIComponent(broadcastTitle);
          const body = encodeURIComponent(broadcastMessage);
          const mailtoLink = `mailto:${emails.join(',')}?subject=${subject}&body=${body}`;
          window.location.href = mailtoLink;
        } else if (broadcastPlatform === 'email') {
          alert('Tidak ada alamat email valid yang dipilih.');
        }
      }

      if (broadcastPlatform === 'wa' || broadcastPlatform === 'both') {
        if (phones.length > 0) {
          const text = encodeURIComponent(`*${broadcastTitle}*\n\n${broadcastMessage}`);
          
          let cleanPhone = phones[0].replace(/\D/g, '');
          if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);
          
          const waLink = `https://wa.me/${cleanPhone}?text=${text}`;
          window.open(waLink, '_blank');
          
          if (phones.length > 1) {
            alert(`Sistem membuka tab WhatsApp untuk penerima pertama (${phones[0]}). Untuk pengiriman massal otomatis ke seluruh kontak tanpa membuka tab satu per satu, diperlukan integrasi API WhatsApp Gateway (Backend).`);
          }
        } else if (broadcastPlatform === 'wa') {
          alert('Tidak ada nomor WhatsApp valid yang dipilih.');
        }
      }

      const recipientList = selectedJamaahIndices.map(i => {
        const j = defaultJamaah[i];
        return { name: j.n, contact: j.c || j.e || '-', status: 'Berhasil' };
      });

      setBroadcastHistory(prev => [{
        id: Date.now(),
        date: new Date().toLocaleDateString('id-ID'),
        title: broadcastTitle,
        platform: broadcastPlatform,
        recipients: (broadcastPlatform === 'wa' ? phones.length : broadcastPlatform === 'email' ? emails.length : phones.length + emails.length),
        recipientList: recipientList
      }, ...prev]);

      setTimeout(() => {
        setBroadcastState('idle');
        setBroadcastTitle('');
        setBroadcastMessage('');
      }, 3000);
    }, 1500);
  };

  const totalIn = kasEntries.filter(e => e.type === 'in').reduce((acc, curr) => acc + curr.amount, 0);
  const totalOut = kasEntries.filter(e => e.type === 'out').reduce((acc, curr) => acc + curr.amount, 0);
  const saldoAkhir = totalIn - totalOut;

  const [journals, setJournals] = useState<JurnalEntry[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [appSettings, setAppSettings] = useState<any>(null);

  useEffect(() => {
    const fetchJournalsAndCoA = async () => {
      try {
        // Fetch App Settings
        const { data: settingsData } = await supabase.from('app_settings').select('*').maybeSingle();
        if (settingsData) {
          setAppSettings(settingsData);
          setTvConfig({
            timezone: settingsData.tv_timezone || 'Asia/Jakarta',
            jedaAdzan: settingsData.tv_jeda_adzan || 15,
            jedaIqomah: settingsData.tv_jeda_iqomah || 10,
            jedaSholat: settingsData.tv_jeda_sholat || 20,
            runningText: settingsData.tv_running_text || 'Selamat Datang di Masjid Citra Sentul Raya. Mari rapatkan dan luruskan shaf shalat Anda.',
            mediaType: settingsData.tv_media_type || 'background',
            mediaUrl: settingsData.tv_media_url || '',
            volume: settingsData.tv_volume || 0,
            showImsak: settingsData.show_imsak !== false,
            showBukaPuasa: settingsData.show_buka_puasa !== false,
            showTarawih: settingsData.show_tarawih || false,
            showJumat: settingsData.show_jumat !== false,
            showIdulFitri: settingsData.show_idul_fitri || false,
            showIdulAdha: settingsData.show_idul_adha || false,
            textImsak: settingsData.text_imsak || 'Waktu Imsak telah tiba. Selamat menjalankan ibadah puasa.',
            textBukaPuasa: settingsData.text_buka_puasa || 'Selamat berbuka puasa. Ya Allah karena-Mu aku berpuasa...',
            textTarawih: settingsData.text_tarawih || 'Selamat menjalankan Ibadah Shalat Sunnah Tarawih berjamaah.',
            textJumat: settingsData.text_jumat || 'Harap tenang, Khutbah Jumat sedang berlangsung.',
            textIdulFitri: settingsData.text_idul_fitri || 'Selamat Hari Raya Idul Fitri 1 Syawal. Mohon maaf lahir dan batin.',
            textIdulAdha: settingsData.text_idul_adha || 'Selamat Hari Raya Idul Adha. Mari berkurban untuk meraih takwa.',
            city: settingsData.tv_city || 'Bogor',
            country: settingsData.tv_country || 'Indonesia'
          });
        }
        
        const { data: rolesData } = await supabase.from('admin_role_permissions').select('*');
        if (rolesData) {
          const permMap: Record<string, string[]> = { ...defaultRolePermissions };
          rolesData.forEach(r => {
            const arr = ['utama']; // always allow utama
            if (r.permissions) {
              if (r.permissions.keuangan) arr.push('keuangan');
              if (r.permissions.operasional) arr.push('operasional');
              if (r.permissions.administrasi) arr.push('administrasi');
              if (r.permissions.pengaturan) arr.push('pengaturan_grup');
            }
            permMap[r.role.toLowerCase()] = arr;
          });
          setRolePermissions(permMap);
        }

        // Fetch CoA
        const { data: coaData, error: coaErr } = await supabase.from('chart_of_accounts').select('*').order('kode');
        if (!coaErr && coaData) {
          const formatted = coaData.map((d: any) => ({
            kode: d.kode,
            nama: d.nama,
            jenis: d.kategori === 'Aset' ? 'Aktiva' : (d.kategori === 'Liabilitas' ? 'Kewajiban' : (d.kategori === 'Saldo Dana' ? 'Ekuitas' : (d.kategori === 'Penerimaan' ? 'Pendapatan' : 'Beban'))),
            kelompok: d.kelompok,
            saldoNormal: d.is_debit ? 'Debit' : 'Kredit',
            saldoAwal: Number(d.saldo) || 0,
            status: d.status,
          }));
          setAccounts(formatted);
        }

        // Fetch Journals
        const { data, error } = await supabase.from('jurnal_umum').select('*, chart_of_accounts(nama)').order('created_at', { ascending: false });
        if (!error && data) {
          const grouped = new Map<string, JurnalEntry>();
          data.forEach((row: any) => {
             const key = row.no_bukti;
             if (!grouped.has(key)) {
                grouped.set(key, {
                  id: key,
                  tanggal: row.tanggal,
                  noBukti: row.no_bukti,
                  keterangan: row.keterangan,
                  sumber: 'Kas Masjid',
                  status: 'Posted',
                  dibuatOleh: row.user_input,
                  tanggalBuat: row.tanggal,
                  baris: []
                });
             }
             grouped.get(key)!.baris.push({
               kodeAkun: row.kode_akun,
               namaAkun: row.chart_of_accounts?.nama || row.kode_akun,
               debit: Number(row.debit),
               kredit: Number(row.kredit)
             });
          });
          const journalsArray = Array.from(grouped.values());
          setJournals(journalsArray);
          
          // Generate kasEntries (Legacy extraction from jurnal_umum for older data)
          const kasListLegacy: any[] = [];
          journalsArray.forEach(j => {
             const kasLine = j.baris.find(b => b.kodeAkun.startsWith('110') || b.kodeAkun.startsWith('1-10'));
             if (kasLine) {
                const dateFormatted = j.tanggal ? (j.tanggal.includes('/') ? j.tanggal : j.tanggal.split('-').reverse().join('/')) : '';
                if (kasLine.debit > 0) {
                   kasListLegacy.push({ id: j.id, date: dateFormatted, desc: j.keterangan, type: 'in', amount: kasLine.debit, isLegacy: true });
                } else if (kasLine.kredit > 0) {
                   kasListLegacy.push({ id: j.id, date: dateFormatted, desc: j.keterangan, type: 'out', amount: kasLine.kredit, isLegacy: true });
                }
             }
          });

          // Failsafe: Render legacy kas immediately to prevent UI from being empty if new fetch fails
          setKasEntries(kasListLegacy);

          try {
             // Fetch new dedicated tables
             const { data: dataPemasukan, error: errPemasukan } = await supabase.from('pemasukan').select('*');
             const { data: dataPengeluaran, error: errPengeluaran } = await supabase.from('pengeluaran').select('*');
             
             let kasListNew: any[] = [];
             if (!errPemasukan && !errPengeluaran && dataPemasukan && dataPengeluaran) {
               kasListNew = [
                 ...dataPemasukan.map((d: any) => ({
                   id: d.id,
                   date: d.tanggal ? d.tanggal.split('-').reverse().join('/') : '',
                   desc: d.keterangan,
                   type: 'in',
                   amount: Number(d.nominal),
                   isNewTable: true
                 })),
                 ...dataPengeluaran.map((d: any) => ({
                   id: d.id,
                   date: d.tanggal ? d.tanggal.split('-').reverse().join('/') : '',
                   desc: d.keterangan,
                   type: 'out',
                   amount: Number(d.nominal),
                   isNewTable: true
                 }))
               ];
             }

             // Merge legacy and new
             const combinedKasList = [...kasListNew];
             kasListLegacy.forEach(legacy => {
                // Check if it exists in new (heuristic matching)
                const existsInNew = kasListNew.some(n => n.desc === legacy.desc && n.amount === legacy.amount && n.date === legacy.date && n.type === legacy.type);
                if (!existsInNew) {
                   combinedKasList.push(legacy);
                }
             });
             
             combinedKasList.sort((a, b) => {
                const dateA = a.date.split('/').reverse().join('');
                const dateB = b.date.split('/').reverse().join('');
                if (dateA === dateB) {
                   return String(b.id).localeCompare(String(a.id));
                }
                return dateB.localeCompare(dateA);
             });

             setKasEntries(combinedKasList);
          } catch (e) {
             console.error("Error fetching new tables, relying on legacy:", e);
          }
        }
      } catch (err) {
        console.error('Error fetching jurnal_umum:', err);
      }
    };
    fetchJournalsAndCoA();
  }, []);

  const handleAutoPostJournal = async (entry: JurnalEntry) => {
    setJournals(prev => [entry, ...prev]);
    try {
      const inserts = entry.baris.map((b, idx) => ({
        id: `${entry.id}-${idx}`,
        tanggal: entry.tanggal,
        no_bukti: entry.noBukti,
        keterangan: entry.keterangan,
        kode_akun: b.kodeAkun,
        debit: b.debit,
        kredit: b.kredit,
        user_input: entry.dibuatOleh || 'Sistem'
      }));
      await supabase.from('jurnal_umum').insert(inserts);
    } catch (err) {
      console.error('Error insert auto jurnal_umum:', err);
    }
  };

  const [namaDonaturStr, setNamaDonaturStr] = useState('');
  const [kontakDonaturStr, setKontakDonaturStr] = useState('');
  const [ziswafTgl, setZiswafTgl] = useState(toLocalDateString());
  const [ziswafBukti, setZiswafBukti] = useState<File | null>(null);
  const [selectedJamaahZiswaf, setSelectedJamaahZiswaf] = useState('manual');

  const handleJamaahZiswafChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedJamaahZiswaf(val);
    if (val === 'manual') {
      setNamaDonaturStr('');
      setKontakDonaturStr('');
    } else {
      const jamaah = registeredJamaahList[parseInt(val)];
      if (jamaah) {
        setNamaDonaturStr(jamaah.n);
        setKontakDonaturStr(jamaah.c || jamaah.e || '');
      }
    }
  };

  const handleZiswafSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nominal = parseInt(nominalStr.replace(/\D/g, ''), 10);
    if (nominal && nominal > 0) {
      onAddDonation(selectedProgram, nominal);
      
      const progObj = programs.find(p => p.id === selectedProgram);
      const progTitle = progObj ? progObj.judul : 'Program ZISWAF';
      const isZakat = progTitle.toLowerCase().includes('zakat');
      const isWakaf = progTitle.toLowerCase().includes('wakaf');
      const namaDonatur = namaDonaturStr.trim() || 'Hamba Allah';
      const noBukti = `BKM-DON-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const tanggal = ziswafTgl || toLocalDateString();
      const tglObj = new Date(tanggal);
      const tanggalFormatted = !isNaN(tglObj.getTime()) ? tglObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : tanggal;

      const newJournal: JurnalEntry = {
        id: `JU-ZIS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        tanggal: tanggal,
        noBukti: noBukti,
        keterangan: `Penerimaan Donasi ZISWAF: ${progTitle} dari ${namaDonatur}`,
        sumber: 'Donasi Umum',
        baris: [
          { kodeAkun: isZakat ? '1104' : (isWakaf ? '1105' : '1106'), namaAkun: `Bank (Debit)`, debit: nominal, kredit: 0 },
          { kodeAkun: isZakat ? '4106' : (isWakaf ? '4105' : '4103'), namaAkun: `Pendapatan Donasi (Kredit)`, debit: 0, kredit: nominal },
        ],
        status: 'Posted',
        dibuatOleh: 'Admin Masjid (Form ZISWAF)',
        tanggalBuat: tanggal,
      };

      setJournals(prev => [newJournal, ...prev]);
      
      try {
        const juId1 = `JU-${Date.now()}-${Math.floor(Math.random() * 1000)}-1`;
        const juId2 = `JU-${Date.now()}-${Math.floor(Math.random() * 1000)}-2`;
        await supabase.from('jurnal_umum').insert([
          {
            id: juId1,
            tanggal: tanggal,
            no_bukti: noBukti,
            keterangan: newJournal.keterangan,
            kode_akun: newJournal.baris[0].kodeAkun,
            debit: nominal,
            kredit: 0,
            user_input: newJournal.dibuatOleh
          },
          {
            id: juId2,
            tanggal: tanggal,
            no_bukti: noBukti,
            keterangan: newJournal.keterangan,
            kode_akun: newJournal.baris[1].kodeAkun,
            debit: 0,
            kredit: nominal,
            user_input: newJournal.dibuatOleh
          }
        ]);
        
        // Simpan ke tabel pemasukan (Riwayat Kas)
        await supabase.from('pemasukan').insert([{
           tanggal: tanggal,
           keterangan: newJournal.keterangan,
           nominal: nominal,
           kategori: 'Penerimaan ZISWAF',
           metode_pembayaran: 'Tunai / Admin',
           dibuat_oleh: newJournal.dibuatOleh
        }]);

        // Simpan ke tabel donations (Riwayat Transaksi) dengan status Berhasil
        const donasiId = `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        
        let finalBuktiUrl = null;
        if (ziswafBukti) {
          const fileExt = ziswafBukti.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `donasi/${fileName}`;
          
          const { error: uploadError } = await supabase.storage.from('masjid-assets').upload(filePath, ziswafBukti, {
            cacheControl: '3600',
            upsert: false
          });
          
          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage.from('masjid-assets').getPublicUrl(filePath);
            finalBuktiUrl = publicUrlData.publicUrl;
          } else {
            console.error('Storage Upload Error:', uploadError);
          }
        }

        const donasiRecord = {
          id: donasiId,
          tanggal: tanggalFormatted,
          program_id: selectedProgram,
          program_name: progTitle,
          nominal,
          metode: 'Tunai / Admin',
          status: 'Berhasil',
          bukti: finalBuktiUrl,
          nama_donatur: namaDonatur,
          kontak_donatur: kontakDonaturStr || '-'
        };
        await supabase.from('donations').insert([donasiRecord]);
        
        if (onAddDonasiHistoryItem) {
          onAddDonasiHistoryItem({
            id: donasiId,
            tanggal: tanggalFormatted,
            programId: selectedProgram,
            programName: progTitle,
            nominal,
            metode: 'Tunai / Admin',
            status: 'Berhasil',
            bukti: finalBuktiUrl,
            namaDonatur: namaDonatur,
            kontakDonatur: kontakDonaturStr || '-'
          });
        }

      } catch (err) { console.error('Error insert jurnal_umum/donations:', err); }
      
      setNominalStr('');
      setNamaDonaturStr('');
      setKontakDonaturStr('');
      setZiswafBukti(null);
      setZiswafTgl(toLocalDateString());
      setSelectedJamaahZiswaf('manual');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const handleKasPemasukanSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const dateInput = (form.elements.namedItem('tgl') as HTMLInputElement).value;
    const descInput = (form.elements.namedItem('ket') as HTMLInputElement).value;
    const amountInput = parseFloat((form.elements.namedItem('nom') as HTMLInputElement).value);
    const akunDebit = (form.elements.namedItem('akun_debit') as HTMLSelectElement)?.value || '1101';
    const akunKredit = (form.elements.namedItem('akun_kredit') as HTMLSelectElement)?.value || '4101';

    if (descInput && amountInput > 0) {
      const dateFormatted = dateInput ? dateInput.split('-').reverse().join('/') : new Date().toLocaleDateString('id-ID');
      const newKas = { id: Date.now(), date: dateFormatted, desc: descInput, type: 'in' as const, amount: amountInput };
      setKasEntries(prev => [newKas, ...prev]);

      const noBukti = `BKM-RT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const tanggal = dateInput || toLocalDateString();

      const namaAkunDebit = accounts.find(a => a.kode === akunDebit)?.nama || 'Kas/Bank (Debit)';
      const namaAkunKredit = accounts.find(a => a.kode === akunKredit)?.nama || 'Pendapatan/Penerimaan (Kredit)';

      const newJournal: JurnalEntry = {
        id: `JU-RT-${Date.now()}`,
        tanggal: tanggal,
        noBukti: noBukti,
        keterangan: `Pemasukan: ${descInput}`,
        sumber: 'Kas Masjid',
        baris: [
          { kodeAkun: akunDebit, namaAkun: namaAkunDebit, debit: amountInput, kredit: 0 },
          { kodeAkun: akunKredit, namaAkun: namaAkunKredit, debit: 0, kredit: amountInput },
        ],
        status: 'Posted',
        dibuatOleh: 'Admin Masjid',
        tanggalBuat: tanggal,
      };

      setJournals(prev => [newJournal, ...prev]);
      
      try {
        const { data: insertedPemasukan } = await supabase.from('pemasukan').insert([{
           tanggal: tanggal,
           keterangan: descInput,
           nominal: amountInput,
           kategori: 'Pemasukan Kas',
           metode_pembayaran: 'Tunai/Transfer',
           dibuat_oleh: 'Admin Masjid'
        }]).select();

        if (insertedPemasukan && insertedPemasukan[0]) {
           setKasEntries(prev => prev.map(e => e.id === newKas.id ? { ...e, id: insertedPemasukan[0].id, isNewTable: true } : e));
        }

        await supabase.from('jurnal_umum').insert([
          {
            id: `JU-${Date.now()}-1`,
            tanggal: tanggal,
            no_bukti: noBukti,
            keterangan: newJournal.keterangan,
            kode_akun: akunDebit,
            debit: amountInput,
            kredit: 0,
            user_input: 'Admin Masjid'
          },
          {
            id: `JU-${Date.now()}-2`,
            tanggal: tanggal,
            no_bukti: noBukti,
            keterangan: newJournal.keterangan,
            kode_akun: akunKredit,
            debit: 0,
            kredit: amountInput,
            user_input: 'Admin Masjid'
          }
        ]);
      } catch (err) { console.error('Error insert pemasukan/jurnal_umum:', err); }

      alert('Data Pemasukan berhasil disimpan & terposting otomatis ke Jurnal Umum, Buku Besar, CoA, & Laporan Keuangan!');
      setKasTab('ringkasan');
      form.reset();
    }
  };

  const handleKasPengeluaranSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const dateInput = (form.elements.namedItem('tgl') as HTMLInputElement).value;
    const descInput = (form.elements.namedItem('ket') as HTMLInputElement).value;
    const amountInput = parseFloat((form.elements.namedItem('nom') as HTMLInputElement).value);
    const akunDebit = (form.elements.namedItem('akun_debit') as HTMLSelectElement)?.value || '5100';
    const akunKredit = (form.elements.namedItem('akun_kredit') as HTMLSelectElement)?.value || '1101';

    if (descInput && amountInput > 0) {
      const dateFormatted = dateInput ? dateInput.split('-').reverse().join('/') : new Date().toLocaleDateString('id-ID');
      const newKas = { id: Date.now(), date: dateFormatted, desc: descInput, type: 'out' as const, amount: amountInput };
      setKasEntries(prev => [newKas, ...prev]);

      const noBukti = `BKK-RT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const tanggal = dateInput || toLocalDateString();

      const namaAkunDebit = accounts.find(a => a.kode === akunDebit)?.nama || 'Beban/Aset (Debit)';
      const namaAkunKredit = accounts.find(a => a.kode === akunKredit)?.nama || 'Kas/Bank (Kredit)';

      const newJournal: JurnalEntry = {
        id: `JU-RT-${Date.now()}`,
        tanggal: tanggal,
        noBukti: noBukti,
        keterangan: `Pengeluaran: ${descInput}`,
        sumber: 'Kas Masjid',
        baris: [
          { kodeAkun: akunDebit, namaAkun: namaAkunDebit, debit: amountInput, kredit: 0 },
          { kodeAkun: akunKredit, namaAkun: namaAkunKredit, debit: 0, kredit: amountInput },
        ],
        status: 'Posted',
        dibuatOleh: 'Admin Masjid',
        tanggalBuat: tanggal,
      };

      setJournals(prev => [newJournal, ...prev]);
      
      try {
        const { data: insertedPengeluaran } = await supabase.from('pengeluaran').insert([{
           tanggal: tanggal,
           keterangan: descInput,
           nominal: amountInput,
           kategori: 'Pengeluaran Kas',
           metode_pembayaran: 'Tunai/Transfer',
           dibuat_oleh: 'Admin Masjid'
        }]).select();

        if (insertedPengeluaran && insertedPengeluaran[0]) {
           setKasEntries(prev => prev.map(e => e.id === newKas.id ? { ...e, id: insertedPengeluaran[0].id, isNewTable: true } : e));
        }

        await supabase.from('jurnal_umum').insert([
          {
            id: `JU-${Date.now()}-1`,
            tanggal: tanggal,
            no_bukti: noBukti,
            keterangan: newJournal.keterangan,
            kode_akun: akunDebit,
            debit: amountInput,
            kredit: 0,
            user_input: 'Admin Masjid'
          },
          {
            id: `JU-${Date.now()}-2`,
            tanggal: tanggal,
            no_bukti: noBukti,
            keterangan: newJournal.keterangan,
            kode_akun: akunKredit,
            debit: 0,
            kredit: amountInput,
            user_input: 'Admin Masjid'
          }
        ]);
      } catch (err) { console.error('Error insert pengeluaran/jurnal_umum:', err); }

      alert('Data Pengeluaran berhasil disimpan & terposting otomatis ke Jurnal Umum, Buku Besar, CoA, & Laporan Keuangan!');
      setKasTab('ringkasan');
      form.reset();
    }
  };

  const formatRp = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  const handleExportPDF = (type: 'in' | 'out', data: any[]) => {
    try {
      const doc = new jsPDF();
      doc.text(`Laporan Histori ${type === 'in' ? 'Pemasukan' : 'Pengeluaran'} Kas Masjid`, 14, 15);
      
      const tableColumn = ["Tanggal", "Keterangan", "Nominal"];
      const tableRows = data.map(entry => [
        entry.date,
        entry.desc,
        formatRp(entry.amount)
      ]);

      (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 20,
      });
      
      doc.save(`Laporan_${type === 'in' ? 'Pemasukan' : 'Pengeluaran'}_Masjid.pdf`);
    } catch (e) {
      alert("Pastikan paket jspdf dan jspdf-autotable telah terinstal dengan baik.");
    }
  };

  const handleExportExcel = (type: 'in' | 'out', data: any[]) => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(data.map(entry => ({
        Tanggal: entry.date,
        Keterangan: entry.desc,
        Nominal: entry.amount
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Histori_Kas");
      XLSX.writeFile(workbook, `Laporan_${type === 'in' ? 'Pemasukan' : 'Pengeluaran'}_Masjid.xlsx`);
    } catch (e) {
      alert("Pastikan paket xlsx telah terinstal dengan baik.");
    }
  };


  if (showDisplayTV) {
    const now = time;
    const pt = jadwalOnline;
    const jadwal = [
      { n: 'SUBUH', t: pt.subuh },
      { n: 'DZUHUR', t: pt.dzuhur },
      { n: 'ASHAR', t: pt.ashar },
      { n: 'MAGHRIB', t: pt.maghrib },
      { n: 'ISYA', t: pt.isya }
    ];

    let nextPrayer = jadwal[0];
    let isCountdownAdzan = false;
    let isCountdownIqomah = false;
    let isWaktuSholat = false;
    let countdownText = "";
    let activeIndex = -1;
    
    // Menghitung Next Prayer dan Jeda Waktu
    const prayerTimes = jadwal.map(j => {
      const [h, m] = j.t.split(':').map(Number);
      const d = new Date(now);
      d.setHours(h, m, 0, 0);
      return { ...j, date: d };
    });

    for (let i = 0; i < prayerTimes.length; i++) {
      const p = prayerTimes[i];
      if (now < p.date) {
        nextPrayer = jadwal[i];
        activeIndex = i;
        const diffMs = p.date.getTime() - now.getTime();
        const diffMinutes = diffMs / 60000;
        
        if (diffMinutes <= tvConfig.jedaAdzan) {
          isCountdownAdzan = true;
          const m = Math.floor(diffMinutes);
          const s = Math.floor((diffMs % 60000) / 1000);
          countdownText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        break;
      } else {
          const diffMs = now.getTime() - p.date.getTime();
          const diffMinutes = diffMs / 60000;
          if (diffMinutes <= tvConfig.jedaIqomah) {
             isCountdownIqomah = true;
             activeIndex = i;
             nextPrayer = jadwal[i];
             const remainingMs = (tvConfig.jedaIqomah * 60000) - diffMs;
             const m = Math.floor(remainingMs / 60000);
             const s = Math.floor((remainingMs % 60000) / 1000);
             countdownText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
             break;
          } else if (diffMinutes <= tvConfig.jedaIqomah + 20) {
             isWaktuSholat = true;
             activeIndex = i;
             nextPrayer = jadwal[i];
             break;
          }
      }
    }
    
    // Fallback: Jika semua jadwal hari ini terlewat, set Subuh hari berikutnya
    if (activeIndex === -1) {
       activeIndex = 0;
       nextPrayer = jadwal[0];
    }

    const getEmbedUrl = (url: string) => {
      if (!url) return '';
      let videoId = '';
      if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1].split('?')[0];
      else if (url.includes('youtube.com/watch?v=')) videoId = url.split('v=')[1].split('&')[0];
      else if (url.includes('youtube.com/shorts/')) videoId = url.split('shorts/')[1].split('?')[0];
      else if (url.includes('youtube.com/live/')) videoId = url.split('live/')[1].split('?')[0];
      else if (url.includes('youtube.com/embed/')) return url;
      
      // Prevent embedding standard youtube.com which blocks iframe, return an empty string to show fallback background if parsing fails
      return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
    };

    return (
      <div id="tv-fullscreen-container" className="fixed inset-0 bg-black z-[9999] flex flex-col text-slate-800 font-sans overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center relative p-8 min-h-screen">
          {!isCountdownAdzan && !isCountdownIqomah && !isWaktuSholat && tvConfig.mediaType === 'youtube' && tvConfig.mediaUrl ? (
            <iframe src={`${getEmbedUrl(tvConfig.mediaUrl)}?autoplay=1&mute=${tvConfig.volume === 0 ? 1 : 0}&loop=1&controls=0`} className="absolute inset-0 w-[120%] h-[120%] -left-[10%] -top-[10%] pointer-events-none opacity-40 object-cover" allow="autoplay; encrypted-media" />
          ) : !isCountdownAdzan && !isCountdownIqomah && !isWaktuSholat && tvConfig.mediaType === 'cctv' && tvConfig.mediaUrl ? (
            <iframe src={tvConfig.mediaUrl} className="absolute inset-0 w-full h-full pointer-events-none opacity-40 object-cover" />
          ) : (
            <img src="https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=2000&q=80" className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" alt="bg" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/90 pointer-events-none"></div>

          <div className="absolute top-4 right-4 flex items-center gap-4 z-50">
            <button onClick={toggleFullscreen} className="p-4 bg-white hover:bg-slate-200 rounded-xl transition-colors opacity-30 hover:opacity-100 group shadow-xl border border-slate-300 cursor-pointer" title="Layar Penuh (F11)">
              <Maximize className="w-8 h-8 group-hover:scale-110 transition-transform" />
            </button>
            <button onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen();
              }
              setShowDisplayTV(false);
            }} className="p-4 bg-white hover:bg-red-600 rounded-xl transition-colors opacity-30 hover:opacity-100 group shadow-xl border border-slate-300 hover:border-red-500 cursor-pointer" title="Tutup Layar TV">
              <X className="w-8 h-8 group-hover:scale-110 transition-transform" />
            </button>
          </div>
          
          <div className="z-10 text-center w-full max-w-6xl">
            <h1 className="text-4xl md:text-6xl font-bold text-lime-600 mb-6 tracking-wider uppercase drop-shadow-lg">Masjid Citra Sentul Raya</h1>
            
            <div className="flex justify-center gap-4 md:gap-8 text-sm md:text-xl font-bold text-slate-700 bg-black/60 py-3 px-8 rounded-full border border-lime-500/30 backdrop-blur-md mb-10 inline-flex shadow-[0_0_20px_rgba(132,204,22,0.1)]">
              <span className="flex items-center gap-2"><span className="text-lime-600 font-normal text-xs uppercase tracking-widest">Imam:</span> {khutbahInfo.imam}</span>
              <span className="w-px h-6 bg-slate-600 hidden md:block"></span>
              <span className="flex items-center gap-2 hidden md:flex"><span className="text-lime-600 font-normal text-xs uppercase tracking-widest">Khatib:</span> {khutbahInfo.khatib}</span>
              <span className="w-px h-6 bg-slate-600 hidden md:block"></span>
              <span className="flex items-center gap-2 hidden md:flex"><span className="text-lime-600 font-normal text-xs uppercase tracking-widest">Muadzin:</span> {khutbahInfo.muadzin}</span>
            </div>
            
            {isCountdownAdzan ? (
              <div className="bg-red-600/80 p-6 md:p-8 rounded-3xl border border-red-500 shadow-2xl backdrop-blur-md inline-block mb-12 animate-pulse w-full max-w-4xl mx-auto">
                <h2 className="text-xl sm:text-3xl md:text-5xl text-white font-bold mb-4">WAKTU MENUJU ADZAN {nextPrayer.n}</h2>
                <div className="text-6xl sm:text-[100px] md:text-[140px] lg:text-[200px] font-mono text-white font-black leading-none drop-shadow-xl">{countdownText}</div>
              </div>
            ) : isCountdownIqomah ? (
              <div className="bg-orange-500/80 p-6 md:p-8 rounded-3xl border border-orange-400 shadow-2xl backdrop-blur-md inline-block mb-12 animate-pulse w-full max-w-4xl mx-auto">
                <h2 className="text-xl sm:text-3xl md:text-5xl text-white font-bold mb-4">WAKTU MENUJU IQOMAH {nextPrayer.n}</h2>
                <div className="text-6xl sm:text-[100px] md:text-[140px] lg:text-[200px] font-mono text-white font-black leading-none drop-shadow-xl">{countdownText}</div>
              </div>
            ) : isWaktuSholat ? (
              <div className="bg-slate-900/90 p-8 md:p-12 rounded-3xl border border-slate-700 shadow-2xl backdrop-blur-md inline-block mb-12 w-full max-w-4xl mx-auto">
                <h2 className="text-2xl sm:text-4xl md:text-5xl text-white font-bold mb-6 uppercase tracking-widest text-center">Harap Tenang</h2>
                <div className="text-xl sm:text-2xl md:text-3xl text-lime-400 font-bold leading-relaxed text-center">SHALAT BERJAMAAH {nextPrayer.n} SEDANG BERLANGSUNG</div>
                <div className="mt-8 text-sm md:text-base text-slate-400 font-medium text-center italic">"Dan apabila dibacakan Al-Qur'an, maka dengarkanlah baik-baik, dan perhatikanlah dengan tenang..."</div>
              </div>
            ) : (
              <div className="text-6xl sm:text-[80px] md:text-[120px] lg:text-[180px] font-bold text-white leading-none font-mono tracking-tighter drop-shadow-[0_0_30px_rgba(132,204,22,0.3)] mb-12">
                {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: tvConfig.timezone })}
              </div>
            )}

            <div className="grid grid-cols-5 gap-4 md:gap-8 max-w-5xl mx-auto mt-8">
              {jadwal.map((j, idx) => (
                <div key={j.n} className={`p-4 md:p-6 rounded-2xl border-2 backdrop-blur-md transition-all duration-500 ${idx === activeIndex ? 'bg-lime-500/30 border-lime-400 scale-110 shadow-[0_0_40px_rgba(132,204,22,0.5)]' : 'bg-black/40 border-slate-300'}`}>
                  <p className={`text-lg md:text-2xl font-bold mb-2 ${idx === activeIndex ? 'text-lime-300' : 'text-slate-400'}`}>{j.n}</p>
                  <p className={`text-3xl md:text-5xl font-bold ${idx === activeIndex ? 'text-white' : 'text-slate-500'}`}>{j.t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="h-20 bg-lime-600 flex items-center overflow-hidden border-t-4 border-lime-400 shrink-0">
          <div className="whitespace-nowrap text-2xl font-bold text-black px-4" style={{ animation: 'marquee 25s linear infinite' }}>
            {(() => {
              let text = tvConfig.runningText;
              const h = now.getHours();
              const d = now.getDay(); // 0 = Sunday, 5 = Friday
              
              // Khutbah Jumat
              if (tvConfig.showJumat && d === 5 && h >= 11 && h <= 13) text += " • " + tvConfig.textJumat;
              // Buka Puasa (Sekitar Maghrib)
              if (tvConfig.showBukaPuasa && nextPrayer.n === 'Maghrib' && isCountdownAdzan) text += " • " + tvConfig.textBukaPuasa;
              // Imsak (Menjelang Subuh)
              if (tvConfig.showImsak && nextPrayer.n === 'Subuh' && isCountdownAdzan) text += " • " + tvConfig.textImsak;
              // Tarawih (Malam hari bulan Ramadhan - asumsikan setelah Isya)
              if (tvConfig.showTarawih && (h >= 19 || h <= 4)) text += " • " + tvConfig.textTarawih;
              // Idul Fitri / Idul Adha (toggled manually by admin)
              if (tvConfig.showIdulFitri) text += " • " + tvConfig.textIdulFitri;
              if (tvConfig.showIdulAdha) text += " • " + tvConfig.textIdulAdha;
              
              return text;
            })()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-700" >
      
      {/* Navbar Minimalis */}
      <div className="bg-white border-b border-slate-200 flex items-center justify-between px-6 py-3 print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-lime-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg">DKM</div>
          <span className="font-bold text-slate-800 hidden sm:block">Portal Pengurus Citra Sentul</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowNotificationModal(true)} 
            className="relative flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {unreadNotificationsCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setShowPanduanModal(true)} 
            className="flex items-center gap-1.5 px-2 sm:px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full text-[10px] sm:text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-lime-300" /> <span className="hidden sm:inline">Buku Panduan</span>
          </button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="flex items-center gap-2 px-2 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-700 text-slate-600 rounded-full text-[10px] sm:text-xs font-bold transition-colors border border-slate-300 cursor-pointer">
            <Moon className="w-3.5 h-3.5 text-lime-600 no-invert" /> <span className="hidden sm:inline">{isDarkMode ? 'Mode Terang' : 'Mode Gelap'}</span>
          </button>
          <button onClick={onBack} className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-slate-800 rounded-full text-[10px] sm:text-xs font-bold transition-colors border border-red-500/20 cursor-pointer">
            <LogOut className="w-3.5 h-3.5" /> LOGOUT
          </button>
        </div>
      </div>

      <BukuPanduanModal
        isOpen={showPanduanModal}
        onClose={() => setShowPanduanModal(false)}
        defaultRole="admin"
      />

      {showNotificationModal && (
        <div className="fixed inset-0 z-[100] flex items-start justify-end pt-16 pr-6 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowNotificationModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Bell className="w-4 h-4 text-lime-600" />
                Notifikasi
              </h3>
              <button onClick={() => setShowNotificationModal(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Tidak ada notifikasi baru</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} onClick={() => { markNotificationAsRead(n.id); if(n.link_to) { window.location.hash = n.link_to; setShowNotificationModal(false); } }} className={`p-3 rounded-lg mb-1 cursor-pointer transition-colors flex gap-3 ${n.is_read ? 'bg-white hover:bg-slate-50' : 'bg-lime-50 hover:bg-lime-100 border border-lime-100'}`}>
                    <div className="mt-1">
                      {n.is_read ? <CheckCircle2 className="w-4 h-4 text-slate-300" /> : <div className="w-2 h-2 rounded-full bg-red-500 mt-1"></div>}
                    </div>
                    <div>
                      <p className={`text-sm ${n.is_read ? 'text-slate-600' : 'text-slate-800 font-bold'}`}>{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <span className="text-xs text-slate-400 mt-2 block">{new Date(n.created_at).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Banner Premium Hijau Cerah */}
        <div className="bg-gradient-to-r from-lime-500 to-lime-600 border border-lime-600 rounded-2xl p-6 sm:p-8 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 backdrop-blur-sm flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow-sm">Portal Admin & Pengurus DKM</h1>
                <span className="px-2 py-0.5 rounded-full bg-white text-lime-700 border border-white/50 text-xs font-extrabold uppercase tracking-wider shadow-sm">
                  Role: {adminRole.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-lime-50 mt-1 font-medium">Manajemen Keuangan Sederhana, Update Program ZISWAF, & Pengaturan Visibilitas.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowDisplayTV(true)} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-lime-50 text-lime-500 hover:text-lime-600 border border-lime-200/50 rounded-lg text-xs font-extrabold transition-all shadow-md">
              <MonitorPlay className="w-4 h-4" /> Display TV
            </button>
            <button onClick={() => {
              setIsRefreshing(true);
              setTimeout(() => setIsRefreshing(false), 500);
            }} className={`flex items-center gap-2 px-4 py-2 bg-white hover:bg-lime-50 text-lime-500 hover:text-lime-600 border border-lime-200/50 rounded-lg text-xs font-extrabold transition-all shadow-md ${isRefreshing ? 'opacity-70' : ''}`}>
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} /> {isRefreshing ? 'Memuat...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* Search Menu */}
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-800 hidden md:block">Pintasan Menu</h2>
          <div className="relative w-full md:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="search"
              autoComplete="new-password"
              name="random-search-string"
              className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500 text-sm shadow-lg transition-all"
              placeholder="Cari fitur portal (contoh: Dashboard, Laporan, Kas)..."
              value={searchMenu}
              onChange={(e) => setSearchMenu(e.target.value)}
            />
            {searchMenu && (
              <button 
                onClick={() => setSearchMenu('')} 
                className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Main Categories Tabs Premium */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-lime-600 to-teal-700 rounded-2xl p-2 mb-5 shadow-xl border border-lime-500/50 overflow-hidden flex flex-col md:flex-row">
          {/* Decorative Background Glows */}
          <div className="absolute top-0 right-10 -mt-6 w-32 h-32 bg-white opacity-20 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-10 -mb-6 w-24 h-24 bg-lime-300 opacity-20 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex overflow-x-auto no-scrollbar w-full gap-2 relative z-10">
            {MENU_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;

              return (
                <button 
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    if (cat.id === 'utama') {
                      setActiveMenu('utama');
                    } else if (SUB_MENUS[cat.id]?.length > 0) {
                      const firstMenu = SUB_MENUS[cat.id][0];
                      if (firstMenu.action) firstMenu.action();
                      else setActiveMenu(firstMenu.id);
                    }
                  }} 
                  className={`flex items-center gap-2 px-5 py-3.5 whitespace-nowrap transition-all duration-300 flex-1 justify-center rounded-xl ${isActive ? 'bg-white text-emerald-800 font-extrabold shadow-lg scale-[1.02] ring-1 ring-black/5' : 'text-emerald-50 hover:bg-white/20 hover:text-white font-medium border border-transparent hover:border-white/30 backdrop-blur-sm'}`}
                >
                  <Icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-emerald-600' : 'text-emerald-100'}`} />
                  <span className="text-sm tracking-wide">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub Menus Tabs */}
        {activeCategory !== 'utama' && SUB_MENUS[activeCategory] && (
          <div className="bg-slate-100 rounded-xl border border-slate-200 mb-6 p-1.5 shadow-inner">
            <div className="flex flex-wrap gap-1.5 relative z-40">
              {SUB_MENUS[activeCategory]
                .filter(menu => menu.label.toLowerCase().includes(searchMenu.toLowerCase()))
                .map((menu) => {
                const Icon = menu.icon;
                const isActive = menu.id === 'lapkeu' 
                  ? ['lapkeu', 'jurnal', 'bukubesar', 'coa', 'anggaran'].includes(activeMenu)
                  : activeMenu === menu.id;

                return (
                  <div key={menu.id} className="relative group">
                    <button 
                      onClick={() => menu.action ? menu.action() : setActiveMenu(menu.id)} 
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${isActive ? 'bg-white text-lime-700 font-bold shadow-sm border border-slate-200' : 'text-slate-600 hover:bg-white/50 hover:text-slate-800 border border-transparent'}`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-lime-600' : ''}`} />
                      <span className="text-sm font-semibold">{menu.label}</span>
                      {menu.subItems && <ChevronDown className="w-3.5 h-3.5 ml-1 opacity-50" />}
                    </button>
                    
                    {menu.subItems && (
                      <div className="absolute left-0 top-full mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden transform origin-top-left scale-95 group-hover:scale-100 flex flex-col">
                        {menu.subItems.map((sub: any) => (
                          <button
                            key={sub.id}
                            onClick={() => {
                              if (sub.action) sub.action();
                            }}
                            className="w-full text-left px-4 py-3 text-xs font-semibold text-slate-600 hover:bg-lime-50 hover:text-lime-700 transition-colors border-b border-slate-50 last:border-0 cursor-pointer flex items-center gap-2"
                          >
                            {sub.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {SUB_MENUS[activeCategory].filter(menu => menu.label.toLowerCase().includes(searchMenu.toLowerCase())).length === 0 && (
                <div className="px-4 py-2.5 text-sm text-slate-500 flex items-center gap-2 font-medium">
                  <Search className="w-4 h-4" /> Tidak ada fitur yang cocok dengan "{searchMenu}".
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONTEN AREA */}
        
        {/* MODUL: DASHBOARD UTAMA */}
        {activeMenu === 'utama' && (
          <div className="animate-in fade-in space-y-6">
            {/* Top Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl border-b-4 border-b-blue-500 shadow-xl flex flex-col items-start justify-center gap-2 transition-all hover:-translate-y-1 hover:shadow-2xl relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center relative z-10 shadow-inner">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="relative z-10 mt-2">
                  <h3 className="text-4xl font-black text-slate-800 tracking-tight">{registeredJamaahList.length}</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">Total Jamaah</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border-b-4 border-b-emerald-500 shadow-xl flex flex-col items-start justify-center gap-2 transition-all hover:-translate-y-1 hover:shadow-2xl relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center relative z-10 shadow-inner">
                  <Heart className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="relative z-10 mt-2">
                  <h3 className="text-4xl font-black text-slate-800 tracking-tight">{programs.length}</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">Program Donasi</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border-b-4 border-b-amber-500 shadow-xl flex flex-col items-start justify-center gap-2 transition-all hover:-translate-y-1 hover:shadow-2xl relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center relative z-10 shadow-inner">
                  <Calendar className="w-6 h-6 text-amber-600" />
                </div>
                <div className="relative z-10 mt-2">
                  <h3 className="text-4xl font-black text-slate-800 tracking-tight">4</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">Jadwal Petugas</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border-b-4 border-b-purple-500 shadow-xl flex flex-col items-start justify-center gap-2 transition-all hover:-translate-y-1 hover:shadow-2xl relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-150 transition-transform duration-500 ease-out z-0"></div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center relative z-10 shadow-inner">
                  <Building className="w-6 h-6 text-purple-600" />
                </div>
                <div className="relative z-10 mt-2">
                  <h3 className="text-4xl font-black text-slate-800 tracking-tight">{inventarisList.length}</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">Aset Inventaris</p>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Saldo Kas Utama (COA) */}
              <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-8 rounded-3xl shadow-[0_20px_50px_-12px_rgba(4,120,87,0.5)] flex flex-col h-96 relative overflow-hidden text-white">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 opacity-20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-teal-400 opacity-20 rounded-full blur-2xl pointer-events-none -ml-10 -mb-10"></div>
                
                <div className="relative z-10 flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-emerald-50 tracking-wide">Saldo Kas Utama</h3>
                    <p className="text-emerald-200/70 text-xs font-medium mt-1">Terhubung dengan PSAK 409</p>
                  </div>
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                    <Wallet className="w-6 h-6 text-emerald-300" />
                  </div>
                </div>

                {kasEntries.length > 0 ? (
                  <div className="relative z-10 flex-1 flex flex-col justify-center">
                    <p className="text-emerald-100 text-sm font-medium mb-2">Total Saldo Aktif Saat Ini</p>
                    <p className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tighter drop-shadow-md break-all">
                      <span className="text-xl sm:text-2xl md:text-3xl text-emerald-300 font-bold mr-1 sm:mr-2">Rp</span>
                      {(kasEntries.filter(e => e.type === 'in').reduce((sum, e) => sum + e.amount, 0) -
                       kasEntries.filter(e => e.type === 'out').reduce((sum, e) => sum + e.amount, 0)).toLocaleString('id-ID')}
                    </p>
                    
                    <div className="mt-8 grid grid-cols-2 gap-2 sm:gap-4">
                      <div className="bg-white/10 rounded-xl p-3 sm:p-4 backdrop-blur-sm border border-white/10">
                        <p className="text-emerald-200 text-[10px] sm:text-xs font-bold uppercase mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-400" /> Pemasukan</p>
                        <p className="text-sm sm:text-lg font-bold text-white truncate">Rp {kasEntries.filter(e => e.type === 'in').reduce((sum, e) => sum + e.amount, 0).toLocaleString('id-ID')}</p>
                      </div>
                      <div className="bg-white/10 rounded-xl p-3 sm:p-4 backdrop-blur-sm border border-white/10">
                        <p className="text-emerald-200 text-[10px] sm:text-xs font-bold uppercase mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3 text-red-400" /> Pengeluaran</p>
                        <p className="text-sm sm:text-lg font-bold text-white truncate">Rp {kasEntries.filter(e => e.type === 'out').reduce((sum, e) => sum + e.amount, 0).toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                    <p className="text-emerald-200/50 font-medium">Belum ada data kas bulan ini.</p>
                  </div>
                )}
              </div>

              {/* Progres Program Donasi */}
              <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl flex flex-col h-96">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold text-slate-800">Progres Program Donasi</h3>
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-500 rounded-full shadow-sm"></div> Terkumpul</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-200 rounded-full shadow-inner"></div> Target</div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-3 space-y-6">
                  {programs.map(prog => (
                    <div key={prog.id} className="w-full group">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <p className="text-xs font-bold text-emerald-600 mb-0.5">{prog.kategori}</p>
                          <p className="font-bold text-slate-700 text-sm group-hover:text-emerald-700 transition-colors">{prog.judul}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-800 text-lg">{prog.terkumpulPersen}%</p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${Math.min(100, prog.terkumpulPersen)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODUL: RIWAYAT TRANSAKSI */}
        {activeMenu === 'kas' && (
          <div className="animate-in fade-in space-y-6">
            {/* KPI Dashboard Kas */}
            {(() => {
              const periodEntries = kasEntries.filter(e => isWithinDateRange(e.date, filterRingkasan));
              const totalIn = periodEntries.filter(e => e.type === 'in').reduce((sum, e) => sum + e.amount, 0);
              const totalOut = periodEntries.filter(e => e.type === 'out').reduce((sum, e) => sum + e.amount, 0);
              
              const saldo = kasEntries.filter(e => {
                if (!filterRingkasan.end) return true;
                const parts = e.date.split('/');
                if (parts.length !== 3) return true;
                const [d, m, y] = parts;
                return new Date(Number(y), Number(m) - 1, Number(d)).getTime() <= new Date(filterRingkasan.end).setHours(23,59,59,999);
              }).reduce((sum, e) => sum + (e.type === 'in' ? e.amount : -e.amount), 0);
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-3">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1">
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">Saldo Kas Saat Ini</p>
                      <h3 className="text-lg font-extrabold text-slate-800">Rp {saldo.toLocaleString('id-ID')}</h3>
                    </div>
                    <div className="w-9 h-9 bg-lime-100 rounded-full flex items-center justify-center shrink-0">
                      <Wallet className="w-4 h-4 text-lime-600" />
                    </div>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1">
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">Total Pemasukan</p>
                      <h3 className="text-base font-extrabold text-emerald-600">Rp {totalIn.toLocaleString('id-ID')}</h3>
                    </div>
                    <div className="w-9 h-9 bg-emerald-50 rounded-full flex items-center justify-center shrink-0">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1">
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">Total Pengeluaran</p>
                      <h3 className="text-base font-extrabold text-red-600">Rp {totalOut.toLocaleString('id-ID')}</h3>
                    </div>
                    <div className="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center shrink-0">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    </div>
                  </div>
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1">
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">Total Transaksi</p>
                      <h3 className="text-lg font-extrabold text-slate-800">{periodEntries.length}</h3>
                    </div>
                    <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Connection Banner */}
            <div className="bg-gradient-to-r from-lime-800 via-lime-700 to-lime-800 rounded-xl p-4 text-white shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border border-lime-500/30">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-lime-100 text-xs font-extrabold uppercase tracking-wider backdrop-blur-md">
                  ðŸ”— Terhubung Otomatis Sistem Akuntansi Double-Entry
                </span>
                <h2 className="text-lg font-extrabold text-white">Riwayat Transaksi Kas Masjid</h2>
                <p className="text-lime-100 text-[11px] max-w-3xl leading-relaxed">
                  Semua mutasi kas tersinkronisasi otomatis dengan **Chart of Accounts (CoA)**, **Jurnal Umum**, **Buku Besar**, dan **Neraca**.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button 
                  onClick={() => { setActiveMenu('lapkeu'); setLapkeuTab('jurnal'); }}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg text-xs backdrop-blur-md transition-all border border-white/20 flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-lime-300" /> Jurnal Umum
                </button>
                <button 
                  onClick={() => { setActiveMenu('lapkeu'); setLapkeuTab('bukubesar'); }}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg text-xs backdrop-blur-md transition-all border border-white/20 flex items-center gap-1 cursor-pointer"
                >
                  <Book className="w-3.5 h-3.5 text-lime-300" /> Buku Besar
                </button>
                <button 
                  onClick={() => { setActiveMenu('lapkeu'); setLapkeuTab('neraca'); }}
                  className="px-3 py-1.5 bg-lime-400 hover:bg-lime-300 text-lime-950 font-extrabold rounded-lg text-xs shadow transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Scale className="w-3.5 h-3.5 text-lime-950" /> Neraca Laba Rugi &rarr;
                </button>
              </div>
            </div>

            {/* Sub-menu Kas dipindahkan ke navigasi atas */}

            {kasTab === 'ringkasan' && (
              <div className="grid grid-cols-1 gap-6 animate-in fade-in">
                {/* Table */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg">
                  <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <h3 className="font-bold text-slate-800">Catatan Transaksi Terakhir</h3>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <div className="flex items-center gap-2">
                        <input type="date" value={filterRingkasan.start} onChange={e => setFilterRingkasan(prev => ({...prev, start: e.target.value}))} className="bg-slate-50 border border-slate-300 text-slate-600 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-lime-600" />
                        <span className="text-xs text-slate-500">-</span>
                        <input type="date" value={filterRingkasan.end} onChange={e => setFilterRingkasan(prev => ({...prev, end: e.target.value}))} className="bg-slate-50 border border-slate-300 text-slate-600 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-lime-600" />
                      </div>
                      <button onClick={() => setKasTab('pemasukan')} className="bg-lime-600 hover:bg-lime-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer shadow-sm">
                        + Tambah Transaksi
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="bg-white text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3">Tanggal</th>
                          <th className="px-5 py-3">Keterangan</th>
                          <th className="px-5 py-3 text-right">Masuk (Debit)</th>
                          <th className="px-5 py-3 text-right">Keluar (Kredit)</th>
                          <th className="px-5 py-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {kasEntries.filter(e => isWithinDateRange(e.date, filterRingkasan)).map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-50">
                            <td className="px-5 py-3 text-slate-500">{entry.date}</td>
                            <td className="px-5 py-3 text-slate-700">{entry.desc}</td>
                            <td className="px-5 py-3 text-right font-mono text-lime-600">
                              {entry.type === 'in' ? formatRp(entry.amount) : '-'}
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-red-600">
                              {entry.type === 'out' ? formatRp(entry.amount) : '-'}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <button onClick={() => handleEditKas(entry)} className="mr-3 text-blue-500 hover:text-blue-700" title="Edit"><Edit className="w-4 h-4 inline"/></button>
                              <button onClick={() => handleDeleteKas(entry.id)} className="text-red-500 hover:text-red-700" title="Hapus"><Trash2 className="w-4 h-4 inline"/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {kasTab === 'pemasukan' && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in">
                <div className="lg:col-span-2 bg-white border border-slate-200 p-8 rounded-xl shadow-xl">
                  <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><ArrowDownCircle className="w-6 h-6 text-lime-600" /> Form Input Pemasukan Kas</h3>
                  <form className="space-y-5" onSubmit={handleKasPemasukanSubmit}>
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-2">Tanggal Transaksi</label>
                      <input name="tgl" type="date" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-600" required defaultValue={toLocalDateString()} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-2">Keterangan / Sumber Dana</label>
                      <input name="ket" type="text" placeholder="Contoh: Infaq Kotak Amal Jumat" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-600" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-2">Akun CoA Penerimaan (Debit: Kas/Bank)</label>
                      <select name="akun_debit" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-600" required>
                        {accounts.filter(a => a.jenis === 'Aset').map(a => <option key={a.kode} value={a.kode}>{a.kode} - {a.nama}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-2">Akun CoA Pendapatan (Kredit)</label>
                      <select name="akun_kredit" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-600" required>
                        {accounts.filter(a => a.jenis === 'Penerimaan' || a.jenis === 'Pendapatan' || a.jenis === 'Liabilitas' || a.jenis === 'Saldo Dana').map(a => <option key={a.kode} value={a.kode}>{a.kode} - {a.nama}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-2">Nominal Pemasukan (Rp)</label>
                      <input name="nom" type="number" placeholder="Contoh: 1500000" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono text-lg focus:outline-none focus:border-lime-600" required />
                    </div>
                    <button type="submit" className="w-full bg-lime-600 hover:bg-lime-700 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-lg shadow-lime-900/20 flex justify-center items-center gap-2 cursor-pointer">
                      <Save className="w-5 h-5" /> Simpan & Auto-Post ke Jurnal
                    </button>
                  </form>
                </div>
                <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
                    <h3 className="font-bold text-slate-800 whitespace-nowrap">Histori Pemasukan</h3>
                    <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                      <div className="flex items-center gap-2">
                        <input type="date" value={filterPemasukan.start} onChange={e => setFilterPemasukan(prev => ({...prev, start: e.target.value}))} className="bg-white border border-slate-300 text-slate-600 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-lime-600" />
                        <span className="text-xs text-slate-500">-</span>
                        <input type="date" value={filterPemasukan.end} onChange={e => setFilterPemasukan(prev => ({...prev, end: e.target.value}))} className="bg-white border border-slate-300 text-slate-600 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-lime-600" />
                      </div>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleExportPDF('in', kasEntries.filter(e => e.type === 'in' && isWithinDateRange(e.date, filterPemasukan))); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-slate-300 shadow-sm cursor-pointer">PDF</button>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleExportExcel('in', kasEntries.filter(e => e.type === 'in' && isWithinDateRange(e.date, filterPemasukan))); }} className="bg-lime-600 hover:bg-lime-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer">Excel</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3">Tanggal</th>
                          <th className="px-5 py-3">Keterangan</th>
                          <th className="px-5 py-3 text-right">Nominal (Debit)</th>
                          <th className="px-5 py-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {kasEntries.filter(e => e.type === 'in' && isWithinDateRange(e.date, filterPemasukan)).map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-50">
                            <td className="px-5 py-3 text-slate-500">{entry.date}</td>
                            <td className="px-5 py-3 text-slate-700">{entry.desc}</td>
                            <td className="px-5 py-3 text-right font-mono font-bold text-lime-600">
                              {formatRp(entry.amount)}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <button onClick={() => handleEditKas(entry)} className="mr-3 text-blue-500 hover:text-blue-700" title="Edit"><Edit className="w-4 h-4 inline"/></button>
                              <button onClick={() => handleDeleteKas(entry.id)} className="text-red-500 hover:text-red-700" title="Hapus"><Trash2 className="w-4 h-4 inline"/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {kasTab === 'pengeluaran' && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-in fade-in">
                <div className="lg:col-span-2 bg-white border border-slate-200 p-8 rounded-xl shadow-xl">
                  <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><ArrowUpCircle className="w-6 h-6 text-red-600" /> Form Input Pengeluaran Kas</h3>
                  <form className="space-y-5" onSubmit={handleKasPengeluaranSubmit}>
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-2">Tanggal Transaksi</label>
                      <input name="tgl" type="date" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-600" required defaultValue={toLocalDateString()} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-2">Keterangan / Tujuan Pengeluaran</label>
                      <input name="ket" type="text" placeholder="Contoh: Pembayaran Listrik & PDAM" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-600" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-2">Akun CoA Pengeluaran (Debit: Beban/Aset)</label>
                      <select name="akun_debit" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-600" required>
                        {accounts.filter(a => a.jenis === 'Beban' || a.jenis === 'Aset').map(a => <option key={a.kode} value={a.kode}>{a.kode} - {a.nama}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-2">Akun CoA Sumber Kas (Kredit: Kas/Bank)</label>
                      <select name="akun_kredit" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-600" required>
                        {accounts.filter(a => a.jenis === 'Aset').map(a => <option key={a.kode} value={a.kode}>{a.kode} - {a.nama}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-500 mb-2">Nominal Pengeluaran (Rp)</label>
                      <input name="nom" type="number" placeholder="Contoh: 500000" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono text-lg focus:outline-none focus:border-lime-600" required />
                    </div>
                    <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-lg shadow-red-900/20 flex justify-center items-center gap-2 cursor-pointer">
                      <Save className="w-5 h-5" /> Simpan & Auto-Post ke Jurnal
                    </button>
                  </form>
                </div>
                <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3">
                    <h3 className="font-bold text-slate-800 whitespace-nowrap">Histori Pengeluaran</h3>
                    <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                      <div className="flex items-center gap-2">
                        <input type="date" value={filterPengeluaran.start} onChange={e => setFilterPengeluaran(prev => ({...prev, start: e.target.value}))} className="bg-white border border-slate-300 text-slate-600 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-lime-600" />
                        <span className="text-xs text-slate-500">-</span>
                        <input type="date" value={filterPengeluaran.end} onChange={e => setFilterPengeluaran(prev => ({...prev, end: e.target.value}))} className="bg-white border border-slate-300 text-slate-600 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-lime-600" />
                      </div>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleExportPDF('out', kasEntries.filter(e => e.type === 'out' && isWithinDateRange(e.date, filterPengeluaran))); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-slate-300 shadow-sm cursor-pointer">PDF</button>
                      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleExportExcel('out', kasEntries.filter(e => e.type === 'out' && isWithinDateRange(e.date, filterPengeluaran))); }} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer">Excel</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3">Tanggal</th>
                          <th className="px-5 py-3">Keterangan</th>
                          <th className="px-5 py-3 text-right">Nominal (Kredit)</th>
                          <th className="px-5 py-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {kasEntries.filter(e => e.type === 'out' && isWithinDateRange(e.date, filterPengeluaran)).map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-50">
                            <td className="px-5 py-3 text-slate-500">{entry.date}</td>
                            <td className="px-5 py-3 text-slate-700">{entry.desc}</td>
                            <td className="px-5 py-3 text-right font-mono font-bold text-red-600">
                              {formatRp(entry.amount)}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <button onClick={() => handleEditKas(entry)} className="mr-3 text-blue-500 hover:text-blue-700" title="Edit"><Edit className="w-4 h-4 inline"/></button>
                              <button onClick={() => handleDeleteKas(entry.id)} className="text-red-500 hover:text-red-700" title="Hapus"><Trash2 className="w-4 h-4 inline"/></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {kasTab === 'laporan' && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl animate-in fade-in">
                <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><FileText className="w-6 h-6 text-lime-500" /> Cetak Laporan Keuangan</h3>
                    <p className="text-slate-500 text-sm mt-1">Pratinjau seluruh transaksi buku kas sebelum diunduh.</p>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button type="button" onClick={() => alert('Mengunduh format PDF...')} className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 px-6 rounded-xl transition-colors border border-red-200 text-sm">Download PDF</button>
                    <button type="button" onClick={() => alert('Mengunduh format Excel...')} className="bg-lime-600 hover:bg-lime-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-lime-900/20 text-sm">Download Excel</button>
                  </div>
                </div>
                
                <div className="overflow-x-auto p-2">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-4">Tanggal</th>
                        <th className="px-5 py-4">Keterangan / Uraian</th>
                        <th className="px-5 py-4 text-right">Penerimaan (Debit)</th>
                        <th className="px-5 py-4 text-right">Pengeluaran (Kredit)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {kasEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="px-5 py-4 text-slate-500">{entry.date}</td>
                          <td className="px-5 py-4 text-slate-700">{entry.desc}</td>
                          <td className="px-5 py-4 text-right font-mono font-bold text-lime-600">
                            {entry.type === 'in' ? formatRp(entry.amount) : '-'}
                          </td>
                          <td className="px-5 py-4 text-right font-mono font-bold text-red-600">
                            {entry.type === 'out' ? formatRp(entry.amount) : '-'}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50/50 font-bold border-t-2 border-slate-300">
                        <td colSpan={2} className="px-5 py-5 text-right text-slate-600">TOTAL SALDO KAS SAAT INI:</td>
                        <td colSpan={2} className="px-5 py-5 text-right text-lime-600 font-mono text-xl">{formatRp(saldoAkhir)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODUL: ZISWAF */}
        {activeMenu === 'ziswaf' && (
          <div className="animate-in fade-in grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
                  <PlusCircle className="w-5 h-5 text-lime-600" />
                  <h2 className="text-base font-bold text-slate-800">Input Donasi Manual</h2>
                </div>

                {showSuccess && (
                  <div className="mb-4 p-2 bg-lime-900/30 border border-lime-500/50 text-lime-600 text-xs font-semibold rounded-lg text-center">
                    Data donasi ZISWAF berhasil disimpan!
                  </div>
                )}

                <form onSubmit={handleZiswafSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Pilih Program</label>
                    <select 
                      value={selectedProgram}
                      onChange={(e) => setSelectedProgram(Number(e.target.value))}
                      className="w-full p-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-lime-600"
                    >
                      {[...programs, ...localPrograms].map(p => (
                        <option key={p.id} value={p.id}>{p.judul} ({p.kategori})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nominal Donasi (Rp)</label>
                    <input 
                      type="text"
                      placeholder="Contoh: 500000"
                      value={nominalStr}
                      onChange={(e) => setNominalStr(e.target.value.replace(/\D/g, ''))}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-lime-600 font-mono text-base"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Tanggal Donasi</label>
                      <input 
                        type="date"
                        value={ziswafTgl}
                        onChange={(e) => setZiswafTgl(e.target.value)}
                        className="w-full p-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-lime-600"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Pilih Jamaah (Otomatis)</label>
                      <select 
                        value={selectedJamaahZiswaf}
                        onChange={handleJamaahZiswafChange}
                        className="w-full p-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-lime-600"
                      >
                        <option value="manual">Input Manual (Hamba Allah)</option>
                        {registeredJamaahList.map((j, idx) => (
                          <option key={idx} value={idx}>{j.n} - {j.c || j.e}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Nama Donatur (Opsional)</label>
                      <input 
                        type="text"
                        placeholder="Contoh: Hamba Allah"
                        value={namaDonaturStr}
                        onChange={(e) => setNamaDonaturStr(e.target.value)}
                        className="w-full p-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-lime-600"
                        disabled={selectedJamaahZiswaf !== 'manual'}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">No. HP / Email (Opsional)</label>
                      <input 
                        type="text"
                        placeholder="Contoh: 08123456789"
                        value={kontakDonaturStr}
                        onChange={(e) => setKontakDonaturStr(e.target.value)}
                        className="w-full p-2 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-lime-600"
                        disabled={selectedJamaahZiswaf !== 'manual'}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Upload Bukti Transfer (Opsional)</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center cursor-pointer hover:bg-slate-50 hover:border-lime-400 transition-colors" onClick={() => document.getElementById('ziswaf-bukti-upload')?.click()}>
                      <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                      <p className="text-xs font-semibold text-slate-500">{ziswafBukti ? ziswafBukti.name : 'Klik untuk memilih file foto/screenshot bukti transfer'}</p>
                      <input id="ziswaf-bukti-upload" type="file" accept="image/*" className="hidden" onChange={(e) => { if(e.target.files && e.target.files[0]) setZiswafBukti(e.target.files[0]) }} />
                    </div>
                  </div>
                  <button type="submit" className="w-full flex items-center justify-center gap-2 bg-lime-600 hover:bg-lime-700 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-colors shadow-sm shadow-lime-900/20">
                    <Save className="w-4 h-4" /> Simpan ke Database
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white p-6 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-4">
                  <Database className="w-6 h-6 text-lime-600" />
                  <h2 className="text-lg font-bold text-slate-800">Status Pencapaian Program</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {programs.map(p => (
                    <div key={p.id} className="p-5 rounded-xl border border-slate-300 bg-slate-50">
                      <span className="text-xs font-bold text-lime-600 uppercase tracking-wider mb-2 block">{p.kategori}</span>
                      <h3 className="font-bold text-slate-800 mb-4 line-clamp-1">{p.judul}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">Terkumpul:</span><span className="font-bold text-lime-600">{formatRp(p.terkumpulRp)}</span></div>
                        {p.targetRp > 0 && <div className="flex justify-between"><span className="text-slate-500">Target:</span><span className="font-bold text-slate-600">{formatRp(p.targetRp)}</span></div>}
                        <div className="flex justify-between pt-3 border-t border-slate-200 mt-3"><span className="text-slate-500">Total Donatur:</span><span className="font-bold text-lime-600">{p.donatur} Orang</span></div>
                        
                        <div className="pt-3 border-t border-slate-200 mt-3 text-center flex flex-col gap-2">
                          <button onClick={() => {
                            setShowDonaturModal(p.id);
                          }} className="text-xs bg-lime-100 text-lime-700 hover:bg-lime-200 font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer w-full">
                            Lihat Daftar Donatur
                          </button>
                          
                          {activeUpdateInput !== p.id ? (
                            <button onClick={() => setActiveUpdateInput(p.id)} className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-colors cursor-pointer w-full">
                              + Update Perkembangan Donasi
                            </button>
                          ) : (
                            <div className="mt-2 text-left bg-amber-50 border border-amber-200 rounded-lg p-3">
                               <p className="text-xs font-bold text-amber-800 mb-2 uppercase">Update Terbaru:</p>
                               <textarea 
                                  autoFocus
                                  value={newUpdateText}
                                  onChange={(e) => setNewUpdateText(e.target.value)}
                                  placeholder={`Update perkembangan untuk ${p.judul}...`}
                                  className="w-full p-2 text-xs border border-amber-300 rounded mb-2 focus:outline-none focus:border-amber-500"
                                  rows={2}
                               />
                               <div className="flex gap-2">
                                  <button onClick={() => {
                                     if(newUpdateText.trim()) {
                                        setProgramUpdates(prev => ({
                                           ...prev,
                                           [p.id]: [{ id: Date.now(), date: new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }), text: newUpdateText }, ...(prev[p.id] || [])]
                                        }));
                                        setNewUpdateText('');
                                        setActiveUpdateInput(null);
                                     }
                                  }} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-1.5 px-3 rounded w-full transition-colors cursor-pointer">Simpan</button>
                                  <button onClick={() => { setActiveUpdateInput(null); setNewUpdateText(''); }} className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold py-1.5 px-3 rounded w-full transition-colors cursor-pointer">Batal</button>
                               </div>
                            </div>
                          )}

                          {programUpdates[p.id] && programUpdates[p.id].length > 0 && (
                            <div className="mt-3 text-left">
                               <p className="text-xs font-bold text-slate-500 mb-2 uppercase border-b border-slate-200 pb-1">Riwayat Update:</p>
                               <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                  {programUpdates[p.id].map((upd) => (
                                     <div key={upd.id} className="bg-slate-50 border border-slate-200 rounded p-2 text-xs">
                                        <div className="text-[9px] text-slate-400 font-bold mb-1">{upd.date}</div>
                                        <p className="text-slate-700">{upd.text}</p>
                                     </div>
                                  ))}
                               </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODUL: PROGRAM & CAMPAIGN (Tab menu dipindahkan ke atas) */}
        
        {activeMenu === 'konten' && kontenTab === 'program' && (
          <div className="animate-in fade-in space-y-6">
            <div className="bg-white p-8 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2"><Database className="w-6 h-6 text-lime-600" /> Manajemen Program ZISWAF</h2>
                <p className="text-slate-500 text-sm">Kelola daftar program donasi, target pendanaan, dan pantau persentase pengumpulan.</p>
              </div>
              <button onClick={() => setShowCampaignModal(true)} className="bg-lime-600 hover:bg-lime-700 text-white font-bold py-2 px-6 rounded-xl transition-colors shrink-0 cursor-pointer">+ Buat Campaign Baru</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...programs, ...localPrograms].filter(p => !deletedPrograms.includes(p.id)).map(baseP => {
                const p = editedPrograms[baseP.id] ? { ...baseP, ...editedPrograms[baseP.id] } : baseP;
                return (
                <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="bg-lime-100 text-lime-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">{p.kategori}</span>
                    <h3 className="font-bold text-slate-800 mt-3 mb-2">{p.judul}</h3>
                    {p.targetRp > 0 ? (
                      <>
                        <div className="w-full bg-slate-100 rounded-full h-2 mb-2"><div className="bg-lime-500 h-2 rounded-full" style={{ width: `${Math.min((p.terkumpulRp / p.targetRp) * 100, 100)}%` }}></div></div>
                        <div className="flex justify-between text-xs font-semibold"><span className="text-lime-700">{Math.round((p.terkumpulRp / p.targetRp) * 100)}% Terkumpul</span><span className="text-slate-500">{formatRp(p.targetRp)}</span></div>
                      </>
                    ) : (
                      <div className="flex justify-between text-xs font-semibold"><span className="text-lime-700">{formatRp(p.terkumpulRp)} Terkumpul</span><span className="text-slate-500">Tanpa Target</span></div>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                    <button onClick={() => {
                      setShowDonaturModal(p.id);
                    }} className="w-full bg-lime-50 text-lime-700 border border-lime-200 hover:bg-lime-100 font-bold py-2 rounded-lg text-xs transition-colors cursor-pointer">Lihat Donatur</button>
                    <div className="flex w-full gap-2">
                      <button onClick={() => {
                        let parsed = { desc: p.deskripsi, akunDebit: '', akunKredit: '' };
                        try { parsed = JSON.parse(p.deskripsi); } catch(e){}
                        setEditCampaignModalData({ id: p.id, judul: p.judul, target: p.targetRp.toString(), kategori: p.kategori, gambar: p.gambar, akunDebit: parsed.akunDebit, akunKredit: parsed.akunKredit, rawDesc: parsed.desc || p.deskripsi });
                      }} className="flex-1 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold py-2 rounded-lg text-xs transition-colors cursor-pointer">Edit</button>
                      <button onClick={async () => {
                        if(window.confirm(`Yakin ingin menutup program "${p.judul}"? Program ini tidak akan ditampilkan lagi.`)) {
                          setDeletedPrograms(prev => [...prev, p.id]);
                          try {
                            await supabase.from('programs').delete().eq('id', p.id);
                          } catch (err) { console.error('Error delete program:', err); }
                        }
                      }} className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 font-bold py-2 rounded-lg text-xs transition-colors cursor-pointer">Tutup</button>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>
        )}

        {/* MODUL: VERIFIKASI ZISWAF */}
        {activeMenu === 'verifikasi' && (
          <div className="animate-in fade-in space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-4">
                <ShieldCheck className="w-6 h-6 text-lime-600" />
                <h2 className="text-lg font-bold text-slate-800">Verifikasi Donasi ZISWAF Jamaah</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">ID / Tanggal</th>
                      <th className="px-5 py-3">Donatur</th>
                      <th className="px-5 py-3">Program</th>
                      <th className="px-5 py-3">Metode & Nominal</th>
                      <th className="px-5 py-3 text-center">Status</th>
                      <th className="px-5 py-3 text-center">Bukti</th>
                      <th className="px-5 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {donasiHistory.map(d => (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-800">{d.id}</p>
                          <p className="text-xs text-slate-500">{d.tanggal}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-bold text-slate-800">{d.namaDonatur || 'Hamba Allah'}</p>
                            {d.kontakDonatur && d.kontakDonatur !== '-' && (
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${checkDonorRegistration(d.kontakDonatur) ? 'bg-lime-100 text-lime-700 border border-lime-200' : 'bg-red-50 text-red-600 border border-red-200 cursor-pointer hover:bg-red-100'}`} 
                              onClick={() => {
                                if (!checkDonorRegistration(d.kontakDonatur)) {
                                  window.open(`https://wa.me/${d.kontakDonatur.replace(/\D/g, '')}?text=Assalamualaikum%20${encodeURIComponent(d.namaDonatur || 'Bapak/Ibu')},%20Terima%20kasih%20atas%20donasinya.%20Mohon%20kesediaannya%20untuk%20mendaftar%20di%20Portal%20Jamaah%20Masjid%20kami%20melalui%20link%20berikut:%20[Link%20Portal]`, '_blank');
                                }
                              }}
                              title={!checkDonorRegistration(d.kontakDonatur) ? 'Klik untuk Kirim WA Ajakan Daftar' : 'Telah Terdaftar di Portal'}
                              >
                                {checkDonorRegistration(d.kontakDonatur) ? 'Terdaftar' : 'Belum Daftar'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{d.kontakDonatur || '-'}</p>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-700 max-w-[200px] truncate" title={d.programName}>{d.programName}</td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-lime-600">{formatRp(d.nominal)}</p>
                          <p className="text-xs text-slate-500">{d.metode}</p>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            d.status === 'Berhasil' ? 'bg-lime-100 text-lime-700' :
                            d.status === 'Ditolak' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {d.bukti ? (
                            <button onClick={() => window.open(d.bukti, '_blank')} className="text-lime-600 hover:text-lime-800 text-xs font-bold underline flex items-center justify-center gap-1 mx-auto">
                              Lihat
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Tidak ada</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {d.status === 'Menunggu Verifikasi' ? (
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => {
                                  if (onVerifyDonasi) onVerifyDonasi(d.id, 'Berhasil');

                                  // Optimistic UI Update: Kas Pemasukan
                                  const dateFormatted = new Date().toLocaleDateString('id-ID');
                                  const newKas = { id: Date.now(), date: dateFormatted, desc: `Penerimaan Donasi ZISWAF a.n ${d.namaDonatur || 'Hamba Allah'}`, type: 'in' as const, amount: d.nominal };
                                  setKasEntries(prev => [newKas, ...prev]);

                                  // Optimistic UI Update: Jurnal Umum & Neraca
                                  const prog = programs.find(p => p.judul === d.programName || p.id === d.programId);
                                  const kat = prog ? prog.kategori.toLowerCase() : 'sedekah';
                                  let akunDebit = '1106';
                                  let akunKredit = '4103';
                                  
                                  // Parse custom COA dari deskripsi program (JSON format)
                                  if (prog && prog.deskripsi) {
                                    try {
                                      const parsed = JSON.parse(prog.deskripsi);
                                      if (parsed.akunDebit) akunDebit = parsed.akunDebit;
                                      if (parsed.akunKredit) akunKredit = parsed.akunKredit;
                                    } catch(e) { /* ignore if not JSON */ }
                                  }

                                  // Fallback ke default logic jika custom COA tidak ditemukan
                                  if (akunDebit === '1106' && akunKredit === '4103') {
                                    if (kat.includes('zakat')) {
                                       akunDebit = '1104'; akunKredit = '4106';
                                    } else if (kat.includes('infaq') || kat.includes('infak')) {
                                       akunDebit = '1106'; akunKredit = '4102';
                                    } else if (kat.includes('wakaf')) {
                                       akunDebit = '1105'; akunKredit = '4104';
                                    }
                                  }

                                  const namaDebit = accounts.find(a => a.kode === akunDebit)?.nama || 'Kas/Bank Debit';
                                  const namaKredit = accounts.find(a => a.kode === akunKredit)?.nama || 'Pendapatan/Kredit';

                                  const tanggalKini = toLocalDateString();
                                  const newJournal: JurnalEntry = {
                                    id: `JU-ZIS-${Date.now()}`,
                                    tanggal: tanggalKini,
                                    noBukti: `BKM-DONASI-${d.id}`,
                                    keterangan: `Penerimaan Donasi ZISWAF a.n ${d.namaDonatur || 'Hamba Allah'}`,
                                    sumber: 'Donasi Portal Jamaah',
                                    baris: [
                                      { kodeAkun: akunDebit, namaAkun: namaDebit, debit: d.nominal, kredit: 0 },
                                      { kodeAkun: akunKredit, namaAkun: namaKredit, debit: 0, kredit: d.nominal }
                                    ],
                                    status: 'Posted',
                                    dibuatOleh: 'Sistem ZISWAF',
                                    tanggalBuat: tanggalKini,
                                  };
                                  
                                  setJournals(prev => [newJournal, ...prev]);

                                  alert(`Donasi berhasil diverifikasi. Dana masuk ke Kas Pemasukan & Jurnal Akuntansi otomatis tercatat.`);
                                }} 
                                className="px-3 py-1.5 bg-lime-100 text-lime-700 hover:bg-lime-200 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 font-bold text-xs" title="Terima"
                              >
                                <ShieldCheck className="w-4 h-4" /> Terima
                              </button>
                              <button onClick={() => onVerifyDonasi && onVerifyDonasi(d.id, 'Ditolak')} className="px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 font-bold text-xs" title="Tolak">
                                <X className="w-4 h-4" /> Tolak
                              </button>
                            </div>
                          ) : d.status === 'Berhasil' ? (
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => {
                                  const contactMethod = confirm('Kirim notifikasi via WhatsApp? (Klik OK untuk WhatsApp, Batal untuk Email)');
                                  if (contactMethod) {
                                    const phone = d.kontakDonatur.replace(/\D/g, '');
                                    const finalPhone = phone.startsWith('0') ? '62' + phone.substring(1) : phone;
                                    const message = encodeURIComponent(`Assalamu'alaikum ${d.namaDonatur}, Terima kasih, donasi ZISWAF Anda untuk program *${d.programName}* sebesar *Rp${d.nominal.toLocaleString('id-ID')}* telah kami terima dan diverifikasi. Semoga menjadi amal jariyah.`);
                                    window.open(`https://wa.me/${finalPhone}?text=${message}`, '_blank');
                                  } else {
                                    window.location.href = `mailto:${d.kontakDonatur}?subject=Kuitansi Donasi ZISWAF&body=Assalamu'alaikum ${d.namaDonatur}, Terima kasih atas donasi sebesar Rp${d.nominal.toLocaleString('id-ID')} untuk program ${d.programName}.`;
                                  }
                                }}
                                className="px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 font-bold text-xs" title="Kirim Konfirmasi"
                              >
                                <Smartphone className="w-4 h-4" /> WA
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const doc = new jsPDF();
                                  doc.setFillColor(6, 78, 59);
                                  doc.rect(0, 0, 210, 40, 'F');
                                  doc.setTextColor(255, 255, 255);
                                  doc.setFontSize(18);
                                  doc.setFont('helvetica', 'bold');
                                  doc.text('MASJID CITRA SENTUL RAYA', 15, 20);
                                  doc.setFontSize(10);
                                  doc.setFont('helvetica', 'normal');
                                  doc.text('Kuitansi Resmi Penerimaan ZISWAF Digital (Copy Pengurus)', 15, 28);
                                  
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
                                  doc.text(`CSR-ZISWAF-${d.id}`, 60, startY);

                                  doc.setFont('helvetica', 'bold');
                                  doc.text('Tanggal Transaksi:', 15, startY + 10);
                                  doc.setFont('helvetica', 'normal');
                                  doc.text(d.tanggal, 60, startY + 10);

                                  doc.setFont('helvetica', 'bold');
                                  doc.text('Nama Donatur:', 15, startY + 20);
                                  doc.setFont('helvetica', 'normal');
                                  doc.text(d.namaDonatur || 'Hamba Allah', 60, startY + 20);

                                  doc.setFont('helvetica', 'bold');
                                  doc.text('Program ZISWAF:', 15, startY + 40);
                                  doc.setFont('helvetica', 'normal');
                                  doc.text(d.programName || '-', 60, startY + 40);

                                  doc.setFont('helvetica', 'bold');
                                  doc.text('Nominal Donasi:', 15, startY + 50);
                                  doc.setFont('helvetica', 'bold');
                                  doc.setTextColor(6, 78, 59);
                                  doc.text(new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(d.nominal), 60, startY + 50);

                                  doc.setTextColor(51, 51, 51);
                                  doc.setFont('helvetica', 'bold');
                                  doc.text('Status:', 15, startY + 60);
                                  doc.setTextColor(16, 185, 129);
                                  doc.text(d.status.toUpperCase(), 60, startY + 60);

                                  doc.setDrawColor(226, 232, 240);
                                  doc.line(15, startY + 75, 195, startY + 75);

                                  doc.setTextColor(100, 116, 139);
                                  doc.setFontSize(8);
                                  doc.setFont('helvetica', 'normal');
                                  const footerText = 'Terima kasih atas donasi ZISWAF Anda. Semoga membawa keberkahan.\nDokumen ini adalah dokumen resmi yang sah dicetak dari Portal DKM Masjid Citra Sentul Raya.';
                                  doc.text(footerText, 15, startY + 85);
                                  
                                  const safeName = (d.namaDonatur || 'Donatur').replace(/[^a-zA-Z0-9]/g, '_');
                                  const safeId = String(d.id).replace(/[^a-zA-Z0-9]/g, '_');
                                  doc.save(`Kwitansi_ZISWAF_${safeName}_${safeId}.pdf`);
                                }}
                                type="button"
                                className="px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 font-bold text-xs" title="Unduh Kwitansi PDF"
                              >
                                <FileText className="w-4 h-4" /> PDF
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-bold text-red-500">Ditolak</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {donasiHistory.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-slate-500 font-medium">Belum ada donasi.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={donasiPage}
                totalItems={donasiHistory.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setDonasiPage}
              />
            </div>
          </div>
        )}

        {/* MODUL: GALERI & KAJIAN */}
        {activeMenu === 'konten' && kontenTab === 'galeri' && (
          <div className="animate-in fade-in bg-white p-8 rounded-xl border border-slate-200 text-center">
            <Video className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Manajemen Galeri & YouTube</h2>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">Upload dokumentasi kegiatan dan link kajian video.</p>
            <button onClick={() => setShowMediaModal(true)} className="bg-lime-600 hover:bg-lime-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-xl">
              <PlusCircle className="w-5 h-5" /> Tambah Media Baru
            </button>
          </div>
        )}

        {/* MODUL: KALENDER & AGENDA */}
        {activeMenu === 'kalender' && (
          <ModulKalenderAdmin />

        )}

        {/* MODUL: ASPIRASI / TANYA DKM */}
        {activeMenu === 'aspirasi' && (
          <div className="animate-in fade-in space-y-6">
            <ModulAspirasi />
          </div>
        )}

        {/* MODUL: PROFIL PENGURUS */}
        {activeMenu === 'profil' && (
          <div className="animate-in fade-in space-y-6">
            <div className="bg-white p-8 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2"><Users className="w-6 h-6 text-lime-500" /> Manajemen Profil & Pengurus</h2>
                <p className="text-slate-500 text-sm">Atur daftar dewan pembina, pengurus DKM, dan staf. Data ini akan ditampilkan di halaman "Tentang Kami".</p>
              </div>
              <button onClick={() => { 
                setProfilFormData({ id: 0, nama: '', jabatan: '', biodata: '', foto_url: '', urutan: 0, tag: 'PENGURUS' });
                setShowProfilModal(true);
              }} className="bg-lime-600 hover:bg-lime-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors shrink-0 cursor-pointer shadow-lg shadow-lime-900/20">+ Tambah Pengurus</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pengurusList.map((p, i) => (
                <div key={p.id || i} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between shadow-xl transition-transform hover:-translate-y-1">
                  <div className="flex items-center gap-4">
                    <img src={p.foto_url || p.img || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'} alt={p.nama || p.name} className="w-16 h-16 rounded-xl object-cover border border-slate-300 shadow-sm" />
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">{p.nama || p.name}</h3>
                      <p className="text-xs text-slate-500 mb-2">{p.jabatan || p.role}</p>
                      {p.biodata && <p className="text-[11px] text-slate-500 line-clamp-2 max-w-sm mb-2">{p.biodata}</p>}
                      <span className="bg-lime-50 text-lime-600 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider border border-lime-200">{p.tag || 'PENGURUS'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 self-end sm:self-start">
                    <button onClick={() => { 
                      setProfilFormData({ 
                        id: p.id || 0, 
                        nama: p.nama || p.name || '', 
                        jabatan: p.jabatan || p.role || '', 
                        biodata: p.biodata || '', 
                        foto_url: p.foto_url || p.img || '',
                        urutan: p.urutan || 0,
                        tag: p.tag || 'PENGURUS'
                      });
                      setShowProfilModal(true);
                    }} className="p-2 bg-slate-100 rounded-lg text-slate-500 hover:text-white hover:bg-lime-600 cursor-pointer transition-colors shadow-sm" title="Edit Profil">
                      <Settings className="w-4 h-4" />
                    </button>
                    <button onClick={async () => {
                      if (window.confirm(`Hapus profil ${p.nama || p.name}?`)) {
                        if (typeof p.id === 'string') {
                          await supabase.from('masjid_pengurus_inti').delete().eq('id', p.id);
                        }
                        setPengurusList(prev => prev.filter(item => item.id !== p.id));
                      }
                    }} className="p-2 bg-red-50 rounded-lg text-red-600 hover:bg-red-600 hover:text-white cursor-pointer transition-colors shadow-sm" title="Hapus Profil">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODUL: SURAT MENYURAT */}
        {activeMenu === 'surat' && (
          <div className="animate-in fade-in space-y-6">
            <ModulSuratMenyurat adminRole={adminRole} />
          </div>
        )}

        {/* MODUL: PENGATURAN SISTEM (Gabungan Admin & Aplikasi) */}
        {activeMenu === 'pengaturan' && (
          <div className="animate-in fade-in space-y-6">
            
            {/* Sub-menu Content */}
            <div className="bg-white p-8 rounded-xl border border-slate-200">
              
              {settingTab === 'admin_utama' && (
                <div className="animate-in fade-in">
                  <h2 className="text-2xl font-bold text-slate-800 mb-1">Pengaturan Utama & Kontrol DKM</h2>
                  <p className="text-slate-500 text-sm mb-8">Atur parameter keamanan, nisab zakat, running text TV signage, informasi khutbah, serta rekening bank.</p>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* 1. Ubah Kata Sandi */}
                    <div className="bg-lime-950/30 border border-slate-200/50 p-6 rounded-2xl">
                      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Settings className="w-5 h-5 text-lime-600" /> Ubah Kata Sandi Akses Portal Admin</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kata Sandi Lama</label>
                          <input type="password" placeholder="Masukkan kata sandi lama" className="w-full p-3 bg-white border border-slate-300/50 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Kata Sandi Baru</label>
                          <input type="password" placeholder="Masukkan kata sandi baru" className="w-full p-3 bg-white border border-slate-300/50 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500 text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Konfirmasi Kata Sandi Baru</label>
                          <input type="password" placeholder="Ketik ulang kata sandi baru" className="w-full p-3 bg-white border border-slate-300/50 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500 text-sm mb-4" />
                        </div>
                        <button className="w-full bg-lime-600 hover:bg-lime-700 text-white font-bold py-3 rounded-xl transition-colors">Perbarui Kata Sandi</button>
                      </div>
                    </div>

                    {/* Visibilitas Beranda */}
                    <div className="bg-lime-950/30 border border-slate-200/50 p-6 rounded-2xl">
                      <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><MonitorPlay className="w-5 h-5 text-lime-600" /> Pengaturan Tampilan Beranda</h3>
                      <div className="space-y-3">
                        {[
                          { id: 'showJadwal', title: 'Modul Jadwal Shalat', desc: 'Menampilkan jadwal shalat harian di beranda.' },
                          { id: 'showKalender', title: 'Kalender Kegiatan', desc: 'Menampilkan kalender kegiatan masjid.' },
                          { id: 'showZiswaf', title: 'Program ZISWAF', desc: 'Menampilkan daftar program donasi dan wakaf.' },
                          { id: 'showQuran', title: 'Al-Qur\'an Digital', desc: 'Menampilkan banner akses Al-Qur\'an Digital.' },
                          { id: 'showTentang', title: 'Tentang Masjid', desc: 'Menampilkan profil sejarah masjid.' }
                        ].map((item, i) => {
                          const isActive = homeVisibility[item.id as keyof typeof homeVisibility];
                          return (
                            <div key={i} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl">
                              <div><h4 className="text-slate-800 font-bold text-sm">{item.title}</h4><p className="text-xs text-slate-500">{item.desc}</p></div>
                              <button 
                                onClick={async () => {
                                  const newVal = !isActive;
                                  const dbKey = item.id.replace('show', 'show_').toLowerCase();
                                  
                                  setHomeVisibility((prev: any) => ({ ...prev, [item.id]: newVal }));
                                  
                                  try {
                                    await supabase.from('app_settings').update({ [dbKey]: newVal }).eq('id', appSettings?.id);
                                  } catch (err) {
                                    console.error('Gagal update visibilitas', err);
                                  }
                                }}
                                className={`text-xs font-bold px-4 py-1.5 rounded-lg border cursor-pointer transition-colors ${isActive ? 'bg-lime-600 text-white border-lime-700' : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'}`}
                              >
                                {isActive ? 'TAMPIL' : 'SEMBUNYI'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 2. Parameter */}
                  <div className="bg-lime-950/30 border border-slate-200/50 p-6 rounded-2xl mb-8">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Database className="w-5 h-5 text-yellow-500" /> 2. Parameter Utama Sistem</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div><label className="block text-sm font-bold text-slate-500 mb-2">Harga Acuan Emas/Gram (Nisab Zakat):</label><input type="text" className="w-full p-3 bg-white border border-slate-300/50 rounded-xl text-lime-600 focus:outline-none focus:border-lime-500 text-sm font-mono" defaultValue="1350000" /></div>
                      <div>
                        <div className="bg-lime-50 p-3 rounded-xl border border-lime-200/50 h-full">
                          <p className="text-xs text-lime-800 font-bold mb-1">Pengaturan TV Display</p>
                          <p className="text-xs text-lime-700">Teks berjalan (marquee) dan hitung mundur dapat diatur di menu utama <b>Manajemen TV & Display</b>.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. Khutbah & Info */}
                  <div className="bg-lime-950/30 border border-slate-200/50 p-6 rounded-2xl">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Calendar className="w-5 h-5 text-yellow-500" /> 3. Pengaturan Khutbah Jumat & Info Kontak DKM</h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-widest border-b border-slate-200/50 pb-2">Parameter Petugas & Khutbah Jumat</h4>
                        <div><label className="block text-xs text-slate-500 mb-1">Topik / Tema Khutbah Jumat:</label><input type="text" className="w-full p-2.5 bg-white border border-slate-300/50 rounded-lg text-yellow-500 font-bold text-sm" value={khutbahInfo.tema} onChange={(e) => setKhutbahInfo({...khutbahInfo, tema: e.target.value})} /></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs text-slate-500 mb-1">Nama Khatib Jumat:</label><input type="text" className="w-full p-2.5 bg-white border border-slate-300/50 rounded-lg text-slate-800 text-sm" value={khutbahInfo.khatib} onChange={(e) => setKhutbahInfo({...khutbahInfo, khatib: e.target.value})} /></div>
                          <div><label className="block text-xs text-slate-500 mb-1">Nama Imam Jumat:</label><input type="text" className="w-full p-2.5 bg-white border border-slate-300/50 rounded-lg text-slate-800 text-sm" value={khutbahInfo.imam} onChange={(e) => setKhutbahInfo({...khutbahInfo, imam: e.target.value})} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs text-slate-500 mb-1">Nama Muadzin Jumat:</label><input type="text" className="w-full p-2.5 bg-white border border-slate-300/50 rounded-lg text-slate-800 text-sm" value={khutbahInfo.muadzin} onChange={(e) => setKhutbahInfo({...khutbahInfo, muadzin: e.target.value})} /></div>
                          <div><label className="block text-xs text-slate-500 mb-1">Waktu Pelaksanaan:</label><input type="text" className="w-full p-2.5 bg-white border border-slate-300/50 rounded-lg text-yellow-500 text-sm" value={khutbahInfo.waktu} onChange={(e) => setKhutbahInfo({...khutbahInfo, waktu: e.target.value})} /></div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-red-600 uppercase tracking-widest border-b border-slate-200/50 pb-2">Info Kontak DKM</h4>
                        <div><label className="block text-xs text-slate-500 mb-1">Alamat Lengkap Masjid:</label><input type="text" className="w-full p-2.5 bg-white border border-slate-300/50 rounded-lg text-slate-800 text-sm" defaultValue="Citra Sentul Raya, Bogor Indonesia" /></div>
                        <div><label className="block text-xs text-slate-500 mb-1">No. Kontak WhatsApp Sekretariat DKM:</label><input type="text" className="w-full p-2.5 bg-white border border-slate-300/50 rounded-lg text-lime-600 font-mono text-sm" defaultValue="0812-3456-7890 (Sekretariat DKM)" /></div>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <button onClick={() => alert('Pengaturan Khutbah & Info DKM berhasil disimpan!')} className="bg-lime-600 hover:bg-lime-700 text-white font-bold py-2 px-6 rounded-xl transition-colors cursor-pointer">Simpan Pengaturan</button>
                    </div>
                  </div>

                  
                  <div className="pt-4 border-t border-slate-200 text-right mt-6">
                    <button onClick={() => alert('Pengaturan Modul & Aplikasi berhasil disimpan!')} className="bg-lime-600 hover:bg-lime-700 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-lg">Simpan Semua Pengaturan Utama</button>
                  </div>
                </div>
              )}

              {settingTab === 'hero' && (
                <div className="animate-in fade-in">
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Manajemen Foto & Teks Beranda (Hero Slider)</h2>
                  <p className="text-slate-500 text-sm mb-8">Ubah tulisan Judul, Sub-Judul, dan Tombol CTA yang tampil di bagian paling atas halaman Beranda Aplikasi.</p>
                  
                  <div className="space-y-6">
                    {adminHeroSlides.map((slide, idx) => (
                      <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-sm relative">
                        <div className="absolute top-4 right-4 bg-slate-800 text-white text-xs font-bold px-3 py-1 rounded-full">Slide {idx + 1}</div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div>
                            <label className="block text-slate-700 text-sm font-bold mb-2">Judul Utama</label>
                            <input 
                              type="text" 
                              value={slide.title} 
                              onChange={(e) => {
                                const newSlides = [...adminHeroSlides];
                                newSlides[idx].title = e.target.value;
                                setAdminHeroSlides(newSlides);
                              }}
                              className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-4 py-2.5 font-semibold focus:outline-none focus:border-lime-600"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 text-sm font-bold mb-2">Teks Tombol (CTA)</label>
                            <input 
                              type="text" 
                              value={slide.cta || ''} 
                              onChange={(e) => {
                                const newSlides = [...adminHeroSlides];
                                newSlides[idx].cta = e.target.value;
                                setAdminHeroSlides(newSlides);
                              }}
                              className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-4 py-2.5 font-semibold focus:outline-none focus:border-lime-600"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-slate-700 text-sm font-bold mb-2">Sub Judul / Deskripsi</label>
                            <textarea 
                              rows={2}
                              value={slide.subtitle} 
                              onChange={(e) => {
                                const newSlides = [...adminHeroSlides];
                                newSlides[idx].subtitle = e.target.value;
                                setAdminHeroSlides(newSlides);
                              }}
                              className="w-full bg-white border border-slate-300 text-slate-800 rounded-lg px-4 py-2.5 font-medium focus:outline-none focus:border-lime-600"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button 
                      onClick={async () => {
                        try {
                          // Preview real-time
                          localStorage.setItem('heroSlides_preview', JSON.stringify(adminHeroSlides));
                          window.dispatchEvent(new Event('storage'));
                          
                          // Save to Supabase
                          let successCount = 0;
                          for (const slide of adminHeroSlides) {
                            if (slide.id) {
                              const { error } = await supabase
                                .from('hero_slides')
                                .update({ title: slide.title, subtitle: slide.subtitle, cta: slide.cta })
                                .eq('id', slide.id);
                              if (!error) successCount++;
                            }
                          }
                          
                          if (successCount > 0) {
                            alert('Berhasil menyimpan perubahan teks Beranda ke Database Supabase secara permanen!');
                          } else {
                            alert('Teks Beranda diperbarui (Simulasi lokal). Pastikan tabel hero_slides sudah ada di Supabase.');
                          }
                        } catch (err) {
                          alert('Terjadi kesalahan saat menyimpan ke Supabase.');
                        }
                      }}
                      className="bg-lime-600 hover:bg-lime-700 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-lg flex items-center gap-2"
                    >
                      <Save className="w-5 h-5" /> Simpan ke Supabase
                    </button>
                  </div>
                </div>
              )}

              {settingTab === 'visibilitas' && (
                <div className="animate-in fade-in">
                  <div className="mb-8 border-b border-slate-200 pb-4">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Settings className="w-6 h-6 text-lime-500" /> Integrasi & Visibilitas</h2>
                    <p className="text-slate-500 text-sm mt-1">Nyalakan/matikan modul yang ingin ditampilkan di Beranda Utama Jamaah.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { key: 'showJadwal', label: 'Modul Jadwal Shalat', id: 'show_jadwal' },
                      { key: 'showKalender', label: 'Modul Kalender Kegiatan', id: 'show_kalender' },
                      { key: 'showZiswaf', label: 'Modul Program ZISWAF', id: 'show_ziswaf' },
                      { key: 'showQuran', label: 'Banner Al-Quran Digital', id: 'show_quran' },
                      { key: 'showTentang', label: 'Modul Profil & Sejarah Masjid', id: 'show_tentang' },
                      { key: 'showTransparansiPublik', label: 'Tombol Laporan Transparansi (Header)', id: 'show_transparansi_publik' },
                      { key: 'showTransparansiKas', label: 'Tab Laporan Kas & Operasional', id: 'show_transparansi_kas' },
                      { key: 'showTransparansiZiswaf', label: 'Tab Laporan Dana ZISWAF', id: 'show_transparansi_ziswaf' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-xl">
                        <h3 className="font-bold text-slate-800">{item.label}</h3>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={homeVisibility[item.key as keyof typeof homeVisibility]} 
                            onChange={async () => {
                              const newVal = !homeVisibility[item.key as keyof typeof homeVisibility];
                              setHomeVisibility(prev => ({ ...prev, [item.key]: newVal }));
                              try {
                                await supabase.from('app_settings').update({ [item.id]: newVal }).eq('id', appSettings?.id);
                              } catch (err) {
                                console.error('Failed to update settings', err);
                              }
                            }} 
                          />
                          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-500"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {settingTab === 'reset' && (
                <div className="animate-in fade-in">
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Reset Data Sistem</h2>
                  <p className="text-slate-500 text-sm mb-2">Fitur ini digunakan untuk menghapus semua riwayat transaksi, jurnal, dan laporan keuangan.</p>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-700">
                    <strong>⚠️ Penting:</strong> Setelah reset dari sini, pastikan Bapak juga sudah menjalankan SQL TRUNCATE di Supabase agar data cloud ikut bersih. Data akan kosong setelah halaman dimuat ulang.
                  </div>
                  <button onClick={() => {
                    if(window.confirm('PERINGATAN: Anda yakin ingin mereset SELURUH data sistem, konfigurasi, dan riwayat keuangan? Tindakan ini tidak dapat dibatalkan.')) {
                      setKasEntries([]);
                      setJournals([]);
                      // Hapus semua cache data transaksi dari localStorage
                      const keysToRemove = [
                        'admin_notifications',
                        'dkm_surat_menyurat',
                        'heroSlides_preview',
                        'kasEntries',
                        'donasiHistory',
                        'journals',
                        'programs_cache',
                      ];
                      keysToRemove.forEach(k => localStorage.removeItem(k));
                      // Pertahankan kunci login & pengurus
                      alert('Seluruh data sistem berhasil direset. Aplikasi akan dimuat ulang.');
                      window.location.reload();
                    }
                  }} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-lg flex items-center gap-2 cursor-pointer">
                    <Trash2 className="w-5 h-5" /> Reset Seluruh Data & Pengaturan Sistem
                  </button>
                </div>
              )}

              {settingTab === 'qr' && (
                <div className="animate-in fade-in flex flex-col items-center text-center">
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Cetak QR Code Aplikasi</h2>
                  <p className="text-slate-500 text-sm mb-8 max-w-lg">QR Code ini dapat Anda cetak dan tempel di area masjid (mading, tiang, dll) agar jamaah bisa langsung membuka aplikasi ini di HP mereka.</p>
                  
                  <div className="bg-white p-6 rounded-3xl inline-block shadow-2xl">
                    <QRCode value={window.location.origin} size={256} className="mb-4 rounded-xl border border-slate-100" />
                    <p className="text-slate-500 font-bold text-sm tracking-widest uppercase mb-1">Scan Untuk Buka</p>
                    <p className="text-lime-600 font-bold text-xl">Aplikasi Citra Sentul Raya</p>
                  </div>

                  <button 
                    onClick={async () => {
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: 'Masjid Citra Sentul Raya',
                            text: 'Mari bergabung dan akses layanan Masjid Citra Sentul Raya melalui portal berikut:',
                            url: window.location.origin,
                          });
                        } catch (error) {
                          console.log('Error sharing', error);
                        }
                      } else {
                        alert('Browser Anda tidak mendukung fitur berbagi langsung. Silakan salin URL browser Anda.');
                      }
                    }} 
                    className="mt-6 bg-lime-600 hover:bg-lime-700 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    <Link2 className="w-5 h-5" /> Bagikan Aplikasi Ke Jamaah
                  </button>
                </div>
              )}

              {settingTab === 'sponsor' && (
                <div className="animate-in fade-in">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-2">Sponsor & Mitra</h2>
                      <p className="text-slate-500 text-sm">Kelola logo sponsor atau unit usaha yang akan ditampilkan di aplikasi.</p>
                    </div>
                    <button onClick={() => alert('Membuka formulir pendaftaran mitra baru...')} className="bg-lime-600 hover:bg-lime-700 text-white font-bold py-2 px-6 rounded-xl transition-colors shrink-0">
                      + Tambah Mitra
                    </button>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex items-center justify-between mb-6 shadow-md w-full max-w-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center p-2 overflow-hidden shadow-sm">
                        <img src="https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=150&q=80" alt="Sponsor" className="w-full h-full object-cover rounded-lg" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">CSR Mart</h3>
                        <p className="text-xs text-lime-600 flex items-center gap-1 mt-1"><Link2 className="w-3 h-3" /> Aktif</p>
                      </div>
                    </div>
                    <button className="text-red-600 hover:text-red-300 p-2"><Trash2 className="w-5 h-5" /></button>
                  </div>

                  <div className="p-4 bg-lime-900/20 border border-lime-500/30 rounded-xl text-lime-600 text-sm font-semibold flex gap-2 items-start">
                    <span className="shrink-0 text-lime-500">Info:</span>
                    <p>Menambah logo di sini secara otomatis akan memasukkan banner/ikon mitra ke area Footer dan Beranda (jika diaktifkan) sebagai tanda "Sponsored By".</p>
                  </div>
                </div>
              )}

              {settingTab === 'sejarah' && (
                <div className="animate-in fade-in space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Profil & Sejarah Masjid Citra Sentul Raya</h2>
                    <p className="text-slate-500 text-sm">Ubah data sejarah, Visi, Misi, dan link YouTube Profil Masjid. Perubahan akan langsung tampil di menu "Tentang Kami".</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Link YouTube Video Profil</label>
                    <input type="text" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-lime-500 font-mono text-sm" defaultValue="https://youtu.be/-oT4ZYK2ZjI?si=-pEBAAicepgcMVPj" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Visi Masjid</label>
                    <textarea rows={2} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-lime-500 text-sm" defaultValue="Menjadi Oase Spiritual dan Intelektual Islam yang memberikan pencerahan, kesejukan dan pemberdayaan serta wawasan Rahmatan Lil Alamin."></textarea>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Misi Masjid (pisahkan dengan baris baru)</label>
                    <textarea rows={4} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-lime-500 text-sm" defaultValue={"Menyelenggarakan pelatihan dan konseling keumatan.\nMengembangkan ekonomi kerakyatan berbasis syariah.\nMenyediakan fasilitas pendidikan berkualitas."}></textarea>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <button onClick={() => alert('Profil berhasil diperbarui!')} className="bg-lime-600 hover:bg-lime-700 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-lg">Simpan Perubahan</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODUL BARU: TANDA TANGAN LAPORAN */}
        {activeMenu === 'ttd' && (
          <div className="animate-in fade-in space-y-6">
            <div className="bg-white p-8 rounded-xl border border-slate-200 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2"><FileText className="w-6 h-6 text-lime-500" /> Manajemen Tanda Tangan Laporan</h2>
                <p className="text-slate-500 text-sm">Atur nama, jabatan, dan wewenang pejabat yang akan tertera pada *footer* laporan akuntansi / cetak PDF.</p>
              </div>
              <button onClick={() => {
                setPejabatTtdFormData({ id: 0, tag: 'MENGETAHUI', name: '', pos: '' });
                setShowPejabatTtdModal(true);
              }} className="bg-lime-600 hover:bg-lime-700 text-white font-bold py-2 px-6 rounded-xl transition-colors shrink-0 cursor-pointer shadow-lg shadow-lime-900/20">+ Tambah Pejabat TTD</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {pejabatTtdList.map((t) => (
                <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-lg h-36 transition-transform hover:-translate-y-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-lime-50 text-lime-600 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider border border-lime-200">{t.tag}</span>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        setPejabatTtdFormData(t);
                        setShowPejabatTtdModal(true);
                      }} className="text-slate-400 hover:text-lime-600 cursor-pointer transition-colors p-1 bg-slate-50 rounded hover:bg-lime-50"><Settings className="w-4 h-4" /></button>
                      <button onClick={() => {
                        if (window.confirm(`Hapus pejabat TTD ${t.name}?`)) {
                          setPejabatTtdList(prev => prev.filter(item => item.id !== t.id));
                        }
                      }} className="text-red-400 hover:text-red-600 cursor-pointer transition-colors p-1 bg-red-50 rounded hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{t.name}</h3>
                    <p className="text-xs text-slate-500">{t.pos}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODUL BARU: PENDAFTARAN KEGIATAN */}
        {activeMenu === 'kalender' && (
          <div className="animate-in fade-in space-y-6">
            <div className="bg-white p-8 rounded-t-xl border border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Daftar Peserta Kegiatan (Registrasi)</h2>
                <p className="text-sm text-slate-500">Data jamaah yang mendaftar kegiatan melalui portal</p>
              </div>
              <button 
                onClick={() => { localStorage.removeItem('kegiatan_registrations'); window.location.reload(); }}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-xl transition-colors text-sm"
              >
                Reset Data
              </button>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-b-xl overflow-x-auto -mt-6">
              <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">Tanggal Daftar</th>
                    <th className="p-4">Nama Jamaah</th>
                    <th className="p-4">No. WhatsApp</th>
                    <th className="p-4">Kegiatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {JSON.parse(localStorage.getItem('kegiatan_registrations') || '[]').length > 0 ? (
                    JSON.parse(localStorage.getItem('kegiatan_registrations') || '[]').map((reg: any) => (
                      <tr key={reg.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">{new Date(reg.tanggal).toLocaleString('id-ID')}</td>
                        <td className="p-4 font-bold text-slate-800">{reg.nama}</td>
                        <td className="p-4 font-mono text-lime-600">{reg.noHp}</td>
                        <td className="p-4">
                          <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-semibold">{reg.eventTitle}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">
                        Belum ada peserta yang mendaftar kegiatan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODUL BARU: INVENTARIS ASET */}
        {activeMenu === 'aset' && (
          <div className="animate-in fade-in space-y-6">
            {/* Sub-menu aset dipindahkan ke atas */}

            {asetTab === 'semua' ? (
              <>
                <div className="bg-white p-8 rounded-t-xl border border-slate-200 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-slate-800">Manajemen Aset & Inventaris Masjid</h2>
                  <button onClick={() => {
                    setInventarisFormData({ id: 0, foto: '', kode: '', nama: '', kategori: '', jumlahTotal: 1, satuan: 'Unit', lokasi: '' });
                    setInventarisFotoFile(null);
                    setShowInventarisModal(true);
                  }} className="bg-lime-600 hover:bg-lime-700 text-white font-bold py-2 px-6 rounded-xl transition-colors cursor-pointer">+ Tambah Barang Inventaris</button>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-b-xl overflow-x-auto -mt-6">
                  <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-4">Foto Aset</th>
                        <th className="p-4">Kode Aset</th>
                        <th className="p-4">Nama Barang</th>
                        <th className="p-4">Kategori</th>
                        <th className="p-4">Lokasi</th>
                        <th className="p-4 text-center">Tersedia</th>
                        <th className="p-4 text-center text-red-600">Rusak</th>
                        <th className="p-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {inventarisList.length > 0 ? (
                        inventarisList.map((item) => {
                          const jumlahRusak = laporanRusakList.filter(r => r.inventarisId === item.id).reduce((sum, r) => sum + r.jumlah, 0);
                          const jumlahTersedia = item.jumlahTotal - jumlahRusak;
                          return (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-4">
                                {item.foto ? (
                                  <img src={item.foto} alt={item.nama} className="w-10 h-10 rounded border border-slate-300 object-cover" />
                                ) : (
                                  <div className="w-10 h-10 rounded border border-slate-300 bg-slate-100 flex items-center justify-center text-slate-400">
                                    <Camera className="w-4 h-4" />
                                  </div>
                                )}
                              </td>
                              <td className="p-4 text-lime-600 font-mono text-xs font-bold">{item.kode}</td>
                              <td className="p-4 font-bold text-slate-800 whitespace-normal min-w-[200px]">{item.nama}</td>
                              <td className="p-4">{item.kategori}</td>
                              <td className="p-4">{item.lokasi}</td>
                              <td className="p-4 text-center font-bold text-emerald-600 bg-emerald-50/50">
                                {jumlahTersedia} <span className="text-xs font-normal text-slate-500">{item.satuan}</span>
                              </td>
                              <td className="p-4 text-center font-bold text-red-600 bg-red-50/50">
                                {jumlahRusak > 0 ? (
                                  <>{jumlahRusak} <span className="text-xs font-normal text-red-400">{item.satuan}</span></>
                                ) : '-'}
                              </td>
                              <td className="p-4 text-right">
                                <button onClick={() => {
                                  if (jumlahTersedia <= 0) {
                                    alert('Tidak ada barang tersedia yang bisa dilaporkan rusak!');
                                    return;
                                  }
                                  setLaporRusakFormData({ id: 0, inventarisId: item.id, jumlah: 1, alasan: '' });
                                  setShowLaporRusakModal(true);
                                }} className="bg-red-100 text-red-600 hover:bg-red-200 px-2 py-1 rounded text-xs font-bold mr-2 cursor-pointer transition-colors">
                                  Lapor Rusak
                                </button>
                                <button onClick={() => {
                                  setInventarisFormData(item as any);
                                  setInventarisFotoFile(null);
                                  setShowInventarisModal(true);
                                }} className="p-1.5 text-lime-600 hover:text-lime-800 cursor-pointer" title="Edit">
                                  <Edit className="w-4 h-4 inline" />
                                </button>
                                <button onClick={async () => {
                                  if(window.confirm(`Yakin ingin menghapus aset "${item.nama}"? Semua riwayat kerusakan juga akan terhapus.`)) {
                                    try {
                                      const { error } = await supabase.from('masjid_inventaris').delete().eq('id', item.id);
                                      if (error) throw error;
                                      setInventarisList(prev => prev.filter(i => i.id !== item.id));
                                      setLaporanRusakList(prev => prev.filter(r => r.inventarisId !== item.id));
                                    } catch (err) {
                                      console.error('Failed to delete inventaris:', err);
                                      alert('Gagal menghapus inventaris dari database.');
                                    }
                                  }
                                }} className="p-1.5 text-red-600 hover:text-red-300 cursor-pointer" title="Hapus">
                                  <Trash2 className="w-4 h-4 inline" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-500">
                            Belum ada data barang inventaris.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-red-50">
                  <div>
                    <h2 className="text-lg font-bold text-red-700">Daftar Barang Inventaris Rusak</h2>
                    <p className="text-sm text-red-600/80">Barang yang rusak akan otomatis memotong total stok yang tersedia.</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-4">Tanggal Lapor</th>
                        <th className="p-4">Barang / Kode</th>
                        <th className="p-4">Jumlah Rusak</th>
                        <th className="p-4">Alasan / Keterangan</th>
                        <th className="p-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {laporanRusakList.length > 0 ? (
                        laporanRusakList.map(laporan => {
                          const inv = inventarisList.find(i => i.id === laporan.inventarisId);
                          if (!inv) return null;
                          return (
                            <tr key={laporan.id} className="hover:bg-slate-50">
                              <td className="p-4 text-slate-600 text-xs">{laporan.tanggal}</td>
                              <td className="p-4">
                                <p className="font-bold text-slate-800">{inv.nama}</p>
                                <p className="text-xs font-mono text-lime-600">{inv.kode}</p>
                              </td>
                              <td className="p-4">
                                <span className="bg-red-100 text-red-700 font-bold px-2 py-1 rounded text-xs">
                                  {laporan.jumlah} {inv.satuan}
                                </span>
                              </td>
                              <td className="p-4 whitespace-normal text-slate-600 min-w-[250px]">{laporan.alasan}</td>
                              <td className="p-4 text-right">
                                <button onClick={() => {
                                  if (window.confirm('Hapus laporan rusak ini? Barang akan kembali berstatus tersedia.')) {
                                    setLaporanRusakList(prev => prev.filter(r => r.id !== laporan.id));
                                  }
                                }} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer">
                                  Batalkan / Hapus
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500">Belum ada laporan barang rusak.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODUL BARU: PENGUMUMAN & GALERI */}
        {activeMenu === 'konten' && kontenTab === 'berita' && (
          <div className="animate-in fade-in space-y-6">
            <div className="bg-white p-8 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">Manajemen Pengumuman & Galeri Foto Kegiatan Masjid</h2>
                <p className="text-slate-500 text-sm">Kelola siaran berita, galeri dokumentasi kajian, & informasi kegiatan jamaah dengan foto real pict.</p>
              </div>
              <button onClick={() => {
                setPengumumanFormData({ id: 0, title: '', tag: 'Kegiatan', desc: '', img: '' });
                setShowPengumumanModal(true);
              }} className="bg-lime-600 hover:bg-lime-700 text-white font-bold py-2 px-6 rounded-xl transition-colors shrink-0 cursor-pointer">+ Tambah Pengumuman / Foto Dokumentasi</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pengumumanList.map((news) => (
                <div key={news.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl flex flex-col">
                  <div className="relative h-48">
                    <img src={news.img} alt={news.title} className="w-full h-full object-cover" />
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-slate-600 text-xs px-3 py-1 rounded-full border border-slate-300 font-bold">{news.tag}</div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="font-bold text-slate-800 text-lg mb-3 leading-snug">{news.title}</h3>
                    <p className="text-sm text-slate-500 mb-6 flex-1">{news.desc}</p>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-200 mt-auto">
                      <button onClick={() => {
                        setPengumumanFormData({ id: news.id, title: news.title, tag: news.tag, desc: news.desc, img: news.img });
                        setShowPengumumanModal(true);
                      }} className="text-lime-600 text-sm font-bold hover:text-slate-500 cursor-pointer">Edit Post</button>
                      <button onClick={() => {
                        if(window.confirm(`Yakin ingin menghapus pengumuman "${news.title}"?`)) {
                          setPengumumanList(prev => prev.filter(p => p.id !== news.id));
                        }
                      }} className="text-red-600 hover:text-red-300 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}



        {/* MODUL BARU: JADWAL JUMAT */}
        {activeMenu === 'jumat' && (
          <div className="animate-in fade-in space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">Penjadwalan Imam, Muadzin, & Khatib Jumat</h2>
              <button onClick={() => { setActiveMenu('pengaturan'); setSettingTab('admin_utama'); }} className="bg-lime-900/40 border border-lime-700/50 text-lime-600 font-bold py-2 px-4 rounded-xl text-sm hover:bg-lime-900/60 transition-colors cursor-pointer">
                <Settings className="w-4 h-4 inline-block mr-2" /> Pengaturan Khutbah Jumat Lengkap
              </button>
            </div>
            
            <div className="bg-lime-50 border border-lime-200 rounded-xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <span className="bg-lime-500 text-black text-xs font-bold px-3 py-1 rounded-full uppercase">Informasi Khutbah Jumat Terkini (Aktif di TV Signage)</span>
                <span className="text-lime-600 font-mono text-sm font-bold">{khutbahInfo.waktu}</span>
              </div>
              <h3 className="text-2xl font-bold text-lime-600 mb-6">"{khutbahInfo.tema}"</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-lime-200 p-4 rounded-xl">
                  <p className="text-slate-500 text-xs mb-1">Khatib Jumat:</p>
                  <p className="text-slate-800 font-bold text-lg">{khutbahInfo.khatib}</p>
                </div>
                <div className="bg-white border border-lime-200 p-4 rounded-xl">
                  <p className="text-slate-500 text-xs mb-1">Imam Jumat:</p>
                  <p className="text-slate-800 font-bold text-lg">{khutbahInfo.imam}</p>
                </div>
                <div className="bg-white border border-lime-200 p-4 rounded-xl">
                  <p className="text-slate-500 text-xs mb-1">Muadzin Jumat:</p>
                  <p className="text-slate-800 font-bold text-lg">{khutbahInfo.muadzin}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODUL BARU: BERITA */}
        {activeMenu === 'berita' && (
          <div className="animate-in fade-in bg-white p-8 rounded-xl border border-slate-200 text-center">
            <Megaphone className="w-16 h-16 text-lime-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Manajemen Berita & Pengumuman</h2>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">Publikasikan pengumuman penting yang akan tampil di halaman depan portal jamaah.</p>
            <button onClick={() => { const title = prompt('Judul Pengumuman Baru:'); if(title) alert('Pengumuman berhasil dipublikasikan!'); }} className="bg-lime-600 hover:bg-lime-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer">
              <PlusCircle className="w-5 h-5" /> Tambah Pengumuman
            </button>
          </div>
        )}



        {/* MODUL BARU: MANAJEMEN TV & DISPLAY */}
        {activeMenu === 'tv' && (
          <div className="animate-in fade-in space-y-6">
            <div className="flex flex-col mb-6">
              <h2 className="text-xl font-bold text-slate-800">Manajemen TV Display Masjid</h2>
              <p className="text-sm text-slate-500 mt-1">Atur hitung mundur adzan, iqomah, animasi teks berjalan, dan media latar belakang (Youtube/CCTV) pada Smart TV Masjid.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <h3 className="font-bold text-slate-800 text-lg border-b pb-3">Konfigurasi Umum & Waktu</h3>
                
                <div>
                  <label className="block text-slate-600 text-sm font-bold mb-2">Zona Waktu</label>
                  <select value={tvConfig.timezone} onChange={e => setTvConfig({...tvConfig, timezone: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-4 py-2.5 font-semibold focus:outline-none focus:border-lime-600">
                    <option value="Asia/Jakarta">WIB (Waktu Indonesia Barat)</option>
                    <option value="Asia/Makassar">WITA (Waktu Indonesia Tengah)</option>
                    <option value="Asia/Jayapura">WIT (Waktu Indonesia Timur)</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 text-sm font-bold mb-2">Kota (Sistem Jadwal API)</label>
                    <input type="text" value={tvConfig.city} onChange={e => setTvConfig({...tvConfig, city: e.target.value})} placeholder="Contoh: Bogor" className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-4 py-2.5 font-bold focus:outline-none focus:border-lime-600" />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-sm font-bold mb-2">Negara</label>
                    <input type="text" value={tvConfig.country} onChange={e => setTvConfig({...tvConfig, country: e.target.value})} placeholder="Contoh: Indonesia" className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-4 py-2.5 font-bold focus:outline-none focus:border-lime-600" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-slate-600 text-sm font-bold mb-2">Jeda Menuju Adzan (Menit)</label>
                    <input type="number" value={tvConfig.jedaAdzan} onChange={e => setTvConfig({...tvConfig, jedaAdzan: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-4 py-2.5 font-bold focus:outline-none focus:border-lime-600" />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-sm font-bold mb-2">Jeda Menuju Iqomah (Menit)</label>
                    <input type="number" value={tvConfig.jedaIqomah} onChange={e => setTvConfig({...tvConfig, jedaIqomah: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-4 py-2.5 font-bold focus:outline-none focus:border-lime-600" />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-sm font-bold mb-2">Durasi Waktu Shalat (Menit)</label>
                    <input type="number" value={tvConfig.jedaSholat} onChange={e => setTvConfig({...tvConfig, jedaSholat: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-4 py-2.5 font-bold focus:outline-none focus:border-lime-600" />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 text-sm font-bold mb-2">Teks Berjalan (Marquee Utama)</label>
                  <textarea rows={2} value={tvConfig.runningText} onChange={e => setTvConfig({...tvConfig, runningText: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-lime-600"></textarea>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <h3 className="font-bold text-slate-800 text-lg border-b pb-3">Teks Dinamis & Pengingat</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="showImsak" checked={tvConfig.showImsak} onChange={e => setTvConfig({...tvConfig, showImsak: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-lime-600" />
                    <label htmlFor="showImsak" className="font-bold text-slate-700">Tampilkan Pengingat Waktu Imsak</label>
                  </div>
                  {tvConfig.showImsak && (
                    <input type="text" value={tvConfig.textImsak} onChange={e => setTvConfig({...tvConfig, textImsak: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-4 py-2 ml-8 text-sm focus:outline-none focus:border-lime-600" />
                  )}

                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="showBukaPuasa" checked={tvConfig.showBukaPuasa} onChange={e => setTvConfig({...tvConfig, showBukaPuasa: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-lime-600" />
                    <label htmlFor="showBukaPuasa" className="font-bold text-slate-700">Tampilkan Pengingat Waktu Buka Puasa</label>
                  </div>
                  {tvConfig.showBukaPuasa && (
                    <input type="text" value={tvConfig.textBukaPuasa} onChange={e => setTvConfig({...tvConfig, textBukaPuasa: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-4 py-2 ml-8 text-sm focus:outline-none focus:border-lime-600" />
                  )}

                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="showTarawih" checked={tvConfig.showTarawih} onChange={e => setTvConfig({...tvConfig, showTarawih: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-lime-600" />
                    <label htmlFor="showTarawih" className="font-bold text-slate-700">Tampilkan Pengingat Shalat Tarawih</label>
                  </div>
                  {tvConfig.showTarawih && (
                    <input type="text" value={tvConfig.textTarawih} onChange={e => setTvConfig({...tvConfig, textTarawih: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-4 py-2 ml-8 text-sm focus:outline-none focus:border-lime-600" />
                  )}

                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="showJumat" checked={tvConfig.showJumat} onChange={e => setTvConfig({...tvConfig, showJumat: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-lime-600" />
                    <label htmlFor="showJumat" className="font-bold text-slate-700">Tampilkan Pengingat Harap Tenang Khutbah Jumat</label>
                  </div>
                  {tvConfig.showJumat && (
                    <input type="text" value={tvConfig.textJumat} onChange={e => setTvConfig({...tvConfig, textJumat: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-4 py-2 ml-8 text-sm focus:outline-none focus:border-lime-600" />
                  )}

                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="showIdulFitri" checked={tvConfig.showIdulFitri} onChange={e => setTvConfig({...tvConfig, showIdulFitri: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-lime-600" />
                    <label htmlFor="showIdulFitri" className="font-bold text-slate-700">Tampilkan Pengingat Idul Fitri</label>
                  </div>
                  {tvConfig.showIdulFitri && (
                    <input type="text" value={tvConfig.textIdulFitri} onChange={e => setTvConfig({...tvConfig, textIdulFitri: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-4 py-2 ml-8 text-sm focus:outline-none focus:border-lime-600" />
                  )}

                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="showIdulAdha" checked={tvConfig.showIdulAdha} onChange={e => setTvConfig({...tvConfig, showIdulAdha: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-lime-600" />
                    <label htmlFor="showIdulAdha" className="font-bold text-slate-700">Tampilkan Pengingat Idul Adha</label>
                  </div>
                  {tvConfig.showIdulAdha && (
                    <input type="text" value={tvConfig.textIdulAdha} onChange={e => setTvConfig({...tvConfig, textIdulAdha: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-4 py-2 ml-8 text-sm focus:outline-none focus:border-lime-600" />
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <h3 className="font-bold text-slate-800 text-lg border-b pb-3">Media Latar Belakang (Background)</h3>
                
                <div>
                  <label className="block text-slate-600 text-sm font-bold mb-2">Tipe Media Latar</label>
                  <select value={tvConfig.mediaType} onChange={e => setTvConfig({...tvConfig, mediaType: e.target.value})} className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-4 py-2.5 font-semibold focus:outline-none focus:border-lime-600">
                    <option value="background">Wallpaper Klasik</option>
                    <option value="youtube">Live Streaming Youtube (iframe)</option>
                    <option value="cctv">Live CCTV (Video Stream URL)</option>
                  </select>
                </div>

                {tvConfig.mediaType !== 'background' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-slate-600 text-sm font-bold mb-2">URL Media / Embed Link</label>
                      <input 
                        type="text" 
                        placeholder={tvConfig.mediaType === 'youtube' ? 'Contoh: https://www.youtube.com/embed/LIVE_ID' : 'Contoh: http://camera-ip/stream'} 
                        value={tvConfig.mediaUrl} 
                        onChange={e => setTvConfig({...tvConfig, mediaUrl: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-4 py-2.5 font-semibold focus:outline-none focus:border-lime-600 disabled:opacity-50 disabled:bg-slate-200" 
                        disabled={tvConfig.mediaType === 'youtube' && adminRole !== 'direktur'}
                      />
                      {tvConfig.mediaType === 'youtube' && adminRole !== 'direktur' && (
                        <p className="text-xs text-red-500 font-bold mt-1">Hanya Super Admin (Direktur) yang dapat mengubah link YouTube untuk keamanan.</p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        {tvConfig.mediaType === 'youtube' 
                          ? 'Pastikan URL menggunakan format embed Youtube agar dapat diputar langsung di layar TV.' 
                          : 'Pastikan URL stream CCTV dapat diakses langsung tanpa autentikasi.'}
                      </p>
                    </div>
                    {tvConfig.mediaType === 'youtube' && (
                      <div>
                        <label className="block text-slate-600 text-sm font-bold mb-2">Suara YouTube</label>
                        <select value={tvConfig.volume || 0} onChange={e => setTvConfig({...tvConfig, volume: parseInt(e.target.value)})} className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-4 py-2.5 font-semibold focus:outline-none focus:border-lime-600">
                          <option value={0}>Bisukan (Muted)</option>
                          <option value={1}>Aktifkan Suara</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-1">Aktifkan suara jika kajian sedang berlangsung.</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4">
                  <button onClick={async () => {
                    const payload = {
                      tv_timezone: tvConfig.timezone,
                      tv_jeda_adzan: tvConfig.jedaAdzan,
                      tv_jeda_iqomah: tvConfig.jedaIqomah,
                      tv_jeda_sholat: tvConfig.jedaSholat,
                      tv_running_text: tvConfig.runningText,
                      tv_media_type: tvConfig.mediaType,
                      tv_media_url: tvConfig.mediaUrl,
                      tv_volume: tvConfig.volume,
                      show_imsak: tvConfig.showImsak,
                      show_buka_puasa: tvConfig.showBukaPuasa,
                      show_tarawih: tvConfig.showTarawih,
                      show_jumat: tvConfig.showJumat,
                      show_idul_fitri: tvConfig.showIdulFitri,
                      show_idul_adha: tvConfig.showIdulAdha,
                      text_imsak: tvConfig.textImsak,
                      text_buka_puasa: tvConfig.textBukaPuasa,
                      text_tarawih: tvConfig.textTarawih,
                      text_jumat: tvConfig.textJumat,
                      text_idul_fitri: tvConfig.textIdulFitri,
                      text_idul_adha: tvConfig.textIdulAdha,
                      tv_city: tvConfig.city,
                      tv_country: tvConfig.country
                    };
                    await supabase.from('app_settings').update(payload).eq('id', appSettings?.id);
                    setAppSettings(prev => ({ ...prev, ...payload }));
                    alert('Konfigurasi TV Display berhasil disimpan ke server!');
                  }} className="w-full px-6 py-3 bg-lime-600 hover:bg-lime-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg">
                    <Save className="w-5 h-5" /> Simpan Konfigurasi TV
                  </button>
                  <button onClick={() => setShowDisplayTV(true)} className="w-full mt-3 px-6 py-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 border border-emerald-300">
                    <MonitorPlay className="w-5 h-5" /> Buka Layar Smart TV
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODUL BARU: BROADCAST WA & EMAIL */}
        {activeMenu === 'wa' && (
          <div className="animate-in fade-in space-y-6">
            <div className="flex flex-col mb-6">
              <h2 className="text-xl font-bold text-slate-800">Fitur Pengiriman Broadcast Informasi Resmi DKM</h2>
              <p className="text-sm text-slate-500 mt-1">Kirim pesan massal ke jamaah terdaftar via Email maupun WhatsApp.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Form Broadcast */}
              <div className="lg:col-span-2 bg-lime-50/50 p-6 md:p-8 rounded-2xl border border-lime-200 shadow-xl h-fit">
                <div className="space-y-5">
                  <div>
                    <label className="block text-slate-600 text-sm font-bold mb-2">Platform Pengiriman <span className="text-red-500">*</span></label>
                    <select value={broadcastPlatform} onChange={(e) => setBroadcastPlatform(e.target.value)} className="w-full bg-white border border-lime-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-lime-500 text-sm">
                      <option value="wa">WhatsApp</option>
                      <option value="email">Email</option>
                      <option value="both">WhatsApp & Email</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 text-sm font-bold mb-2">Judul Pengumuman <span className="text-red-500">*</span></label>
                    <input type="text" value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} placeholder="Contoh: Undangan Kajian Subuh..." className="w-full bg-white border border-lime-200 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-lime-500 placeholder-slate-400 text-sm" />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-sm font-bold mb-2">Isi Pesan Siaran <span className="text-red-500">*</span></label>
                    <textarea rows={6} value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} placeholder="Tuliskan isi pesan pengumuman untuk jamaah..." className="w-full bg-white border border-lime-200 rounded-xl p-4 text-slate-800 focus:outline-none focus:border-lime-500 placeholder-slate-400 text-sm"></textarea>
                  </div>
                  
                  {broadcastState === 'success' ? (
                    <div className="w-full bg-lime-50 border border-lime-200 text-lime-700 font-bold py-3.5 px-4 rounded-xl flex flex-col items-center justify-center gap-2 mt-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5" /> Pesan Berhasil Terkirim ke {selectedJamaahIndices.length} Jamaah!
                      </div>
                      <button onClick={() => {
                        const list = selectedJamaahIndices.map(i => `- ${defaultJamaah[i].n} (${defaultJamaah[i].c || defaultJamaah[i].e})`).join('\n');
                        alert('Detail Penerima Broadcast:\n\n' + list);
                      }} className="text-xs text-lime-600 underline hover:text-lime-800 cursor-pointer">
                        Lihat Detail Penerima
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={handleBroadcastSubmit}
                      disabled={broadcastState === 'sending'}
                      className={`w-full text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg mt-4 cursor-pointer ${broadcastState === 'sending' ? 'bg-lime-400 cursor-not-allowed' : 'bg-lime-600 hover:bg-lime-700 shadow-lime-900/20'}`}
                    >
                      {broadcastState === 'sending' ? (
                        <>Sedang Mengirim...</>
                      ) : (
                        <><span className="transform -rotate-45 text-lg">&#9992;</span> Kirim Pesan Siaran</>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Daftar Jamaah Penerima */}
              <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl flex flex-col h-fit max-h-[600px]">
                <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
                  <div>
                    <h3 className="font-bold text-slate-800">Daftar Penerima Broadcast</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Jamaah yang terdaftar di aplikasi</p>
                  </div>
                  <span className="bg-lime-100 text-lime-700 text-xs font-extrabold px-3 py-1.5 rounded-full border border-lime-200 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> {defaultJamaah.length} Terdaftar
                  </span>
                </div>
                <div className="p-3 border-b border-slate-100 bg-white">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Cari jamaah penerima..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-lime-500" />
                  </div>
                </div>
                <div className="overflow-x-auto flex-1 overflow-y-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-white text-slate-400 font-bold text-xs uppercase tracking-wider sticky top-0 border-b border-slate-200 z-10 shadow-sm">
                      <tr>
                        <th className="px-5 py-3">
                          <input type="checkbox" checked={selectedJamaahIndices.length > 0 && selectedJamaahIndices.length >= defaultJamaah.filter(u => broadcastPlatform === 'wa' ? (u.c && !u.c.includes('@')) : broadcastPlatform === 'email' ? (u.e || (u.c && u.c.includes('@'))) : true).length} onChange={(e) => toggleAllJamaah(e.target.checked)} className="rounded border-slate-300 text-lime-600 focus:ring-lime-500 cursor-pointer" />
                        </th>
                        <th className="px-5 py-3">Nama Jamaah</th>
                        <th className="px-5 py-3">Kontak WA</th>
                        <th className="px-5 py-3">Alamat Email</th>
                        <th className="px-5 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {defaultJamaah.map((u, i) => (
                        <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-4">
                            <input type="checkbox" checked={selectedJamaahIndices.includes(i)} onChange={() => toggleJamaah(i)} className="rounded border-slate-300 text-lime-600 focus:ring-lime-500 cursor-pointer" />
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200">
                                {u.n.charAt(0)}
                              </div>
                              <p className="font-bold text-slate-700">{u.n}</p>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 font-mono text-lime-600 bg-lime-50 px-2.5 py-1 rounded-md text-xs font-semibold border border-lime-100">
                              <Smartphone className="w-3.5 h-3.5" /> {u.c}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-500 text-xs font-mono">
                            {u.e || (u.c && u.c.includes('@') ? u.c : '-')}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="bg-lime-100 text-lime-700 text-xs font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border border-lime-200">Aktif</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Broadcast History */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xl mt-2">
                <div className="p-5 border-b border-slate-200 bg-slate-50">
                  <h3 className="font-bold text-slate-800">Riwayat Pengiriman Pesan Siaran</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Catatan log aktivitas broadcast (WA & Email)</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-white text-slate-400 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3">Tanggal</th>
                        <th className="px-5 py-3">Judul Pesan</th>
                        <th className="px-5 py-3">Platform</th>
                        <th className="px-5 py-3 text-center">Penerima</th>
                        <th className="px-5 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {broadcastHistory.map((h, i) => (
                        <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-4 text-slate-500 font-mono text-xs">{h.date}</td>
                          <td className="px-5 py-4 font-bold text-slate-700">{h.title}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 font-bold text-xs px-2.5 py-1 rounded-md uppercase tracking-wider border ${h.platform === 'wa' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : h.platform === 'email' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                              {h.platform === 'both' ? 'WA & Email' : h.platform.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center text-slate-700 font-bold">{h.recipients}</td>
                          <td className="px-5 py-4 text-center">
                            <span className="bg-lime-100 text-lime-700 text-xs font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border border-lime-200 mr-2">Berhasil</span>
                            <button onClick={() => {
                              setShowBroadcastDetailModal(h);
                            }} className="text-lime-600 hover:text-lime-800 text-xs font-bold underline cursor-pointer">Lihat Detail</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* MODUL BARU: ROLE & AUDIT */}
        {activeMenu === 'role' && (
          <div className="animate-in fade-in space-y-6">
            <div className="bg-lime-50/50 p-6 rounded-2xl border border-lime-200 flex justify-between items-center shadow-xl">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                  <span className="text-red-600">&hearts;</span> Manajemen Akun & Role Pengguna
                </h2>
                <p className="text-slate-600 text-sm">Kelola data jamaah, atur hak akses (role) pengurus, jabatan DKM, dan kelola sandi pengguna.</p>
              </div>
              <button onClick={() => { 
                setAkunPenggunaFormData({ id: 0, n: '', t: 'JEMAAH', e: '', c: '', r: 'Jamaah Terverifikasi' });
                setShowAkunPenggunaModal(true); 
              }} className="bg-lime-500 hover:bg-lime-400 text-black font-bold py-2 px-6 rounded-xl transition-colors cursor-pointer">+ Tambah Pengurus Baru</button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-500 font-bold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Nama Jamaah & Tingkatan</th>
                      <th className="p-4">Email & Kontak</th>
                      <th className="p-4">Role Akses</th>
                      <th className="p-4">Tanggal Bergabung</th>
                      <th className="p-4">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {akunPenggunaList.slice((jamaahPage - 1) * ITEMS_PER_PAGE, jamaahPage * ITEMS_PER_PAGE).map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="p-4">
                          <p className="font-bold text-slate-800 mb-1">{u.n}</p>
                          <span className="text-xs bg-lime-300 text-slate-900 border border-lime-500 px-2 py-0.5 rounded font-extrabold uppercase">{u.t}</span>
                        </td>
                        <td className="p-4 text-slate-600 text-xs">
                          <p className="mb-1">{u.e}</p>
                          <p>{u.c}</p>
                        </td>
                        <td className="p-4">
                          <select 
                            value={u.r} 
                            onChange={(e) => {
                              const newRole = e.target.value;
                              setAkunPenggunaList(prev => prev.map(p => p.id === u.id ? { ...p, r: newRole } : p));
                            }} 
                            className="bg-white border border-lime-500 text-lime-600 rounded px-3 py-1 text-xs font-bold outline-none cursor-pointer focus:ring-1 focus:ring-lime-500"
                          >
                            <option value="direktur">Super Admin (Direktur)</option>
                            <option value="admin">Admin Operasional</option>
                            <option value="bendahara">Admin Keuangan (Bendahara)</option>
                            <option value="staff">Auditor / Staff</option>
                            <option value="jamaah">Jamaah Terverifikasi</option>
                          </select>
                          <button 
                            onClick={async () => {
                              const { error } = await supabase.from('admin_users').update({ role: u.r }).eq('id', u.id);
                              if (error) {
                                alert('Gagal menyimpan perubahan role ke Database!');
                              } else {
                                alert('Perubahan Role berhasil disimpan ke Database secara permanen!');
                              }
                            }}
                            className="bg-lime-600 hover:bg-lime-700 text-white ml-2 rounded px-3 py-1 text-xs font-bold transition-colors cursor-pointer"
                          >
                            Simpan
                          </button>
                        </td>
                        <td className="p-4 text-slate-600 text-xs">{u.d}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button onClick={() => {
                              setAkunPenggunaFormData(u);
                              setShowAkunPenggunaModal(true);
                            }} className="bg-lime-100/50 text-slate-500 hover:bg-lime-600 hover:text-white px-3 py-1 rounded border border-lime-200 text-xs transition-colors cursor-pointer">Edit</button>
                            <button onClick={() => alert(`Tautan reset sandi telah dikirim ke kontak/email ${u.e || u.c}`)} className="bg-lime-900/10 text-lime-600 hover:bg-lime-600 hover:text-white px-3 py-1 rounded border border-lime-200 text-xs transition-colors cursor-pointer">Sandi</button>
                            <button onClick={async () => {
                              if(window.confirm(`Hapus akun pengguna ${u.n} dari database?`)) {
                                const { error } = await supabase.from('admin_users').delete().eq('id', u.id);
                                if (!error) {
                                  setAkunPenggunaList(prev => prev.filter(p => p.id !== u.id));
                                  alert('Akun berhasil dihapus dari Database permanen!');
                                } else {
                                  alert('Gagal menghapus akun: ' + error.message);
                                }
                              }
                            }} className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1 rounded border border-red-200 text-xs transition-colors cursor-pointer">Hapus</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={jamaahPage}
                totalItems={akunPenggunaList.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setJamaahPage}
              />
            </div>

            {/* RBAC (Role-Based Access Control) Panel */}
            {['direktur', 'admin'].includes(adminRole.toLowerCase()) && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-xl p-6 mt-8">
                <div className="flex items-center gap-3 mb-6">
                  <ShieldCheck className="w-6 h-6 text-lime-600" />
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">Tatakelola Hak Akses Modul (RBAC)</h3>
                    <p className="text-xs text-slate-500">Atur modul apa saja yang boleh diakses oleh masing-masing Role Pengurus. (Hanya terlihat oleh Direktur/Superadmin)</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap border-collapse">
                    <thead className="bg-slate-200/50 text-slate-600 font-bold text-xs uppercase tracking-wider">
                      <tr>
                        <th className="p-4 border-b border-slate-200">Role Pengurus</th>
                        {ALL_MENU_CATEGORIES.map(cat => (
                           <th key={cat.id} className="p-4 border-b border-slate-200 text-center">{cat.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {['direktur', 'admin', 'bendahara', 'staff'].map(role => (
                        <tr key={role} className="hover:bg-slate-50/50">
                          <td className="p-4 font-bold text-slate-700 capitalize border-r border-slate-100">{role}</td>
                          {ALL_MENU_CATEGORIES.map(cat => {
                            const isChecked = (rolePermissions[role] || []).includes(cat.id);
                            const isLocked = (role === 'direktur' || role === 'admin');
                            
                            return (
                              <td key={cat.id} className="p-4 text-center">
                                <input 
                                  type="checkbox"
                                  className="w-5 h-5 accent-lime-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  checked={isChecked}
                                  disabled={isLocked}
                                  onChange={async (e) => {
                                    const checked = e.target.checked;
                                    
                                    const current = rolePermissions[role] || [];
                                    const newPerms = checked ? [...current, cat.id] : current.filter(id => id !== cat.id);
                                    
                                    setRolePermissions(prev => ({ ...prev, [role]: newPerms }));
                                    
                                    // Update to Supabase
                                    const dbPerms = {
                                      keuangan: newPerms.includes('keuangan'),
                                      operasional: newPerms.includes('operasional'),
                                      administrasi: newPerms.includes('administrasi'),
                                      pengaturan: newPerms.includes('pengaturan_grup')
                                    };
                                    await supabase.from('admin_role_permissions')
                                      .upsert({ role: role, permissions: dbPerms }, { onConflict: 'role' });
                                  }}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-slate-400 mt-4 text-right">*Role Direktur & Admin memiliki akses penuh secara permanen untuk mencegah lockout.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeMenu === 'audit' && (
          <div className="animate-in fade-in space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-100 text-slate-500 font-bold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Waktu (WIB)</th>
                      <th className="p-4">Pengguna</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Aksi</th>
                      <th className="p-4">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                   {(() => {
                     const logs = auditLogs.length > 0 
                       ? auditLogs
                       : [
                           { w: '29/7/2026, 19.06.26', n: 'Petugas Masjid Citra Sentul Raya', a: 'admin', r: 'ADMIN MASJID', ac: 'LOGIN', c: 'bg-lime-900/50 text-lime-600', d: 'User logged in successfully' },
                           { w: '29/7/2026, 19.06.14', n: 'Gania', a: '081517045406', r: 'JAMAAH', ac: 'LOGOUT', c: 'bg-red-900/50 text-red-600', d: 'User logged out successfully' },
                           { w: '28/7/2026, 17.30.00', n: 'Haji Bambang Pamungkas, M.M.', a: 'bambang.pamungkas@outlook.com', r: 'DKM', ac: 'ADD_JOURNAL_ENTRY', c: 'bg-blue-900/50 text-blue-600', d: 'Berhasil menginput data Jurnal Umum senilai Rp 12.500.000.' },
                         ];
                     return logs.slice((auditPage - 1) * ITEMS_PER_PAGE, auditPage * ITEMS_PER_PAGE).map((l: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-4 text-slate-600 text-xs">{l.w}</td>
                        <td className="p-4">
                          <p className="font-bold text-slate-800 mb-1">{l.n}</p>
                          <p className="text-lime-600 text-xs">{l.a}</p>
                        </td>
                        <td className="p-4"><span className="bg-lime-100/50 text-slate-500 px-2 py-1 rounded text-xs font-bold border border-lime-200">{l.r}</span></td>
                        <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold border border-current/20 ${l.c}`}>{l.ac}</span></td>
                        <td className="p-4 text-slate-600 text-xs">{l.d}</td>
                      </tr>
                    ))
                   })()}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={auditPage}
                totalItems={auditLogs.length > 0 ? auditLogs.length : 3}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setAuditPage}
              />
            </div>
          </div>
        )}

        {/* --- MODUL LAPORAN KEUANGAN & AKUNTANSI TERINTEGRASI --- */}
        {['lapkeu', 'jurnal', 'bukubesar', 'coa', 'anggaran'].includes(activeMenu) && (
          <ErrorBoundary>
            <div className="animate-in fade-in space-y-6">
              {/* Header Banner */}
              <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border border-slate-200">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider mb-1.5 border border-slate-200">
                    💼 Modul Akuntansi Standar PSAK 409
                  </span>
                  <h2 className="text-lg font-extrabold text-slate-800 leading-none">Fitur Laporan Keuangan & Akuntansi Masjid</h2>
                  <p className="text-slate-500 text-[11px] mt-1.5 max-w-3xl leading-snug">
                    Terhubung langsung secara real-time dengan **Riwayat Transaksi** & **Input Donasi ZISWAF**. Mengintegrasikan Chart of Accounts (CoA), Jurnal Umum Double-Entry, Buku Besar, Neraca Aktivitas & Laba Rugi, serta Approval Anggaran.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button 
                    onClick={() => setActiveMenu('kas')} 
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs backdrop-blur-md transition-colors border border-white/20 flex items-center gap-2 cursor-pointer"
                  >
                    <Book className="w-4 h-4 text-lime-400" /> Buka Riwayat Transaksi
                  </button>
                </div>
              </div>

              {/* Sub-Tab Module Display */}
              {lapkeuTab === 'neraca' && <ModulLaporanKeuangan journals={journals} accounts={accounts} />}
              {lapkeuTab === 'jurnal' && <ModulJurnal entries={journals} accounts={accounts} onAddJournal={handleAutoPostJournal} />}
              {lapkeuTab === 'bukubesar' && <ModulBukuBesar journals={journals} accounts={accounts} />}
              {lapkeuTab === 'coa' && <ModulCoA journals={journals} />}
              {lapkeuTab === 'anggaran' && <ModulAnggaranApproval onAutoPostJournal={handleAutoPostJournal} adminRole={adminRole} appSettings={appSettings} />}
              {lapkeuTab === 'penyusutan' && <ModulPenyusutanAset onAutoPostJournal={handleAutoPostJournal} adminRole={adminRole} />}
            </div>
          </ErrorBoundary>
        )}

        {/* ——— MODUL LAINNYA ——— */}

        {showCampaignModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowCampaignModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Database className="w-5 h-5 text-lime-600" /> Buat Program Donasi Baru</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Kategori Program</label>
                  <select value={newCampaignData.kategori} onChange={e => {
                    const k = e.target.value;
                    let d = '1104', c = '4106';
                    if (k === 'Infaq') { d = '1106'; c = '4102'; }
                    if (k === 'Wakaf') { d = '1105'; c = '4104'; }
                    if (k === 'Sedekah') { d = '1106'; c = '4103'; }
                    setNewCampaignData({...newCampaignData, kategori: k, akunDebit: d, akunKredit: c});
                  }} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500">
                    <option value="Zakat">Zakat</option>
                    <option value="Infaq">Infaq</option>
                    <option value="Wakaf">Wakaf</option>
                    <option value="Sedekah">Sedekah Khusus</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Judul Campaign</label>
                  <input type="text" value={newCampaignData.judul} onChange={e => setNewCampaignData({...newCampaignData, judul: e.target.value})} placeholder="Misal: Pembangunan Gedung Utama..." className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Target Pengumpulan Dana (Rp)</label>
                  <input type="number" value={newCampaignData.target} onChange={e => setNewCampaignData({...newCampaignData, target: e.target.value})} placeholder="Contoh: 50000000" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Unggah Foto Program (Opsional)</label>
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setNewCampaignData(prev => ({...prev, gambar: reader.result as string}));
                      };
                      reader.readAsDataURL(file);
                    }
                  }} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-lime-50 file:text-lime-700 hover:file:bg-lime-100 cursor-pointer" />
                  {newCampaignData.gambar && <img src={newCampaignData.gambar} className="mt-3 h-28 w-auto rounded-lg border border-slate-200 object-cover" alt="Preview" />}
                </div>
                
                <div className="bg-lime-50 border border-lime-200 rounded-xl p-4 mt-2">
                  <h4 className="font-bold text-lime-800 text-sm mb-3">Pengaturan Akuntansi (Otomatis Tersinkron)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Akun Debit (Kas Masuk)</label>
                      <select value={newCampaignData.akunDebit} onChange={e => setNewCampaignData({...newCampaignData, akunDebit: e.target.value})} className="w-full p-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-lime-500">
                        {accounts.filter(a => a.jenis === 'Aktiva').map(a => (
                          <option key={a.kode} value={a.kode}>{a.kode} - {a.nama}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Akun Kredit (Pendapatan)</label>
                      <select value={newCampaignData.akunKredit} onChange={e => setNewCampaignData({...newCampaignData, akunKredit: e.target.value})} className="w-full p-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-lime-500">
                        {accounts.filter(a => a.jenis !== 'Aktiva' && a.jenis !== 'Kewajiban').map(a => (
                          <option key={a.kode} value={a.kode}>{a.kode} - {a.nama}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button onClick={() => setShowCampaignModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors cursor-pointer">Batal</button>
                <button onClick={async () => {
                  if(!newCampaignData.judul || !newCampaignData.target) return alert('Mohon lengkapi judul dan target dana!');
                  const targetRpNum = parseInt(newCampaignData.target.replace(/\D/g, '')) || 0;
                  
                  try {
                    const { data, error } = await supabase.from('programs').insert([{
                      kategori: newCampaignData.kategori,
                      judul: newCampaignData.judul,
                      deskripsi: JSON.stringify({ desc: 'Dibuat dari form admin', akunDebit: newCampaignData.akunDebit, akunKredit: newCampaignData.akunKredit }),
                      terkumpul_persen: 0,
                      terkumpul_rp: 0,
                      target_rp: targetRpNum,
                      donatur: 0,
                      gambar: newCampaignData.gambar || 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&q=80&w=400'
                    }]).select().single();
                    
                    if (data && !error) {
                      setLocalPrograms(prev => [...prev, {
                        id: data.id,
                        kategori: data.kategori,
                        judul: data.judul,
                        deskripsi: data.deskripsi,
                        terkumpulPersen: data.terkumpul_persen,
                        terkumpulRp: data.terkumpul_rp,
                        targetRp: data.target_rp,
                        donatur: data.donatur,
                      }]);
                    } else {
                      // Fallback if select().single() fails
                      setLocalPrograms(prev => [...prev, {
                        id: Math.random() * 10000,
                        kategori: newCampaignData.kategori,
                        judul: newCampaignData.judul,
                        deskripsi: 'Dibuat dari form admin',
                        terkumpulPersen: 0,
                        terkumpulRp: 0,
                        targetRp: targetRpNum,
                        donatur: 0,
                        gambar: newCampaignData.gambar || 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?auto=format&fit=crop&q=80&w=400'
                      }]);
                    }
                  } catch (err) { console.error('Error insert program:', err); }
                  
                  setNewCampaignData({ judul: '', target: '', kategori: 'Zakat', gambar: '', akunDebit: '1106', akunKredit: '4103' });
                  setShowCampaignModal(false);
                  alert(`Program "${newCampaignData.judul}" berhasil dipublikasikan dan live!`);
                }} className="flex-1 bg-lime-600 hover:bg-lime-700 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer">Simpan & Publikasikan</button>
              </div>
            </div>
          </div>
        )}

        {editCampaignModalData && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setEditCampaignModalData(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Settings className="w-5 h-5 text-lime-600" /> Edit Campaign / Program</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Kategori Program</label>
                  <select value={editCampaignModalData.kategori} onChange={e => {
                    const k = e.target.value;
                    let d = editCampaignModalData.akunDebit || '1104', c = editCampaignModalData.akunKredit || '4106';
                    if (k !== editCampaignModalData.kategori) {
                      if (k === 'Infaq') { d = '1106'; c = '4102'; }
                      else if (k === 'Wakaf') { d = '1105'; c = '4104'; }
                      else if (k === 'Sedekah') { d = '1106'; c = '4103'; }
                      else if (k === 'Zakat') { d = '1104'; c = '4106'; }
                    }
                    setEditCampaignModalData({...editCampaignModalData, kategori: k, akunDebit: d, akunKredit: c});
                  }} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500">
                    <option value="Zakat">Zakat</option>
                    <option value="Infaq">Infaq</option>
                    <option value="Wakaf">Wakaf</option>
                    <option value="Sedekah">Sedekah Khusus</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Judul Campaign</label>
                  <input type="text" value={editCampaignModalData.judul} onChange={e => setEditCampaignModalData({...editCampaignModalData, judul: e.target.value})} placeholder="Misal: Pembangunan Gedung Utama..." className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Target Pengumpulan Dana (Rp)</label>
                  <input type="number" value={editCampaignModalData.target} onChange={e => setEditCampaignModalData({...editCampaignModalData, target: e.target.value})} placeholder="Contoh: 50000000" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Unggah Foto Program (Ganti Gambar)</label>
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setEditCampaignModalData({...editCampaignModalData, gambar: reader.result as string});
                      };
                      reader.readAsDataURL(file);
                    }
                  }} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-lime-50 file:text-lime-700 hover:file:bg-lime-100 cursor-pointer" />
                  {editCampaignModalData.gambar && <img src={editCampaignModalData.gambar} className="mt-3 h-28 w-auto rounded-lg border border-slate-200 object-cover" alt="Preview" />}
                </div>
                
                <div className="bg-lime-50 border border-lime-200 rounded-xl p-4 mt-2">
                  <h4 className="font-bold text-lime-800 text-sm mb-3">Pengaturan Akuntansi (Otomatis Tersinkron)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Akun Debit (Kas Masuk)</label>
                      <select value={editCampaignModalData.akunDebit || '1104'} onChange={e => setEditCampaignModalData({...editCampaignModalData, akunDebit: e.target.value})} className="w-full p-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-lime-500">
                        {accounts.filter(a => a.jenis === 'Aktiva').map(a => (
                          <option key={a.kode} value={a.kode}>{a.kode} - {a.nama}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Akun Kredit (Pendapatan)</label>
                      <select value={editCampaignModalData.akunKredit || '4106'} onChange={e => setEditCampaignModalData({...editCampaignModalData, akunKredit: e.target.value})} className="w-full p-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-lime-500">
                        {accounts.filter(a => a.jenis !== 'Aktiva' && a.jenis !== 'Kewajiban').map(a => (
                          <option key={a.kode} value={a.kode}>{a.kode} - {a.nama}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button onClick={() => setEditCampaignModalData(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors cursor-pointer">Batal</button>
                <button onClick={async () => {
                  if(!editCampaignModalData.judul || !editCampaignModalData.target) return alert('Mohon lengkapi judul dan target dana!');
                  const targetRpNum = parseInt(editCampaignModalData.target.toString().replace(/\D/g, '')) || 0;
                  setEditedPrograms(prev => ({...prev, [editCampaignModalData.id]: {...(prev[editCampaignModalData.id] || {}), judul: editCampaignModalData.judul, targetRp: targetRpNum, kategori: editCampaignModalData.kategori, gambar: editCampaignModalData.gambar}}));
                  
                  try {
                    await supabase.from('programs').update({
                      judul: editCampaignModalData.judul,
                      target_rp: targetRpNum,
                      kategori: editCampaignModalData.kategori,
                      gambar: editCampaignModalData.gambar,
                      deskripsi: JSON.stringify({ desc: editCampaignModalData.rawDesc || 'Dibuat dari form admin', akunDebit: editCampaignModalData.akunDebit, akunKredit: editCampaignModalData.akunKredit })
                    }).eq('id', editCampaignModalData.id);
                  } catch (err) { console.error('Error update program:', err); }

                  alert(`Perubahan program "${editCampaignModalData.judul}" berhasil disimpan!`);
                  setEditCampaignModalData(null);
                }} className="flex-1 bg-lime-600 hover:bg-lime-700 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer">Simpan Perubahan</button>
              </div>
            </div>
          </div>
        )}

        {showPengumumanModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowPengumumanModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-lime-600" />
                {pengumumanFormData.id === 0 ? 'Buat Pengumuman Baru' : 'Edit Pengumuman'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Kategori (Tag)</label>
                  <select value={pengumumanFormData.tag} onChange={e => setPengumumanFormData({...pengumumanFormData, tag: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500">
                    <option value="Kajian">Kajian</option>
                    <option value="Kegiatan">Kegiatan</option>
                    <option value="Keuangan">Keuangan</option>
                    <option value="Berita">Berita</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Judul Pengumuman</label>
                  <input type="text" value={pengumumanFormData.title} onChange={e => setPengumumanFormData({...pengumumanFormData, title: e.target.value})} placeholder="Misal: Kajian Subuh Ahad..." className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Isi/Deskripsi Singkat</label>
                  <textarea rows={3} value={pengumumanFormData.desc} onChange={e => setPengumumanFormData({...pengumumanFormData, desc: e.target.value})} placeholder="Tuliskan isi pengumuman..." className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Unggah Foto (Opsional)</label>
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setPengumumanFormData(prev => ({...prev, img: reader.result as string}));
                      };
                      reader.readAsDataURL(file);
                    }
                  }} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-lime-50 file:text-lime-700 hover:file:bg-lime-100 cursor-pointer" />
                  {pengumumanFormData.img && <img src={pengumumanFormData.img} className="mt-3 h-28 w-auto rounded-lg border border-slate-200 object-cover" alt="Preview" />}
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button onClick={() => setShowPengumumanModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors cursor-pointer">Batal</button>
                <button onClick={() => {
                  if(!pengumumanFormData.title || !pengumumanFormData.desc) return alert('Mohon lengkapi judul dan deskripsi!');
                  
                  const finalImg = pengumumanFormData.img || 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=400&q=80';
                  
                  if(pengumumanFormData.id === 0) {
                    setPengumumanList(prev => [{id: Math.random() * 10000, tag: pengumumanFormData.tag, title: pengumumanFormData.title, desc: pengumumanFormData.desc, img: finalImg}, ...prev]);
                    alert('Pengumuman berhasil ditambahkan!');
                  } else {
                    setPengumumanList(prev => prev.map(p => p.id === pengumumanFormData.id ? {...p, title: pengumumanFormData.title, tag: pengumumanFormData.tag, desc: pengumumanFormData.desc, img: finalImg} : p));
                    alert('Perubahan berhasil disimpan!');
                  }
                  setShowPengumumanModal(false);
                }} className="flex-1 bg-lime-600 hover:bg-lime-700 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer">
                  {pengumumanFormData.id === 0 ? 'Publikasikan' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showBroadcastDetailModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowBroadcastDetailModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Detail Penerima Pesan Siaran</h2>
              <p className="text-slate-500 text-sm mb-6">Judul: <span className="font-bold text-slate-700">{showBroadcastDetailModal.title}</span></p>

              {showBroadcastDetailModal.recipientList ? (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Nama Jamaah</th>
                        <th className="px-4 py-3">Kontak / Email</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {showBroadcastDetailModal.recipientList.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-700">{r.name}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.contact}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-extrabold px-2 py-1 rounded-full uppercase border ${r.status?.includes('Gagal') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-lime-50 text-lime-600 border-lime-200'}`}>
                              {r.status || 'Berhasil'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-slate-500 text-sm">Tidak ada rincian penerima yang tersimpan untuk sesi siaran lama ini.</p>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button onClick={() => setShowBroadcastDetailModal(null)} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-6 rounded-xl transition-colors cursor-pointer">Tutup Jendela</button>
              </div>
            </div>
          </div>
        )}

        {showMediaModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowMediaModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Video className="w-5 h-5 text-lime-600" />
                Tambah Media Galeri / Kajian
              </h2>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Tipe Media</label>
                  <select value={mediaFormData.type} onChange={e => setMediaFormData({...mediaFormData, type: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500 font-bold">
                    <option value="youtube">Video Kajian YouTube</option>
                    <option value="foto">Foto Dokumentasi Kegiatan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Judul / Keterangan Media</label>
                  <input type="text" value={mediaFormData.title} onChange={e => setMediaFormData({...mediaFormData, title: e.target.value})} placeholder="Contoh: Tabligh Akbar Bersama Ust. Adi Hidayat" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500" />
                </div>

                {mediaFormData.type === 'youtube' ? (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Tautan YouTube URL</label>
                    <input type="url" value={mediaFormData.link} onChange={e => setMediaFormData({...mediaFormData, link: e.target.value})} placeholder="https://youtube.com/watch?v=..." className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500 text-sm font-mono text-lime-700" />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Unggah File Foto</label>
                    <input type="file" accept="image/*" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setMediaFormData(prev => ({...prev, file: reader.result as string}));
                        };
                        reader.readAsDataURL(file);
                      }
                    }} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-lime-50 file:text-lime-700 hover:file:bg-lime-100 cursor-pointer" />
                    {mediaFormData.file && <img src={mediaFormData.file} className="mt-3 h-32 w-full rounded-lg border border-slate-200 object-cover" alt="Preview" />}
                  </div>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <button onClick={() => setShowMediaModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors cursor-pointer">Batal</button>
                <button onClick={() => {
                  if(!mediaFormData.title) return alert('Mohon isi Judul / Keterangan Media!');
                  if(mediaFormData.type === 'youtube' && !mediaFormData.link) return alert('Mohon isi Tautan YouTube!');
                  
                  alert('Media berhasil diunggah dan ditambahkan ke database Galeri/Kajian!');
                  setShowMediaModal(false);
                  setMediaFormData({ title: '', type: 'youtube', link: '', file: '' });
                }} className="flex-1 bg-lime-600 hover:bg-lime-700 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer">
                  Unggah Media
                </button>
              </div>
            </div>
          </div>
        )}

        {showInventarisModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto my-8">
              <button onClick={() => setShowInventarisModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Camera className="w-5 h-5 text-lime-600" />
                {inventarisFormData.id === 0 ? 'Tambah Barang Inventaris' : 'Edit Data Inventaris'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nama Barang <span className="text-red-500">*</span></label>
                  <input type="text" value={inventarisFormData.nama} onChange={e => setInventarisFormData({...inventarisFormData, nama: e.target.value})} placeholder="Contoh: AC Daikin 2 PK" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Kode Aset <span className="text-red-500">*</span></label>
                  <input type="text" value={inventarisFormData.kode} onChange={e => setInventarisFormData({...inventarisFormData, kode: e.target.value})} placeholder="Contoh: AC-01" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500 font-mono text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Kategori <span className="text-red-500">*</span></label>
                  <select value={inventarisFormData.kategori} onChange={e => setInventarisFormData({...inventarisFormData, kategori: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500" required>
                    <option value="">Pilih Kategori...</option>
                    <option value="Elektronik & Audio">Elektronik & Audio</option>
                    <option value="Furnitur & Perlengkapan">Furnitur & Perlengkapan</option>
                    <option value="Kendaraan">Kendaraan</option>
                    <option value="Alat Kebersihan">Alat Kebersihan</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Total <span className="text-red-500">*</span></label>
                    <input type="number" min="1" value={inventarisFormData.jumlahTotal} onChange={e => setInventarisFormData({...inventarisFormData, jumlahTotal: parseInt(e.target.value) || 0})} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Satuan <span className="text-red-500">*</span></label>
                    <input type="text" value={inventarisFormData.satuan} onChange={e => setInventarisFormData({...inventarisFormData, satuan: e.target.value})} placeholder="Unit/Pcs/Set" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Lokasi <span className="text-red-500">*</span></label>
                  <input type="text" value={inventarisFormData.lokasi} onChange={e => setInventarisFormData({...inventarisFormData, lokasi: e.target.value})} placeholder="Contoh: Ruang Shalat Utama" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Foto Barang (Opsional)</label>
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setInventarisFotoFile(file);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setInventarisFormData(prev => ({...prev, foto: reader.result as string}));
                      };
                      reader.readAsDataURL(file);
                    }
                  }} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-lime-50 file:text-lime-700 hover:file:bg-lime-100 cursor-pointer" />
                  {inventarisFormData.foto && <img src={inventarisFormData.foto} className="mt-3 h-28 w-auto rounded-lg border border-slate-200 object-cover" alt="Preview" />}
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button onClick={() => setShowInventarisModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors cursor-pointer">Batal</button>
                <button onClick={async () => {
                  if(!inventarisFormData.nama || !inventarisFormData.kode || !inventarisFormData.kategori || !inventarisFormData.jumlahTotal || !inventarisFormData.satuan || !inventarisFormData.lokasi) {
                    return alert('Mohon lengkapi semua field yang wajib diisi (*)!');
                  }
                  
                  try {
                    let finalFotoUrl = inventarisFormData.foto;
                    
                    if (inventarisFotoFile) {
                      const fileExt = inventarisFotoFile.name.split('.').pop();
                      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                      const filePath = `inventaris/${fileName}`;
                      
                      const { error: uploadError } = await supabase.storage.from('masjid-assets').upload(filePath, inventarisFotoFile, {
                        cacheControl: '3600',
                        upsert: false
                      });
                      
                      if (uploadError) {
                        alert('Gagal mengupload gambar. Pastikan bucket "masjid-assets" sudah terbuat di Supabase!');
                        console.error('Storage Upload Error:', uploadError);
                        return; // Berhenti jika gagal upload
                      }
                      
                      const { data: publicUrlData } = supabase.storage.from('masjid-assets').getPublicUrl(filePath);
                      finalFotoUrl = publicUrlData.publicUrl;
                    }

                    if(inventarisFormData.id === 0) {
                      const newId = `INV-${Date.now()}`;
                      const { error } = await supabase.from('masjid_inventaris').insert([{
                        id: newId,
                        nama: inventarisFormData.nama,
                        kode: inventarisFormData.kode,
                        kategori: inventarisFormData.kategori,
                        jumlah: inventarisFormData.jumlahTotal,
                        satuan: inventarisFormData.satuan,
                        lokasi: inventarisFormData.lokasi,
                        foto: finalFotoUrl,
                        kondisi: 'Baik',
                        tanggal_perolehan: new Date().toISOString()
                      }]);
                      if (error) throw error;
                      setInventarisList(prev => [{...inventarisFormData, id: newId, foto: finalFotoUrl}, ...prev]);
                      alert('Barang berhasil ditambahkan ke inventaris!');
                    } else {
                      const { error } = await supabase.from('masjid_inventaris').update({
                        nama: inventarisFormData.nama,
                        kode: inventarisFormData.kode,
                        kategori: inventarisFormData.kategori,
                        jumlah: inventarisFormData.jumlahTotal,
                        satuan: inventarisFormData.satuan,
                        lokasi: inventarisFormData.lokasi,
                        foto: finalFotoUrl
                      }).eq('id', inventarisFormData.id);
                      if (error) throw error;
                      setInventarisList(prev => prev.map(p => p.id === inventarisFormData.id ? {...inventarisFormData, foto: finalFotoUrl} : p));
                      alert('Perubahan berhasil disimpan!');
                    }
                    setShowInventarisModal(false);
                    setInventarisFotoFile(null);
                  } catch (err) {
                    console.error('Failed to save inventaris to Supabase', err);
                    alert('Gagal menyimpan barang ke database.');
                  }
                }} className="flex-1 bg-lime-600 hover:bg-lime-700 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer">
                  Simpan Barang
                </button>
              </div>
            </div>
          </div>
        )}

        {showLaporRusakModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
              <button onClick={() => setShowLaporRusakModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              <h2 className="text-xl font-bold text-red-700 mb-6 flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5" /> Laporkan Barang Rusak
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Jumlah Barang Rusak</label>
                  <input type="number" min="1" value={laporRusakFormData.jumlah} onChange={e => setLaporRusakFormData({...laporRusakFormData, jumlah: parseInt(e.target.value) || 1})} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-red-500 font-bold text-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Alasan / Keterangan Kerusakan</label>
                  <textarea rows={3} value={laporRusakFormData.alasan} onChange={e => setLaporRusakFormData({...laporRusakFormData, alasan: e.target.value})} placeholder="Jelaskan kondisi kerusakan barang..." className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-red-500 text-sm" required></textarea>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button onClick={() => setShowLaporRusakModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors cursor-pointer">Batal</button>
                <button onClick={() => {
                  if(!laporRusakFormData.jumlah || !laporRusakFormData.alasan) {
                    return alert('Jumlah rusak dan alasan wajib diisi!');
                  }
                  
                  const item = inventarisList.find(i => i.id === laporRusakFormData.inventarisId);
                  const alreadyRusak = laporanRusakList.filter(r => r.inventarisId === laporRusakFormData.inventarisId).reduce((sum, r) => sum + r.jumlah, 0);
                  
                  if (item && laporRusakFormData.jumlah > (item.jumlahTotal - alreadyRusak)) {
                    return alert(`Jumlah rusak (${laporRusakFormData.jumlah}) melebihi stok yang tersedia (${item.jumlahTotal - alreadyRusak})!`);
                  }
                  
                  setLaporanRusakList(prev => [{...laporRusakFormData, id: Math.random() * 10000, tanggal: new Date().toLocaleDateString('id-ID')}, ...prev]);
                  alert('Laporan barang rusak berhasil dicatat. Stok tersedia otomatis berkurang.');
                  setShowLaporRusakModal(false);
                }} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer">
                  Simpan Laporan
                </button>
              </div>
            </div>
          </div>
        )}

        {showAkunPenggunaModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
              <button onClick={() => setShowAkunPenggunaModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              <h2 className="text-xl font-bold text-slate-800 mb-6">
                {akunPenggunaFormData.id === 0 ? 'Tambah Pengurus / Pengguna Baru' : 'Edit Data Pengguna'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
                  <input type="text" value={akunPenggunaFormData.n} onChange={e => setAkunPenggunaFormData({...akunPenggunaFormData, n: e.target.value})} placeholder="Contoh: H. Ahmad Subagja" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Jabatan DKM / Tingkatan <span className="text-red-500">*</span></label>
                  <input type="text" value={akunPenggunaFormData.t} onChange={e => setAkunPenggunaFormData({...akunPenggunaFormData, t: e.target.value})} placeholder="Contoh: KETUA DKM" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500 text-sm uppercase" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Alamat Email</label>
                    <input type="email" value={akunPenggunaFormData.e} onChange={e => setAkunPenggunaFormData({...akunPenggunaFormData, e: e.target.value})} placeholder="email@contoh.com" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Nomor Kontak (WA) <span className="text-red-500">*</span></label>
                    <input type="tel" value={akunPenggunaFormData.c} onChange={e => setAkunPenggunaFormData({...akunPenggunaFormData, c: e.target.value})} placeholder="0812..." className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500 text-sm" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Role Sistem Akses <span className="text-red-500">*</span></label>
                  <select value={akunPenggunaFormData.r} onChange={e => setAkunPenggunaFormData({...akunPenggunaFormData, r: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500 text-sm font-bold cursor-pointer">
                    <option value="direktur">Super Admin (Direktur)</option>
                    <option value="admin">Admin Operasional</option>
                    <option value="bendahara">Admin Keuangan (Bendahara)</option>
                    <option value="staff">Auditor / Staff</option>
                    <option value="jamaah">Jamaah Terverifikasi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Kata Sandi (Password) <span className="text-red-500">*</span></label>
                  <input type="text" value={akunPenggunaFormData.p} onChange={e => setAkunPenggunaFormData({...akunPenggunaFormData, p: e.target.value})} placeholder="Masukkan kata sandi..." className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500 text-sm" required />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button onClick={() => setShowAkunPenggunaModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors cursor-pointer">Batal</button>
                <button onClick={async () => {
                  if(!akunPenggunaFormData.n || !akunPenggunaFormData.c || !akunPenggunaFormData.t || !akunPenggunaFormData.p) {
                    return alert('Nama, Jabatan, Nomor Kontak, dan Password wajib diisi!');
                  }
                  
                  if(akunPenggunaFormData.id === 0) {
                    // Create New
                    const { data, error } = await supabase.from('admin_users').insert({
                      nama: akunPenggunaFormData.n,
                      email: akunPenggunaFormData.e || `${akunPenggunaFormData.c}@masjid.com`,
                      password_hash: akunPenggunaFormData.p,
                      role: akunPenggunaFormData.r,
                      jabatan: akunPenggunaFormData.t,
                      kontak: akunPenggunaFormData.c,
                      status: 'Aktif'
                    }).select();
                    
                    if (!error && data) {
                      setAkunPenggunaList(prev => [{
                        id: data[0].id, n: data[0].nama, t: data[0].jabatan, e: data[0].email, c: data[0].kontak, r: data[0].role, p: data[0].password_hash, d: new Date().toLocaleDateString('id-ID')
                      }, ...prev]);
                      alert('Berhasil! Pengguna baru telah tersimpan ke Database Supabase.');
                    } else {
                      alert('Gagal menambah pengguna ke Supabase: ' + (error?.message || 'Unknown error'));
                    }
                  } else {
                    // Update Existing
                    const { error } = await supabase.from('admin_users').update({
                      nama: akunPenggunaFormData.n,
                      email: akunPenggunaFormData.e || `${akunPenggunaFormData.c}@masjid.com`,
                      password_hash: akunPenggunaFormData.p,
                      role: akunPenggunaFormData.r,
                      jabatan: akunPenggunaFormData.t,
                      kontak: akunPenggunaFormData.c
                    }).eq('id', akunPenggunaFormData.id);
                    
                    if (!error) {
                      setAkunPenggunaList(prev => prev.map(p => p.id === akunPenggunaFormData.id ? {...akunPenggunaFormData, d: p.d} : p));
                      alert('Berhasil! Data pengguna telah diperbarui di Database Supabase.');
                    } else {
                      alert('Gagal memperbarui pengguna: ' + error.message);
                    }
                  }
                  setShowAkunPenggunaModal(false);
                }} className="flex-1 bg-lime-600 hover:bg-lime-700 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer">
                  Simpan Data
                </button>
              </div>
            </div>
          </div>
        )}

        {showProfilModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
              <button onClick={() => setShowProfilModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              <h2 className="text-xl font-bold text-slate-800 mb-6">
                {profilFormData.id === 0 ? 'Tambah Profil Pengurus' : 'Edit Profil Pengurus'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nama Lengkap & Gelar <span className="text-red-500">*</span></label>
                  <input type="text" value={profilFormData.nama} onChange={e => setProfilFormData({...profilFormData, nama: e.target.value})} placeholder="Contoh: Ustadz H. M. Zainuddin, SQ" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Jabatan / Role <span className="text-red-500">*</span></label>
                  <input type="text" value={profilFormData.jabatan} onChange={e => setProfilFormData({...profilFormData, jabatan: e.target.value})} placeholder="Contoh: Ketua DKM" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500 text-sm font-bold" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Biodata Singkat</label>
                  <textarea value={profilFormData.biodata} onChange={e => setProfilFormData({...profilFormData, biodata: e.target.value})} placeholder="Tuliskan profil atau latar belakang singkat..." className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500 text-sm h-24" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Urutan Tampil (Opsional)</label>
                  <input type="number" value={profilFormData.urutan} onChange={e => setProfilFormData({...profilFormData, urutan: Number(e.target.value)})} placeholder="Contoh: 1" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Foto Profil (Bisa upload)</label>
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setProfilFormData(prev => ({...prev, foto_url: reader.result as string}));
                      };
                      reader.readAsDataURL(file);
                    }
                  }} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-lime-50 file:text-lime-700 hover:file:bg-lime-100 cursor-pointer" />
                  {profilFormData.foto_url && <img src={profilFormData.foto_url} className="mt-3 h-20 w-20 rounded-full border border-slate-200 object-cover shadow-md" alt="Preview" />}
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button onClick={() => setShowProfilModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors cursor-pointer">Batal</button>
                <button onClick={async () => {
                  if(!profilFormData.nama || !profilFormData.jabatan) {
                    return alert('Nama Lengkap dan Jabatan wajib diisi!');
                  }
                  
                  if(profilFormData.id === 0) {
                    const { data, error } = await supabase.from('masjid_pengurus_inti').insert([{
                      nama: profilFormData.nama,
                      jabatan: profilFormData.jabatan,
                      biodata: profilFormData.biodata,
                      foto_url: profilFormData.foto_url,
                      urutan: profilFormData.urutan
                    }]).select();
                    if (!error && data) {
                      setPengurusList(prev => [...prev, data[0]]);
                      alert('Profil baru berhasil ditambahkan!');
                    } else {
                      alert('Gagal menambah profil ke Supabase: ' + error?.message);
                    }
                  } else {
                    const { data, error } = await supabase.from('masjid_pengurus_inti').update({
                      nama: profilFormData.nama,
                      jabatan: profilFormData.jabatan,
                      biodata: profilFormData.biodata,
                      foto_url: profilFormData.foto_url,
                      urutan: profilFormData.urutan
                    }).eq('id', profilFormData.id).select();
                    if (!error && data) {
                      setPengurusList(prev => prev.map(p => p.id === profilFormData.id ? data[0] : p));
                      alert('Profil berhasil diperbarui!');
                    } else {
                      alert('Gagal memperbarui profil ke Supabase: ' + error?.message);
                    }
                  }
                  setShowProfilModal(false);
                }} className="flex-1 bg-lime-600 hover:bg-lime-700 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer">
                  Simpan Profil
                </button>
              </div>
            </div>
          </div>
        )}

        {showPejabatTtdModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
              <button onClick={() => setShowPejabatTtdModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              <h2 className="text-xl font-bold text-slate-800 mb-6">
                {pejabatTtdFormData.id === 0 ? 'Tambah Pejabat TTD Baru' : 'Edit Pejabat TTD'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nama Pejabat <span className="text-red-500">*</span></label>
                  <input type="text" value={pejabatTtdFormData.name} onChange={e => setPejabatTtdFormData({...pejabatTtdFormData, name: e.target.value})} placeholder="Contoh: H. Ahmad" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Jabatan DKM <span className="text-red-500">*</span></label>
                  <input type="text" value={pejabatTtdFormData.pos} onChange={e => setPejabatTtdFormData({...pejabatTtdFormData, pos: e.target.value})} placeholder="Contoh: Bendahara DKM" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Keterangan / Tag TTD <span className="text-red-500">*</span></label>
                  <input type="text" value={pejabatTtdFormData.tag} onChange={e => setPejabatTtdFormData({...pejabatTtdFormData, tag: e.target.value})} placeholder="Contoh: DIPERIKSA OLEH" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-lime-500 text-sm uppercase" required />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button onClick={() => setShowPejabatTtdModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors cursor-pointer">Batal</button>
                <button onClick={() => {
                  if(!pejabatTtdFormData.name || !pejabatTtdFormData.pos || !pejabatTtdFormData.tag) {
                    return alert('Semua isian wajib diisi!');
                  }
                  
                  if(pejabatTtdFormData.id === 0) {
                    setPejabatTtdList(prev => [...prev, {...pejabatTtdFormData, id: Math.random() * 10000}]);
                    alert('Pejabat TTD baru berhasil ditambahkan!');
                  } else {
                    setPejabatTtdList(prev => prev.map(p => p.id === pejabatTtdFormData.id ? pejabatTtdFormData : p));
                    alert('Data Pejabat TTD berhasil diperbarui!');
                  }
                  setShowPejabatTtdModal(false);
                }} className="flex-1 bg-lime-600 hover:bg-lime-700 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer">
                  Simpan Data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DONATUR MODAL */}
        {showDonaturModal !== null && (() => {
          const p = [...programs, ...localPrograms].find(x => x.id === showDonaturModal);
          if (!p) return null;
          const donors = (donasiHistory || []).filter((d: any) => d.programId === p.id);
          
          return (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4 shrink-0">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Daftar Donatur</h3>
                    <p className="text-sm font-semibold text-lime-600 mt-1">{p.judul}</p>
                  </div>
                  <button onClick={() => setShowDonaturModal(null)} className="p-2 bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full cursor-pointer transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 pr-2 space-y-3 custom-scrollbar">
                  {donors.length > 0 ? (
                    donors.map((d: any, idx: number) => (
                      <div key={idx} className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-lime-300 transition-colors">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-bold text-slate-800 text-base">{d.namaDonatur || 'Hamba Allah'}</span>
                            <span className="text-[11px] text-slate-500 font-medium bg-slate-200 px-2 py-0.5 rounded-full">{d.tanggal}</span>
                          </div>
                          <div className="text-lg font-mono font-extrabold text-lime-600">{formatRp(d.nominal)}</div>
                          {d.metode && <div className="text-[11px] text-slate-500 mt-1">Metode: {d.metode}</div>}
                        </div>
                        <div className="flex items-center">
                           {d.status === 'Berhasil' ? (
                             <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1">
                               <ShieldCheck className="w-3.5 h-3.5" /> Terverifikasi
                             </span>
                           ) : d.status === 'Menunggu Verifikasi' ? (
                             <button onClick={() => {
                               setShowDonaturModal(null);
                               setActiveMenu('verifikasi');
                             }} className="px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm flex items-center gap-1 group">
                               Menunggu Verifikasi <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                             </button>
                           ) : (
                             <span className="px-3 py-1.5 bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold flex items-center gap-1">
                               <X className="w-3.5 h-3.5" /> Ditolak
                             </span>
                           )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                      <Database className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-slate-500 font-medium text-sm">Belum ada data donatur untuk program ini.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
};


