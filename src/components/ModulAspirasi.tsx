import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MessageSquare, CheckCircle, Trash2, Reply } from 'lucide-react';

export const ModulAspirasi = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyId, setReplyId] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    const { data } = await supabase.from('tanya_dkm').select('*').order('created_at', { ascending: false });
    if (data) setMessages(data);
    setLoading(false);
  };

  const handleReply = async (id: string) => {
    if (!replyText.trim()) return;
    const { error } = await supabase.from('tanya_dkm').update({
      balasan: replyText,
      status: 'terjawab',
      dibalas_pada: new Date().toISOString()
    }).eq('id', id);

    if (!error) {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, balasan: replyText, status: 'terjawab' } : m));
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

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="text-lime-600" size={24} />
        <h2 className="text-xl font-bold text-slate-800">Kotak Masuk Jamaah (Aspirasi & Tanya DKM)</h2>
      </div>

      {loading ? (
        <p className="text-slate-500">Memuat pesan...</p>
      ) : messages.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <MessageSquare className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500">Belum ada pesan dari jamaah.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`bg-white rounded-xl border p-4 shadow-sm ${msg.status === 'terjawab' ? 'border-green-200' : 'border-yellow-200'}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-slate-800">{msg.pengirim}</h4>
                  <p className="text-xs text-slate-500">{new Date(msg.created_at).toLocaleString('id-ID')}</p>
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
                        <button onClick={() => handleReply(msg.id)} className="bg-lime-600 text-white px-3 py-1 rounded-lg text-sm font-bold flex-1">Kirim</button>
                        <button onClick={() => setReplyId(null)} className="bg-slate-200 text-slate-700 px-3 py-1 rounded-lg text-sm font-bold flex-1">Batal</button>
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
