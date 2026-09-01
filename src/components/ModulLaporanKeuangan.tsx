import React, { useState } from 'react';
import { BarChart3, Scale, Download, FileSpreadsheet, Layers, Filter, CheckCircle, AlertTriangle, ArrowRightLeft, ChevronDown, Printer } from 'lucide-react';
import { INITIAL_CHART_OF_ACCOUNTS, INITIAL_JURNAL_ENTRIES, AkunCoA, JurnalEntry } from '../data/akuntansiData';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';


export type FundCategory = 'Semua' | 'Zakat' | 'Infaq' | 'Wakaf' | 'Sodaqoh' | 'Operasional' | 'Komparatif' | 'Multi';

export const getAccountFundCategory = (akun: AkunCoA): 'Zakat' | 'Infaq' | 'Wakaf' | 'Sodaqoh' | 'Operasional' => {
  if (akun.kategoriDana) return akun.kategoriDana;
  const name = (akun.nama || '').toLowerCase();
  const kel = (akun.kelompok || '').toLowerCase();
  if (name.includes('zakat') || kel.includes('zakat')) return 'Zakat';
  if (name.includes('infak') || name.includes('infaq') || kel.includes('infak')) return 'Infaq';
  if (name.includes('wakaf') || name.includes('bangunan') || name.includes('tanah') || kel.includes('wakaf')) return 'Wakaf';
  if (name.includes('sedekah') || name.includes('sodaqoh') || name.includes('yatim') || name.includes('sembako') || name.includes('fakir')) return 'Sodaqoh';
  return 'Operasional';
};

interface ModulLaporanKeuanganProps {
  journals?: JurnalEntry[];
  accounts?: AkunCoA[];
}

