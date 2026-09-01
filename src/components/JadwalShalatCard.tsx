import React, { useState, useEffect } from 'react';
import { Clock, Calendar, MapPin, Volume2, VolumeX, Compass } from 'lucide-react';
import { getPrayerTimesSentul, getHijriDateIndo, getNextPrayerInfo, fetchPrayerTimesOnline } from '../utils/prayerTimes';
import type { JadwalWaktu } from '../types';

export const JadwalShalatCard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const [jadwal, setJadwal] = useState<JadwalWaktu>(getPrayerTimesSentul(currentTime));
  const [hijriDate, setHijriDate] = useState<string>(getHijriDateIndo());

  useEffect(() => {
    // Initial fetch from API
    fetchPrayerTimesOnline().then(res => {
      setJadwal(res.jadwal);
      setHijriDate(res.hijri);
    }).catch(() => {
      // Fallback is already set
    });
    
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const nextPrayer = getNextPrayerInfo(jadwal);

  const prayerList = [
    { name: 'Subuh', time: jadwal.subuh, icon: '🌌' },
    { name: 'Dzuhur', time: jadwal.dzuhur, icon: '🌤️' },
    { name: 'Ashar', time: jadwal.ashar, icon: '🌇' },
    { name: 'Maghrib', time: jadwal.maghrib, icon: '🌆' },
    { name: 'Isya', time: jadwal.isya, icon: '🌃' },
  ];

  return (
    <div id="jadwal" className="py-12 bg-lime-600 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-lime-500 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-700 border border-lime-500 text-lime-100 text-xs font-bold mb-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>{hijriDate}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Jadwal Shalat 5 Waktu & Adzan
            </h2>
            <p className="text-xs sm:text-sm text-lime-100 flex items-center gap-1.5 mt-1">
              <MapPin className="w-4 h-4 text-lime-300" />
              <span>Citra Sentul Raya, Kabupaten Bogor</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-stretch gap-4 bg-lime-700/80 border border-lime-500 px-4 sm:px-5 py-3 rounded-2xl text-center sm:text-right shadow-md w-full md:w-auto">
            <div className="flex items-center justify-center sm:justify-end gap-3 pb-3 sm:pb-0 sm:pr-4 border-b sm:border-b-0 sm:border-r border-lime-500 w-full sm:w-auto">
              <Compass className="w-6 h-6 sm:w-8 sm:h-8 text-lime-200" />
              <div className="text-left">
                <span className="text-[10px] sm:text-xs text-lime-200 block font-semibold uppercase">Arah Kiblat</span>
                <span className="text-base sm:text-lg font-bold text-white tracking-wider">
                  295° <span className="text-[10px] sm:text-xs font-normal">Barat Laut</span>
                </span>
              </div>
            </div>
            
            <div className="w-full sm:w-auto text-center sm:text-right">
              <span className="text-[10px] sm:text-xs text-lime-200 block font-semibold uppercase">Waktu Real-time</span>
              <span className="text-xl sm:text-2xl font-mono font-black text-white tracking-wider">
                {currentTime.toLocaleTimeString('id-ID', { hour12: false })} WIB
              </span>
            </div>
          </div>
        </div>

        {/* Next Prayer Highlight Banner */}
        <div className="bg-gradient-to-r from-lime-500 via-lime-400 to-green-500 border-2 border-white/50 rounded-2xl p-6 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1 w-full text-center sm:text-left">
            <span className="text-[10px] sm:text-xs text-lime-900 font-extrabold uppercase tracking-widest block">
              Menuju Adzan Berikutnya
            </span>
            <h3 className="text-xl sm:text-3xl font-black text-lime-950">
              {nextPrayer.name} - <span className="text-white font-mono break-all sm:break-normal">{nextPrayer.time} WIB</span>
            </h3>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className="p-3 rounded-full bg-lime-600 hover:bg-lime-700 text-white transition-colors shadow-md border border-lime-300 cursor-pointer"
              title={isAudioMuted ? 'Matikan Notifikasi Adzan' : 'Aktifkan Notifikasi Adzan'}
            >
              {isAudioMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <div className="bg-lime-700/80 px-5 py-3 rounded-xl border border-lime-500 text-center">
              <span className="text-xs text-lime-200 block uppercase">Sisa Waktu</span>
              <span className="text-lg sm:text-xl font-bold text-white animate-pulse">
                {nextPrayer.remainingText}
              </span>
            </div>
          </div>
        </div>

        {/* Prayer Grid - 5 Columns for 5 Prayers */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {prayerList.map((p) => {
            const isCurrentNext = nextPrayer.name.includes(p.name);
            return (
              <div
                key={p.name}
                className={`p-5 rounded-2xl text-center border transition-all ${
                  isCurrentNext
                    ? 'bg-white text-lime-800 border-white shadow-xl scale-105 font-black'
                    : 'bg-lime-700/60 text-white border-lime-500 hover:bg-lime-700'
                }`}
              >
                <span className="text-3xl block mb-2">{p.icon}</span>
                <span className={`text-xs block font-bold uppercase tracking-wider mb-1 ${isCurrentNext ? 'text-lime-700 font-black' : 'text-lime-200'}`}>
                  {p.name}
                </span>
                <span className={`text-xl font-mono font-black ${isCurrentNext ? 'text-slate-950' : 'text-white'}`}>
                  {p.time}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
