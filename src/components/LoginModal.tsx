import React, { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, UserCheck, ArrowRight, Sparkles, CheckCircle2, KeyRound, HelpCircle, ChevronDown, ChevronUp, HeartHandshake, BookOpen, Bell, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminLogin: (role?: string) => void;
  onJamaahLogin: (nama: string, kontak: string) => void;
  registeredJamaahList?: any[];
  onRegisterJamaah?: (jamaah: any) => void;
}

export const normalizeContact = (str: string) => {
  if (!str) return '';
  let clean = str.trim().toLowerCase();
  if (clean.includes('@')) return clean;
  let digits = clean.replace(/\D/g, '');
  if (digits.startsWith('62')) {
    digits = '0' + digits.slice(2);
  }
  return digits;
};

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onAdminLogin,
  onJamaahLogin,
  registeredJamaahList = [],
  onRegisterJamaah
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset_step'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showJamaahGuide, setShowJamaahGuide] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [namaJamaah, setNamaJamaah] = useState('');

  // Reset Password State
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetTargetUser, setResetTargetUser] = useState<any>(null);

  if (!isOpen) return null;

  const handleResetState = () => {
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleResetState();

    const identifier = loginIdentifier.trim();
    const pass = password.trim();
    const targetClean = normalizeContact(identifier);

    const userMap = new Map();
    registeredJamaahList.forEach((u: any) => {
      if (u) {
        const key = (u.c || u.e || u.n || '').toLowerCase();
        if (key) userMap.set(key, u);
      }
    });
    const allUsers: any[] = Array.from(userMap.values());

    if (mode === 'register') {
      const nama = namaJamaah.trim();
      if (!nama) {
        setErrorMsg('Nama lengkap wajib diisi!');
        return;
      }
      if (!identifier) {
        setErrorMsg('Email atau No. Handphone wajib diisi!');
        return;
      }
      if (!pass || pass.length < 6) {
        setErrorMsg('Password wajib diisi (minimal 6 karakter)!');
        return;
      }

      // Check if user already exists
      const exists = allUsers.find((u: any) => {
        if (!u) return false;
        const uc = normalizeContact(u.c || '');
        const ue = normalizeContact(u.e || '');
        return (uc && uc === targetClean) || (ue && ue === targetClean);
      });

      if (exists) {
        setErrorMsg('Kontak atau Email ini sudah terdaftar! Silakan pilih Masuk.');
        return;
      }

      let e = '';
      let phone = '';
      if (identifier.includes('@')) {
        e = identifier.toLowerCase();
      } else {
        phone = targetClean;
      }

      const joinedAt = new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      const userKey = phone || e || targetClean;
      
      const newJamaahObj = { n: nama, c: phone, e: e, s: 'Aktif', p: pass, joinedAt };

      if (onRegisterJamaah) {
        onRegisterJamaah(newJamaahObj);
      }
      onJamaahLogin(nama, phone || e || identifier);
      onClose();
    } else if (mode === 'login') {
      // Unified Login Mode
      if (!identifier) {
        setErrorMsg('Username/Email/No. Handphone wajib diisi!');
        return;
      }
      if (!pass) {
        setErrorMsg('Password wajib diisi!');
        return;
      }

      const lowerId = identifier.trim().toLowerCase();

      // Strict Admin / DKM Role Detection
      const isAdminIdentifier = 
        lowerId === 'admin' || 
        lowerId === 'dkm' || 
        lowerId === 'petugas' ||
        lowerId === 'admin@masjid.com' ||
        lowerId === 'admin@citrasentul.id' ||
        targetClean === 'admin' ||
        lowerId === 'direktur' ||
        lowerId === 'ketua' ||
        lowerId === 'bendahara' ||
        lowerId === 'keuangan' ||
        lowerId === 'staff';

      if (isAdminIdentifier) {
        if (pass === 'admin123' || pass === 'admin') {
          let role = 'direktur'; // Default role
          if (lowerId === 'bendahara' || lowerId === 'keuangan') {
            role = 'bendahara';
          } else if (lowerId === 'staff' || lowerId === 'petugas') {
            role = 'staff';
          } else if (lowerId === 'direktur' || lowerId === 'ketua' || lowerId === 'dkm' || lowerId === 'admin') {
            role = 'direktur';
          }
          
          onAdminLogin(role);
          onClose();
          return;
        } else {
          setErrorMsg('Kata sandi Admin/DKM salah! Silakan coba lagi.');
          return;
        }
      }

      // Check Jamaah by matching normalized contact/email and password
      const matchedUser = allUsers.find((u: any) => {
        if (!u) return false;
        const uc = normalizeContact(u.c || '');
        const ue = normalizeContact(u.e || '');
        const passwordMatch = u.p && u.p.trim() === pass;
        return (uc === targetClean || ue === targetClean) && passwordMatch;
      });

      if (matchedUser) {
        onJamaahLogin(matchedUser.n || matchedUser.c || matchedUser.e || 'Jamaah', matchedUser.c || matchedUser.e || identifier);
        onClose();
        return;
      }

      // Check if user exists but password mismatch
      const userExistNoPass = allUsers.find((u: any) => {
        if (!u) return false;
        const uc = normalizeContact(u.c || '');
        const ue = normalizeContact(u.e || '');
        return uc === targetClean || ue === targetClean;
      });

      if (userExistNoPass) {
        setErrorMsg('Kata sandi salah! Periksa besar/kecil huruf password Anda atau gunakan "Lupa Password?".');
      } else {
        setErrorMsg('Akun belum terdaftar! Klik "Daftar sekarang" di bawah untuk mendaftar akun baru.');
      }
    }
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setResetMsg('');

    const target = resetEmail.trim();
    if (!target) {
      setErrorMsg('Masukkan Email atau Nomor Handphone terdaftar!');
      return;
    }

    const cleanTarget = normalizeContact(target);

    // Call Supabase Auth reset if email
    if (target.includes('@')) {
      try {
        await supabase.auth.resetPasswordForEmail(target, {
          redirectTo: window.location.origin,
        });
      } catch (err) {
        console.log('Supabase reset note:', err);
      }
    }

    const allUsers = registeredJamaahList;

    const found = allUsers.find((u: any) => {
      if (!u) return false;
      const uc = normalizeContact(u.c || '');
      const ue = normalizeContact(u.e || '');
      return uc === cleanTarget || ue === cleanTarget;
    });

    setResetTargetUser(found || { n: 'Jamaah Masjid', c: target.includes('@') ? '' : cleanTarget, e: target.includes('@') ? target : '' });
    setResetMsg(`Instruksi & Link Reset Password telah dikirim ke ${target}. Silakan buat kata sandi baru Anda di bawah ini:`);
    setMode('reset_step');
  };

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const pass = newPassword.trim();
    if (!pass || pass.length < 6) {
      setErrorMsg('Password baru wajib diisi (minimal 6 karakter)!');
      return;
    }

    const cleanTarget = resetTargetUser ? normalizeContact(resetTargetUser.c || resetTargetUser.e || resetEmail) : normalizeContact(resetEmail);

    const updateSupabase = async () => {
      try {
        if (cleanTarget) {
          await supabase.from('registered_jamaah').update({ password: pass }).eq('kontak', cleanTarget);
        }
      } catch (e) {
        console.error('Failed to reset password in Supabase:', e);
      }
    };
    
    updateSupabase();

    // Return back to the initial login screen (menu awal untuk masuk ulang)
    setLoginIdentifier(resetEmail || cleanTarget);
    setPassword('');
    setNewPassword('');
    setResetEmail('');
    setMode('login');
    alert('✅ Password berhasil diperbarui! Silakan masuk kembali menggunakan password baru Anda.');
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md flex flex-col overflow-hidden shadow-2xl border border-lime-200/50 dark:border-slate-800 my-auto relative z-10">
        
        {/* Header - Single Unified Portal Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-lime-700 to-emerald-900 text-white p-5 flex items-center justify-between relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-lg pointer-events-none"></div>
          <div className="flex gap-3 items-center z-10">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              {mode === 'forgot' || mode === 'reset_step' ? (
                <KeyRound className="w-5 h-5 text-lime-200" />
              ) : (
                <UserCheck className="w-5 h-5 text-lime-200" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif leading-tight flex items-center gap-1.5">
                {mode === 'forgot' || mode === 'reset_step' ? 'Reset Kata Sandi' : 'Portal Login Terpadu'}
                <Sparkles className="w-3.5 h-3.5 text-lime-300 inline" />
              </h2>
              <p className="text-xs tracking-wider text-lime-100 uppercase font-semibold">Masjid Citra Sentul Raya</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors z-10 cursor-pointer"
            aria-label="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          
          {/* FORGOT PASSWORD FORM STEP 1 */}
          {mode === 'forgot' && (
            <form onSubmit={handleSendResetLink} className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3.5 rounded-2xl text-center">
                <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1.5">
                  <KeyRound className="w-4 h-4" /> Lupa Kata Sandi Akun?
                </h3>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                  Masukkan Email atau No. Handphone terdaftar Anda. Kami akan mengirimkan verifikasi reset password.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email atau No. Handphone Terdaftar <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={resetEmail}
                    onChange={(e) => { setResetEmail(e.target.value); handleResetState(); }}
                    placeholder="Contoh: 081517045406 atau email@domain.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-amber-500 focus:outline-none text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800"
                    required
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-bold border border-red-200 dark:border-red-900/50">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer mt-2 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700"
              >
                Kirim Link Reset Password
                <ArrowRight className="w-4.5 h-4.5" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setMode('login'); handleResetState(); }}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold cursor-pointer"
                >
                  ← Kembali ke Login
                </button>
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD FORM STEP 2 (SET NEW PASSWORD) */}
          {mode === 'reset_step' && (
            <form onSubmit={handleSaveNewPassword} className="space-y-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3.5 rounded-2xl text-left">
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 leading-relaxed flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>{resetMsg}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Masukkan Kata Sandi Baru <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); handleResetState(); }}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-bold border border-red-200 dark:border-red-900/50">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                Simpan Password Baru & Masuk
                <ArrowRight className="w-4.5 h-4.5" />
              </button>
            </form>
          )}

          {/* LOGIN / REGISTER FORM */}
          {(mode === 'login' || mode === 'register') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Mode Register Banner Header */}
              {mode === 'register' && (
                <div className="bg-lime-50 dark:bg-lime-950/40 border border-lime-200 dark:border-lime-800 p-3 rounded-2xl mb-2 text-center">
                  <h3 className="text-sm font-bold text-lime-800 dark:text-lime-300">Pendaftaran Akun Jamaah Baru</h3>
                  <p className="text-[11px] text-lime-700 dark:text-lime-400 mt-0.5">Isi data diri di bawah ini untuk membuat akun jamaah</p>
                </div>
              )}

              {/* Nama Lengkap (Only in Register mode) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={namaJamaah}
                    onChange={(e) => { setNamaJamaah(e.target.value); handleResetState(); }}
                    placeholder="Masukkan nama lengkap Anda"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-lime-500 focus:outline-none text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800"
                    required
                  />
                </div>
              )}

              {/* Field Username / Contact */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {mode === 'login' ? 'Username / Email / No. Handphone' : 'Email atau No. Handphone'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4.5 h-4.5 text-lime-600 dark:text-lime-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => { setLoginIdentifier(e.target.value); handleResetState(); }}
                    placeholder={mode === 'login' ? 'Masukkan ID Anda' : 'Contoh: 08123456789 atau user@email.com'}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-lime-500 focus:outline-none text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800"
                    required
                  />
                </div>
              </div>

              {/* Field Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi (Password) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4.5 h-4.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      handleResetState();
                    }}
                    placeholder={mode === 'register' ? 'Minimal 6 karakter' : 'Masukkan password'}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-lime-500 focus:outline-none text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              {/* Lupa Password Link for Login Mode */}
              {mode === 'login' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(loginIdentifier);
                      setMode('forgot');
                      handleResetState();
                    }}
                    className="text-xs text-lime-600 dark:text-lime-400 font-semibold hover:underline cursor-pointer"
                  >
                    Lupa Password?
                  </button>
                </div>
              )}

              {/* Error Message Display */}
              {errorMsg && (
                <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-bold border border-red-200 dark:border-red-900/50 leading-relaxed">
                  {errorMsg}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer mt-2 bg-gradient-to-r from-lime-600 to-emerald-600 hover:from-lime-700 hover:to-emerald-700"
              >
                {mode === 'login' ? 'Masuk Portal' : 'Daftar Akun Baru'}
                <ArrowRight className="w-4.5 h-4.5" />
              </button>
            </form>
          )}

          {/* Bottom Footer - Small Link for "Daftar / Masuk" */}
          {(mode === 'login' || mode === 'register') && (
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-center space-y-3">
              {mode === 'login' ? (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Belum punya akun jamaah?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      handleResetState();
                    }}
                    className="font-semibold text-[11px] text-lime-600 dark:text-lime-400 hover:text-lime-700 hover:underline cursor-pointer ml-0.5"
                  >
                    Daftar sekarang
                  </button>
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sudah punya akun?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      handleResetState();
                    }}
                    className="font-semibold text-[11px] text-lime-600 dark:text-lime-400 hover:text-lime-700 hover:underline cursor-pointer ml-0.5"
                  >
                    Masuk sekarang
                  </button>
                </p>
              )}

              {/* Section Panduan Akun & Fitur Portal Jamaah */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowJamaahGuide(!showJamaahGuide)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-lime-50/80 dark:bg-lime-950/40 border border-lime-200/80 dark:border-lime-900/60 text-lime-800 dark:text-lime-300 hover:bg-lime-100/80 dark:hover:bg-lime-900/40 transition-all text-xs font-bold cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-left">
                    <HelpCircle className="w-4 h-4 text-lime-600 dark:text-lime-400 shrink-0" />
                    <span>Panduan Akun & Fitur Portal Jamaah</span>
                  </span>
                  {showJamaahGuide ? (
                    <ChevronUp className="w-4 h-4 text-lime-600 dark:text-lime-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-lime-600 dark:text-lime-400 shrink-0" />
                  )}
                </button>

                {showJamaahGuide && (
                  <div className="mt-2.5 p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-left text-xs space-y-3.5 animate-in fade-in duration-200 shadow-inner">
                    {/* 1. Cara Pembuatan Akun */}
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-lime-700 dark:text-lime-400">
                        <UserCheck className="w-3.5 h-3.5" /> Cara Pembuatan Akun Jamaah
                      </h4>
                      <ol className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300 list-decimal list-inside pl-0.5 leading-relaxed">
                        <li>Klik link <strong className="text-lime-700 dark:text-lime-400">Daftar sekarang</strong> pada modal ini.</li>
                        <li>Isi <strong>Nama Lengkap</strong>, <strong>Email / No. HP (WhatsApp)</strong>, & <strong>Password</strong>.</li>
                        <li>Klik <strong>Daftar Akun Baru</strong>. Akun Anda langsung aktif tanpa perlu verifikasi manual.</li>
                        <li>Gunakan Email / No. HP & Password tersebut untuk masuk kapan saja.</li>
                      </ol>
                    </div>

                    {/* 2. Fitur Portal Jamaah */}
                    <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Isi & Fitur Portal Jamaah
                      </h4>
                      <ul className="space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                        <li className="flex items-start gap-2">
                          <HeartHandshake className="w-3.5 h-3.5 text-lime-600 dark:text-lime-400 shrink-0 mt-0.5" />
                          <span><strong>Infak & Wakaf Digital:</strong> Berdonasi instan via QRIS/BSI & unduh <em>E-Sertifikat Wakaf</em> resmi.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span><strong>Pengingat Sedekah Bulanan:</strong> Notifikasi istiqomah rutin otomatis via WhatsApp/Portal.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span><strong>Al-Qur'an Digital 30 Juz:</strong> 114 Surah, terjemahan Indonesia, & audio murottal MP3.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <span><strong>Histori & Laporan Transparan:</strong> Cek riwayat donasi pribadi & transparansi kas masjid real-time.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