export const ModulLaporanKeuangan: React.FC<ModulLaporanKeuanganProps> = ({
  journals = INITIAL_JURNAL_ENTRIES,
  accounts = INITIAL_CHART_OF_ACCOUNTS,
}) => {
  const [tab, setTab] = useState<'neraca' | 'labarugi'>('neraca');
  const [selectedFundFilter, setSelectedFundFilter] = useState<FundCategory>('Semua');
  // Auto-set date range: from 1st of current month to today (using local timezone)
  const toLocalISODate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayLocal = new Date();
  const firstOfMonthLocal = new Date(todayLocal.getFullYear(), todayLocal.getMonth(), 1);
  const [filterStartDate, setFilterStartDate] = useState(toLocalISODate(firstOfMonthLocal));
  const [filterEndDate, setFilterEndDate] = useState(toLocalISODate(todayLocal));

  const formatRp = (n: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);
  };

  const isSharedAccount = (kode: string) => {
    const clean = kode.replace('-', '');
    return clean === '110001' || clean === '110002' || clean === '110004' || 
           clean === '1101' || clean === '1102' || clean === '1103' || clean === '1106';
  };

  const pastJournals = journals.filter(j => {
    if (!filterStartDate) return false;
    const jDate = new Date(j.tanggal).getTime();
    return jDate < new Date(filterStartDate).getTime();
  });

  const currentJournals = journals.filter(j => {
    if (!filterStartDate && !filterEndDate) return true;
    const jDate = new Date(j.tanggal).getTime();
    if (filterStartDate && jDate < new Date(filterStartDate).getTime()) return false;
    if (filterEndDate && jDate > new Date(filterEndDate).setHours(23,59,59,999)) return false;
    return true;
  });

  // Compute Live Balance for an account by adding posted journal entries
  const getLiveBalance = (kode: string, fundFilter: FundCategory = 'Semua', calcType: 'current' | 'past' | 'all' = 'current') => {
    const akun = accounts.find(a => a.kode === kode);
    if (!akun) return 0;
    
    const mainCategory = getAccountFundCategory(akun);
    const isShared = isSharedAccount(kode);

    if (fundFilter !== 'Semua' && fundFilter !== 'Komparatif' && fundFilter !== 'Multi') {
      if (!isShared && mainCategory !== fundFilter) {
        return 0;
      }
    }

    let balance = 0;
    if (calcType === 'past' || calcType === 'all') {
      if (fundFilter === 'Semua' || fundFilter === 'Komparatif' || fundFilter === 'Multi') {
        balance = akun.saldoAwal;
      } else {
        if (!isShared && mainCategory === fundFilter) {
          balance = akun.saldoAwal;
        } else if (isShared && fundFilter === 'Operasional') {
          balance = akun.saldoAwal;
        }
      }
    }

    const jList = calcType === 'past' ? pastJournals : (calcType === 'all' ? [...pastJournals, ...currentJournals] : currentJournals);

    jList.forEach(j => {
      if (j.status === 'Posted') {
        let matchesFund = true;
        if (fundFilter !== 'Semua' && fundFilter !== 'Komparatif' && fundFilter !== 'Multi') {
          matchesFund = j.baris.some(b => {
            const otherAkun = accounts.find(a => a.kode === b.kodeAkun);
            return otherAkun && !isSharedAccount(b.kodeAkun) && getAccountFundCategory(otherAkun) === fundFilter;
          });
          if (!matchesFund && fundFilter === 'Operasional') {
            matchesFund = j.baris.every(b => isSharedAccount(b.kodeAkun));
          }
        }

        if (matchesFund) {
          j.baris.forEach(b => {
            if (b.kodeAkun === kode) {
              if (akun.saldoNormal === 'Debit') {
                balance += (b.debit - b.kredit);
              } else {
                balance += (b.kredit - b.debit);
              }
            }
          });
        }
      }
    });

    return balance;
  };

  // Helper for fund specific metrics
  const getFundMetrics = (fundCategory: 'Zakat' | 'Infaq' | 'Wakaf' | 'Sodaqoh' | 'Operasional') => {
    const fundAccounts = accounts.filter(a => getAccountFundCategory(a) === fundCategory || isSharedAccount(a.kode));
    const aktiva = fundAccounts.filter(a => a.jenis === 'Aktiva').reduce((s, a) => s + getLiveBalance(a.kode, fundCategory, 'all'), 0);
    const kewajiban = fundAccounts.filter(a => a.jenis === 'Kewajiban').reduce((s, a) => s + getLiveBalance(a.kode, fundCategory, 'all'), 0);
    const ekuitasBase = fundAccounts.filter(a => a.jenis === 'Ekuitas').reduce((s, a) => s + getLiveBalance(a.kode, fundCategory, 'all'), 0);
    
    const pendapatanLalu = fundAccounts.filter(a => a.jenis === 'Pendapatan').reduce((s, a) => s + getLiveBalance(a.kode, fundCategory, 'past'), 0);
    const bebanLalu = fundAccounts.filter(a => a.jenis === 'Beban').reduce((s, a) => s + getLiveBalance(a.kode, fundCategory, 'past'), 0);
    const surplusLalu = pendapatanLalu - bebanLalu;
    
    const ekuitas = ekuitasBase + surplusLalu;
    const pendapatan = fundAccounts.filter(a => a.jenis === 'Pendapatan').reduce((s, a) => s + getLiveBalance(a.kode, fundCategory, 'current'), 0);
    const beban = fundAccounts.filter(a => a.jenis === 'Beban').reduce((s, a) => s + getLiveBalance(a.kode, fundCategory, 'current'), 0);
    const surplus = pendapatan - beban;

    return { aktiva, kewajiban, ekuitas, pendapatan, beban, surplus, surplusLalu, totalSaldoNeto: ekuitas + surplus, accounts: fundAccounts };
  };

  const zakatMetrics = getFundMetrics('Zakat');
  const infaqMetrics = getFundMetrics('Infaq');
  const wakafMetrics = getFundMetrics('Wakaf');
  const sodaqohMetrics = getFundMetrics('Sodaqoh');
  const operasionalMetrics = getFundMetrics('Operasional');

  // Filter lists based on selected fund category tab
  const filterByFund = (list: AkunCoA[]) => {
    if (selectedFundFilter === 'Semua' || selectedFundFilter === 'Komparatif' || selectedFundFilter === 'Multi') return list;
    return list.filter(a => getAccountFundCategory(a) === selectedFundFilter || (isSharedAccount(a.kode) && (getLiveBalance(a.kode, selectedFundFilter, 'all') !== 0 || getLiveBalance(a.kode, selectedFundFilter, 'current') !== 0)));
  };

  const aktivaList = filterByFund(accounts.filter(a => a.jenis === 'Aktiva'));
  const kewajibanList = filterByFund(accounts.filter(a => a.jenis === 'Kewajiban'));
  const ekuitasList = filterByFund(accounts.filter(a => a.jenis === 'Ekuitas'));
  const pendapatanList = filterByFund(accounts.filter(a => a.jenis === 'Pendapatan'));
  const bebanList = filterByFund(accounts.filter(a => a.jenis === 'Beban'));

  const totalAktiva = aktivaList.reduce((s, a) => s + getLiveBalance(a.kode, selectedFundFilter, 'all'), 0);
  const totalKewajiban = kewajibanList.reduce((s, a) => s + getLiveBalance(a.kode, selectedFundFilter, 'all'), 0);
  
  const ekuitasBase = ekuitasList.reduce((s, a) => s + getLiveBalance(a.kode, selectedFundFilter, 'all'), 0);
  const pendapatanLalu = pendapatanList.reduce((s, a) => s + getLiveBalance(a.kode, selectedFundFilter, 'past'), 0);
  const bebanLalu = bebanList.reduce((s, a) => s + getLiveBalance(a.kode, selectedFundFilter, 'past'), 0);
  const surplusDefisitLalu = pendapatanLalu - bebanLalu;
  const totalEkuitas = ekuitasBase + surplusDefisitLalu;

  const totalPendapatan = pendapatanList.reduce((s, a) => s + getLiveBalance(a.kode, selectedFundFilter, 'current'), 0);
  const totalBeban = bebanList.reduce((s, a) => s + getLiveBalance(a.kode, selectedFundFilter, 'current'), 0);
  const surplusDefisit = totalPendapatan - totalBeban;

  const isBalanced = Math.abs(totalAktiva - (totalKewajiban + totalEkuitas + surplusDefisit)) < 1;

  const aktivaGroups = [...new Set(aktivaList.map(a => a.kelompok))];
  const pendapatanGroups = [...new Set(pendapatanList.map(a => a.kelompok))];
  const bebanGroups = [...new Set(bebanList.map(a => a.kelompok))];

  const handleExportExcel = () => {
    const data = [];
    data.push({ Kategori: 'AKTIVA', Kode: '', Nama: '', Saldo: '' });
    aktivaList.forEach(a => data.push({ Kategori: 'Aktiva', Kode: a.kode, Nama: a.nama, Saldo: getLiveBalance(a.kode, selectedFundFilter, 'all') }));
    data.push({ Kategori: '', Kode: '', Nama: 'Total Aktiva', Saldo: totalAktiva });
    
    data.push({ Kategori: '', Kode: '', Nama: '', Saldo: '' });
    data.push({ Kategori: 'KEWAJIBAN', Kode: '', Nama: '', Saldo: '' });
    kewajibanList.forEach(a => data.push({ Kategori: 'Kewajiban', Kode: a.kode, Nama: a.nama, Saldo: getLiveBalance(a.kode, selectedFundFilter, 'all') }));
    data.push({ Kategori: '', Kode: '', Nama: 'Total Kewajiban', Saldo: totalKewajiban });

    data.push({ Kategori: '', Kode: '', Nama: '', Saldo: '' });
    data.push({ Kategori: 'SALDO DANA', Kode: '', Nama: '', Saldo: '' });
    ekuitasList.forEach(a => data.push({ Kategori: 'Ekuitas', Kode: a.kode, Nama: a.nama, Saldo: getLiveBalance(a.kode, selectedFundFilter, 'all') }));
    data.push({ Kategori: 'Ekuitas', Kode: '3999', Nama: 'Surplus/Defisit Periode Lalu', Saldo: surplusDefisitLalu });
    
    data.push({ Kategori: 'Surplus/Defisit', Kode: '', Nama: 'Periode Berjalan', Saldo: surplusDefisit });
    data.push({ Kategori: '', Kode: '', Nama: 'Total Kewajiban & Ekuitas', Saldo: totalKewajiban + totalEkuitas + surplusDefisit });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Neraca ${selectedFundFilter}`);
    XLSX.writeFile(workbook, `Laporan_Neraca_${selectedFundFilter}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Laporan Neraca Aktivitas - Dana ${selectedFundFilter}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Periode: ${filterStartDate || 'Awal'} s/d ${filterEndDate || 'Sekarang'}`, 14, 22);
    
    const tableData: any[] = [];
    tableData.push(['AKTIVA', '', '']);
    aktivaList.forEach(a => tableData.push([a.kode, a.nama, formatRp(getLiveBalance(a.kode, selectedFundFilter, 'all'))]));
    tableData.push(['', 'Total Aktiva', formatRp(totalAktiva)]);
    tableData.push(['', '', '']);
    
    tableData.push(['KEWAJIBAN', '', '']);
    kewajibanList.forEach(a => tableData.push([a.kode, a.nama, formatRp(getLiveBalance(a.kode, selectedFundFilter, 'all'))]));
    tableData.push(['', 'Total Kewajiban', formatRp(totalKewajiban)]);
    tableData.push(['', '', '']);
    
    tableData.push(['SALDO DANA', '', '']);
    ekuitasList.forEach(a => tableData.push([a.kode, a.nama, formatRp(getLiveBalance(a.kode, selectedFundFilter, 'all'))]));
    tableData.push(['3999', 'Surplus/Defisit Periode Lalu', formatRp(surplusDefisitLalu)]);
    tableData.push(['', 'Surplus/Defisit Berjalan', formatRp(surplusDefisit)]);
    tableData.push(['', 'Total Kewajiban & Saldo Dana', formatRp(totalKewajiban + totalEkuitas + surplusDefisit)]);

    (doc as any).autoTable({
      startY: 30,
      head: [['Kode', 'Keterangan', 'Saldo (Rp)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [74, 109, 0] }
    });
    
    doc.save(`Laporan_Neraca_${selectedFundFilter}.pdf`);
  };

  // Helper renderer for a single fund balance sheet card
  const renderFundBalanceSheetDoc = (
    fundName: 'Zakat' | 'Infaq' | 'Wakaf' | 'Sodaqoh' | 'Operasional',
    badgeColor: string,
    themeBorder: string,
    metrics: ReturnType<typeof getFundMetrics>
  ) => {
    const fundAktiva = metrics.accounts.filter(a => a.jenis === 'Aktiva' && (!isSharedAccount(a.kode) || getLiveBalance(a.kode, fundName) !== 0));
    const fundKewajiban = metrics.accounts.filter(a => a.jenis === 'Kewajiban' && (!isSharedAccount(a.kode) || getLiveBalance(a.kode, fundName) !== 0));
    const fundEkuitas = metrics.accounts.filter(a => a.jenis === 'Ekuitas' && (!isSharedAccount(a.kode) || getLiveBalance(a.kode, fundName) !== 0));

    const totalFktiva = fundAktiva.reduce((s, a) => s + getLiveBalance(a.kode, fundName), 0);
    const totalFkewajiban = fundKewajiban.reduce((s, a) => s + getLiveBalance(a.kode, fundName), 0);
    const totalFekuitas = fundEkuitas.reduce((s, a) => s + getLiveBalance(a.kode, fundName), 0);
    const fSurplus = metrics.surplus;

    const fBalanced = Math.abs(totalFktiva - (totalFkewajiban + totalFekuitas + fSurplus)) < 1;
    const fAktivaGroups = [...new Set(fundAktiva.map(a => a.kelompok))];

    return (
      <div key={fundName} className={`bg-white border-2 ${themeBorder} rounded-3xl overflow-hidden shadow-sm space-y-0`}>
        {/* Document Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-xl text-xs font-black text-white ${badgeColor}`}>
              DANA {fundName.toUpperCase()}
            </span>
            <div>
              <h4 className="text-base sm:text-lg font-black text-slate-900">
                LAPORAN NERACA AKTIVITAS DANA {fundName.toUpperCase()}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">Standar PSAK 409 - Posisi Keuangan Terpisah Dana {fundName}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-extrabold text-slate-700 block">
              Total Saldo Dana: {formatRp(metrics.totalSaldoNeto)}
            </span>
          </div>
        </div>

        {/* Document Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-xs sm:text-sm">
          {/* LEFT: AKTIVA */}
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-lime-600 pb-1.5">
              <h5 className="font-black text-lime-800 uppercase tracking-wider text-xs">
                1. AKTIVA / ASET (DANA {fundName.toUpperCase()})
              </h5>
            </div>

            {fundAktiva.length === 0 ? (
              <p className="text-slate-400 italic text-xs py-3 text-center">Tidak ada akun Aktiva tercatat untuk Dana {fundName}.</p>
            ) : (
              fAktivaGroups.map(grp => (
                <div key={grp} className="space-y-1.5">
                  <p className="font-bold text-slate-400 text-[11px] uppercase tracking-wider">{grp}</p>
                  {fundAktiva.filter(a => a.kelompok === grp).map(a => (
                    <div key={a.kode} className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-700 font-medium">{a.kode} – {a.nama}</span>
                      <span className="font-mono font-bold text-slate-900">{formatRp(getLiveBalance(a.kode, fundName))}</span>
                    </div>
                  ))}
                </div>
              ))
            )}

            <div className="border-t-2 border-lime-700 pt-3 flex justify-between font-black text-sm text-lime-900 bg-lime-50/60 p-2.5 rounded-xl">
              <span>TOTAL AKTIVA DANA {fundName.toUpperCase()}</span>
              <span className="font-mono">{formatRp(totalFktiva)}</span>
            </div>
          </div>

          {/* RIGHT: KEWAJIBAN & SALDO DANA */}
          <div className="p-5 space-y-4">
            {/* Kewajiban */}
            <div className="space-y-2">
              <div className="border-b-2 border-rose-600 pb-1.5">
                <h5 className="font-black text-rose-800 uppercase tracking-wider text-xs">
                  2. KEWAJIBAN (LIABILITIES) DANA {fundName.toUpperCase()}
                </h5>
              </div>
              {fundKewajiban.length === 0 ? (
                <p className="text-slate-400 italic text-xs py-1">Tidak ada kewajiban tercatat.</p>
              ) : (
                fundKewajiban.map(a => (
                  <div key={a.kode} className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-700 font-medium">{a.kode} – {a.nama}</span>
                    <span className="font-mono font-bold text-slate-900">{formatRp(getLiveBalance(a.kode, fundName))}</span>
                  </div>
                ))
              )}
              <div className="flex justify-between font-bold text-rose-700 text-xs">
                <span>Total Kewajiban</span>
                <span className="font-mono">{formatRp(totalFkewajiban)}</span>
              </div>
            </div>

            {/* Saldo Dana */}
            <div className="space-y-2 pt-2">
              <div className="border-b-2 border-lime-600 pb-1.5">
                <h5 className="font-black text-lime-800 uppercase tracking-wider text-xs">
                  3. SALDO DANA & SURPLUS AKTIVITAS DANA {fundName.toUpperCase()}
                </h5>
              </div>
              {fundEkuitas.map(a => (
                <div key={a.kode} className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-700 font-medium">{a.kode} – {a.nama}</span>
                  <span className="font-mono font-bold text-slate-900">{formatRp(getLiveBalance(a.kode, fundName))}</span>
                </div>
              ))}
              <div className="flex justify-between py-1 border-b border-slate-100 font-semibold text-lime-800">
                <span>Surplus / Defisit Aktivitas Dana {fundName}</span>
                <span className="font-mono font-bold">{formatRp(fSurplus)}</span>
              </div>
              <div className="flex justify-between font-bold text-lime-800 text-xs">
                <span>Total Saldo Dana & Surplus</span>
                <span className="font-mono">{formatRp(totalFekuitas + fSurplus)}</span>
              </div>
            </div>

            <div className="border-t-2 border-lime-700 pt-3 flex justify-between font-black text-sm text-lime-900 bg-lime-50/60 p-2.5 rounded-xl">
              <span>TOTAL KEWAJIBAN + SALDO DANA</span>
              <span className="font-mono">{formatRp(totalFkewajiban + totalFekuitas + fSurplus)}</span>
            </div>
          </div>
        </div>

        {/* Footer Balance Check */}
        <div className={`p-3 text-center font-bold text-xs border-t flex items-center justify-center gap-2 ${
          fBalanced ? 'bg-lime-50 text-lime-900 border-lime-200' : 'bg-rose-50 text-rose-900 border-rose-200'
        }`}>
          {fBalanced ? (
            <>
              <CheckCircle className="w-4 h-4 text-lime-600" />
              <span>✅ Neraca Aktivitas Dana {fundName} Seimbang (Total Aktiva = Kewajiban + Saldo Dana & Surplus)</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>⚠️ Neraca Aktivitas Dana {fundName} Tidak Seimbang!</span>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-lime-50 border border-lime-100 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-lime-600" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-slate-800">Laporan Neraca Aktivitas & Keuangan</h2>
            <p className="text-slate-500 text-[11px]">Terintegrasi Pemisahan Dana Zakat, Infaq, Wakaf & Sodaqoh (PSAK 409 / PSAK 409)</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200">
            <span className="text-xs font-bold text-slate-700">Periode:</span>
            <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} className="bg-transparent text-slate-700 font-medium text-xs focus:outline-none focus:ring-0" />
            <span className="text-xs font-bold text-slate-400">-</span>
            <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} className="bg-transparent text-slate-700 font-medium text-xs focus:outline-none focus:ring-0" />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-all border border-slate-200 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" /> Export PDF
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-all border border-slate-200 cursor-pointer print:hidden"
            >
              <Printer className="w-4 h-4 text-slate-500" /> Cetak (Print)
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-lime-600 hover:bg-lime-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs transition-all shadow-md cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Summary Cards by ZISWAF Fund Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* DANA ZAKAT CARD */}
        <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-2xl p-3 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Dana Zakat
            </span>
            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">Mustahik</span>
          </div>
          <p className="text-lg font-black font-mono text-emerald-900">{formatRp(zakatMetrics.totalSaldoNeto)}</p>
          <div className="mt-1.5 pt-1.5 border-t border-emerald-100/80 text-xs space-y-0.5 font-medium">
            <div className="flex justify-between text-emerald-700">
              <span>Terima Zakat:</span>
              <span className="font-mono font-bold">{formatRp(zakatMetrics.pendapatan)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Penyaluran:</span>
              <span className="font-mono font-bold text-rose-600">{formatRp(zakatMetrics.beban)}</span>
            </div>
          </div>
        </div>

        {/* DANA INFAQ CARD */}
        <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-2xl p-3 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-black text-blue-800 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Dana Infaq
            </span>
            <span className="text-[9px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-bold">Jumat & Harian</span>
          </div>
          <p className="text-lg font-black font-mono text-blue-900">{formatRp(infaqMetrics.totalSaldoNeto)}</p>
          <div className="mt-1.5 pt-1.5 border-t border-blue-100/80 text-xs space-y-0.5 font-medium">
            <div className="flex justify-between text-blue-700">
              <span>Terima Infak:</span>
              <span className="font-mono font-bold">{formatRp(infaqMetrics.pendapatan)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Program Infak:</span>
              <span className="font-mono font-bold text-rose-600">{formatRp(infaqMetrics.beban)}</span>
            </div>
          </div>
        </div>

        {/* DANA WAKAF CARD */}
        <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-2xl p-3 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-black text-purple-800 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Dana Wakaf
            </span>
            <span className="text-[9px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-bold">Aset Restriksi</span>
          </div>
          <p className="text-lg font-black font-mono text-purple-900">{formatRp(wakafMetrics.totalSaldoNeto)}</p>
          <div className="mt-1.5 pt-1.5 border-t border-purple-100/80 text-xs space-y-0.5 font-medium">
            <div className="flex justify-between text-purple-700">
              <span>Wakaf Uang:</span>
              <span className="font-mono font-bold">{formatRp(wakafMetrics.pendapatan)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Aset Tetap Wakaf:</span>
              <span className="font-mono font-bold text-purple-700">{formatRp(wakafMetrics.aktiva)}</span>
            </div>
          </div>
        </div>

        {/* DANA SODAQOH CARD */}
        <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-3 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Dana Sodaqoh
            </span>
            <span className="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold">Sosial & Yatim</span>
          </div>
          <p className="text-lg font-black font-mono text-amber-900">{formatRp(sodaqohMetrics.totalSaldoNeto)}</p>
          <div className="mt-1.5 pt-1.5 border-t border-amber-100/80 text-xs space-y-0.5 font-medium">
            <div className="flex justify-between text-amber-700">
              <span>Sedekah Masuk:</span>
              <span className="font-mono font-bold">{formatRp(sodaqohMetrics.pendapatan)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Santunan/Sembako:</span>
              <span className="font-mono font-bold text-rose-600">{formatRp(sodaqohMetrics.beban)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Mode Tabs Selector */}
      <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={() => setTab('neraca')}
          className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            tab === 'neraca'
              ? 'bg-lime-700 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Scale className="w-4 h-4" /> Laporan Neraca Aktivitas (Zakat, Infaq, Wakaf, Sodaqoh)
        </button>
        <button
          onClick={() => setTab('labarugi')}
          className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            tab === 'labarugi'
              ? 'bg-lime-700 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" /> Laporan Surplus & Defisit (Laba Rugi Operasional)
        </button>
      </div>

      {/* REPORT CONTENT: NERACA AKTIVITAS */}
      {tab === 'neraca' && (
        <div className="space-y-5">
          {/* Main Container Card for Filter Controls & Single/Comparative View */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm space-y-0">
            
            {/* Header Document */}
            <div className="p-6 text-center border-b border-slate-200 bg-slate-50/70">
              <span className="text-xs font-black text-lime-700 uppercase tracking-widest">DKM MASJID CITRA SENTUL RAYA</span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {selectedFundFilter === 'Semua' && 'LAPORAN NERACA AKTIVITAS KONSOLIDASI (SEMUA DANA)'}
                {selectedFundFilter === 'Zakat' && 'LAPORAN NERACA AKTIVITAS DANA ZAKAT'}
                {selectedFundFilter === 'Infaq' && 'LAPORAN NERACA AKTIVITAS DANA INFAQ'}
                {selectedFundFilter === 'Wakaf' && 'LAPORAN NERACA AKTIVITAS DANA WAKAF'}
                {selectedFundFilter === 'Sodaqoh' && 'LAPORAN NERACA AKTIVITAS DANA SODAQOH'}
                {selectedFundFilter === 'Operasional' && 'LAPORAN NERACA AKTIVITAS DANA OPERASIONAL'}
                {selectedFundFilter === 'Komparatif' && 'MATRIX PERBANDINGAN NERACA AKTIVITAS 4 DANA (PSAK 409)'}
                {selectedFundFilter === 'Multi' && 'KUMPULAN LAPORAN NERACA AKTIVITAS TERPISAH (ZAKAT, INFAQ, WAKAF, SODAQOH)'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Rincian Posisi Keuangan & Perubahan Saldo Dana Berdasarkan Pemisahan Dana Zakat, Infaq, Wakaf & Sodaqoh (PSAK 409)
              </p>

              {/* Fund Breakdown Filter Controls (Dropdown) */}
              <div className="mt-6 mb-2 max-w-sm mx-auto">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1.5 mb-2">
                  <Filter className="w-3.5 h-3.5" /> Silakan Pilih Mode Neraca:
                </label>
                <div className="relative group">
                  <select
                    value={selectedFundFilter}
                    onChange={(e) => setSelectedFundFilter(e.target.value as FundCategory)}
                    className="w-full appearance-none bg-white border-2 border-lime-500 text-lime-900 font-extrabold text-sm py-3 pl-4 pr-12 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-lime-500/20 focus:border-lime-600 transition-all cursor-pointer hover:bg-lime-50"
                  >
                    <option value="Semua">Semua Dana (Konsolidasi)</option>
                    <option value="Zakat">Neraca Dana Zakat</option>
                    <option value="Infaq">Neraca Dana Infaq</option>
                    <option value="Wakaf">Neraca Dana Wakaf</option>
                    <option value="Sodaqoh">Neraca Dana Sodaqoh</option>
                    <option value="Operasional">Neraca Dana Operasional</option>
                    <option value="Komparatif">Tabel Perbandingan 4 Dana (Matrix)</option>
                    <option value="Multi">Tampilkan 4 Neraca Terpisah (Multi-View)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-lime-700 group-hover:text-lime-900 transition-colors">
                    <div className="bg-lime-100 p-1.5 rounded-lg border border-lime-200">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* VIEW MODE 1: COMPARATIVE MULTI-FUND MATRIX TABLE */}
            {selectedFundFilter === 'Komparatif' && (
              <div className="p-6 overflow-x-auto space-y-4">
                <div className="bg-lime-50/60 border border-lime-200 p-4 rounded-2xl flex items-center justify-between text-xs text-lime-900 font-semibold">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-lime-700" /> Matrix Laporan Neraca Aktivitas Terpisah Berdasarkan Standar Akuntansi Syariah PSAK 409
                  </span>
                  <span className="font-mono text-lime-700 font-bold">Mata Uang: IDR (Rupiah)</span>
                </div>

                <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase text-[11px] tracking-wider font-extrabold">
                      <th className="p-3.5 rounded-l-xl">Komponen Neraca Aktivitas</th>
                      <th className="p-3.5 text-right font-mono bg-emerald-950 text-emerald-200">🟢 Dana Zakat</th>
                      <th className="p-3.5 text-right font-mono bg-blue-950 text-blue-200">🔵 Dana Infaq</th>
                      <th className="p-3.5 text-right font-mono bg-purple-950 text-purple-200">🟣 Dana Wakaf</th>
                      <th className="p-3.5 text-right font-mono bg-amber-950 text-amber-200">🟠 Dana Sodaqoh</th>
                      <th className="p-3.5 text-right font-mono bg-slate-800 text-slate-200">⚪ Operasional</th>
                      <th className="p-3.5 text-right font-mono bg-lime-950 text-lime-300 rounded-r-xl">Total Konsolidasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                    
                    {/* PENERIMAAN / DONASI MASUK */}
                    <tr className="bg-slate-100 font-black text-slate-900 text-xs">
                      <td colSpan={7} className="p-3 uppercase tracking-wider text-lime-800">1. PENERIMAAN & AKTIVITAS MASUK PERIODE BERJALAN</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 pl-6 text-slate-700">Penerimaan Zakat (Maal & Fitrah)</td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">{formatRp(zakatMetrics.pendapatan)}</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono font-bold">{formatRp(zakatMetrics.pendapatan)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 pl-6 text-slate-700">Penerimaan Infak (Jumat & Harian)</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono font-bold text-blue-700">{formatRp(infaqMetrics.pendapatan)}</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono font-bold">{formatRp(infaqMetrics.pendapatan)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 pl-6 text-slate-700">Wakaf Uang & Donasi Pembangunan</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono font-bold text-purple-700">{formatRp(wakafMetrics.pendapatan)}</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono font-bold">{formatRp(wakafMetrics.pendapatan)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 pl-6 text-slate-700">Sedekah Jamaah & Donasi Sosial</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono font-bold text-amber-700">{formatRp(sodaqohMetrics.pendapatan)}</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono font-bold">{formatRp(sodaqohMetrics.pendapatan)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 pl-6 text-slate-700">Penerimaan Operasional / Hibah / BUMM</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-700">{formatRp(operasionalMetrics.pendapatan)}</td>
                      <td className="p-3 text-right font-mono font-bold">{formatRp(operasionalMetrics.pendapatan)}</td>
                    </tr>
                    <tr className="bg-lime-50/80 font-black text-lime-900">
                      <td className="p-3 pl-4">TOTAL PENERIMAAN DANA AKTIVITAS</td>
                      <td className="p-3 text-right font-mono">{formatRp(zakatMetrics.pendapatan)}</td>
                      <td className="p-3 text-right font-mono">{formatRp(infaqMetrics.pendapatan)}</td>
                      <td className="p-3 text-right font-mono">{formatRp(wakafMetrics.pendapatan)}</td>
                      <td className="p-3 text-right font-mono">{formatRp(sodaqohMetrics.pendapatan)}</td>
                      <td className="p-3 text-right font-mono">{formatRp(operasionalMetrics.pendapatan)}</td>
                      <td className="p-3 text-right font-mono text-lime-800 font-extrabold">{formatRp(totalPendapatan)}</td>
                    </tr>

                    {/* PENYALURAN & BEBAN AKTIVITAS */}
                    <tr className="bg-slate-100 font-black text-slate-900 text-xs">
                      <td colSpan={7} className="p-3 uppercase tracking-wider text-rose-800">2. PENYALURAN & BEBAN AKTIVITAS KELUAR</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 pl-6 text-slate-700">Penyaluran Zakat ke Mustahik (8 Asnaf)</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600">{formatRp(zakatMetrics.beban)}</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600">{formatRp(zakatMetrics.beban)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 pl-6 text-slate-700">Program Penyaluran Infak Sosial & Dakwah</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600">{formatRp(infaqMetrics.beban)}</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600">{formatRp(infaqMetrics.beban)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 pl-6 text-slate-700">Pemeliharaan & Penyusutan Wakaf</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600">{formatRp(wakafMetrics.beban)}</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600">{formatRp(wakafMetrics.beban)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 pl-6 text-slate-700">Santunan Yatim & Paket Sembako (Sodaqoh)</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600">{formatRp(sodaqohMetrics.beban)}</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600">{formatRp(sodaqohMetrics.beban)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 pl-6 text-slate-700">Beban Operasional Masjid (Honor, Utility, ATK)</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp 0</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600">{formatRp(operasionalMetrics.beban)}</td>
                      <td className="p-3 text-right font-mono font-bold text-rose-600">{formatRp(operasionalMetrics.beban)}</td>
                    </tr>
                    <tr className="bg-rose-50/80 font-black text-rose-900">
                      <td className="p-3 pl-4">TOTAL PENYALURAN & BEBAN AKTIVITAS</td>
                      <td className="p-3 text-right font-mono">{formatRp(zakatMetrics.beban)}</td>
                      <td className="p-3 text-right font-mono">{formatRp(infaqMetrics.beban)}</td>
                      <td className="p-3 text-right font-mono">{formatRp(wakafMetrics.beban)}</td>
                      <td className="p-3 text-right font-mono">{formatRp(sodaqohMetrics.beban)}</td>
                      <td className="p-3 text-right font-mono">{formatRp(operasionalMetrics.beban)}</td>
                      <td className="p-3 text-right font-mono text-rose-800 font-extrabold">{formatRp(totalBeban)}</td>
                    </tr>

                    {/* HASIL SURPLUS DEFISIT PERIODE INI */}
                    <tr className="bg-slate-900 text-white font-black text-xs">
                      <td className="p-3.5 pl-4 uppercase tracking-wider">3. SURPLUS / (DEFISIT) AKTIVITAS PERIODE BERJALAN</td>
                      <td className="p-3.5 text-right font-mono text-emerald-300 font-extrabold">{formatRp(zakatMetrics.surplus)}</td>
                      <td className="p-3.5 text-right font-mono text-blue-300 font-extrabold">{formatRp(infaqMetrics.surplus)}</td>
                      <td className="p-3.5 text-right font-mono text-purple-300 font-extrabold">{formatRp(wakafMetrics.surplus)}</td>
                      <td className="p-3.5 text-right font-mono text-amber-300 font-extrabold">{formatRp(sodaqohMetrics.surplus)}</td>
                      <td className="p-3.5 text-right font-mono text-slate-300 font-extrabold">{formatRp(operasionalMetrics.surplus)}</td>
                      <td className="p-3.5 text-right font-mono text-lime-300 font-extrabold text-sm">{formatRp(surplusDefisit)}</td>
                    </tr>

                    {/* POSISI ASET & SALDO DANA AKHIR */}
                    <tr className="bg-slate-100 font-black text-slate-900 text-xs">
                      <td colSpan={7} className="p-3 uppercase tracking-wider text-slate-900">4. REKAPITULASI POSISI AKTIVA NETO & SALDO DANA AKHIR (NERACA)</td>
                    </tr>
                    <tr className="hover:bg-slate-50 font-bold">
                      <td className="p-3 pl-6 text-slate-800">Total Aktiva (Aset Allocated)</td>
                      <td className="p-3 text-right font-mono text-emerald-800">{formatRp(zakatMetrics.aktiva)}</td>
                      <td className="p-3 text-right font-mono text-blue-800">{formatRp(infaqMetrics.aktiva)}</td>
                      <td className="p-3 text-right font-mono text-purple-800">{formatRp(wakafMetrics.aktiva)}</td>
                      <td className="p-3 text-right font-mono text-amber-800">{formatRp(sodaqohMetrics.aktiva)}</td>
                      <td className="p-3 text-right font-mono text-slate-800">{formatRp(operasionalMetrics.aktiva)}</td>
                      <td className="p-3 text-right font-mono font-black text-slate-900">{formatRp(totalAktiva)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 font-bold">
                      <td className="p-3 pl-6 text-slate-800">Total Kewajiban (Liabilities)</td>
                      <td className="p-3 text-right font-mono text-rose-700">{formatRp(zakatMetrics.kewajiban)}</td>
                      <td className="p-3 text-right font-mono text-rose-700">{formatRp(infaqMetrics.kewajiban)}</td>
                      <td className="p-3 text-right font-mono text-rose-700">{formatRp(wakafMetrics.kewajiban)}</td>
                      <td className="p-3 text-right font-mono text-rose-700">{formatRp(sodaqohMetrics.kewajiban)}</td>
                      <td className="p-3 text-right font-mono text-rose-700">{formatRp(operasionalMetrics.kewajiban)}</td>
                      <td className="p-3 text-right font-mono text-rose-700">{formatRp(totalKewajiban)}</td>
                    </tr>
                    <tr className="bg-lime-600 text-white font-black text-xs">
                      <td className="p-3.5 pl-4 uppercase tracking-wider">TOTAL SALDO DANA & AKTIVA NETO AKHIR</td>
                      <td className="p-3.5 text-right font-mono font-extrabold">{formatRp(zakatMetrics.totalSaldoNeto)}</td>
                      <td className="p-3.5 text-right font-mono font-extrabold">{formatRp(infaqMetrics.totalSaldoNeto)}</td>
                      <td className="p-3.5 text-right font-mono font-extrabold">{formatRp(wakafMetrics.totalSaldoNeto)}</td>
                      <td className="p-3.5 text-right font-mono font-extrabold">{formatRp(sodaqohMetrics.totalSaldoNeto)}</td>
                      <td className="p-3.5 text-right font-mono font-extrabold">{formatRp(operasionalMetrics.totalSaldoNeto)}</td>
                      <td className="p-3.5 text-right font-mono text-sm font-black">{formatRp(totalEkuitas + surplusDefisit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* VIEW MODE 2: SINGLE FUND OR CONSOLIDATED BALANCE SHEET */}
            {selectedFundFilter !== 'Komparatif' && selectedFundFilter !== 'Multi' && (
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-xs sm:text-sm">
                
                {/* LEFT COLUMN: AKTIVA */}
                <div className="p-6 space-y-5">
                  <div className="flex items-center justify-between border-b-2 border-lime-600 pb-2">
                    <h4 className="font-black text-lime-700 uppercase tracking-wider text-xs flex items-center gap-1.5">
                      AKTIVA / ASET (ASSETS)
                    </h4>
                    {selectedFundFilter !== 'Semua' && (
                      <span className="text-xs font-bold bg-lime-100 text-lime-800 px-2 py-0.5 rounded-full uppercase">
                        Dana {selectedFundFilter}
                      </span>
                    )}
                  </div>

                  {aktivaList.length === 0 ? (
                    <p className="text-slate-400 italic text-xs py-4 text-center">Tidak ada akun Aktiva tercatat untuk kategori dana ini.</p>
                  ) : (
                    aktivaGroups.map(grp => (
                      <div key={grp} className="space-y-2">
                        <p className="font-bold text-slate-400 text-xs uppercase tracking-wider">{grp}</p>
                        {aktivaList.filter(a => a.kelompok === grp).map(a => {
                          const b = getLiveBalance(a.kode, selectedFundFilter);
                          const fund = getAccountFundCategory(a);
                          return (
                            <div key={a.kode} className="flex justify-between py-1.5 border-b border-slate-100">
                              <span className="text-slate-700 font-medium flex items-center gap-1.5">
                                <span>{a.kode} – {a.nama}</span>
                                {selectedFundFilter === 'Semua' && (
                                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                    fund === 'Zakat' ? 'bg-emerald-100 text-emerald-700' :
                                    fund === 'Infaq' ? 'bg-blue-100 text-blue-700' :
                                    fund === 'Wakaf' ? 'bg-purple-100 text-purple-700' :
                                    fund === 'Sodaqoh' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {fund}
                                  </span>
                                )}
                              </span>
                              <span className="font-mono font-bold text-slate-900">{formatRp(b)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}

                  <div className="border-t-2 border-lime-700 pt-4 flex justify-between font-black text-base text-lime-800 bg-lime-50/50 p-3 rounded-xl">
                    <span>TOTAL AKTIVA ({selectedFundFilter.toUpperCase()})</span>
                    <span className="font-mono">{formatRp(totalAktiva)}</span>
                  </div>
                </div>

                {/* RIGHT COLUMN: KEWAJIBAN & EKUITAS / SALDO DANA */}
                <div className="p-6 space-y-5">
                  
                  {/* Kewajiban */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b-2 border-rose-600 pb-2">
                      <h4 className="font-black text-rose-700 uppercase tracking-wider text-xs">
                        KEWAJIBAN (LIABILITIES)
                      </h4>
                    </div>
                    {kewajibanList.length === 0 ? (
                      <p className="text-slate-400 italic text-xs py-2">Tidak ada kewajiban tercatat.</p>
                    ) : (
                      kewajibanList.map(a => (
                        <div key={a.kode} className="flex justify-between py-1.5 border-b border-slate-100">
                          <span className="text-slate-700 font-medium">{a.kode} – {a.nama}</span>
                          <span className="font-mono font-bold text-slate-900">{formatRp(getLiveBalance(a.kode, selectedFundFilter))}</span>
                        </div>
                      ))
                    )}
                    <div className="flex justify-between font-bold text-rose-700 pt-1">
                      <span>Total Kewajiban</span>
                      <span className="font-mono">{formatRp(totalKewajiban)}</span>
                    </div>
                  </div>

                  {/* Ekuitas / Saldo Dana */}
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center justify-between border-b-2 border-lime-600 pb-2">
                      <h4 className="font-black text-lime-700 uppercase tracking-wider text-xs">
                        SALDO DANA & AKTIVA NETO
                      </h4>
                    </div>
                    {ekuitasList.map(a => (
                      <div key={a.kode} className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-700 font-medium">{a.kode} – {a.nama}</span>
                        <span className="font-mono font-bold text-slate-900">{formatRp(getLiveBalance(a.kode, selectedFundFilter))}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1.5 border-b border-slate-100 font-semibold text-lime-700">
                      <span>Surplus / Defisit Aktivitas Periode Berjalan</span>
                      <span className="font-mono font-bold">{formatRp(surplusDefisit)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lime-700 pt-1">
                      <span>Total Saldo Dana & Surplus</span>
                      <span className="font-mono">{formatRp(totalEkuitas + surplusDefisit)}</span>
                    </div>
                  </div>

                  <div className="border-t-2 border-lime-700 pt-4 flex justify-between font-black text-base text-lime-800 bg-lime-50/50 p-3 rounded-xl">
                    <span>TOTAL KEWAJIBAN + SALDO DANA</span>
                    <span className="font-mono">{formatRp(totalKewajiban + totalEkuitas + surplusDefisit)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Balance Check Footer for Single / Consolidated Mode */}
            {selectedFundFilter !== 'Komparatif' && selectedFundFilter !== 'Multi' && (
              <div className={`p-4 text-center font-bold text-xs sm:text-sm border-t flex items-center justify-center gap-2 ${
                isBalanced ? 'bg-lime-50 text-lime-800 border-lime-200' : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {isBalanced ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-lime-600" />
                    <span>✅ Keseimbangan Neraca Aktivitas Sempurna (Total Aktiva = Total Kewajiban + Saldo Dana & Surplus Aktivitas)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>⚠️ Neraca Aktivitas Tidak Seimbang! Periksa kembali posting jurnal.</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* VIEW MODE 3: MULTI-NERACA STACKED VIEW (INDIVIDUAL SEPARATED DOCUMENT FOR EACH FUND) */}
          {selectedFundFilter === 'Multi' && (
            <div className="space-y-6 pt-2">
              <div className="bg-lime-800 text-white p-4 rounded-2xl flex items-center justify-between text-xs font-bold shadow-sm">
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-lime-300" /> Kumpulan 4 Dokumen Laporan Neraca Aktivitas Terpisah Berdasarkan Standar PSAK 409
                </span>
                <span className="text-lime-200 font-mono">Zakat • Infaq • Wakaf • Sodaqoh</span>
              </div>

              {/* 1. DANA ZAKAT */}
              {renderFundBalanceSheetDoc('Zakat', 'bg-emerald-600', 'border-emerald-300', zakatMetrics)}

              {/* 2. DANA INFAQ */}
              {renderFundBalanceSheetDoc('Infaq', 'bg-blue-600', 'border-blue-300', infaqMetrics)}

              {/* 3. DANA WAKAF */}
              {renderFundBalanceSheetDoc('Wakaf', 'bg-purple-600', 'border-purple-300', wakafMetrics)}

              {/* 4. DANA SODAQOH */}
              {renderFundBalanceSheetDoc('Sodaqoh', 'bg-amber-600', 'border-amber-300', sodaqohMetrics)}
            </div>
          )}
        </div>
      )}

      {/* REPORT CONTENT: LABA RUGI / SURPLUS DEFISIT */}
      {tab === 'labarugi' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm space-y-0">
          
          <div className="p-6 text-center border-b border-slate-200 bg-slate-50">
            <span className="text-xs font-black text-lime-700 uppercase tracking-widest">DKM MASJID CITRA SENTUL RAYA</span>
            <h3 className="text-xl font-black text-slate-900 mt-1">LAPORAN SURPLUS & DEFISIT AKTIVITAS (LABA RUGI)</h3>
            <p className="text-xs text-slate-500 font-medium">Periode 1 Juli 2026 s/d 31 Juli 2026</p>
          </div>

          <div className="p-6 space-y-6 text-xs sm:text-sm">
            
            {/* Section 1: Pendapatan */}
            <div className="space-y-3">
              <h4 className="font-black text-lime-700 uppercase tracking-wider text-xs border-b-2 border-lime-600 pb-2">
                1. PENDAPATAN & PENERIMAAN DONASI ZISWAF
              </h4>
              
              {pendapatanGroups.map(grp => (
                <div key={grp} className="space-y-1.5 pl-2">
                  <p className="font-bold text-slate-400 text-xs uppercase tracking-wider">{grp}</p>
                  {pendapatanList.filter(a => a.kelompok === grp).map(a => {
                    const bal = getLiveBalance(a.kode, selectedFundFilter);
                    const fund = getAccountFundCategory(a);
                    return (
                      <div key={a.kode} className="flex justify-between py-1.5 border-b border-slate-100 pl-4">
                        <span className="text-slate-700 font-medium flex items-center gap-2">
                          <span>{a.nama}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            fund === 'Zakat' ? 'bg-emerald-100 text-emerald-700' :
                            fund === 'Infaq' ? 'bg-blue-100 text-blue-700' :
                            fund === 'Wakaf' ? 'bg-purple-100 text-purple-700' :
                            fund === 'Sodaqoh' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {fund}
                          </span>
                        </span>
                        <span className="font-mono font-bold text-lime-700">{formatRp(bal)}</span>
                      </div>
                    );
                  })}
                </div>
              ))}

              <div className="flex justify-between font-black text-base text-lime-800 bg-lime-50 p-3.5 rounded-2xl border border-lime-200 mt-2">
                <span>TOTAL PENDAPATAN & PENERIMAAN</span>
                <span className="font-mono">{formatRp(totalPendapatan)}</span>
              </div>
            </div>

            {/* Section 2: Beban */}
            <div className="space-y-3 pt-2">
              <h4 className="font-black text-rose-700 uppercase tracking-wider text-xs border-b-2 border-rose-600 pb-2">
                2. BEBAN & PENGELUARAN PENYALURAN PROGRAM / OPERASIONAL
              </h4>

              {bebanGroups.map(grp => (
                <div key={grp} className="space-y-1.5 pl-2">
                  <p className="font-bold text-slate-400 text-xs uppercase tracking-wider">{grp}</p>
                  {bebanList.filter(a => a.kelompok === grp).map(a => {
                    const bal = getLiveBalance(a.kode, selectedFundFilter);
                    const fund = getAccountFundCategory(a);
                    return (
                      <div key={a.kode} className="flex justify-between py-1.5 border-b border-slate-100 pl-4">
                        <span className="text-slate-700 font-medium flex items-center gap-2">
                          <span>{a.nama}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            fund === 'Zakat' ? 'bg-emerald-100 text-emerald-700' :
                            fund === 'Infaq' ? 'bg-blue-100 text-blue-700' :
                            fund === 'Wakaf' ? 'bg-purple-100 text-purple-700' :
                            fund === 'Sodaqoh' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {fund}
                          </span>
                        </span>
                        <span className="font-mono font-bold text-rose-700">{formatRp(bal)}</span>
                      </div>
                    );
                  })}
                </div>
              ))}

              <div className="flex justify-between font-black text-base text-rose-800 bg-rose-50 p-3.5 rounded-2xl border border-rose-200 mt-2">
                <span>TOTAL BEBAN & PENYALURAN PROGRAM</span>
                <span className="font-mono">{formatRp(totalBeban)}</span>
              </div>
            </div>

            {/* Section 3: Net Surplus / Defisit */}
            <div className={`p-6 rounded-3xl border-2 flex flex-col sm:flex-row items-center justify-between gap-4 ${
              surplusDefisit >= 0 
                ? 'bg-lime-600 text-white border-lime-700 shadow-md' 
                : 'bg-rose-600 text-white border-rose-700 shadow-md'
            }`}>
              <div>
                <p className="text-xs uppercase tracking-widest font-black text-white/80">HASIL AKTIVITAS KEUANGAN BERSIH</p>
                <h4 className="text-2xl font-black">{surplusDefisit >= 0 ? 'SURPLUS AKTIVITAS PERIODE INI' : 'DEFISIT AKTIVITAS PERIODE INI'}</h4>
                <p className="text-xs text-white/80 mt-0.5">Total Penerimaan ZISWAF dikurangi Total Penyaluran Program & Operasional</p>
              </div>

              <p className="text-3xl font-black font-mono tracking-tight bg-white/10 backdrop-blur px-6 py-3 rounded-2xl border border-white/20">
                {formatRp(surplusDefisit)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
