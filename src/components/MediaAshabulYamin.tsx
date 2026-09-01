import React, { useState, useEffect } from 'react';
import { Youtube, Play, ExternalLink, Radio, Tv, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { VideoDakwah } from '../types';

export const MediaAshabulYamin: React.FC = () => {
  const [videos, setVideos] = useState<VideoDakwah[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoDakwah | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      const { data, error } = await supabase.from('video_dakwah').select('*').order('tanggal', { ascending: false });
      if (!error && data && data.length > 0) {
        const formatted = data.map(d => ({
          id: d.id,
          youtubeId: d.youtube_id,
          judul: d.judul,
          penceramah: d.penceramah,
          durasi: d.durasi,
          kategori: d.kategori,
          tanggal: d.tanggal
        }));
        setVideos(formatted);
        setActiveVideo(formatted[0]);
      }
    };
    fetchVideos();
  }, []);

  if (!activeVideo) return null;

  return (
    <div id="media" className="py-12 bg-slate-900 text-white border-y border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950 text-red-400 border border-red-800 text-xs font-bold mb-2">
              <Youtube className="w-4 h-4 text-red-500" />
              <span>Media Dakwah Official</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-white">
              Ashabul Yamin TV
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Kajian Keislaman, Live Streaming, dan Video Dokumentasi Progress Pembangunan Masjid Citra Sentul Raya.
            </p>
          </div>

          <a
            href="https://youtube.com/@ashabulyamintv?si=2BVXSTrBwoouBi_9"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all shadow-md"
          >
            <Youtube className="w-4 h-4" />
            <span>Subscribe @ashabulyamintv</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>
        </div>

        {/* Video Player & Playlist Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Player Box */}
          <div className="lg:col-span-8 space-y-4">
            <div className="relative rounded-3xl overflow-hidden bg-black border-2 border-slate-700 shadow-2xl aspect-video">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube-nocookie.com/embed/${activeVideo.youtubeId}?autoplay=0`}
                title={activeVideo.judul}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>

            <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-xs text-lime-400 font-semibold">
                <span className="bg-red-900/80 text-red-300 px-2.5 py-0.5 rounded-full text-xs font-bold">
                  {activeVideo.kategori}
                </span>
                <span>Durasi: {activeVideo.durasi}</span>
                <span>• {activeVideo.tanggal}</span>
              </div>
              <h3 className="text-lg font-bold text-white">{activeVideo.judul}</h3>
              {activeVideo.penceramah && (
                <p className="text-xs text-slate-400 font-medium">
                  Narasumber: <strong className="text-slate-200">{activeVideo.penceramah}</strong>
                </p>
              )}
            </div>
          </div>

          {/* Playlist Sidebar */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Tv className="w-4 h-4 text-red-500" />
              <span>Daftar Playlist Kajian & Updates:</span>
            </h3>

            <div className="space-y-2.5">
              {videos.map((v) => {
                const isActive = activeVideo.id === v.id;
                return (
                  <button
                    key={v.id}
                    onClick={() => setActiveVideo(v)}
                    className={`w-full p-3.5 rounded-2xl text-left border transition-all flex items-start gap-3 ${
                      isActive
                        ? 'bg-emerald-950 border-emerald-600 shadow-md ring-1 ring-emerald-500'
                        : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-900/80 text-red-300 flex items-center justify-center shrink-0 mt-1">
                      <Play className="w-4 h-4 fill-red-300" />
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs font-bold text-lime-400 block uppercase">
                        {v.kategori}
                      </span>
                      <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                        {v.judul}
                      </h4>
                      <span className="text-xs text-slate-400 block">
                        {v.durasi} • {v.tanggal}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
