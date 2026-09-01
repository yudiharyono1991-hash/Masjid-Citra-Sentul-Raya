import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Phone } from 'lucide-react';

export interface HeroSlide {
  id?: number;
  image: string;
  title: string;
  subtitle: string;
  cta?: string;
  ctaAction?: string;
}

export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    image: '/images/masjid-hero-night.png',
    title: 'Masjid Citra Sentul Raya',
    subtitle: 'Pusat Peradaban Islam & Kesejahteraan Umat di Kawasan Sirkuit Sentul, Bogor',
    cta: 'Pilih ZISWAF & Bayar Sekarang',
    ctaAction: 'ziswaf',
  },
  {
    image: '/images/masjid-hero-sunset.png',
    title: 'Wakaf Pembangunan Masjid',
    subtitle: 'Amal Jariyah Tak Terputus — "Barangsiapa membangun masjid karena Allah, Allah akan membangunkan untuknya rumah di surga." (HR. Bukhari & Muslim)',
    cta: 'Salurkan Wakaf',
    ctaAction: 'ziswaf',
  },
  {
    image: '/images/masjid-hero-interior.png',
    title: 'Ruang Ibadah yang Nyaman',
    subtitle: 'Interior masjid yang luas, bersih, dan nyaman untuk beribadah serta kegiatan dakwah, pendidikan, dan pemberdayaan umat.',
    cta: 'Lihat Kegiatan',
    ctaAction: 'kalender',
  },
];

export const Hero = () => {
  const [slides, setSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    // Check localStorage for admin preview overrides only
    const saved = localStorage.getItem('heroSlides_preview');
    if (saved) {
      try { setSlides(JSON.parse(saved)); } catch {}
    }

    const handleStorageChange = () => {
      const saved = localStorage.getItem('heroSlides_preview');
      if (saved) setSlides(JSON.parse(saved));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide(index);
    setTimeout(() => setIsTransitioning(false), 700);
  }, [isTransitioning]);

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % slides.length);
  }, [currentSlide, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide((currentSlide - 1 + slides.length) % slides.length);
  }, [currentSlide, goToSlide]);

  // Auto-play
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, [nextSlide, isPaused]);

  const handleCtaClick = (action?: string) => {
    if (!action) return;
    if (action === 'ziswaf' || action === 'kalender' || action === 'tentang') {
      const el = document.getElementById(action);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="home"
      className="relative w-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Carousel Container */}
      <div className="relative w-full" style={{ aspectRatio: '16/7' }}>
        {/* Slides */}
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out ${
              index === currentSlide
                ? 'opacity-100 scale-100 z-10'
                : 'opacity-0 scale-105 z-0'
            }`}
          >
            {/* Image */}
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
              loading={index === 0 ? 'eager' : 'lazy'}
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

            {/* Content Overlay */}
            <div className="absolute inset-0 z-20 flex items-end pb-12 sm:pb-16 md:pb-20 lg:pb-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div
                  className={`max-w-2xl transition-all duration-700 delay-200 ${
                    index === currentSlide
                      ? 'translate-y-0 opacity-100'
                      : 'translate-y-8 opacity-0'
                  }`}
                >
                  {/* Decorative Line */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-[2px] bg-emerald-400 rounded-full" />
                    <span className="text-emerald-400 text-xs sm:text-sm font-bold tracking-[0.2em] uppercase">
                      Masjid Citra Sentul Raya
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-white leading-tight mb-3 sm:mb-4 drop-shadow-lg">
                    {slide.title}
                  </h2>

                  {/* Subtitle */}
                  <p className="text-sm sm:text-base md:text-lg text-white/85 leading-relaxed mb-5 sm:mb-6 max-w-xl drop-shadow-md">
                    {slide.subtitle}
                  </p>

                  {/* CTA Button */}
                  {slide.cta && (
                    <button
                      onClick={() => handleCtaClick(slide.ctaAction)}
                      className="inline-flex items-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-400/40 transition-all duration-300 active:scale-95 cursor-pointer"
                    >
                      {slide.cta}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/15 backdrop-blur-md border border-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all duration-300 active:scale-90 cursor-pointer shadow-lg"
          aria-label="Slide sebelumnya"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/15 backdrop-blur-md border border-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all duration-300 active:scale-90 cursor-pointer shadow-lg"
          aria-label="Slide berikutnya"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Indicator Dots */}
        <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 sm:gap-3">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-500 rounded-full cursor-pointer ${
                index === currentSlide
                  ? 'w-8 sm:w-10 h-2.5 sm:h-3 bg-emerald-400 shadow-lg shadow-emerald-400/50'
                  : 'w-2.5 sm:w-3 h-2.5 sm:h-3 bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Bottom Info Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-20 hidden md:block">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex items-center gap-6 pb-4 text-white/60 text-xs">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Kawasan Citra Sentul Raya, Sirkuit Sentul, Bogor
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                +62 812-1920-0400
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tagline Bar below the carousel */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-500 dark:from-emerald-800 dark:via-emerald-700 dark:to-green-700 py-4 sm:py-5 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <p className="text-white text-sm sm:text-base md:text-lg font-semibold leading-relaxed">
            Ekosistem Digital Masjid Citra Sentul Raya — Salurkan Zakat, Infaq, Shadaqah, dan Wakaf Anda secara transparan untuk dakwah, pendidikan, dan pemberdayaan ekonomi umat.
            <span className="ml-2 font-bold opacity-80">#ZISWAFMasjidCitraSentul</span>
          </p>
        </div>
      </div>
    </section>
  );
};
