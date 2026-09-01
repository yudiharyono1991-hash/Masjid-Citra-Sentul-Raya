import React, { useState } from 'react';
import { BookOpen, Search, ArrowRightLeft, FileSpreadsheet } from 'lucide-react';
import { INITIAL_CHART_OF_ACCOUNTS, INITIAL_JURNAL_ENTRIES, JurnalEntry, AkunCoA } from '../data/akuntansiData';
import * as XLSX from 'xlsx';

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

interface ModulBukuBesarProps {
  journals?: JurnalEntry[];
  accounts?: AkunCoA[];
}

export const ModulBukuBesar: React.FC<ModulBukuBesarProps> = ({ 
  journals = INITIAL_JURNAL_ENTRIES,
  accounts = INITIAL_CHART_OF_ACCOUNTS 
}) => {
  const [selectedKode, setSelectedKode] = useState<string>(accounts[0]?.kode || '1-1100');
  const [searchAccount, setSearchAccount] = useState('');

  const selectedAkun = accounts.find(a => a.kode === selectedKode) || accounts[0];

  // Calculate Ledger Rows dynamically for the selected account
  const buildLedgerRows = () => {
    if (!selectedAkun) return [];

    let runningBalance = selectedAkun.saldoAwal;
    const rows: {
      tanggal: string;
      noBukti: string;
      keterangan: string;
      sumber: string;
      debit: number;
      kredit: number;
      saldo: number;
    }[] = [];

    journals.forEach(j => {
      if (j.status === 'Posted') {
        j.baris.forEach(b => {
          if (b.kodeAkun === selectedAkun.kode) {
            if (selectedAkun.saldoNormal === 'Debit') {
              runningBalance += (b.debit - b.kredit);
            } else {
              runningBalance += (b.kredit - b.debit);
            }

            rows.push({
              tanggal: j.tanggal,
              noBukti: j.noBukti,
              keterangan: j.keterangan,
              sumber: j.sumber,
              debit: b.debit,
              kredit: b.kredit,
              saldo: runningBalance,
            });
          }
        });
      }
    });

    return rows;
  };

  const ledgerRows = buildLedgerRows();
  const totalDebitAcc = ledgerRows.reduce((s, r) => s + r.debit, 0);
  const totalKreditAcc = ledgerRows.reduce((s, r) => s + r.kredit, 0);
  const closingBalance = ledgerRows.length > 0 ? ledgerRows[ledgerRows.length - 1].saldo : selectedAkun.saldoAwal;

  const filteredAccounts = accounts.filter(a => 
    a.kode.includes(searchAccount) || a.nama.toLowerCase().includes(searchAccount.toLowerCase())
  );

  const handleExportExcel = () => {
    if (!selectedAkun) return;
    const wsData = ledgerRows.map(r => ({
      Tanggal: r.tanggal,
      'No Bukti': r.noBukti,
      Sumber: r.sumber,
      Keterangan: r.keterangan,
      Debit: r.debit,
      Kredit: r.kredit,
      Saldo: r.saldo
    }));
    
    // Insert header info
    wsData.unshift({ Tanggal: '', 'No Bukti': '', Sumber: '', Keterangan: 'SALDO AWAL', Debit: 0, Kredit: 0, Saldo: selectedAkun.saldoAwal });
    
    const worksheet = XLSX.utils.json_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Buku Besar");
    XLSX.writeFile(workbook, `Buku_Besar_${selectedAkun.kode}_${selectedAkun.nama.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Banner Header */}
      <div className="bg-gradient-to-r from-lime-700 via-lime-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-lime-200" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">Buku Besar (General Ledger)</h2>
            <p className="text-lime-200 text-xs sm:text-sm">Buku Mutasi Akun Keuangan Masjid Citra Sentul Raya</p>
          </div>
        </div>

        <button 
          onClick={handleExportExcel}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 rounded-2xl text-xs transition-all border border-white/20 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-lime-300" /> Export Ledger Excel
        </button>
      </div>

      {/* Account Selector Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Akun Buku Besar:</label>
          <input
            type="text"
            placeholder="Cari kode/nama akun..."
            value={searchAccount}
            onChange={e => setSearchAccount(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-lime-500 w-full sm:w-64"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto pr-1">
          {filteredAccounts.map(a => (
            <button
              key={a.kode}
              onClick={() => setSelectedKode(a.kode)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                selectedKode === a.kode
                  ? 'bg-lime-500 text-white border-lime-600 shadow-md font-bold'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex justify-between items-center w-full">
                <span className="font-mono text-xs font-bold">{a.kode}</span>
                <span className={`text-xs px-2 py-0.5 rounded-md font-bold uppercase ${
                  selectedKode === a.kode ? 'bg-lime-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {a.jenis}
                </span>
              </div>
              <p className="text-xs truncate mt-1 font-semibold">{a.nama}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Active Account Detail & Ledger Table */}
      {selectedAkun && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm space-y-0">
          
          {/* Account Card Header */}
          <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-lg text-lime-700 bg-lime-100 border border-lime-200 px-3 py-0.5 rounded-xl">
                  {selectedAkun.kode}
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700">
                  {selectedAkun.kelompok}
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-lime-100 text-lime-800">
                  Saldo Normal: {selectedAkun.saldoNormal}
                </span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 mt-2">{selectedAkun.nama}</h3>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-right shadow-xs min-w-[200px]">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo Akhir Akun</p>
              <p className="text-xl font-black font-mono text-lime-700">{formatRp(closingBalance)}</p>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left whitespace-nowrap">
              <thead className="bg-slate-100 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Tanggal</th>
                  <th className="px-5 py-3.5">No Bukti</th>
                  <th className="px-5 py-3.5">Sumber / Kategori</th>
                  <th className="px-5 py-3.5">Keterangan Mutasi</th>
                  <th className="px-5 py-3.5 text-right">Debit (Rp)</th>
                  <th className="px-5 py-3.5 text-right">Kredit (Rp)</th>
                  <th className="px-5 py-3.5 text-right">Saldo Running (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Saldo Awal Row */}
                <tr className="bg-slate-50/80 italic font-semibold text-slate-600">
                  <td className="px-5 py-3">-</td>
                  <td className="px-5 py-3 font-mono font-bold">SALDO-AWAL</td>
                  <td className="px-5 py-3">Saldo Pembukaan</td>
                  <td className="px-5 py-3">Saldo Awal Tahun / Pembukaan Pembukuan</td>
                  <td className="px-5 py-3 text-right">-</td>
                  <td className="px-5 py-3 text-right">-</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-slate-800">
                    {formatRp(selectedAkun.saldoAwal)}
                  </td>
                </tr>

                {ledgerRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 text-slate-500">{row.tanggal}</td>
                    <td className="px-5 py-3.5 font-mono font-bold text-lime-700">{row.noBukti}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 bg-slate-100 rounded-md font-semibold text-slate-600">
                        {row.sumber}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-800 max-w-xs truncate">{row.keterangan}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-lime-600">
                      {row.debit > 0 ? formatRp(row.debit) : '-'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-lime-600">
                      {row.kredit > 0 ? formatRp(row.kredit) : '-'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                      {formatRp(row.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-extrabold text-sm">
                <tr>
                  <td colSpan={4} className="px-5 py-4 text-slate-700 uppercase tracking-wider">
                    TOTAL MUTASI & SALDO AKHIR
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-lime-700">{formatRp(totalDebitAcc)}</td>
                  <td className="px-5 py-4 text-right font-mono text-lime-700">{formatRp(totalKreditAcc)}</td>
                  <td className="px-5 py-4 text-right font-mono text-lime-800 text-base">{formatRp(closingBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {ledgerRows.length === 0 && (
            <div className="text-center py-12 bg-white">
              <ArrowRightLeft className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-600 font-bold text-sm">Belum ada mutasi ter-posting untuk akun ini</p>
              <p className="text-xs text-slate-400 mt-1">Saldo saat ini mengacu pada saldo pembukaan ({formatRp(selectedAkun.saldoAwal)}).</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
