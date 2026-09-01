import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp, 
  AlertTriangle, PlusCircle, ShieldCheck, UserCheck, Check, X, FileText 
} from 'lucide-react';
import { 
  INITIAL_ANGGARAN_LIST, INITIAL_PENGAJUAN_LIST, INITIAL_CHART_OF_ACCOUNTS, 
  AnggaranItem, PengajuanPengeluaran, JurnalEntry 
} from '../data/akuntansiData';
import { supabase } from '../lib/supabase';

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const STATUS_COLOR: Record<string, string> = {
  'Draft': 'bg-slate-100 text-slate-600 border-slate-200',
  'Menunggu Persetujuan Bendahara': 'bg-lime-100 text-lime-800 border-lime-200',
  'Menunggu Bendahara': 'bg-lime-100 text-lime-800 border-lime-200',
  'Menunggu Persetujuan Ketua': 'bg-orange-100 text-orange-800 border-orange-200',
  'Menunggu Ketua': 'bg-orange-100 text-orange-800 border-orange-200',
  'Menunggu Persetujuan Direktur': 'bg-lime-100 text-lime-800 border-lime-200',
  'Menunggu Direktur': 'bg-lime-100 text-lime-800 border-lime-200',
  'Disetujui': 'bg-lime-100 text-lime-800 border-lime-200',
  'Ditolak': 'bg-rose-100 text-rose-800 border-rose-200',
};

const APPROVAL_LEVELS = [
  { level: 1, role: 'Bendahara', name: 'H. Ahmad', color: 'bg-lime-500' },
  { level: 2, role: 'Ketua DKM', name: 'Ustadz H. M. Zainuddin', color: 'bg-orange-500' },
  { level: 3, role: 'Direktur', name: 'Prof. Dr. M. Syafii Antonio', color: 'bg-lime-600' },
];

interface ModulAnggaranApprovalProps {
  onAutoPostJournal?: (entry: JurnalEntry) => void;
  adminRole?: string;
  appSettings?: any;
}

