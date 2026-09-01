import React, { useState, useEffect } from 'react';
import { Youtube, Facebook, Instagram } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { VideoDakwah } from '../types';

export const MediaSosial = () => {
  const [mainVideo, setMainVideo] = useState<VideoDakwah | null>(null);

  useEffect(() => {
    const fetchVideo = async () => {
      const { data, error } = await supabase.from('video_dakwah').select('*').order('tanggal', { ascending: false }).limit(1).maybeSingle();
      if (!error && data) {
        setMainVideo({
          id: data.id,
          youtubeId: data.youtube_id,
          judul: data.judul,
          penceramah: data.penceramah,
          durasi: data.durasi,
          kategori: data.kategori,
          tanggal: data.tanggal
        });
      }
    };
    fetchVideo();
  }, []);

  if (!mainVideo) return null;

  return (
    <section className="py-16 bg-slate-50" id="media">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-lime-600 font-bold uppercase tracking-wider text-sm mb-2">Ikuti Kami</p>
          <h2 className="text-3xl font-bold text-slate-900 font-serif mb-4">Media Sosial & Dakwah Digital</h2>
          <p className="text-slate-600">Ikuti terus pembaruan berita, kajian, dan aktivitas Masjid Citra Sentul Raya</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-2 mb-8 border border-slate-100">
          <div className="aspect-video rounded-xl overflow-hidden bg-slate-900 relative group cursor-pointer">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${mainVideo.youtubeId}`}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0"
            ></iframe>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <a href="#" className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity">
            <Instagram className="w-5 h-5" />
            <span>Follow Instagram</span>
          </a>
          <a href="#" className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            <Facebook className="w-5 h-5" />
            <span>Like Facebook</span>
          </a>
          <a href="#" className="flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors">
            <Youtube className="w-5 h-5" />
            <span>Subscribe YouTube</span>
          </a>
        </div>
      </div>
    </section>
  );
};
