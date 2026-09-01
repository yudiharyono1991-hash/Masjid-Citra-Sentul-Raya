import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MilestonePembangunan } from '../types';
import {
  CheckCircle2,
  Clock,
  Calendar,
  Building2,
  Layers,
  ArrowRight,
  Sparkles,
  ChevronRight,
  ImageIcon,
} from 'lucide-react';

export const ProgressPembangunan: React.FC = () => {
  const [milestones, setMilestones] = useState<MilestonePembangunan[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestonePembangunan | null>(null);

  useEffect(() => {
    const fetchMilestones = async () => {
      const { data, error } = await supabase
        .from('milestones_pembangunan')
        .select('*')
        .order('urutan', { ascending: true });
        
      if (!error && data) {
        const formatted = data.map(d => ({
          id: d.id,
          judul: d.judul,
          deskripsi: d.deskripsi,
          persentase: d.persentase,
          status: d.status,
          targetSelesai: d.target_selesai,
          fotoUrl: d.foto_url,
          rincianPekerjaan: d.rincian_pekerjaan || []
        }));
        setMilestones(formatted);
        setSelectedMilestone(formatted[2] || formatted[0]);
      }
    };
    fetchMilestones();
  }, []);

  if (!selectedMilestone) return null;

  return (
    <div id="progress" className="py-12 bg-slate-50/70 border-y border-emerald-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tahapan & Progress Fisik Pembangunan</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Transparansi Pembangunan Lapangan
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Pantau setiap jengkal proses pembangunan Masjid Citra Sentul Raya Sirkuit Sentul. Dari pembebasan lahan, pemancangan pilar, hingga tahap finishing.
          </p>
        </div>

        {/* Milestone Steps Timeline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {milestones.map((m, idx) => {
            const isSelected = selectedMilestone.id === m.id;
            const isFinished = m.status === 'Selesai';
            const isInProgress = m.status === 'Sedang Berjalan';

            return (
              <button
                key={m.id}
                onClick={() => setSelectedMilestone(m)}
                className={`p-4 rounded-2xl text-left border-2 transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-emerald-900 text-white border-emerald-700 shadow-lg ring-2 ring-emerald-500/20 scale-[1.02]'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                        isSelected
                          ? 'bg-lime-400 text-emerald-950'
                          : isFinished
                          ? 'bg-emerald-100 text-emerald-800'
                          : isInProgress
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isFinished
                          ? isSelected ? 'bg-emerald-800 text-lime-300' : 'bg-emerald-100 text-emerald-800'
                          : isInProgress
                          ? isSelected ? 'bg-amber-400 text-emerald-950 font-black' : 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>

                  <h3 className={`text-xs font-bold line-clamp-2 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {m.judul}
                  </h3>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-200/40">
                  <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                    <span className={isSelected ? 'text-emerald-300' : 'text-slate-500'}>Capaian:</span>
                    <span className={isSelected ? 'text-lime-300 font-extrabold' : 'text-emerald-700 font-extrabold'}>
                      {m.persentase}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isSelected ? 'bg-lime-400' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${m.persentase}%` }}
                    ></div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detailed Milestone Focus Card */}
        <div className="bg-white rounded-3xl border border-emerald-100 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left Column: Image Preview */}
          <div className="lg:col-span-6 relative min-h-[280px] lg:min-h-full bg-slate-900">
            <img
              src={selectedMilestone.fotoUrl}
              alt={selectedMilestone.judul}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>

            <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5 text-lime-400" />
              <span>Dokumentasi Lapangan Real-time</span>
            </div>

            <div className="absolute bottom-4 left-4 right-4 text-white space-y-1">
              <span className="text-xs text-lime-300 font-semibold uppercase tracking-wider block">
                Target Selesai: {selectedMilestone.targetSelesai}
              </span>
              <h3 className="text-xl font-bold">{selectedMilestone.judul}</h3>
            </div>
          </div>

          {/* Right Column: Breakdown */}
          <div className="lg:col-span-6 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-700 font-bold uppercase tracking-wider block">
                  Detail Pekerjaan Lapangan
                </span>
                <h3 className="text-2xl font-black text-slate-900">{selectedMilestone.judul}</h3>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-emerald-800">{selectedMilestone.persentase}%</span>
                <span className="text-xs text-slate-500 block">Selesai</span>
              </div>
            </div>

            <p className="text-slate-600 text-sm leading-relaxed">
              {selectedMilestone.deskripsi}
            </p>

            {/* Checklist of Tasks */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Rincian Item Pekerjaan & Spesifikasi:
              </h4>

              <div className="space-y-2">
                {selectedMilestone.rincianPekerjaan.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs font-semibold text-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Lokasi: Komplek Citra Sentul Raya</span>
              </span>
              <a
                href="#wakaf"
                className="text-emerald-800 font-bold hover:underline flex items-center gap-1"
              >
                <span>Dukung Tahap Ini</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