export const ModulAnggaranApproval: React.FC<ModulAnggaranApprovalProps> = ({ onAutoPostJournal, adminRole = 'direktur', appSettings }) => {
  const [tab, setTab] = useState<'anggaran' | 'pengajuan' | 'tambah'>('pengajuan');
  const [anggaranList, setAnggaranList] = useState<AnggaranItem[]>(INITIAL_ANGGARAN_LIST);
  const [pengajuanList, setPengajuanList] = useState<PengajuanPengeluaran[]>(INITIAL_PENGAJUAN_LIST);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: anggaranData } = await supabase.from('anggaran').select('*').order('created_at', { ascending: false });
    const { data: pengajuanData } = await supabase.from('pengajuan_pengeluaran').select('*').order('created_at', { ascending: false });
    
    if (anggaranData && anggaranData.length > 0) {
      setAnggaranList(anggaranData.map((d: any) => ({
        id: d.id,
        tahun: d.tahun,
        bulan: d.bulan,
        kategori: d.kategori,
        namaKegiatan: d.nama_kegiatan,
        kodeAkun: d.kode_akun,
        jumlahDianggarkan: Number(d.jumlah_dianggarkan),
        jumlahRealisasi: Number(d.jumlah_realisasi),
        status: d.status,
        dibuatOleh: d.dibuat_oleh,
        riwayatApproval: d.riwayat_approval || []
      })));
    }
    
    if (pengajuanData && pengajuanData.length > 0) {
      setPengajuanList(pengajuanData.map((d: any) => ({
        id: d.id,
        tanggal: d.tanggal,
        noPengajuan: d.no_pengajuan,
        judul: d.judul,
        keterangan: d.keterangan,
        kodeAkun: d.kode_akun,
        namaAkun: d.nama_akun,
        jumlah: Number(d.jumlah),
        dibuatOleh: d.dibuat_oleh,
        rolePermohon: d.role_permohon,
        status: d.status,
        stepAktif: d.step_aktif,
        riwayatApproval: d.riwayat_approval || []
      })));
    }
  };

  // Role Approval tied to logged-in user
  const currentTestingRole = adminRole === 'bendahara' ? 'Bendahara' : adminRole === 'ketua' ? 'Ketua DKM' : adminRole === 'direktur' ? 'Direktur' : 'Staf';
  const [approvalNote, setApprovalNote] = useState('');

  // Form Pengajuan State
  const [formJudul, setFormJudul] = useState('');
  const [formKodeAkun, setFormKodeAkun] = useState('5-1200');
  const [formJumlah, setFormJumlah] = useState('');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formPermohon, setFormPermohon] = useState('Staf Operasional Masjid');

  const totalAnggaran = anggaranList.reduce((s, a) => s + a.jumlahDianggarkan, 0);
  const totalRealisasi = anggaranList.reduce((s, a) => s + a.jumlahRealisasi, 0);
  const pendingCount = pengajuanList.filter(p => p.status !== 'Disetujui' && p.status !== 'Ditolak').length;

  // Execute Approval action for a request
  const handleApprovalAction = (pengajuanId: string, action: 'Disetujui' | 'Ditolak') => {
    const updated = pengajuanList.map(p => {
      if (p.id !== pengajuanId) return p;

      const currentStepIdx = p.riwayatApproval.findIndex(r => r.role === currentTestingRole);
      if (currentStepIdx === -1) return p;

      const newRiwayat = [...p.riwayatApproval];
      newRiwayat[currentStepIdx] = {
        ...newRiwayat[currentStepIdx],
        aksi: action,
        catatan: approvalNote || (action === 'Disetujui' ? 'Disetujui & diverifikasi' : 'Ditolak'),
        tanggal: new Date().toISOString().split('T')[0],
      };

      let newStatus = p.status;
      let newStepAktif = p.stepAktif;

      if (action === 'Ditolak') {
        newStatus = 'Ditolak';
      } else {
        if (currentTestingRole === 'Bendahara') {
          newStatus = 'Menunggu Ketua';
          newStepAktif = 2;
        } else if (currentTestingRole === 'Ketua DKM') {
          newStatus = 'Menunggu Direktur';
          newStepAktif = 3;
        } else if (currentTestingRole === 'Direktur') {
          newStatus = 'Disetujui';
          newStepAktif = 4;

          // Auto Post Journal Entry upon Level 3 (Direktur) Final Signoff
          const autoJournal: JurnalEntry = {
            id: `JU-AUTO-${Date.now()}`,
            tanggal: new Date().toISOString().split('T')[0],
            noBukti: `BKK-${p.noPengajuan}`,
            keterangan: `Pencairan Pengeluaran Anggaran: ${p.judul} (Persetujuan Direktur)`,
            sumber: 'Anggaran',
            baris: [
              { kodeAkun: p.kodeAkun, namaAkun: `${p.namaAkun} (Debit)`, debit: p.jumlah, kredit: 0 },
              { kodeAkun: '1-1200', namaAkun: 'Bank BSI - Rekening Operasional (Kredit)', debit: 0, kredit: p.jumlah },
            ],
            status: 'Posted',
            dibuatOleh: 'Sistem Approval Direktur',
            tanggalBuat: new Date().toISOString().split('T')[0],
          };

          if (onAutoPostJournal) onAutoPostJournal(autoJournal);

          // Update Anggaran realization
          setAnggaranList(prev => prev.map(a => {
            if (a.kodeAkun === p.kodeAkun) {
              return { ...a, jumlahRealisasi: a.jumlahRealisasi + p.jumlah };
            }
            return a;
          }));
        }
      }

      return {
        ...p,
        status: newStatus,
        stepAktif: newStepAktif,
        riwayatApproval: newRiwayat,
      };
    });

    setPengajuanList(updated);
    setApprovalNote('');
    
    // Save back to supabase
    const toUpdate = updated.find(u => u.id === pengajuanId);
    if (toUpdate) {
      supabase.from('pengajuan_pengeluaran').update({
        status: toUpdate.status,
        step_aktif: toUpdate.stepAktif,
        riwayat_approval: toUpdate.riwayatApproval
      }).eq('id', pengajuanId).then();
    }

    alert(
      action === 'Disetujui'
        ? `Pengeluaran disetujui oleh ${currentTestingRole}! ${
            currentTestingRole === 'Direktur'
              ? '✨ Final Approval Direktur tercapai. Jurnal pencairan otomatis diposting!'
              : 'Diteruskan ke level approval berikutnya.'
          }`
        : `Pengeluaran ditolak oleh ${currentTestingRole}.`
    );
  };

  const handleCreatePengajuan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJudul || !formJumlah) return;

    const selectedAkunObj = INITIAL_CHART_OF_ACCOUNTS.find(a => a.kode === formKodeAkun);
    const nominal = parseInt(formJumlah.replace(/\D/g, ''), 10) || 0;

    const newPengajuan: PengajuanPengeluaran = {
      id: `PG-${Date.now()}`,
      tanggal: new Date().toISOString().split('T')[0],
      noPengajuan: `PGJ-2026-07-00${pengajuanList.length + 1}`,
      judul: formJudul,
      keterangan: formKeterangan || formJudul,
      kodeAkun: formKodeAkun,
      namaAkun: selectedAkunObj ? selectedAkunObj.nama : 'Beban Operasional',
      jumlah: nominal,
      dibuatOleh: 'Jamaah / Staf DKM',
      rolePermohon: formPermohon,
      status: 'Menunggu Bendahara',
      stepAktif: 1,
      riwayatApproval: [
        { level: 1, role: 'Bendahara', nama: appSettings?.nama_bendahara || 'Bendahara', aksi: 'Menunggu' },
        { level: 2, role: 'Ketua DKM', nama: appSettings?.nama_dkm || 'Ketua DKM', aksi: 'Menunggu' },
        { level: 3, role: 'Direktur', nama: appSettings?.nama_direktur || 'Direktur', aksi: 'Menunggu' },
      ],
    };

    setPengajuanList([newPengajuan, ...pengajuanList]);
    
    // Insert into supabase
    supabase.from('pengajuan_pengeluaran').insert([{
      id: newPengajuan.id,
      tanggal: newPengajuan.tanggal,
      no_pengajuan: newPengajuan.noPengajuan,
      judul: newPengajuan.judul,
      keterangan: newPengajuan.keterangan,
      kode_akun: newPengajuan.kodeAkun,
      nama_akun: newPengajuan.namaAkun,
      jumlah: newPengajuan.jumlah,
      dibuat_oleh: newPengajuan.dibuatOleh,
      role_permohon: newPengajuan.rolePermohon,
      status: newPengajuan.status,
      step_aktif: newPengajuan.stepAktif,
      riwayat_approval: newPengajuan.riwayatApproval
    }]).then(({ error }) => {
      if (!error) {
        supabase.from('notifications').insert([{
          user_role: 'direktur',
          title: 'Permohonan Anggaran Baru',
          message: `Terdapat pengajuan baru: ${newPengajuan.noPengajuan} sebesar Rp ${newPengajuan.jumlah.toLocaleString('id-ID')}`,
          is_read: false
        }]).then();
      }
    });

    setTab('pengajuan');
    setExpandedId(newPengajuan.id);

    // Reset Form
    setFormJudul('');
    setFormJumlah('');
    setFormKeterangan('');
    alert('Pengajuan pengeluaran berhasil dikirim! Sekarang masuk ke alur review Bendahara.');
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Banner Header */}
      <div className="bg-gradient-to-r from-lime-900 via-lime-900 to-lime-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-lime-200" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">Rencana Anggaran & Approval Direktur</h2>
              <p className="text-lime-200 text-xs sm:text-sm">Workflow Persetujuan Bertingkat (Bendahara → Ketua DKM → Direktur)</p>
            </div>
          </div>
        </div>

        {/* Dynamic Metric Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10">
            <p className="text-xs text-lime-200 mb-1">Total Pagu Anggaran (RAPB)</p>
            <p className="font-black text-lg sm:text-xl font-mono">{formatRp(totalAnggaran)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10">
            <p className="text-xs text-lime-200 mb-1">Realisasi Pengeluaran</p>
            <p className="font-black text-lg sm:text-xl font-mono text-lime-300">{formatRp(totalRealisasi)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10">
            <p className="text-xs text-lime-200 mb-1">Menunggu Persetujuan</p>
            <p className="font-black text-lg sm:text-xl text-lime-300">{pendingCount} <span className="text-xs font-normal">Pengajuan</span></p>
          </div>
        </div>
      </div>

      {/* Active Role Indicator */}
      <div className="bg-lime-50 border border-lime-200 rounded-3xl p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-lime-700 shrink-0" />
          <div>
            <p className="text-xs font-bold text-lime-700 uppercase tracking-wider">Akses Otorisasi Saat Ini</p>
            <p className="font-extrabold text-sm text-lime-900">{currentTestingRole}</p>
          </div>
        </div>
        <div className="bg-white px-3 py-1.5 rounded-xl border border-lime-100 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-lime-600" />
          <span className="text-xs font-bold text-lime-800">Sesuai Akun Login</span>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={() => setTab('pengajuan')}
          className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
            tab === 'pengajuan'
              ? 'bg-lime-800 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Pengajuan Pengeluaran
          {pendingCount > 0 && (
            <span className="bg-lime-400 text-lime-950 text-xs font-black px-2 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('anggaran')}
          className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            tab === 'anggaran'
              ? 'bg-lime-800 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Rencana Anggaran RAPB 2026
        </button>
        <button
          onClick={() => setTab('tambah')}
          className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
            tab === 'tambah'
              ? 'bg-lime-800 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PlusCircle className="w-4 h-4" /> + Buat Pengajuan Baru
        </button>
      </div>

      {/* PENGAJUAN PENGELUARAN TAB */}
      {tab === 'pengajuan' && (
        <div className="space-y-4">
          {pengajuanList.map(item => {
            const isExpanded = expandedId === item.id;
            const needsActionFromCurrentRole = 
              (currentTestingRole === 'Bendahara' && item.status === 'Menunggu Bendahara') ||
              (currentTestingRole === 'Ketua DKM' && item.status === 'Menunggu Ketua') ||
              (currentTestingRole === 'Direktur' && item.status === 'Menunggu Direktur');

            return (
              <div key={item.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs hover:shadow-md transition-shadow">
                
                {/* Accordion Bar */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="w-full p-5 sm:p-6 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-lime-700 bg-lime-50 border border-lime-200 px-2.5 py-0.5 rounded-lg">
                          {item.noPengajuan}
                        </span>
                        <span className={`text-xs font-bold px-3 py-0.5 rounded-full border ${STATUS_COLOR[item.status] || 'bg-slate-100 text-slate-600'}`}>
                          {item.status}
                        </span>
                        {needsActionFromCurrentRole && (
                          <span className="bg-lime-400 text-lime-950 font-black text-xs px-2 py-0.5 rounded-md animate-pulse">
                            ⚠️ Butuh Persetujuan {currentTestingRole} Anda!
                          </span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">{item.judul}</h3>
                      <p className="text-xs text-slate-500">
                        Diajukan oleh: <span className="font-semibold text-slate-700">{item.dibuatOleh} ({item.rolePermohon})</span> • Tanggal: {item.tanggal}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Nominal Pengeluaran</p>
                        <p className="text-lg sm:text-xl font-black font-mono text-lime-800">{formatRp(item.jumlah)}</p>
                      </div>

                      <div className="p-2 bg-slate-100 rounded-xl text-slate-500">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Visual 3-Level Approval Stepper */}
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between max-w-xl mx-auto">
                      {item.riwayatApproval.map((step, idx) => (
                        <React.Fragment key={step.role}>
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white transition-all shadow-xs ${
                              step.aksi === 'Disetujui'
                                ? 'bg-lime-500 ring-4 ring-lime-100'
                                : step.aksi === 'Ditolak'
                                ? 'bg-rose-500 ring-4 ring-rose-100'
                                : 'bg-slate-300'
                            }`}>
                              {step.aksi === 'Disetujui' ? '✓' : step.aksi === 'Ditolak' ? '✗' : idx + 1}
                            </div>
                            <p className="text-xs font-bold text-slate-700 mt-1.5">{step.role}</p>
                            <p className={`text-[9px] font-semibold ${
                              step.aksi === 'Disetujui' ? 'text-lime-600' : step.aksi === 'Ditolak' ? 'text-rose-600' : 'text-slate-400'
                            }`}>
                              {step.aksi}
                            </p>
                          </div>

                          {idx < item.riwayatApproval.length - 1 && (
                            <div className={`flex-1 h-1 mx-2 rounded-full ${
                              item.riwayatApproval[idx + 1].aksi !== 'Menunggu' ? 'bg-lime-400' : 'bg-slate-200'
                            }`} />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </button>

                {/* Expanded Details & Approval Actions */}
                {isExpanded && (
                  <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-5">
                    
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Uraian & Rincian Kebutuhan Pengeluaran</p>
                      <p className="text-sm font-medium text-slate-800">{item.keterangan}</p>
                      <div className="flex items-center gap-2 text-xs font-semibold text-lime-700 pt-2 border-t border-slate-100">
                        <FileText className="w-4 h-4" /> Beban CoA: <span className="font-mono">{item.kodeAkun} – {item.namaAkun}</span>
                      </div>
                    </div>

                    {/* Timeline History */}
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Riwayat Pertimbangan & Otorisasi</p>
                      {item.riwayatApproval.map((r, i) => (
                        <div key={i} className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                          r.aksi === 'Disetujui' 
                            ? 'bg-lime-50/60 border-lime-200' 
                            : r.aksi === 'Ditolak'
                            ? 'bg-rose-50/60 border-rose-200'
                            : 'bg-white border-slate-200'
                        }`}>
                          <div className={`w-8 h-8 rounded-2xl flex items-center justify-center font-bold text-white text-xs shrink-0 ${
                            r.aksi === 'Disetujui' ? 'bg-lime-600' : r.aksi === 'Ditolak' ? 'bg-rose-600' : 'bg-slate-300'
                          }`}>
                            L{r.level}
                          </div>

                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-extrabold text-slate-800">{r.role}: {r.nama}</p>
                              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                r.aksi === 'Disetujui' ? 'bg-lime-100 text-lime-800' : r.aksi === 'Ditolak' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {r.aksi} {r.tanggal ? `(${r.tanggal})` : ''}
                              </span>
                            </div>
                            {r.catatan && <p className="text-xs text-slate-600 italic">"{r.catatan}"</p>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Action Form if current role can approve */}
                    {item.status !== 'Disetujui' && item.status !== 'Ditolak' && needsActionFromCurrentRole && (
                      <div className="bg-white p-5 rounded-2xl border-2 border-lime-200 space-y-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-lime-700" />
                          <h4 className="text-sm font-extrabold text-slate-900">
                            Aksi Otorisasi ({currentTestingRole})
                          </h4>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Catatan Persetujuan / Penolakan ({currentTestingRole})
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Disetujui, dana operasional mencukupi..."
                            value={approvalNote}
                            onChange={e => setApprovalNote(e.target.value)}
                            className="w-full p-3 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-lime-600"
                          />
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() => handleApprovalAction(item.id, 'Disetujui')}
                            className="flex-1 py-3 bg-lime-600 hover:bg-lime-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer"
                          >
                            <Check className="w-4 h-4" /> Setujui Pengeluaran (Sebagai {currentTestingRole})
                          </button>
                          <button
                            onClick={() => handleApprovalAction(item.id, 'Ditolak')}
                            className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer"
                          >
                            <X className="w-4 h-4" /> Tolak Pengeluaran
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* RENCANA ANGGARAN (RAPB) TAB */}
      {tab === 'anggaran' && (
        <div className="space-y-4">
          {anggaranList.map(item => {
            const pct = item.jumlahDianggarkan > 0 ? Math.round((item.jumlahRealisasi / item.jumlahDianggarkan) * 100) : 0;
            return (
              <div key={item.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200">
                        {item.kategori}
                      </span>
                      <span className={`text-xs font-bold px-3 py-0.5 rounded-full border ${STATUS_COLOR[item.status] || 'bg-slate-100 text-slate-600'}`}>
                        {item.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900">{item.namaKegiatan}</h3>
                    <p className="text-xs text-slate-400">Kode CoA: <span className="font-mono font-bold text-lime-700">{item.kodeAkun}</span> • Periode RAPB {item.tahun}/{String(item.bulan).padStart(2, '0')}</p>
                  </div>

                  <div className="text-right self-end sm:self-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pagu Dianggarkan</p>
                    <p className="text-xl font-black font-mono text-lime-800">{formatRp(item.jumlahDianggarkan)}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">Realisasi: <span className="font-mono text-lime-700">{formatRp(item.jumlahRealisasi)}</span></span>
                    <span className={pct >= 100 ? 'text-rose-600' : 'text-lime-800'}>{pct}% Serapan</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 100 ? 'bg-rose-500' : pct >= 75 ? 'bg-lime-500' : 'bg-lime-500'
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FORM BUAT PENGAJUAN BARU */}
      {tab === 'tambah' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-lime-700" /> Form Permohonan Pengeluaran Anggaran Baru
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Pengajuan ini akan diproses secara otomatis melalui alur 3 Tingkat Approval: <strong>Bendahara → Ketua DKM → Direktur</strong>.
            </p>
          </div>

          <form onSubmit={handleCreatePengajuan} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Judul Pengeluaran / Kegiatan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pembelian Karpet Shalat Musholla..."
                  value={formJudul}
                  onChange={e => setFormJudul(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-lime-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kode Akun Beban CoA *</label>
                <select
                  value={formKodeAkun}
                  onChange={e => setFormKodeAkun(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-lime-700 font-semibold text-slate-800"
                >
                  {INITIAL_CHART_OF_ACCOUNTS.filter(a => a.jenis === 'Beban').map(a => (
                    <option key={a.kode} value={a.kode}>
                      {a.kode} - {a.nama} ({a.kelompok})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nominal Anggaran (Rp) *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 3500000"
                  value={formJumlah}
                  onChange={e => setFormJumlah(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-lime-700 text-lime-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Jabatan / Role Pemohon *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Staf Operasional, Tim Dakwah, Panitia Pembangunan"
                  value={formPermohon}
                  onChange={e => setFormPermohon(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-lime-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Deskripsi / Rincian Urgensi Pengeluaran *</label>
              <textarea
                rows={3}
                required
                placeholder="Jelaskan kebutuhan pengeluaran secara rinci untuk pertimbangan Bendahara, Ketua DKM, dan Direktur..."
                value={formKeterangan}
                onChange={e => setFormKeterangan(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-lime-700"
              />
            </div>

            <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTab('pengajuan')}
                className="px-5 py-3 border border-slate-200 rounded-xl text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-lime-800 hover:bg-lime-900 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95"
              >
                Kirim Pengajuan Ke Bendahara
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
