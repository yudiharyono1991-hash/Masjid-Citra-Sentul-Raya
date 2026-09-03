import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, CheckCircle, Trash2, Reply, BarChart3, PieChart as PieChartIcon, Download, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const ModulAspirasi = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyId, setReplyId] = useState<string | null>(null);

  // Helper to format local date as YYYY-MM-DD
  const toLocalISODate = (d: Date) => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
  };

  const todayLocal = new Date();
  const firstOfMonthLocal = new Date(todayLocal.getFullYear(), todayLocal.getMonth(), 1);
  
  const [filterStart, setFilterStart] = useState(toLocalISODate(firstOfMonthLocal));
  const [filterEnd, setFilterEnd] = useState(toLocalISODate(todayLocal));
  const [filterStatus, setFilterStatus] = useState('Semua');

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    const { data } = await supabase.from('tanya_dkm').select('*').order('created_at', { ascending: false });
    if (data) setMessages(data);
    setLoading(false);
  };

  const filteredMessages = messages.filter(msg => {
    // Filter Date
    if (filterStart && filterEnd) {
      const msgDate = new Date(msg.created_at).getTime();
      const start = new Date(filterStart).getTime();
      const end = new Date(filterEnd).setHours(23, 59, 59, 999);
      if (msgDate < start || msgDate > end) return false;
    }
    // Filter Status
    if (filterStatus === 'Menunggu Balasan' && msg.status === 'terjawab') return false;
    if (filterStatus === 'Terjawab' && msg.status !== 'terjawab') return false;
    
    return true;
  });

  const handleReply = async (id: string, withWa: boolean = false) => {
    if (!replyText.trim()) return;
    const { error } = await supabase.from('tanya_dkm').update({
      balasan: replyText,
      status: 'terjawab',
      dibalas_pada: new Date().toISOString()
    }).eq('id', id);

    if (!error) {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, balasan: replyText, status: 'terjawab' } : m));
      
      const msg = messages.find(m => m.id === id);
      if (withWa && msg) {
         let phone = msg.no_wa;
         if (!phone) phone = prompt('Nomor WA jamaah belum ada di database. Masukkan nomor WA tujuan:');
         if (phone) {
             const finalPhone = phone.startsWith('0') ? '62' + phone.substring(1) : phone.replace(/\D/g, '');
             const nama = msg.nama_penanya || msg.pengirim || 'Jamaah';
             const message = encodeURIComponent(`Assalamu'alaikum Warahmatullahi Wabarakatuh Bapak/Ibu ${nama},\n\nTerima kasih atas aspirasi/pertanyaan Anda mengenai *${msg.kategori}*.\n\nBerikut adalah tanggapan dari Pengurus DKM Masjid Citra Sentul Raya:\n\n_"${replyText}"_\n\nJazakumullah khairan atas partisipasi Anda dalam membangun masjid kita bersama.\n\nWassalamu'alaikum Warahmatullahi Wabarakatuh`);
             window.open(`https://wa.me/${finalPhone}?text=${message}`, '_blank');
         }
      }

      setReplyId(null);
      setReplyText('');
    } else {
      alert('Gagal membalas pesan');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus pesan ini?')) {
      const { error } = await supabase.from('tanya_dkm').delete().eq('id', id);
      if (!error) {
        setMessages(prev => prev.filter(m => m.id !== id));
      }
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.text('Laporan Rekapitulasi Aspirasi & Tanya DKM', 14, 15);
    doc.setFontSize(10);
    doc.text(`Periode: ${filterStart || 'Awal'} s/d ${filterEnd || 'Sekarang'}`, 14, 22);

    const tableData = filteredMessages.map((m, i) => [
      i + 1,
      new Date(m.created_at || m.tanggal || new Date()).toLocaleDateString('id-ID'),
      m.nama_penanya || m.pengirim || 'Jamaah',
      m.kategori,
      m.pesan,
      m.status === 'terjawab' ? 'Terjawab' : 'Menunggu',
      m.balasan || '-'
    ]);

    (doc as any).autoTable({
      startY: 30,
      head: [['No', 'Tanggal', 'Pengirim', 'Kategori', 'Pesan / Aspirasi', 'Status', 'Tanggapan DKM']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [101, 163, 13] },
      styles: { fontSize: 8, cellPadding: 2 }
    });

    doc.save(`Laporan_Aspirasi_${filterStart}_sd_${filterEnd}.pdf`);
  };

  const handleExportExcel = () => {
    const data = filteredMessages.map((m, i) => ({
      'No': i + 1,
      'Tanggal': new Date(m.created_at || m.tanggal || new Date()).toLocaleString('id-ID'),
      'Pengirim': m.nama_penanya || m.pengirim || 'Jamaah',
      'No WA': m.no_wa || '-',
      'Kategori': m.kategori,
      'Pesan / Aspirasi': m.pesan,
      'Status': m.status === 'terjawab' ? 'Terjawab' : 'Menunggu',
      'Tanggapan DKM': m.balasan || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Aspirasi");
    XLSX.writeFile(workbook, `Rekap_Aspirasi_${filterStart}_sd_${filterEnd}.xlsx`);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-lime-600" size={24} />
          <h2 className="text-xl font-bold text-slate-800">Kotak Masuk Jamaah (Aspirasi & Tanya DKM)</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold border border-rose-200 transition-colors">
            <FileText size={14}/> PDF
          </button>
          <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl text-xs font-bold border border-emerald-200 transition-colors">
            <Download size={14}/> Excel
          </button>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2 w-full">
          <select 
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 font-bold text-slate-700 outline-none"
          >
            <option value="Semua">Semua Status</option>
            <option value="Menunggu Balasan">Menunggu Balasan</option>
            <option value="Terjawab">Terjawab</option>
          </select>
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200">
            <span className="text-xs font-bold text-slate-700">Filter:</span>
            <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="bg-transparent text-slate-700 font-medium text-xs focus:outline-none focus:ring-0" />
            <span className="text-xs font-bold text-slate-400">-</span>
            <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="bg-transparent text-slate-700 font-medium text-xs focus:outline-none focus:ring-0" />
          </div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {!loading && messages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
             <h3 className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-2"><PieChartIcon size={16}/> Status Respons</h3>
             <div className="h-40 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie 
                     data={[
                       { name: 'Terjawab', value: messages.filter(m => m.status === 'terjawab').length },
                       { name: 'Menunggu', value: messages.filter(m => m.status !== 'terjawab').length }
                     ]} 
                     dataKey="value" 
                     nameKey="name" 
                     cx="50%" cy="50%" 
                     outerRadius={60}
                     label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                   >
                     <Cell fill="#65a30d" />
                     <Cell fill="#eab308" />
                   </Pie>
                   <Tooltip />
                 </PieChart>
               </ResponsiveContainer>
             </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
             <h3 className="text-sm font-bold text-slate-600 mb-2 flex items-center gap-2"><BarChart3 size={16}/> Topik Aspirasi</h3>
             <div className="h-40 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={
                    Array.from(new Set(messages.map(m => m.kategori))).map(k => ({
                       name: k,
                       total: messages.filter(m => m.kategori === k).length
                    }))
                 }>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} />
                   <YAxis allowDecimals={false} tick={{fontSize: 10}} />
                   <Tooltip />
                   <Bar dataKey="total" fill="#475569" radius={[4, 4, 0, 0]} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Memuat pesan...</p>
      ) : filteredMessages.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <MessageSquare className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500">Belum ada pesan dari jamaah pada rentang filter ini.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map(msg => (
            <div key={msg.id} className={`bg-white rounded-xl border p-4 shadow-sm ${msg.status === 'terjawab' ? 'border-green-200' : 'border-yellow-200'}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-bold text-slate-800">{msg.nama_penanya || msg.pengirim || 'Jamaah'}</h4>
                    {msg.ticket_id && (
                      <span className="bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                        {msg.ticket_id}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{new Date(msg.created_at || msg.tanggal || new Date()).toLocaleString('id-ID')}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <span className={`px-2 py-1 text-xs font-bold rounded-full ${msg.status === 'terjawab' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {msg.status === 'terjawab' ? 'Terjawab' : 'Menunggu Balasan'}
                  </span>
                  <button onClick={() => handleDelete(msg.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"><Trash2 size={16}/></button>
                </div>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-lg mb-3">
                <p className="text-slate-700 font-medium">Kategori: {msg.kategori}</p>
                <p className="text-slate-600 text-sm mt-1">{msg.pesan}</p>
              </div>

              {msg.status === 'terjawab' ? (
                <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                  <p className="text-green-800 font-bold text-sm mb-1 flex items-center gap-1"><CheckCircle size={14}/> Balasan DKM:</p>
                  <p className="text-green-700 text-sm">{msg.balasan}</p>
                </div>
              ) : (
                <div>
                  {replyId === msg.id ? (
                    <div className="flex gap-2">
                      <textarea 
                        className="flex-1 border border-slate-300 rounded-lg p-2 text-sm focus:border-lime-500 outline-none"
                        placeholder="Ketik balasan..."
                        rows={2}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                      />
                      <div className="flex flex-col gap-2">
                        <button onClick={() => handleReply(msg.id, false)} className="bg-lime-600 hover:bg-lime-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex-1 transition-colors">Kirim</button>
                        <button onClick={() => handleReply(msg.id, true)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex-1 transition-colors flex items-center justify-center gap-1">WA</button>
                        <button onClick={() => setReplyId(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-bold flex-1 transition-colors">Batal</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setReplyId(msg.id)} className="text-lime-600 hover:bg-lime-50 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1">
                      <Reply size={16}/> Balas Pesan
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
