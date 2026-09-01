import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, User, RefreshCw } from 'lucide-react';
import { ChatMessage } from '../types';

interface AiAsistenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWakaf: () => void;
}

export const AiAsistenModal: React.FC<AiAsistenModalProps> = ({
  isOpen,
  onClose,
  onOpenWakaf,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: "Assalamu'alaikum Warahmatullahi Wabarakatuh! Saya AI Asisten Masjid Citra Sentul Raya. Anda dapat bertanya tentang Jadwal Shalat, Al-Qur'an 30 Juz, Hadits, Fiqih, Rekening Wakaf/Donasi BSI, Laporan Keuangan Masjid, atau Fasilitas Masjid Citra Sentul Raya. Apa yang ingin Anda tanyakan?",
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const quickChips = [
    'Jadwal Shalat 5 Waktu',
    'Rekening BSI Donasi',
    'Al-Qur\'an Digital & Tajwid',
    'Kitab Hadits Shahih',
    'Lokasi & Pengurus Masjid'
  ];

  const generateDynamicAnswer = (query: string): string => {
    const q = query.toLowerCase();

    if (q.includes('rekening') || q.includes('bsi') || q.includes('donasi') || q.includes('wakaf') || q.includes('transfer')) {
      return `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\nUntuk Donasi & Wakaf Pembangunan Masjid Citra Sentul Raya dapat disalurkan melalui:\n• Bank: **Bank Syariah Indonesia (BSI)**\n• No. Rekening: **7257159102**\n• Atas Nama: **Masjid Citra Sentul Raya**\n\nUntuk konfirmasi donasi atau informasi lebih lanjut, silakan hubungi pengurus:\n- Pak Leo: +62 812-1920-0400\n\nJazakumullah Khairan Katsiran atas kebaikan Bapak/Ibu!`;
    }

    if (q.includes('jadwal') || q.includes('shalat') || q.includes('solat') || q.includes('subuh') || q.includes('dzuhur') || q.includes('ashar') || q.includes('maghrib') || q.includes('isya') || q.includes('kiblat')) {
      return `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\nJadwal Shalat 5 Waktu untuk area Citra Sentul Raya, Kab. Bogor:\n• **Subuh**: 04:42 WIB\n• **Dzuhur**: 12:04 WIB\n• **Ashar**: 15:25 WIB\n• **Maghrib**: 18:02 WIB\n• **Isya**: 19:14 WIB\n\n📍 **Arah Kiblat**: 295° (Barat Laut).\nSetiap waktu shalat tiba, adzan otomatis dikumandangkan melalui pengeras suara Masjid Citra Sentul Raya.`;
    }

    if (q.includes('quran') || q.includes('surah') || q.includes('ayat') || q.includes('juz') || q.includes('tajwid') || q.includes('tafsir')) {
      return `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\nPortal Al-Qur'an Digital Masjid Citra Sentul Raya menyediakan:\n1. **114 Surah Complete** dengan audio murottal Qari pilihan.\n2. **Filter Juz 1 - 30** lengkap dengan daftar surah per juz.\n3. **Index Ayat (14 Topik Utama)**: Muamalat, Ibadah, Sejarah, Iman, Hukum, dll.\n4. **Panduan Tajwid Interaktif**: Idzhar, Idgham, Iqlab, Ikhfa, Mad, & Gharib.\n5. **Multitafsir**: Tafsir Ibnu Katsir, Kemenag, Jalalain, dan Muyassar.\n\nAnda dapat mengklik menu **Quran Digital** pada navigasi utama untuk membaca!`;
    }

    if (q.includes('hadist') || q.includes('hadits') || q.includes('bukhari') || q.includes('muslim') || q.includes('tirmidzi') || q.includes('perawi')) {
      return `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\nModul Hadits Digital Masjid Citra Sentul Raya menyediakan 3 kategori utama:\n1. **Buku Hadits**: 14 Kitab (Shahih Bukhari, Shahih Muslim, Sunan At-Tirmidzi, Sunan Abu Daud, Sunan An-Nasa'i, Sunan Ibnu Majah, Sunan Darimi, Musnad Ahmad, Muwatha' Malik, dll).\n2. **Tema Hadits**: 14 Tema (Iman, Ilmu, Al-Qur'an, Akhlaq, Muamalat, Ibadah, Jihad, dll).\n3. **Kedudukan Hadits**: Shahih, Qudsi, Mutawatir, Hasan, Marfu', Mauquf, dll.`;
    }

    if (q.includes('lokasi') || q.includes('alamat') || q.includes('dimana') || q.includes('sentul') || q.includes('pengurus')) {
      return `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\n📍 **Alamat Masjid Citra Sentul Raya**:\nKawasan Citra Sentul Raya, Sirkuit Sentul, Kab. Bogor, Jawa Barat 16810.\n\n👤 **Pengurus Masjid**:\n• Bendahara & Wakaf: Bpk. H. Leo (+62 812-1920-0400)\n\nFasilitas meliputi Ruang Shalat Utama Ber-AC, Area Parkir Luas, Taman Syariah, Sekretariat DKM, dan Pusat Pembelajaran Al-Qur'an.`;
    }

    if (q.includes('keuangan') || q.includes('laporan') || q.includes('kas') || q.includes('coa') || q.includes('jurnal') || q.includes('neraca') || q.includes('laba rugi')) {
      return `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\nSistem Keuangan Masjid Citra Sentul Raya dikelola secara transparan dan akuntabel berbasis standar Akuntansi Syariah DKM (PSAK 409):\n• **Riwayat Transaksi & COA**: Terhubung dengan Jurnal Umum & Buku Besar.\n• **Laporan Keuangan**: Menyajikan Laporan Surplus/Defisit dan Laporan Neraca Aktivitas Terpisah (Dana Zakat, Infaq, Wakaf, Sodaqoh & Operasional) secara real-time.\n• **Approval Anggaran**: Menggunakan persetujuan multi-level (Bendahara → Ketua DKM → Pembina).`;
    }

    if (q.includes('zakat') || q.includes('infaq') || q.includes('sedekah')) {
      return `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\nMasjid Citra Sentul Raya menerima dan menyalurkan Zakat Fitrah, Zakat Maal, Infaq Operasional, serta Sedekah Subuh secara amanah kepada 8 Asnaf yang berhak.\n\nDonasi dapat disalurkan melalui BSI 7257159102 a.n. Masjid Citra Sentul Raya atau langsung di Sekretariat DKM.`;
    }

    return `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\nTerima kasih atas pertanyaan Anda mengenai "${query}".\n\nMasjid Citra Sentul Raya siap melayani kebutuhan jamaah dalam hal Ibadah 5 Waktu, Pembelajaran Al-Qur'an 30 Juz & Tajwid, Pembacaan Hadits Shahih, serta Penyaluran ZISWAF/Wakaf Pembangunan.\n\nAda hal spesifik lain tentang Jadwal Shalat, Al-Qur'an, Hadits, atau Rekening Donasi yang ingin Anda ketahui?`;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = textToSend || inputPrompt;
    if (!promptText.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputPrompt('');
    setIsLoading(true);

    setTimeout(() => {
      const aiReplyText = generateDynamicAnswer(promptText);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-hidden font-sans">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 border-2 border-lime-500/30">
        
        {/* Header - Hijau Daun Muda Premium Theme */}
        <div className="bg-gradient-to-r from-lime-700 via-lime-600 to-emerald-600 text-white p-4 flex items-center justify-between border-b border-lime-500 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-lime-700 flex items-center justify-center shadow-md">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <span>AI Asisten Masjid Citra Sentul</span>
                <Sparkles className="w-3.5 h-3.5 text-lime-200 animate-pulse" />
              </h3>
              <span className="text-xs text-lime-100 block font-semibold">
                Konsultasi Al-Qur'an, Hadits, Fiqih & Informasi DKM
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-lime-800/50 hover:bg-lime-800 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50 dark:bg-slate-950">
          {messages.map((m) => {
            const isAi = m.sender === 'ai';
            return (
              <div
                key={m.id}
                className={`flex items-start gap-2.5 ${isAi ? '' : 'flex-row-reverse'}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm ${
                    isAi
                      ? 'bg-lime-600 text-white'
                      : 'bg-slate-900 text-white'
                  }`}
                >
                  {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed space-y-1 shadow-sm border ${
                    isAi
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800 rounded-tl-sm'
                      : 'bg-lime-600 text-white border-lime-600 rounded-tr-sm font-medium'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>
                  <span
                    className={`block text-[9px] text-right font-medium ${
                      isAi ? 'text-slate-400' : 'text-lime-100'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit rounded-tl-sm shadow-sm">
              <RefreshCw className="w-4 h-4 animate-spin text-lime-600" />
              <span className="font-medium">AI Asisten sedang menganalisis pertanyaan...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Chips */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-[11px] font-bold no-scrollbar">
          {quickChips.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSendMessage(chip)}
              className="px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-lime-600 hover:text-white border border-slate-200 dark:border-slate-700 shrink-0 transition-all cursor-pointer shadow-xs"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-slate-100 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Tanyakan hal seputar Al-Qur'an, Hadits, atau Masjid..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-lime-500 transition-all bg-white dark:bg-slate-800"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputPrompt.trim()}
            className="p-2.5 rounded-xl bg-lime-600 hover:bg-lime-700 disabled:opacity-50 text-white transition-colors shadow-sm cursor-pointer"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
