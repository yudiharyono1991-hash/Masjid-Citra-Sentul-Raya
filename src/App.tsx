import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { Hero, HeroSlide } from './components/Hero';
import { toLocalDateString } from './utils/formatters';
import { DaftarProgram } from './components/DaftarProgram';
import { JadwalShalatCard } from './components/JadwalShalatCard';
import { KalenderKegiatan } from './components/KalenderKegiatan';
import { MediaSosial } from './components/MediaSosial';
import { ProfilMasjid } from './components/ProfilMasjid';
import { LokasiKontak } from './components/LokasiKontak';
import { Footer } from './components/Footer';
import { AdminDashboard } from './components/AdminDashboard';
import { JamaahDashboard } from './components/JamaahDashboard';
import { LoginModal } from './components/LoginModal';
import { supabase } from './lib/supabase';
import { Sun, Moon, BookOpen, LayoutDashboard } from 'lucide-react';

const AiAsistenModal = lazy(() => import('./components/AiAsistenModal').then(module => ({ default: module.AiAsistenModal })));
const BukuPanduanModal = lazy(() => import('./components/BukuPanduanModal').then(module => ({ default: module.BukuPanduanModal })));
const AlQuranDigital = lazy(() => import('./components/AlQuranDigital').then(module => ({ default: module.AlQuranDigital })));


