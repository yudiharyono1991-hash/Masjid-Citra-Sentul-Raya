import React, { useState } from 'react';
import { PlusCircle, FileText, CheckCircle, Clock, Search, AlertCircle, Trash2, ArrowRight } from 'lucide-react';
import { INITIAL_CHART_OF_ACCOUNTS, INITIAL_JURNAL_ENTRIES, JurnalEntry, JurnalBaris, AkunCoA } from '../data/akuntansiData';

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const SUMBER_COLOR: Record<string, string> = {
  'Donasi Umum': 'bg-lime-100 text-lime-800 border-lime-200',
  'Donasi Portal Jamaah': 'bg-lime-100 text-lime-800 border-lime-200',
  'Kas Masjid': 'bg-lime-100 text-lime-800 border-lime-200',
  'Anggaran': 'bg-lime-100 text-lime-800 border-lime-200',
};

interface ModulJurnalProps {
  entries?: JurnalEntry[];
  accounts?: AkunCoA[];
  onAddJournal?: (entry: JurnalEntry) => void;
}

export const ModulJurnal: React.FC<ModulJurnalProps> = ({ 
  entries = INITIAL_JURNAL_ENTRIES, 
  accounts = INITIAL_CHART_OF_ACCOUNTS,
  onAddJournal 
}) => {
  const [journalList, setJournalList] = useState<JurnalEntry[]>(entries);
  const [tab, setTab] = useState<'list' | 'input'>('list');
  const [search, setSearch] = useState('');
  const [filterSumber, setFilterSumber] = useState('Semua');

  // Form Double Entry State
  const [formTgl, setFormTgl] = useState(new Date().toISOString().split('T')[0]);
  const [formNoBukti, setFormNoBukti] = useState(`JU-${new Date().getFullYear()}-00${journalList.length + 1}`);
  const [formKet, setFormKet] = useState('');
  const [formSumber, setFormSumber] = useState<'Donasi Umum' | 'Donasi Portal Jamaah' | 'Kas Masjid' | 'Anggaran'>('Kas Masjid');
  const [formBaris, setFormBaris] = useState<JurnalBaris[]>([
    { kodeAkun: '1-1100', namaAkun: 'Kas Tunai Masjid', debit: 0, kredit: 0 },
    { kodeAkun: '4-1200', namaAkun: 'Pendapatan Infaq Kotak Amal', debit: 0, kredit: 0 },
  ]);

  const allEntries = journalList;

  const filtered = allEntries.filter(j => {
    const matchSearch = j.keterangan.toLowerCase().includes(search.toLowerCase()) || j.noBukti.toLowerCase().includes(search.toLowerCase());
    const matchSumber = filterSumber === 'Semua' || j.sumber === filterSumber;
    return matchSearch && matchSumber;
  });

  const totalDebit = allEntries.reduce((s, j) => s + j.baris.reduce((b, r) => b + r.debit, 0), 0);
  const totalKredit = allEntries.reduce((s, j) => s + j.baris.reduce((b, r) => b + r.kredit, 0), 0);

  const formTotalDebit = formBaris.reduce((s, b) => s + (Number(b.debit) || 0), 0);
  const formTotalKredit = formBaris.reduce((s, b) => s + (Number(b.kredit) || 0), 0);
  const isBalanced = formTotalDebit > 0 && formTotalDebit === formTotalKredit;

  const addBaris = () => {
    setFormBaris([...formBaris, { kodeAkun: '', namaAkun: '', debit: 0, kredit: 0 }]);
  };

  const removeBaris = (index: number) => {
    if (formBaris.length <= 2) return;
    setFormBaris(formBaris.filter((_, i) => i !== index));
  };

  const updateBaris = (index: number, field: keyof JurnalBaris, value: any) => {
    const updated = [...formBaris];
    if (field === 'kodeAkun') {
      const selectedCoA = accounts.find(a => a.kode === value);
      updated[index].kodeAkun = value;
      updated[index].namaAkun = selectedCoA ? selectedCoA.nama : '';
    } else {
      (updated[index] as any)[field] = value;
    }
    setFormBaris(updated);
  };

  const handleSubmitJurnal = (status: 'Draft' | 'Posted') => {
    if (!formKet) {
      alert('Mohon isi keterangan transaksi.');
      return;
    }

    if (status === 'Posted' && !isBalanced) {
      alert('Posting Gagal! Total Debit harus SAMA dengan Total Kredit.');
      return;
    }

    const newEntry: JurnalEntry = {
      id: `JU-${Date.now()}`,
      tanggal: formTgl,
      noBukti: formNoBukti,
      keterangan: formKet,
      sumber: formSumber,
      baris: formBaris.filter(b => b.kodeAkun && (b.debit > 0 || b.kredit > 0)),
      status,
      dibuatOleh: 'Staf Keuangan',
      tanggalBuat: new Date().toISOString().split('T')[0],
    };

    setJournalList([newEntry, ...journalList]);
    if (onAddJournal) onAddJournal(newEntry);

    alert(`Berhasil menyimpan Jurnal Umum (${status === 'Posted' ? 'Ter-posted ke Buku Besar' : 'Draft'})!`);
    setTab('list');

    // Reset Form
    setFormKet('');
    setFormNoBukti(`JU-${new Date().getFullYear()}-00${journalList.length + 2}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Metric Cards Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-lime-950 rounded-3xl p-6 text-white shadow-md border border-slate-700">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Entri Jurnal</p>
          <p className="text-3xl font-black">{allEntries.length} <span className="text-sm font-normal text-slate-300">Transaksi</span></p>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-lime-400" /> Terintegrasi ke Buku Besar & Laporan Keuangan
          </p>
        </div>

        <div className="bg-gradient-to-br from-lime-800 to-lime-900 rounded-3xl p-6 text-white shadow-md border border-lime-700">
          <p className="text-xs font-bold text-lime-200 uppercase tracking-wider mb-1">Total Debit Ter-posting</p>
          <p className="text-2xl font-black font-mono">{formatRp(totalDebit)}</p>
          <p className="text-xs text-lime-200 mt-2">Penerimaan / Alokasi Aset & Beban</p>
        </div>

        <div className="bg-gradient-to-br from-lime-800 to-lime-900 rounded-3xl p-6 text-white shadow-md border border-lime-700">
          <p className="text-xs font-bold text-lime-200 uppercase tracking-wider mb-1">Total Kredit (Jurnal Lawan)</p>
          <p className="text-2xl font-black font-mono">{formatRp(totalKredit)}</p>
          <p className="text-xs text-lime-200 mt-2">Keseimbangan Double-Entry (Kredit)</p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex justify-between items-center bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex gap-1">
          <button
            onClick={() => setTab('list')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              tab === 'list'
                ? 'bg-lime-700 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Daftar Jurnal Umum & Jurnal Lawan ({allEntries.length})
          </button>
          <button
            onClick={() => setTab('input')}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
              tab === 'input'
                ? 'bg-lime-700 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <PlusCircle className="w-4 h-4" /> Input Jurnal Double-Entry Baru
          </button>
        </div>
      </div>

      {tab === 'list' ? (
        <div className="space-y-4">
          {/* Search & Source Filter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari no bukti (BKM-2026-07-001) atau keterangan..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100 transition-all text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Sumber Dana:</span>
              {['Semua', 'Donasi Umum', 'Donasi Portal Jamaah', 'Kas Masjid', 'Anggaran'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterSumber(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    filterSumber === s
                      ? 'bg-lime-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Journal Entries List */}
          <div className="space-y-4">
            {filtered.map(jurnal => (
              <div key={jurnal.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow">
                
                {/* Journal Card Header */}
                <div className="flex flex-wrap items-center justify-between p-4 bg-slate-50 border-b border-slate-100 gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="w-9 h-9 rounded-xl bg-lime-50 border border-lime-100 text-lime-700 flex items-center justify-center font-bold">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lime-700 text-sm">{jurnal.noBukti}</span>
                        <span className="text-xs text-slate-400 font-semibold">• {jurnal.tanggal}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Oleh: {jurnal.dibuatOleh} ({jurnal.tanggalBuat})</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-xl border ${SUMBER_COLOR[jurnal.sumber] || 'bg-slate-100 text-slate-600'}`}>
                      {jurnal.sumber}
                    </span>
                    {jurnal.status === 'Posted' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-lime-700 bg-lime-50 border border-lime-200 px-3 py-1 rounded-xl">
                        <CheckCircle className="w-3.5 h-3.5" /> Posted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-lime-700 bg-lime-50 border border-lime-200 px-3 py-1 rounded-xl">
                        <Clock className="w-3.5 h-3.5" /> Draft
                      </span>
                    )}
                  </div>
                </div>

                {/* Journal Body Detail */}
                <div className="p-5 space-y-3">
                  <p className="text-sm font-bold text-slate-800">
                    Keterangan: <span className="font-normal text-slate-700">{jurnal.keterangan}</span>
                  </p>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">Kode Akun</th>
                          <th className="px-4 py-2.5">Nama Akun & Peran (Jurnal Lawan)</th>
                          <th className="px-4 py-2.5 text-right">Debit (Rp)</th>
                          <th className="px-4 py-2.5 text-right">Kredit (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {jurnal.baris.map((b, i) => (
                          <tr key={i} className={i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                            <td className="px-4 py-2.5 font-mono font-bold text-lime-700">{b.kodeAkun}</td>
                            <td className="px-4 py-2.5 font-semibold text-slate-800">
                              {b.kredit > 0 ? (
                                <span className="pl-4 text-lime-700 flex items-center gap-1">
                                  <ArrowRight className="w-3 h-3 text-lime-400 inline" /> {b.namaAkun}
                                </span>
                              ) : (
                                <span className="text-lime-800">{b.namaAkun}</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-lime-600">
                              {b.debit > 0 ? formatRp(b.debit) : '-'}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-lime-600">
                              {b.kredit > 0 ? formatRp(b.kredit) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-600 font-bold text-sm">Entri jurnal tidak ditemukan</p>
                <p className="text-xs text-slate-400 mt-1">Coba sesuaikan pencarian atau filter sumber dana.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Form Double Entry Input */
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-lime-600" /> Form Input Jurnal Double-Entry & Jurnal Lawan
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Setiap transaksi keuangan masjid harus dicatat secara seimbang (Debit = Kredit) untuk menjamin akuntabilitas laporan Neraca dan Laba Rugi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">No Bukti Transaksi</label>
              <input
                type="text"
                value={formNoBukti}
                onChange={e => setFormNoBukti(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-lime-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tanggal Transaksi</label>
              <input
                type="date"
                value={formTgl}
                onChange={e => setFormTgl(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-lime-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sumber Dana / Kategori</label>
              <select
                value={formSumber}
                onChange={e => setFormSumber(e.target.value as any)}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-lime-500"
              >
                <option value="Kas Masjid">Kas Masjid</option>
                <option value="Donasi Umum">Donasi Umum</option>
                <option value="Donasi Portal Jamaah">Donasi Portal Jamaah</option>
                <option value="Anggaran">Anggaran Operasional/Pembangunan</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Keterangan / Uraian Transaksi *</label>
            <input
              type="text"
              placeholder="Contoh: Penerimaan Donasi Portal Jamaah untuk Program Santunan Dhuafa..."
              value={formKet}
              onChange={e => setFormKet(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-lime-500"
            />
          </div>

          {/* Table Input Baris Double Entry */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden space-y-0">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Akun CoA</th>
                  <th className="px-4 py-3 text-right">Debit (Rp)</th>
                  <th className="px-4 py-3 text-right">Kredit (Rp - Jurnal Lawan)</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formBaris.map((b, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <select
                        value={b.kodeAkun}
                        onChange={e => updateBaris(idx, 'kodeAkun', e.target.value)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-lime-500"
                      >
                        <option value="">-- Pilih Akun CoA --</option>
                        {accounts.map(a => (
                          <option key={a.kode} value={a.kode}>
                            {a.kode} - {a.nama} ({a.jenis})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        placeholder="0"
                        value={b.debit || ''}
                        onChange={e => updateBaris(idx, 'debit', parseFloat(e.target.value) || 0)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-right font-mono font-bold text-lime-700 focus:outline-none focus:border-lime-500"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        placeholder="0"
                        value={b.kredit || ''}
                        onChange={e => updateBaris(idx, 'kredit', parseFloat(e.target.value) || 0)}
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-xs text-right font-mono font-bold text-lime-700 focus:outline-none focus:border-lime-500"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeBaris(idx)}
                        disabled={formBaris.length <= 2}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-200 font-bold">
                <tr>
                  <td className="px-4 py-3 text-sm text-slate-700">TOTAL DOUBLE ENTRY:</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-lime-700">{formatRp(formTotalDebit)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-lime-700">{formatRp(formTotalKredit)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Validation Banner */}
          <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            isBalanced
              ? 'bg-lime-50 border-lime-200 text-lime-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <div className="flex items-center gap-2">
              {isBalanced ? <CheckCircle className="w-4 h-4 text-lime-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span>
                {isBalanced 
                  ? '✅ Status: SEIMBANG (Debit = Kredit). Siap untuk di-posting ke Buku Besar & Laporan Keuangan!' 
                  : '⚠️ Status: TIDAK SEIMBANG! Pastikan Total Debit SAMA dengan Total Kredit.'}
              </span>
            </div>

            <button
              type="button"
              onClick={addBaris}
              className="text-xs text-lime-700 hover:text-lime-900 bg-white border border-lime-200 px-3 py-1.5 rounded-xl font-bold transition-colors"
            >
              + Tambah Baris
            </button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleSubmitJurnal('Draft')}
              className="px-5 py-3 border border-slate-200 rounded-xl text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-100 transition-colors"
            >
              Simpan Draft
            </button>
            <button
              type="button"
              disabled={!isBalanced}
              onClick={() => handleSubmitJurnal('Posted')}
              className="px-6 py-3 bg-lime-700 hover:bg-lime-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95"
            >
              Posting ke Buku Besar & Laporan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