export default function App() {
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('isAdmin') === 'true');
  const [adminRole, setAdminRole] = useState(() => localStorage.getItem('adminRole') || 'direktur');
  const [isJamaahLoggedIn, setIsJamaahLoggedIn] = useState(() => localStorage.getItem('isJamaahLoggedIn') === 'true');
  const [showPortal, setShowPortal] = useState(() => localStorage.getItem('showPortal') === 'true');

  useEffect(() => {
    localStorage.setItem('isAdmin', String(isAdmin));
    localStorage.setItem('adminRole', adminRole);
    localStorage.setItem('isJamaahLoggedIn', String(isJamaahLoggedIn));
    localStorage.setItem('showPortal', String(showPortal));
  }, [isAdmin, adminRole, isJamaahLoggedIn, showPortal]);
  const [namaJamaah, setNamaJamaah] = useState(() => localStorage.getItem('masjid_user_name') || 'Hamba Allah');
  const [kontakJamaah, setKontakJamaah] = useState(() => localStorage.getItem('masjid_user_phone') || '');
  const [showGlobalPanduanModal, setShowGlobalPanduanModal] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isQuranModalOpen, setIsQuranModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Helper for Audit Logging
  const logAudit = async (name: string, role: string, kontak: string, action: string, desc: string, colorClass: string) => {
    const w = new Date().toLocaleString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    try {
      await supabase.from('audit_logs').insert([{
        waktu: w,
        nama: name,
        peran: role,
        kontak: kontak,
        aksi: action,
        deskripsi: desc,
        warna_class: colorClass
      }]);
    } catch (err) {
      console.error('Failed to log audit to Supabase', err);
    }
  };

  // Jamaah Registration State (Fetched from Supabase in useEffect)
  const [registeredJamaahList, setRegisteredJamaahList] = useState<any[]>([]);

  const handleRegisterJamaah = async (jamaah: any) => {
    setRegisteredJamaahList(prev => [...prev, jamaah]);

    try {
      await supabase.from('registered_jamaah').insert([{
        nama: jamaah.n,
        kontak: jamaah.c || jamaah.e,
        email: jamaah.e || null,
        password: jamaah.p,
        status: jamaah.s || 'Aktif',
        joined_at: new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
      }]);
    } catch (err) {
      console.error('Failed to register jamaah to Supabase', err);
    }
  };

  // Day & Night Dark Mode State Logic
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    // Auto Day & Night Detection: 18:00 - 06:00 is Night Mode (Dark)
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
  });

  const [isAutoNight, setIsAutoNight] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return false;
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6;
  });

  // Sync dark class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    setIsAutoNight(false);
    localStorage.setItem('theme', nextMode ? 'dark' : 'light');
  };
  
  // State for ZISWAF Programs
  const [programs, setPrograms] = useState<any[]>([]);
  
  // State for Donasi History (Pending and Verified)
  const [donasiHistory, setDonasiHistory] = useState<any[]>([]);
  
  // Global Error State
  const [errorLoad, setErrorLoad] = useState<string | null>(null);

  const handleDonateSubmit = async (programId: number, nominal: number, metode: string, bukti: File | string | null, namaDonatur: string, kontakDonatur: string) => {
    const program = programs.find(p => p.id === programId);
    if (!program) return;
    
    const donasiId = `INV-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const tanggal = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    
    let finalBuktiUrl = null;
    
    if (bukti instanceof File) {
      const fileExt = bukti.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `donasi/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('masjid-assets').upload(filePath, bukti, {
        cacheControl: '3600',
        upsert: false
      });
      
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('masjid-assets').getPublicUrl(filePath);
        finalBuktiUrl = publicUrlData.publicUrl;
      } else {
        console.error('Storage Upload Error:', uploadError);
      }
    } else if (typeof bukti === 'string') {
      finalBuktiUrl = bukti;
    }
    
    const newDonasi = {
      id: donasiId,
      tanggal,
      programId,
      programName: program.judul,
      nominal,
      metode,
      status: 'Menunggu Verifikasi',
      bukti: finalBuktiUrl,
      namaDonatur: namaDonatur || 'Hamba Allah',
      kontakDonatur: kontakDonatur || '-'
    };
    
    setDonasiHistory(prev => [newDonasi, ...prev]);
    logAudit(namaDonatur || 'Hamba Allah', isJamaahLoggedIn ? 'JAMAAH' : 'GUEST', kontakDonatur || '-', 'DONASI', `Input donasi sejumlah Rp ${nominal} via ${metode}`, 'bg-blue-900/50 text-blue-600');

    try {
      await supabase.from('donations').insert([{
        id: donasiId,
        tanggal,
        program_id: programId,
        program_name: program.judul,
        nominal,
        metode,
        status: 'Menunggu Verifikasi',
        bukti: finalBuktiUrl,
        nama_donatur: namaDonatur || 'Hamba Allah',
        kontak_donatur: kontakDonatur || '-'
      }]);

      // Add notifications - try Supabase first (cross-device), fallback to localStorage
      const addNotification = async (role: string, title: string, message: string) => {
        try {
          await supabase.from('notifications').insert([{ user_role: role, title, message, is_read: false }]);
        } catch {
          // Fallback to localStorage
          try {
            const stored = localStorage.getItem('admin_notifications');
            const existing = stored ? JSON.parse(stored) : [];
            const newNotif = { id: `notif-${Date.now()}-${role}`, user_role: role, title, message, is_read: false, created_at: new Date().toISOString() };
            localStorage.setItem('admin_notifications', JSON.stringify([newNotif, ...existing].slice(0, 50)));
            window.dispatchEvent(new Event('storage'));
          } catch {}
        }
      };
      await addNotification('bendahara', 'Donasi Baru (Menunggu Verifikasi)', `Terdapat donasi baru dari ${namaDonatur || 'Hamba Allah'} sebesar Rp ${nominal.toLocaleString('id-ID')} untuk program ${program.judul}.`);
      await addNotification('direktur', 'Donasi Baru Masuk', `Terdapat donasi baru dari ${namaDonatur || 'Hamba Allah'} sebesar Rp ${nominal.toLocaleString('id-ID')}.`);
    } catch (err) {
      console.error('Failed to insert donation to Supabase', err);
    }
  };

  const handleVerifyDonasi = async (id: string, status: 'Berhasil' | 'Ditolak') => {
    const donation = donasiHistory.find(d => d.id === id);

    setDonasiHistory(prev => prev.map(d => {
      if (d.id === id) {
        if (status === 'Berhasil' && d.status !== 'Berhasil') {
          // If verifying as success, add to program
          handleAddDonation(d.programId, d.nominal);
          logAudit('Pengurus DKM', 'ADMIN', 'admin@masjid.id', 'VERIFY_DONASI', `Memverifikasi penerimaan donasi ID: ${id} senilai Rp ${d.nominal}`, 'bg-lime-900/50 text-lime-600');
        } else if (status === 'Ditolak' && d.status !== 'Ditolak') {
          logAudit('Pengurus DKM', 'ADMIN', 'admin@masjid.id', 'TOLAK_DONASI', `Menolak/membatalkan donasi ID: ${id}`, 'bg-red-900/50 text-red-600');
        }
        return { ...d, status };
      }
      return d;
    }));

    try {
      await supabase.from('donations').update({ status }).eq('id', id);

      // Auto-post ke Pemasukan dan Jurnal Umum untuk integrasi Neraca Laporan Keuangan
      if (status === 'Berhasil' && donation && donation.status !== 'Berhasil') {
        const prog = programs.find(p => p.id === donation.programId);
        const kat = prog ? prog.kategori.toLowerCase() : 'sedekah';
        
        let akunDebit = '1106'; // default Bank Infak & Sodaqoh
        let akunKredit = '4103'; // default Sedekah Jamaah
        
        // Coba parse custom COA dari deskripsi program (JSON format)
        if (prog && prog.deskripsi) {
          try {
            const parsed = JSON.parse(prog.deskripsi);
            if (parsed.akunDebit) akunDebit = parsed.akunDebit;
            if (parsed.akunKredit) akunKredit = parsed.akunKredit;
          } catch(e) { /* ignore */ }
        }

        // Fallback jika tidak ada custom COA
        if (akunDebit === '1106' && akunKredit === '4103') {
          if (kat === 'zakat') {
             akunDebit = '1104'; // Kas Bank Zakat
             akunKredit = '4106'; // Penerimaan Zakat
          } else if (kat === 'infaq') {
             akunDebit = '1106'; // Kas Bank Infak
             akunKredit = '4102'; // Infak Harian
          } else if (kat === 'wakaf') {
             akunDebit = '1105'; // Kas Bank Wakaf
             akunKredit = '4104'; // Donasi Pembangunan Wakaf
          }
        }

        const tanggalKini = toLocalDateString();
        const keterangan = `Penerimaan Donasi ${prog?.judul || 'ZISWAF'} a.n ${donation.namaDonatur || 'Hamba Allah'}`;

        // 1. Insert ke tabel pemasukan (Riwayat Kas)
        await supabase.from('pemasukan').insert([{
           tanggal: tanggalKini,
           keterangan: keterangan,
           nominal: donation.nominal,
           kategori: 'Penerimaan ZISWAF',
           metode_pembayaran: donation.metode || 'Transfer',
           dibuat_oleh: 'Sistem ZISWAF'
        }]);

        // 2. Insert ke Jurnal Umum (Double Entry)
        await supabase.from('jurnal_umum').insert([
          {
            id: `JU-${Date.now()}-1`,
            tanggal: tanggalKini,
            no_bukti: `BKM-DONASI-${id}`,
            keterangan: keterangan,
            kode_akun: akunDebit,
            debit: donation.nominal,
            kredit: 0,
            user_input: 'Sistem ZISWAF'
          },
          {
            id: `JU-${Date.now()}-2`,
            tanggal: tanggalKini,
            no_bukti: `BKM-DONASI-${id}`,
            keterangan: keterangan,
            kode_akun: akunKredit,
            debit: 0,
            kredit: donation.nominal,
            user_input: 'Sistem ZISWAF'
          }
        ]);
      }
    } catch (err) {
      console.error('Failed to update donation status or push to jurnal in Supabase', err);
    }
  };
  
  // Home Visibility State managed by Admin
  const [homeVisibility, setHomeVisibility] = useState({
    showJadwal: true,
    showKalender: true,
    showZiswaf: true,
    showQuran: true,
    showTentang: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 0. Fetch App Settings for Visibility Toggles
        const { data: settingsData, error: settingsErr } = await supabase.from('app_settings').select('*').maybeSingle();
        if (!settingsErr && settingsData) {
          setHomeVisibility({
            showJadwal: settingsData.show_jadwal ?? true,
            showKalender: settingsData.show_kalender ?? true,
            showZiswaf: settingsData.show_ziswaf ?? true,
            showQuran: settingsData.show_quran ?? true,
            showTentang: settingsData.show_tentang ?? true,
          });
        }

        // 1. Fetch Donations First to calculate exact live balances
        const { data: donasiData, error: donasiErr } = await supabase.from('donations').select('*').order('created_at', { ascending: false });
        let formattedDonasi: any[] = [];
        if (!donasiErr && donasiData) {
          formattedDonasi = donasiData.map((d: any) => ({
            id: d.id,
            tanggal: d.tanggal,
            programId: d.program_id,
            programName: d.program_name,
            nominal: Number(d.nominal),
            metode: d.metode,
            status: d.status,
            bukti: d.bukti,
            namaDonatur: d.nama_donatur,
            kontakDonatur: d.kontak_donatur
          }));
          setDonasiHistory(formattedDonasi); // Always update, including when empty (reset)
        } else if (!donasiErr) {
          setDonasiHistory([]); // Clear if Supabase returns empty
        }

        // 2. Fetch Programs and synchronize live totals
        const { data: programsData, error: progErr } = await supabase.from('programs').select('*').order('id');
        if (!progErr && programsData) {
          if (programsData.length === 0) {
            // Database was reset — clear program state
            setPrograms([]);
          } else {
          const formattedPrograms = programsData.map((p: any) => {
            const programDonations = formattedDonasi.filter(d => d.programId === p.id && d.status === 'Berhasil');
            const totalTerkumpul = programDonations.reduce((sum, d) => sum + d.nominal, 0);
            const totalDonatur = programDonations.length;
            const pTargetRp = Number(p.target_rp) || 0;
            const pTerkumpulRp = Number(p.terkumpul_rp) || 0;
            const pDonatur = Number(p.donatur) || 0;
            
            let percentage = 0;
            if (pTargetRp > 0 && totalTerkumpul > 0) {
              const rawPct = (totalTerkumpul / pTargetRp) * 100;
              percentage = rawPct < 1 ? 1 : Math.min(100, Math.round(rawPct));
            }

            // Auto-heal database if out of sync
            if (pTerkumpulRp !== totalTerkumpul || pDonatur !== totalDonatur) {
               supabase.from('programs').update({
                  terkumpul_rp: totalTerkumpul,
                  terkumpul_persen: percentage,
                  donatur: totalDonatur
               }).eq('id', p.id).then();
            }

            return {
              id: p.id,
              kategori: p.kategori,
              judul: p.judul,
              deskripsi: p.deskripsi,
              terkumpulPersen: percentage,
              terkumpulRp: totalTerkumpul,
              targetRp: pTargetRp,
              donatur: totalDonatur,
              gambar: p.gambar
            };
          });
          setPrograms(formattedPrograms);
          }
        }

        // Fetch Jamaah
        const { data: jamaahData, error: jamaahErr } = await supabase.from('registered_jamaah').select('*').order('created_at', { ascending: false });
        if (!jamaahErr && jamaahData && jamaahData.length > 0) {
          const formattedJamaah = jamaahData.map((j: any) => ({
            n: j.nama, c: j.kontak, e: j.email || '', s: j.status, p: j.password
          }));
          setRegisteredJamaahList(formattedJamaah);
        }

        // Fetch Audit Logs
        const { data: auditData, error: auditErr } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
        if (!auditErr && auditData && auditData.length > 0) {
          const formattedAudit = auditData.map((a: any) => ({
            w: a.waktu, n: a.nama, r: a.peran, a: a.kontak, ac: a.aksi, d: a.deskripsi, c: a.warna_class
          }));
          setAuditLogs(formattedAudit);
        }
        
        // Remove error state on success
        setErrorLoad(null);
      } catch (err: any) {
        console.error('Error fetching data from Supabase:', err);
        setErrorLoad('Gagal memuat data dari server. Mohon periksa koneksi internet Anda.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleAddDonation = async (programId: number, nominal: number) => {
    const updatedPrograms = programs.map(p => {
      if (p.id === programId) {
        const newTerkumpul = p.terkumpulRp + nominal;
        let percentage = 0;
        if (p.targetRp > 0 && newTerkumpul > 0) {
          const rawPct = (newTerkumpul / p.targetRp) * 100;
          percentage = rawPct < 1 ? 1 : Math.min(100, Math.round(rawPct));
        }

        return {
          ...p,
          terkumpulRp: newTerkumpul,
          terkumpulPersen: percentage,
          donatur: p.donatur + 1
        };
      }
      return p;
    });

    setPrograms(updatedPrograms);

    // Update to Supabase
    const programToUpdate = updatedPrograms.find(p => p.id === programId);
    if (programToUpdate) {
      const { error } = await supabase
        .from('programs')
        .update({
          terkumpul_rp: programToUpdate.terkumpulRp,
          terkumpul_persen: programToUpdate.terkumpulPersen,
          donatur: programToUpdate.donatur
        })
        .eq('id', programId);
        
      if (error) {
        console.error('Error updating program to Supabase:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7FBF4] dark:bg-slate-950 transition-colors duration-300">
        <div className="w-16 h-16 border-4 border-lime-200 border-t-lime-600 rounded-full animate-spin shadow-lg"></div>
        <p className="mt-6 text-lime-800 dark:text-lime-400 font-bold tracking-widest uppercase text-sm animate-pulse">Menghubungkan ke Server...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 relative flex flex-col ${
      isDarkMode 
        ? 'dark bg-slate-950 text-slate-100 selection:bg-green-400 selection:text-white' 
        : 'bg-[#F7FBF4] text-[#1A1A1A] selection:bg-green-400 selection:text-white'
    }`}>
      
      {errorLoad && (
        <div className="bg-red-500/90 backdrop-blur-sm text-white px-4 py-2 text-center text-sm font-medium z-[100] sticky top-0 flex items-center justify-center gap-4">
          <span>{errorLoad}</span>
          <button onClick={() => window.location.reload()} className="px-3 py-1 bg-white text-red-600 rounded-md hover:bg-red-50 transition-colors shadow-sm font-bold">
            Muat Ulang
          </button>
        </div>
      )}

      {/* Navigation Header Always Visible */}
      <Header 
        onLoginClick={() => {
          if ((isAdmin || isJamaahLoggedIn) && !showPortal) {
            setShowPortal(true);
          } else {
            setIsLoginModalOpen(true);
          }
        }} 
        onAiClick={() => setIsAiModalOpen(true)} 
        onQuranClick={() => setIsQuranModalOpen(true)}
        onPanduanClick={() => setShowGlobalPanduanModal(true)}
        onNavClick={() => {
          // Hide portal to show Beranda, without logging out
          setShowPortal(false);
        }}
        isDarkMode={isDarkMode}
        onToggleDarkMode={toggleDarkMode}
        isAutoNight={isAutoNight}
        isLoggedIn={isAdmin || isJamaahLoggedIn}
        loggedInText={isAdmin ? 'Portal Admin' : 'Portal Jamaah'}
      />
      
      <main className="flex-1 flex flex-col">
        {(isAdmin && showPortal) ? (
          <div className="flex-1">
            <AdminDashboard 
              adminRole={adminRole}
              onBack={() => {
                logAudit('Pengurus DKM', adminRole.toUpperCase(), 'admin@masjid.id', 'LOGOUT', 'User berhasil keluar (logout) dari sistem Admin', 'bg-red-900/50 text-red-600');
                setIsAdmin(false);
                setShowPortal(false);
              }} 
              programs={programs} 
              onAddDonation={handleAddDonation} 
              homeVisibility={homeVisibility}
              setHomeVisibility={setHomeVisibility}
              registeredJamaahList={registeredJamaahList}
              donasiHistory={donasiHistory}
              onVerifyDonasi={handleVerifyDonasi}
              onAddDonasiHistoryItem={(newItem: any) => setDonasiHistory(prev => [newItem, ...prev])}
              auditLogs={auditLogs}
            />
          </div>
        ) : (isJamaahLoggedIn && showPortal) ? (
          <div className="flex-1">
            <JamaahDashboard 
              nama={namaJamaah} 
              kontak={kontakJamaah} 
              onBack={() => {
                logAudit(namaJamaah, 'JAMAAH', kontakJamaah, 'LOGOUT', 'User berhasil keluar (logout) dari Portal Jamaah', 'bg-red-900/50 text-red-600');
                setIsJamaahLoggedIn(false);
                setShowPortal(false);
                setNamaJamaah('Hamba Allah');
                setKontakJamaah('');
              }} 
              donasiHistory={donasiHistory}
            />
          </div>
        ) : (
          <>
            {/* Home / Beranda Sections */}
        <Hero />
        {homeVisibility.showJadwal && <JadwalShalatCard />}
        
        {/* Banner Button Al-Qur'an Digital di Beranda */}
        {homeVisibility.showQuran && (
          <section id="quran-beranda" className="max-w-7xl mx-auto px-4 py-8">
            <div className="bg-gradient-to-r from-emerald-800 via-lime-700 to-green-700 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 border border-lime-500/30">
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="z-10 max-w-2xl space-y-4 text-center md:text-left">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 text-lime-200 text-xs font-extrabold uppercase tracking-wider backdrop-blur-md">
                  📖 Kitab Suci Al-Qur'an Digital 30 Juz
                </span>
                <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight leading-tight text-white drop-shadow-sm">
                  Membaca & Memahami Al-Qur'an Kapan Saja
                </h2>
                <p className="text-lime-100 text-sm md:text-base leading-relaxed">
                  Akses 114 Surah Al-Qur'an lengkap dengan Audio Qari Murottal, terjemahan Indonesia, Tafsir Kemenag, petunjuk Tajwid berwarna, serta fitur penanda bacaan (*Bookmark*).
                </p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                  <button
                    onClick={() => setIsQuranModalOpen(true)}
                    className="px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-extrabold rounded-2xl shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <BookOpen className="w-5 h-5 text-amber-950" /> Buka Al-Qur'an Digital (114 Surah)
                  </button>
                </div>
              </div>

              <div className="z-10 flex flex-col items-center justify-center bg-white/10 p-6 rounded-2xl backdrop-blur-md border border-white/20 shrink-0 text-center w-full md:w-auto">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
                  <BookOpen className="w-8 h-8 text-amber-300" />
                </div>
                <p className="text-xs font-bold text-lime-100 uppercase tracking-widest">Akses Gratis 100%</p>
                <p className="text-xl font-bold text-white mt-1">114 Surah & Audio MP3</p>
                <button
                  onClick={() => setIsQuranModalOpen(true)}
                  className="mt-4 w-full py-2.5 px-5 bg-white text-emerald-800 hover:bg-lime-50 font-extrabold text-xs rounded-xl transition-colors shadow-md cursor-pointer"
                >
                  Baca Surah & Ayat ➔
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Kalender Kegiatan */}
        {homeVisibility.showKalender && <KalenderKegiatan />}

        {/* ZISWAF Programs */}
        {homeVisibility.showZiswaf && <DaftarProgram programs={programs} onDonate={handleDonateSubmit} loggedInName={isJamaahLoggedIn ? namaJamaah : ''} loggedInContact={isJamaahLoggedIn ? kontakJamaah : ''} />}

        {/* Al-Quran Digital - Modal Reader */}
        <Suspense fallback={null}>
          <AlQuranDigital 
            isOpenModal={isQuranModalOpen} 
            onCloseModal={() => setIsQuranModalOpen(false)} 
          />
        </Suspense>

        {/* Tentang Kami */}
        {homeVisibility.showTentang && (
          <div id="tentang">
            <ProfilMasjid />
          </div>
        )}

        {/* Kontak Kami & Media Sosial */}
        <div id="kontak">
          <LokasiKontak />
        </div>
        <MediaSosial />
          </>
        )}
      </main>

      {/* Floating Button to Return to Portal */}
      {(!showPortal && (isAdmin || isJamaahLoggedIn)) && (
        <div className="fixed bottom-6 right-6 z-[60] animate-bounce">
          <button
            onClick={() => setShowPortal(true)}
            className="flex items-center gap-2 px-6 py-4 bg-lime-600 hover:bg-lime-700 text-white rounded-full shadow-[0_10px_40px_-10px_rgba(101,163,13,1)] font-bold border-4 border-white dark:border-slate-800 transition-all cursor-pointer"
          >
            <LayoutDashboard className="w-6 h-6" /> 
            Buka Portal Anda
          </button>
        </div>
      )}

      {/* Footer */}
      {!isAdmin && !isJamaahLoggedIn && <Footer onNavigate={() => {}} onOpenWakafModal={() => {}} />}

      {/* Modals */}
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        onAdminLogin={(role) => {
          setIsAdmin(true);
          setAdminRole(role || 'direktur');
          setShowPortal(true);
          logAudit('Pengurus DKM', (role || 'direktur').toUpperCase(), 'admin@masjid.id', 'LOGIN', `Admin (${role || 'direktur'}) berhasil login ke sistem`, 'bg-lime-900/50 text-lime-600');
        }}
        onJamaahLogin={(nama, kontak) => {
          setIsJamaahLoggedIn(true);
          setShowPortal(true);
          setNamaJamaah(nama);
          setKontakJamaah(kontak);
          localStorage.setItem('masjid_user_name', nama);
          localStorage.setItem('masjid_user_phone', kontak);
          logAudit(nama, 'JAMAAH', kontak, 'LOGIN', 'Jamaah berhasil login ke portal', 'bg-blue-900/50 text-blue-600');
        }}
        registeredJamaahList={registeredJamaahList}
        onRegisterJamaah={(jamaah) => {
          handleRegisterJamaah(jamaah);
          logAudit(jamaah.n, 'JAMAAH_BARU', jamaah.c || jamaah.e, 'REGISTER', 'Registrasi jamaah baru berhasil dilakukan', 'bg-blue-900/50 text-blue-600');
        }}
      />
      <Suspense fallback={null}>
        <AiAsistenModal 
          isOpen={isAiModalOpen} 
          onClose={() => setIsAiModalOpen(false)} 
          onOpenWakaf={() => {
            setIsAiModalOpen(false);
            document.getElementById('ziswaf')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
        <BukuPanduanModal
          isOpen={showGlobalPanduanModal}
          onClose={() => setShowGlobalPanduanModal(false)}
          defaultRole={isAdmin ? 'admin' : 'jamaah'}
        />
      </Suspense>
    </div>
  );
}
