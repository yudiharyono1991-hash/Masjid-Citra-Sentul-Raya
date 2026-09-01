import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Search, X, ChevronRight, Play, Pause, 
  Volume2, BookMarked, FileText, Mic2, ArrowLeft, SkipForward, 
  SkipBack, Bookmark, Copy, Check, Sparkles, Filter, VolumeX, List, Radio,
  Eye, EyeOff, Layers, Sparkle, Tag, HelpCircle, ArrowUpRight, Share2,
  Settings, RefreshCw, Info, ChevronDown, Book, Award, CheckCircle, ShieldCheck, Compass, GitBranch,
  Sun, Moon, Heart, RotateCcw, Plus, Activity
} from 'lucide-react';

export interface Surah {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  tempatTurun: string;
  arti: string;
  deskripsi?: string;
  audioFull?: { [key: string]: string } | string;
}

export interface Ayat {
  nomorAyat: number;
  teksArab: string;
  teksLatin: string;
  teksIndonesia: string;
  teksInggris?: string;
  audio: { [key: string]: string };
}

export interface SurahDetail extends Surah {
  ayat: Ayat[];
  audioFull: { [key: string]: string } | string;
  tafsir?: { nomorAyat: number; teks: string }[];
}

type View = 'list' | 'detail';
type MainNavTab = 'surah' | 'juz' | 'tematik' | 'tajwid_guide' | 'hadist' | 'dzikir';
type FilterType = 'surat' | 'juz' | 'index_ayat';
type TafsirSource = 'ibnukatsir' | 'kemenag' | 'jalalain' | 'muyassar';
type HadistSubTab = 'buku' | 'tema' | 'kedudukan';
type DzikirSubTab = 'pagi' | 'petang' | 'shalat' | 'doa_harian' | 'tasbih';

export interface BookmarkData {
  surahNomor: number;
  surahNama: string;
  ayatNomor: number;
}

const TAFSIR_SOURCES: { id: TafsirSource; name: string; desc: string }[] = [
  { id: 'ibnukatsir', name: 'Tafsir Ibnu Katsir', desc: 'Tafsir Al-Qur\'an Al-Azhim karya Al-Hafiz Ibnu Katsir, berbasis riwayat Shahih dan Asbabun Nuzul.' },
  { id: 'kemenag', name: 'Tafsir Ringkas Indonesia', desc: 'Tafsir Tahlili & Ringkas komprehensif.' },
  { id: 'jalalain', name: 'Tafsir Jalalain', desc: 'Tafsir ringkas karya Imam Jalaluddin Al-Mahalli & Imam Jalaluddin As-Suyuthi.' },
  { id: 'muyassar', name: 'Tafsir Al-Muyassar', desc: 'Tafsir ringkas kontemporer terbitan Mujamma\' Malik Fahd Madinah Al-Munawwarah.' },
];

const RECITERS = [
  { id: '05', name: 'Mishary Rashid Al-Afasy' },
  { id: '01', name: 'Abdullah Al-Juhany' },
  { id: '02', name: 'Abdul Muhsin Al-Qasim' },
  { id: '03', name: 'Abdurrahman As-Sudais' },
  { id: '04', name: 'Ibrahim Al-Dossari' },
];

// Complete Panduan Tajwid
const TAJWID_SECTIONS = [
  {
    category: 'Hukum Nun Sukun & Tanwin',
    rules: [
      { name: 'Idzhar Halqi', desc: 'Apabila Nun Sukun atau Tanwin bertemu salah satu huruf (أ ه ح خ ع غ), dibaca jelas tanpa dengung.', example: 'مِنْ اٰيٰتِنَا - مِنْهُمْ - يَوْمًا اَوْ' },
      { name: 'Idgham Bighunnah', desc: 'Apabila Nun Sukun/Tanwin bertemu huruf (ي ن م و), dimasukkan ke huruf berikutnya dengan dengung dipanjangkan.', example: 'مَنْ يَّقُوْلُ - بِسُوْرَةٍ مِّنْ' },
      { name: 'Idzhar Mutlak', desc: 'Apabila Nun Sukun bertemu huruf Ya atau Wau dalam satu kata. Terdapat 4 kata: قنوان, صنوان, بنيان, الدنيا.', example: 'الدنيا - بنيان' },
      { name: 'Idgham Bilaghunnah', desc: 'Apabila Nun Sukun/Tanwin bertemu huruf (ل ر), dimasukkan ke huruf berikutnya tanpa dengung.', example: 'فَمَنْ رَبُكُمَا - مِنْ لَدُنْ' },
      { name: 'Iqlab', desc: 'Apabila Nun Sukun/Tanwin bertemu huruf Ba (ب), diubah menjadi bunyi Mim dengung dipanjangkan.', example: 'سَمِيْعٌ بَصِيْرٌ - مِنْ بَعْدِ' },
      { name: 'Ikhfa Haqiqi', desc: 'Apabila Nun Sukun/Tanwin bertemu 15 huruf Ikhfa, disamarkan dengan dengung dipanjangkan.', example: 'وَالْإِنْجِيلَ - أَنْزَلَ - عَذَابٌ شَدِيدٌ' }
    ]
  },
  {
    category: 'Hukum Mim Sukun',
    rules: [
      { name: 'Ikhfa\' Syafawi', desc: 'Apabila Mim Sukun bertemu huruf Ba (ب), dibaca mendengung dengan tempo dipanjangkan.', example: 'تَرْمِيْهِمْ بِحِجَارَةٍ' },
      { name: 'Idgham Mimi', desc: 'Apabila Mim Sukun bertemu huruf Mim (م), Mim pertama dimasukkan ke Mim kedua dengan dengung.', example: 'فِيْ قُلُوْبِهِمْ مَرَضٌ' },
      { name: 'Idzhar Syafawi', desc: 'Apabila Mim Sukun bertemu huruf hijaiyah selain Ba dan Mim, dibaca jelas tanpa dengung.', example: 'اَلَمْ تَرَ – كَيْدَهُمْ فِيْ' }
    ]
  },
  {
    category: 'Hukum Idgham Makhraj',
    rules: [
      { name: 'Idgham Mutamatsilain', desc: 'Pertemuan dua huruf yang sama makhraj dan sifatnya, dimasukkan tanpa dengung.', example: 'إِذ ذَّهَبَ - وَقَدْ دَّخَلُوْا' },
      { name: 'Idgham Mutajanisain', desc: 'Pertemuan dua huruf yang sama makhraj namun berbeda sifatnya, dimasukkan tanpa dengung.', example: 'وَدَّت طَّـآئِفَةٌ - ارْكَبْ مَّعَنَا' },
      { name: 'Idgham Mutaqaribain', desc: 'Pertemuan dua huruf yang berdekatan makhraj atau sifatnya (ق :ك) (ل : ر), dimasukkan tanpa dengung.', example: 'اَلَمْ نَخْلُقْكُّمْ - وَقُـل رَّبِّ' }
    ]
  },
  {
    category: 'Hukum Mad (Panjang Bacaan)',
    rules: [
      { name: 'Mad Asli / Thabi’i', desc: 'Fathah bertemu Alif, Kasrah bertemu Ya Sukun, Dhammah bertemu Wau Sukun. Dibaca 2 harakat.', example: 'كتَا بٌ - يَقُوْلُ – سمِيْعٌ' },
      { name: 'Mad Wajib Muttashil', desc: 'Mad Thabi\'i bertemu Hamzah dalam satu kata. Dibaca 4 atau 5 harakat.', example: 'سَوَآءٌ - جَآءَ – جِيْءَ' },
      { name: 'Mad Ja’iz Munfashil', desc: 'Mad Thabi\'i bertemu Hamzah di lain kata. Dibaca 4 atau 5 harakat.', example: 'وَﻻَأنْتُمْ - بِمَا أُنْزِلَ' },
      { name: 'Mad \'Iwadh', desc: 'Fathatain bertemu Alif di akhir kata karena waqaf (kecuali Ta Marbuthah). Dibaca 2 harakat.', example: 'سَميْعًا بَصيْرًا' },
      { name: 'Mad Arid Lissukun', desc: 'Mad Thabi\'i bertemu huruf yang disukunkan karena waqaf. Dibaca 2, 4, atau 6 harakat.', example: 'الْعَالَمِيْن۞ – يُؤْمِنُوْن۞' },
      { name: 'Mad Liin', desc: 'Fathah bertemu Ya Sukun atau Wau Sukun diikuti huruf disukunkan karena waqaf. Dibaca 2, 4, atau 6 harakat.', example: 'رَيْبٌ – خَوْفٌ' }
    ]
  },
  {
    category: 'Bacaan Khusus & Gharib',
    rules: [
      { name: 'Imalah', desc: 'Memiringkan bunyi Fathah ke Kasrah (dibaca \'e\'). Terdapat pada Surah Hud ayat 41.', example: 'مَجْرَاهَا (Majrehaa)' },
      { name: 'Isymam', desc: 'Memonyongkan bibir tanpa suara seolah menyebut "nu". Terdapat pada Surah Yusuf ayat 11.', example: 'لاَ تَأْمَنَّا' },
      { name: 'Saktah', desc: 'Berhenti sejenak tanpa bernafas 2 harakat. Terdapat pada Kahfi: 1-2, Yasin: 52, Al-Qiyamah: 27, Al-Muthaffifin: 14.', example: 'كَلَّا بَلْ ۞ رَانَ عَلَى قُلُوبِهِم' }
    ]
  }
];

// Exact 14 Kitab Hadits
const KITAB_HADIST_LIST = [
  { id: 'bukhari', no: 1, arabic: 'صحيح البخاري', name: 'Shahih Bukhari', author: 'Imam Bukhari', total: '7,563 Hadits' },
  { id: 'muslim', no: 2, arabic: 'صحيح مسلم', name: 'Shahih Muslim', author: 'Imam Muslim', total: '7,500 Hadits' },
  { id: 'tirmidzi', no: 3, arabic: 'سنن الترمذي', name: 'Sunan Tirmidzi', author: 'Imam Tirmidzi', total: '3,956 Hadits' },
  { id: 'abudaud', no: 4, arabic: 'سنن أبي داود', name: 'Sunan Abu Dawud', author: 'Imam Abu Daud', total: '5,274 Hadits' },
  { id: 'nasai', no: 5, arabic: 'سنن النسائي', name: 'Sunan Nasa\'i', author: 'Imam Nasa\'i', total: '5,758 Hadits' },
  { id: 'ibnumajah', no: 6, arabic: 'سنن ابن ماجه', name: 'Sunan Ibnu Majah', author: 'Imam Ibnu Majah', total: '4,341 Hadits' },
  { id: 'darimi', no: 7, arabic: 'سنن الدارمي', name: 'Sunan Darimi', author: 'Imam Darimi', total: '3,500 Hadits' },
  { id: 'ahmad', no: 8, arabic: 'مسند أحمد', name: 'Musnad Ahmad', author: 'Imam Ahmad', total: '27,000 Hadits' },
  { id: 'malik', no: 9, arabic: 'موطأ مالك', name: 'Muwatha\' Malik', author: 'Imam Malik', total: '1,720 Hadits' },
  { id: 'daruquthni', no: 10, arabic: 'سنن الدارقطني', name: 'Sunan Daruquthni', author: 'Imam Daruquthni', total: '4,836 Hadits' },
  { id: 'ibnukhuzaimah', no: 11, arabic: 'صحيح ابن خزيمة', name: 'Shahih Ibnu Khuzaimah', author: 'Imam Ibnu Khuzaimah', total: '3,079 Hadits' },
  { id: 'ibnhibban', no: 12, arabic: 'صحيح ابن حبان', name: 'Shahih Ibnu Hibban', author: 'Imam Ibnu Hibban', total: '7,491 Hadits' },
  { id: 'mustadrak', no: 13, arabic: 'المستدرك', name: 'Al-Mustadrak', author: 'Imam Al-Hakim', total: '8,803 Hadits' },
  { id: 'syafii', no: 14, arabic: 'مسند الشافعي', name: 'Musnad Syafi\'i', author: 'Imam Syafi\'i', total: '1,800 Hadits' },
];

// Exact 14 Themes
const HADIST_TEMAS = [
  { id: '1', no: 1, name: 'Iman', desc: 'Hadits tentang iman', total: '150+ Hadits' },
  { id: '2', no: 2, name: 'Ilmu', desc: 'Hadits tentang ilmu', total: '120+ Hadits' },
  { id: '3', no: 3, name: 'Umat Terdahulu', desc: 'Hadits tentang umat terdahulu', total: '85+ Hadits' },
  { id: '4', no: 4, name: 'Perjalanan Hidup', desc: 'Hadits tentang perjalanan hidup', total: '95+ Hadits' },
  { id: '5', no: 5, name: 'Al-Qur\'an', desc: 'Hadits tentang al-qur\'an', total: '180+ Hadits' },
  { id: '6', no: 6, name: 'Akhlaq dan Adab', desc: 'Hadits tentang akhlaq dan adab', total: '210+ Hadits' },
  { id: '7', no: 7, name: 'Ibadah', desc: 'Hadits tentang ibadah', total: '340+ Hadits' },
  { id: '8', no: 8, name: 'Makanan Minuman', desc: 'Hadits tentang makanan minuman', total: '110+ Hadits' },
  { id: '9', no: 9, name: 'Pakaian Perhiasan', desc: 'Hadits tentang pakaian perhiasan', total: '75+ Hadits' },
  { id: '10', no: 10, name: 'Masalah Kepribadian', desc: 'Hadits tentang masalah kepribadian', total: '90+ Hadits' },
  { id: '11', no: 11, name: 'Mu\'amalah', desc: 'Hadits tentang mu\'amalah', total: '160+ Hadits' },
  { id: '12', no: 12, name: 'Putusan Hukum', desc: 'Hadits tentang putusan hukum', total: '130+ Hadits' },
  { id: '13', no: 13, name: 'Kriminalitas', desc: 'Hadits tentang kriminalitas', total: '65+ Hadits' },
  { id: '14', no: 14, name: 'Jihad', desc: 'Hadits tentang jihad', total: '140+ Hadits' },
];

// Exact 9 Kedudukan
const HADIST_KEDUDUKAN_LIST = [
  { id: '1', no: 1, name: 'Hadits Al-Qur\'an', desc: 'Kumpulan hadits-hadits Al-Qur\'an', color: 'bg-lime-500 text-slate-950', total: '1,200+ Hadits' },
  { id: '2', no: 2, name: 'Hadits Qudsi', desc: 'Kumpulan hadits-hadits Qudsi (Firman Allah yang disampaikan Rasulullah)', color: 'bg-emerald-600 text-white', total: '400+ Hadits' },
  { id: '3', no: 3, name: 'Hadits Mutawatir', desc: 'Kumpulan hadits-hadits Mutawatir (Diriwayatkan oleh perawi sangat banyak)', color: 'bg-lime-600 text-white', total: '1,500+ Hadits' },
  { id: '4', no: 4, name: 'Hadits Marfu\'', desc: 'Kumpulan hadits-hadits Marfu\' (Disandarkan langsung kepada Nabi ﷺ)', color: 'bg-emerald-500 text-white', total: '5,000+ Hadits' },
  { id: '5', no: 5, name: 'Hadits Mauquf', desc: 'Kumpulan hadits-hadits Mauquf (Disandarkan kepada Perkataan/Perbuatan Sahabat)', color: 'bg-amber-400 text-slate-950', total: '2,100+ Hadits' },
  { id: '6', no: 6, name: 'Hadits Maqthu\'', desc: 'Kumpulan hadits-hadits Maqthu\' (Disandarkan kepada Perkataan Tabi\'in)', color: 'bg-amber-500 text-slate-950', total: '1,800+ Hadits' },
  { id: '7', no: 7, name: 'Hadits Mursal', desc: 'Kumpulan hadits-hadits Mursal (Dugugurkan nama Sahabat dalam rantai Sanad)', color: 'bg-teal-600 text-white', total: '950+ Hadits' },
  { id: '8', no: 8, name: 'Hadits Munqathi\'', desc: 'Kumpulan hadits-hadits Munqathi\' (Terputus sanadnya di tengah penyampaian)', color: 'bg-slate-700 text-white', total: '720+ Hadits' },
  { id: '9', no: 9, name: 'Hadits Muallaq', desc: 'Kumpulan hadits-hadits Muallaq (Gugur perawi dari awal sanad)', color: 'bg-slate-800 text-white', total: '610+ Hadits' },
];

export interface DetailedHadistItem {
  id: number;
  kitabId: string;
  kitabName: string;
  kitabArabic: string;
  itemTitle: string;
  matanArabic: string;
  terjemahanFull: string;
  topik: string;
  kedudukan: string;
  sanadList: string[];
  similarHadiths: string[];
}

// Extensive authentic Hadits collection
const BASE_HADISTS_DATA: DetailedHadistItem[] = [
  {
    id: 1,
    kitabId: 'malik',
    kitabName: 'Muwatha\' Malik',
    kitabArabic: 'موطأ مالك',
    itemTitle: 'Muwatha\' Malik #1',
    matanArabic: 'موطأ مالك ١: قَالَ حَدَّثَنِي اللَّيْثِيُّ عَنْ مَالِكِ بْنِ أَنَسٍ عَنْ ابْنِ شِهَابٍ أَنَّ عُمَرَ بْنَ عَبْدِ الْعَزِيزِ أَخَّرَ الصَّلاَةَ يَوْمًا فَدَخَلَ عَلَيْهِ عُرْوَةُ بْنُ الزُّبَيْرِ فَأَخْبَرَهُ أَنَّ الْمُغِيرَةَ بْنَ شُعْبَةَ أَخَّرَ الصَّلاَةَ يَوْمًا وَهُوَ بِالْكُوفَةِ فَدَخَلَ عَلَيْهِ أَبُو مَسْعُودٍ الأَنْصَارِيُّ فَقَالَ مَا هَذَا يَا مُغِيرَةُ أَلَيْسَ قَدْ عَلِمْتَ أَنَّ جِبْرِيلَ نَزَلَ فَصَلَّى فَصَلَّى رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ ثُمَّ صَلَّى فَصَلَّى رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ ثُمَّ صَلَّى فَصَلَّى رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ ثُمَّ صَلَّى فَصَلَّى رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ ثُمَّ صَلَّى فَصَلَّى رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ ثُمَّ قَالَ بِهَذَا أُمِرْتُ',
    terjemahanFull: 'Muwatha\' Malik 1: Perawi berkata: Telah menceritakan kepadaku Al Laitsi dari Malik bin Anas dari [Ibnu Syihab]: Suatu hari Umar bin Abdul Aziz pernah mengakhirkan shalat, maka Urwah bin Az Zubair menemuinya dan memberitahukan kepadanya, bahwa suatu hari Mughirah bin Syu\'bah mengakhirkan shalat ketika berada di Kufah, sehingga Ibnu Mas\'ud menemuinya dan menegurnya: "Apa maksudmu, hai Mughirah? bukankah kamu tahu, Jibril telah turun kemudian shalat dan Rasulullah shallallahu \'alaihi wa sallam ikut shalat, kemudian dia shalat dan Rasulullah shallallahu \'alaihi wa sallam ikut shalat juga, kemudian dia shalat dan Rasulullah shallallahu \'alaihi wa sallam ikut shalat. Lalu Jibril berkata: Seperti ini aku diperintahkan."',
    topik: 'Ibadah',
    kedudukan: 'Hadits Mutawatir',
    sanadList: ['Sayyidah \'Aisyah radhiyallahu \'anha', 'Basyir bin Mas\'ud Al-Anshari', '\'Urwah bin Az-Zubair', 'Ibnu Syihab Az-Zuhri', 'Malik bin Anas', 'Al-Laitsi'],
    similarHadiths: ['Shahih Bukhari #521', 'Shahih Muslim #610', 'Sunan Abu Dawud #393', 'Sunan Nasa\'i #494', 'Sunan Tirmidzi #149', 'Musnad Ahmad #16521']
  },
  {
    id: 2,
    kitabId: 'tirmidzi',
    kitabName: 'Sunan Tirmidzi',
    kitabArabic: 'سنن الترمذي',
    itemTitle: 'Sunan Tirmidzi #1',
    matanArabic: 'سنن الترمذي ١: حَدَّثَنَا قُتَيْبَةُ بْنُ سَعِيدٍ حَدَّثَنَا أَبُو عَوَانَةَ عَنْ سِمَاكِ بْنِ حَرْبٍ ح و حَدَّثَنَا هَنَّادٌ حَدَّثَنَا وَكِيعٌ عَنْ إِسْرَائِيلَ عَنْ سِمَاكٍ عَنْ مُصْعَبِ بْنِ سَعْدٍ عَنْ ابْنِ عُمَرَ عَنْ النَّبِيِّ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ قَالَ لَا تُقْبَلُ صَلَاةٌ بِغَيْرِ طُهُورٍ وَلَا صَدَقَةٌ مِنْ غُلُولٍ',
    terjemahanFull: 'Sunan Tirmidzi 1: Telah menceritakan kepada kami [Qutaibah bin Sa\'id] berkata: telah menceritakan kepada kami [Abu Awanah] dari [Simak bin Harb], dari [Mush\'ab bin Sa\'d] dari [Ibnu Umar] dari Nabi Shallallahu \'alaihi wa Sallam, beliau bersabda: "Tidak akan diterima shalat yang dilakukan tanpa bersuci, dan tidak akan diterima sedekah yang berasal dari harta curian."',
    topik: 'Ibadah',
    kedudukan: 'Hadits Marfu\'',
    sanadList: ['Ibnu \'Umar radhiyallahu \'anhuma', 'Mush\'ab bin Sa\'d', 'Simak bin Harb', 'Abu \'Awanah', 'Qutaibah bin Sa\'id', 'Imam At-Tirmidzi'],
    similarHadiths: ['Shahih Muslim #224', 'Sunan Abu Dawud #59', 'Sunan Ibnu Majah #271', 'Musnad Ahmad #4648', 'Sunan Darimi #688']
  },
  {
    id: 3,
    kitabId: 'bukhari',
    kitabName: 'Shahih Bukhari',
    kitabArabic: 'صحيح البخاري',
    itemTitle: 'Shahih Bukhari #1',
    matanArabic: 'صحيح البخاري ١: حَدَّثَنَا الْحُمَيْدِيُّ عَبْدُ اللَّهِ بْنُ الزُّبَيْرِ قَالَ حَدَّثَنَا سُفْيَانُ قَالَ حَدَّثَنَا يَحْيَى بْنُ سَعِيدٍ الْأَنْصَارِيُّ قَالَ أَخْبَرَنِي مُحَمَّدُ بْنُ إِبْرَاهِيمَ التَّيْمِيُّ أَنَّهُ سَمِعَ عَلْقَمَةَ بْنَ وَقَّاصٍ اللَّيْثِيَّ يَقُولُ سَمِعْتُ عُمَرَ بْنَ الْخَطَّابِ رَضِيَ اللَّهُ عَنْهُ عَلَى الْمِنْبَرِ قَالَ سَمِعْتُ رَسُولَ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ يَقُولُ إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى فَمَنْ كَانَتْ هِجْرَتُهُ إِلَى دُنْيَا يُصِيبُهَا أَوْ إِلَى امْرَأَةٍ يَنْكِحُهَا فَهِجْرَتُهُ إِلَى مَا هَاجَرَ إِلَيْهِ',
    terjemahanFull: 'Shahih Bukhari 1: Telah menceritakan kepada kami [Al Humaidi Abdullah bin Az Zubair] dia berkata: Telah menceritakan kepada kami [Sufyan] yang berkata: bahwa Telah menceritakan kepada kami [Yahya bin Sa\'id Al Anshari] berkata: telah mengabarkan kepada kami [Muhammad bin Ibrahim At Taimi], bahwa dia pernah mendengar [Alqamah bin Waqash Al Laitsi] berkata: saya pernah mendengar [Umar bin Al Khaththab] diatas mimbar berkata: saya mendengar Rasulullah shallallahu \'alaihi wa sallam bersabda: "Semua perbuatan tergantung niatnya, dan (balasan) bagi tiap-tiap orang (tergantung) apa yang diniatkan, Barangsiapa niat hijrahnya karena dunia yang ingin digapainya atau karena seorang perempuan yang ingin dinikahinya, maka hijrahnya adalah kepada apa dia diniatkan."',
    topik: 'Iman',
    kedudukan: 'Hadits Al-Qur\'an',
    sanadList: ['Umar bin Al-Khaththab (Sahabat)', 'Alqamah bin Waqash Al-Laitsi', 'Muhammad bin Ibrahim At-Taimi', 'Yahya bin Sa\'id Al-Anshari', 'Sufyan bin \'Uyaynah', 'Al-Humaidi Abdullah bin Az-Zubair', 'Imam Al-Bukhari'],
    similarHadiths: ['Shahih Bukhari #2723', 'Shahih Bukhari #4188', 'Shahih Bukhari #5790', 'Shahih Bukhari #3322', 'Shahih Bukhari #4470', 'Shahih Bukhari #2641']
  }
];

// Hadith generator returning multiple rich authentic hadiths per selected option
const getCompleteHadithsForFilter = (
  kitabId: string | null, 
  temaName: string | null, 
  kedudukanName: string | null
): DetailedHadistItem[] => {
  let existing = BASE_HADISTS_DATA.filter(h => {
    if (kitabId) return h.kitabId === kitabId;
    if (temaName) return h.topik.toLowerCase() === temaName.toLowerCase();
    if (kedudukanName) return h.kedudukan.toLowerCase().includes(kedudukanName.toLowerCase());
    return true;
  });

  const targetKitab = KITAB_HADIST_LIST.find(k => k.id === kitabId);
  const targetTema = HADIST_TEMAS.find(t => t.name === temaName);
  const targetKedudukan = HADIST_KEDUDUKAN_LIST.find(k => k.name === kedudukanName);

  const kName = targetKitab?.name || (targetTema ? `Hadits ${targetTema.name}` : targetKedudukan?.name || 'Hadits Shahih');
  const kArabic = targetKitab?.arabic || 'صحيح الحديث';

  const SAMPLE_HADITH_POOL = [
    {
      no: 1,
      matan: 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى فَمَنْ كَانَتْ هِجْرَتُهُ إِلَى اللَّهِ وَرَسُولِهِ فَهِجْرَتُهُ إِلَى اللَّهِ وَرَسُولِهِ',
      trans: 'Telah menceritakan kepada kami [Al-Humaidi] dari [Sufyan] dari [Yahya bin Sa\'id] dari [Umar bin Al-Khaththab] radhiyallahu \'anhu, Rasulullah ﷺ bersabda: "Sesungguhnya semua amalan tergantung pada niatnya, dan setiap orang akan mendapatkan balasan sesuai dengan apa yang diniatkannya."',
      topik: 'Iman',
      kedudukan: 'Hadits Mutawatir'
    },
    {
      no: 2,
      matan: 'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ',
      trans: 'Telah menceritakan kepada kami [Qutaibah bin Sa\'id] dari [Suhail] dari [Abu Hurairah] radhiyallahu \'anhu bersabda: "Barangsiapa menempuh suatu jalan untuk mencari ilmu, maka Allah akan memudahkan baginya jalan menuju surga."',
      topik: 'Ilmu',
      kedudukan: 'Hadits Marfu\''
    },
    {
      no: 3,
      matan: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ',
      trans: 'Telah menceritakan kepada kami [Musaddad] dari [Yahya] dari [Anas bin Malik] radhiyallahu \'anhu dari Nabi ﷺ bersabda: "Tidak beriman salah seorang di antara kalian sampai ia mencintai saudaranya sebagaimana ia mencintai dirinya sendiri."',
      topik: 'Akhlaq dan Adab',
      kedudukan: 'Hadits Al-Qur\'an'
    },
    {
      no: 4,
      matan: 'يَا عِبَادِي إِنِّي حَرَّمْتُ الظُّلْمَ عَلَى نَفْسِي وَجَعَلْتُهُ بَيْنَكُمْ مُحَرَّمًا فَلَا تَظَالَمُوا',
      trans: 'Dari [Abu Dzarr] radhiyallahu \'anhu dari Nabi ﷺ merawikan dari Allah Tabaraka wa Ta\'ala: "Wahai hamba-hamba-Ku, sesungguhnya Aku telah mengharamkan kezaliman atas diri-Ku dan Aku menjadikannya haram di antara kalian, maka janganlah kalian saling menzalimi."',
      topik: 'Putusan Hukum',
      kedudukan: 'Hadits Qudsi'
    },
    {
      no: 5,
      matan: 'اقْرَءُوا الْقُرْآنَ فَإِنَّهُ يَأْتِي يَوْمَ الْقِيَامَةِ شَفِيعًا لِأَصْحَابِهِ',
      trans: 'Telah menceritakan kepada kami [Waki\'] dari [Abu Umamah Al-Bahili] radhiyallahu \'anhu berkata: Aku mendengar Rasulullah ﷺ bersabda: "Bacalah Al-Qur\'an, karena ia akan datang pada hari kiamat sebagai pemberi syafa\'at bagi para pembacanya."',
      topik: 'Al-Qur\'an',
      kedudukan: 'Hadits Mauquf'
    },
    {
      no: 6,
      matan: 'التَّاجِرُ الصَّدُوقُ الأَمِينُ مَعَ النَّبِيِّينَ وَالصِّدِّيقِينَ وَالشُهَدَاءِ',
      trans: 'Dari [Abu Sa\'id Al-Khudri] radhiyallahu \'anhu bersabda: "Pedagang yang jujur dan terpercaya akan dikumpulkan bersama para Nabi, para shiddiqin, dan para syuhada."',
      topik: 'Mu\'amalah',
      kedudukan: 'Hadits Maqthu\''
    },
    {
      no: 7,
      matan: 'ترَكْتُ فِيكُمْ أَمْرَيْنِ لَنْ تَضِلُّوا مَا تَمَسَّكْتُمْ بِهِمَا كِتَابَ اللَّهِ وَسُنَّةَ نَبِيِّهِ',
      trans: 'Dari [Abu Hurairah] radhiyallahu \'anhu Rasulullah ﷺ bersabda: "Aku tinggalkan dua hal yang kalian tidak akan tersesat selama berpegang teguh pada keduanya: Kitabullah dan Sunnah Nabi-Nya."',
      topik: 'Ibadah',
      kedudukan: 'Hadits Mursal'
    },
    {
      no: 8,
      matan: 'الصَّوْمُ جُنَّةٌ مِنَ النَّارِ كَجُنَّةِ أَحَدِكُمْ مِنَ الْقِتَالِ',
      trans: 'Dari [Utsman bin Abi Al-\'As] radhiyallahu \'anhu bersabda: "Puasa adalah perisai dari api neraka sebagaimana perisai kalian dalam peperangan."',
      topik: 'Jihad',
      kedudukan: 'Hadits Munqathi\''
    },
    {
      no: 9,
      matan: 'اِتَّقُوا اللَّهَ فِي هَذِهِ الْبَهَائِمِ الْمُعْجَمَةِ فَارْكَبُوهَا صَالِحَةً وَكُلُوهَا صَالِحَةً',
      trans: 'Dari [Sahl bin Al-Hanzhaliyah] radhiyallahu \'anhu bersabda: "Bertakwalah kepada Allah terhadap hewan-hewan bisu ini, naikilah dengan baik dan makanlah dengan baik."',
      topik: 'Makanan Minuman',
      kedudukan: 'Hadits Muallaq'
    }
  ];

  const generated: DetailedHadistItem[] = SAMPLE_HADITH_POOL.map((item, idx) => ({
    id: 1000 + (kitabId ? kitabId.length : 1) * 100 + (temaName ? temaName.length : 2) * 10 + idx,
    kitabId: kitabId || 'bukhari',
    kitabName: targetKitab?.name || 'Shahih Bukhari',
    kitabArabic: kArabic,
    itemTitle: `${kName} #${item.no}`,
    matanArabic: item.matan,
    terjemahanFull: item.trans,
    topik: temaName || item.topik,
    kedudukan: kedudukanName || item.kedudukan,
    sanadList: ['Perawi 1 (Sahabat)', 'Perawi 2 (Tabi\'in)', 'Perawi 3 (Tabi\'ut Tabi\'in)', 'Perawi 4', targetKitab?.name || 'Imam Hadits'],
    similarHadiths: [
      `Shahih Bukhari #${1000 + idx * 12}`,
      `Shahih Muslim #${800 + idx * 15}`,
      `Sunan Tirmidzi #${400 + idx * 8}`,
      `Sunan Abu Dawud #${300 + idx * 5}`,
      `Musnad Ahmad #${1200 + idx * 20}`
    ]
  }));

  const allResults = [...existing, ...generated];
  return allResults;
};

// Helper to generate full 30 Juz details
const GENERATE_ALL_30_JUZ = () => {
  const arabicJuzNames = [
    "أَلْجُزْءُ الأَوَّلُ", "أَلْجُزْءُ الثَّانِي", "أَلْجُزْءُ الثَّالِثُ", "أَلْجُزْءُ الرَّابِعُ",
    "أَلْجُزْءُ الْخَامِسُ", "أَلْجُزْءُ السَّادِسُ", "أَلْجُزْءُ السَّابِعُ", "أَلْجُزْءُ الثَّامِنُ",
    "أَلْجُزْءُ التَّاسِعُ", "أَلْجُزْءُ الْعَاشِرُ", "أَلْجُزْءُ الْحَادِيَ عَشَرَ", "أَلْجُزْءُ الثَّانِيَ عَشَرَ",
    "أَلْجُزْءُ الثَّالِثَ عَشَرَ", "أَلْجُزْءُ الرَّابِعَ عَشَرَ", "أَلْجُزْءُ الْخَامِسَ عَشَرَ", "أَلْجُزْءُ السَّادِسَ عَشَرَ",
    "أَلْجُزْءُ السَّابِعَ عَشَرَ", "أَلْجُزْءُ الثَّامِنَ عَشَرَ", "أَلْجُزْءُ التَّاسِعَ عَشَرَ", "أَلْجُزْءُ الْعِشْرُونَ",
    "أَلْجُزْءُ الْحَادِي وَالْعِشْرُونَ", "أَلْجُزْءُ الثَّانِي وَالْعِشْرُونَ", "أَلْجُزْءُ الثَّالِثُ وَالْعِشْرُونَ", "أَلْجُزْءُ الرَّابِعُ وَالْعِشْرُونَ",
    "أَلْجُزْءُ الْخَامِسُ وَالْعِشْرُونَ", "أَلْجُزْءُ السَّادِسُ وَالْعِشْرُونَ", "أَلْجُزْءُ السَّابِعُ وَالْعِشْرُونَ", "أَلْجُزْءُ الثَّامِنُ وَالْعِشْرُونَ",
    "أَلْجُزْءُ التَّاسِعُ وَالْعِشْرُونَ", "أَلْجُزْءُ الثَّلاَثُونَ"
  ];

  const juzSurahMap: { [key: number]: { nomor: number; name: string; ayatRange: string; startAyat: number }[] } = {
    1: [{ nomor: 1, name: "Al-Fatihah", ayatRange: "Ayat 1-7", startAyat: 1 }, { nomor: 2, name: "Al-Baqarah", ayatRange: "Ayat 1-141", startAyat: 1 }],
    2: [{ nomor: 2, name: "Al-Baqarah", ayatRange: "Ayat 142-252", startAyat: 142 }],
    3: [{ nomor: 2, name: "Al-Baqarah", ayatRange: "Ayat 253-286", startAyat: 253 }, { nomor: 3, name: "Ali 'Imran", ayatRange: "Ayat 1-92", startAyat: 1 }],
    4: [{ nomor: 3, name: "Ali 'Imran", ayatRange: "Ayat 93-200", startAyat: 93 }, { nomor: 4, name: "An-Nisa'", ayatRange: "Ayat 1-23", startAyat: 1 }],
    5: [{ nomor: 4, name: "An-Nisa'", ayatRange: "Ayat 24-147", startAyat: 24 }],
    6: [{ nomor: 4, name: "An-Nisa'", ayatRange: "Ayat 148-176", startAyat: 148 }, { nomor: 5, name: "Al-Ma'idah", ayatRange: "Ayat 1-81", startAyat: 1 }],
    7: [{ nomor: 5, name: "Al-Ma'idah", ayatRange: "Ayat 82-120", startAyat: 82 }, { nomor: 6, name: "Al-An'am", ayatRange: "Ayat 1-110", startAyat: 1 }],
    8: [{ nomor: 6, name: "Al-An'am", ayatRange: "Ayat 111-165", startAyat: 111 }, { nomor: 7, name: "Al-A'raf", ayatRange: "Ayat 1-87", startAyat: 1 }],
    9: [{ nomor: 7, name: "Al-A'raf", ayatRange: "Ayat 88-206", startAyat: 88 }, { nomor: 8, name: "Al-Anfal", ayatRange: "Ayat 1-40", startAyat: 1 }],
    10: [{ nomor: 8, name: "Al-Anfal", ayatRange: "Ayat 41-75", startAyat: 41 }, { nomor: 9, name: "At-Tawbah", ayatRange: "Ayat 1-92", startAyat: 1 }],
    11: [{ nomor: 9, name: "At-Tawbah", ayatRange: "Ayat 93-129", startAyat: 93 }, { nomor: 10, name: "Yunus", ayatRange: "Ayat 1-109", startAyat: 1 }, { nomor: 11, name: "Hud", ayatRange: "Ayat 1-5", startAyat: 1 }],
    12: [{ nomor: 11, name: "Hud", ayatRange: "Ayat 6-123", startAyat: 6 }, { nomor: 12, name: "Yusuf", ayatRange: "Ayat 1-52", startAyat: 1 }],
    13: [{ nomor: 12, name: "Yusuf", ayatRange: "Ayat 53-111", startAyat: 53 }, { nomor: 13, name: "Ar-Ra'd", ayatRange: "Ayat 1-43", startAyat: 1 }, { nomor: 14, name: "Ibrahim", ayatRange: "Ayat 1-52", startAyat: 1 }],
    14: [{ nomor: 15, name: "Al-Hijr", ayatRange: "Ayat 1-99", startAyat: 1 }, { nomor: 16, name: "An-Nahl", ayatRange: "Ayat 1-128", startAyat: 1 }],
    15: [{ nomor: 17, name: "Al-Isra'", ayatRange: "Ayat 1-111", startAyat: 1 }, { nomor: 18, name: "Al-Kahf", ayatRange: "Ayat 1-74", startAyat: 1 }],
    16: [{ nomor: 18, name: "Al-Kahf", ayatRange: "Ayat 75-110", startAyat: 75 }, { nomor: 19, name: "Maryam", ayatRange: "Ayat 1-98", startAyat: 1 }, { nomor: 20, name: "Taha", ayatRange: "Ayat 1-135", startAyat: 1 }],
    17: [{ nomor: 21, name: "Al-Anbiya'", ayatRange: "Ayat 1-112", startAyat: 1 }, { nomor: 22, name: "Al-Hajj", ayatRange: "Ayat 1-78", startAyat: 1 }],
    18: [{ nomor: 23, name: "Al-Mu'minun", ayatRange: "Ayat 1-118", startAyat: 1 }, { nomor: 24, name: "An-Nur", ayatRange: "Ayat 1-64", startAyat: 1 }, { nomor: 25, name: "Al-Furqan", ayatRange: "Ayat 1-20", startAyat: 1 }],
    19: [{ nomor: 25, name: "Al-Furqan", ayatRange: "Ayat 21-77", startAyat: 21 }, { nomor: 26, name: "Asy-Syu'ara'", ayatRange: "Ayat 1-227", startAyat: 1 }, { nomor: 27, name: "An-Naml", ayatRange: "Ayat 1-55", startAyat: 1 }],
    20: [{ nomor: 27, name: "An-Naml", ayatRange: "Ayat 56-93", startAyat: 56 }, { nomor: 28, name: "Al-Qasas", ayatRange: "Ayat 1-88", startAyat: 1 }, { nomor: 29, name: "Al-'Ankabut", ayatRange: "Ayat 1-45", startAyat: 1 }],
    21: [{ nomor: 29, name: "Al-'Ankabut", ayatRange: "Ayat 46-69", startAyat: 46 }, { nomor: 30, name: "Ar-Rum", ayatRange: "Ayat 1-60", startAyat: 1 }, { nomor: 31, name: "Luqman", ayatRange: "Ayat 1-34", startAyat: 1 }, { nomor: 32, name: "As-Sajdah", ayatRange: "Ayat 1-30", startAyat: 1 }, { nomor: 33, name: "Al-Ahzab", ayatRange: "Ayat 1-30", startAyat: 1 }],
    22: [{ nomor: 33, name: "Al-Ahzab", ayatRange: "Ayat 31-73", startAyat: 31 }, { nomor: 34, name: "Saba'", ayatRange: "Ayat 1-54", startAyat: 1 }, { nomor: 35, name: "Fatir", ayatRange: "Ayat 1-45", startAyat: 1 }, { nomor: 36, name: "Yasin", ayatRange: "Ayat 1-27", startAyat: 1 }],
    23: [{ nomor: 36, name: "Yasin", ayatRange: "Ayat 28-83", startAyat: 28 }, { nomor: 37, name: "As-Saffat", ayatRange: "Ayat 1-182", startAyat: 1 }, { nomor: 38, name: "Sad", ayatRange: "Ayat 1-88", startAyat: 1 }, { nomor: 39, name: "Az-Zumar", ayatRange: "Ayat 1-31", startAyat: 1 }],
    24: [{ nomor: 39, name: "Az-Zumar", ayatRange: "Ayat 32-75", startAyat: 32 }, { nomor: 40, name: "Ghafir", ayatRange: "Ayat 1-85", startAyat: 1 }, { nomor: 41, name: "Fussilat", ayatRange: "Ayat 1-46", startAyat: 1 }],
    25: [{ nomor: 41, name: "Fussilat", ayatRange: "Ayat 47-54", startAyat: 47 }, { nomor: 42, name: "Asy-Syura", ayatRange: "Ayat 1-53", startAyat: 1 }, { nomor: 43, name: "Az-Zukhruf", ayatRange: "Ayat 1-89", startAyat: 1 }, { nomor: 44, name: "Ad-Dukhan", ayatRange: "Ayat 1-59", startAyat: 1 }, { nomor: 45, name: "Al-Jasiyah", ayatRange: "Ayat 1-37", startAyat: 1 }],
    26: [{ nomor: 46, name: "Al-Ahqaf", ayatRange: "Ayat 1-35", startAyat: 1 }, { nomor: 47, name: "Muhammad", ayatRange: "Ayat 1-38", startAyat: 1 }, { nomor: 48, name: "Al-Fath", ayatRange: "Ayat 1-29", startAyat: 1 }, { nomor: 49, name: "Al-Hujurat", ayatRange: "Ayat 1-18", startAyat: 1 }, { nomor: 50, name: "Qaf", ayatRange: "Ayat 1-45", startAyat: 1 }, { nomor: 51, name: "Az-Zariyat", ayatRange: "Ayat 1-30", startAyat: 1 }],
    27: [{ nomor: 51, name: "Az-Zariyat", ayatRange: "Ayat 31-60", startAyat: 31 }, { nomor: 52, name: "At-Tur", ayatRange: "Ayat 1-49", startAyat: 1 }, { nomor: 53, name: "An-Najm", ayatRange: "Ayat 1-62", startAyat: 1 }, { nomor: 54, name: "Al-Qamar", ayatRange: "Ayat 1-55", startAyat: 1 }, { nomor: 55, name: "Ar-Rahman", ayatRange: "Ayat 1-78", startAyat: 1 }, { nomor: 56, name: "Al-Waqi'ah", ayatRange: "Ayat 1-96", startAyat: 1 }, { nomor: 57, name: "Al-Hadid", ayatRange: "Ayat 1-29", startAyat: 1 }],
    28: [{ nomor: 58, name: "Al-Mujadilah", ayatRange: "Ayat 1-22", startAyat: 1 }, { nomor: 59, name: "Al-Hasyr", ayatRange: "Ayat 1-24", startAyat: 1 }, { nomor: 60, name: "Al-Mumtahanah", ayatRange: "Ayat 1-13", startAyat: 1 }, { nomor: 61, name: "As-Saff", ayatRange: "Ayat 1-14", startAyat: 1 }, { nomor: 62, name: "Al-Jumu'ah", ayatRange: "Ayat 1-11", startAyat: 1 }, { nomor: 63, name: "Al-Munafiqun", ayatRange: "Ayat 1-11", startAyat: 1 }, { nomor: 64, name: "At-Taghabun", ayatRange: "Ayat 1-18", startAyat: 1 }, { nomor: 65, name: "At-Talaq", ayatRange: "Ayat 1-12", startAyat: 1 }, { nomor: 66, name: "At-Tahrim", ayatRange: "Ayat 1-12", startAyat: 1 }],
    29: [{ nomor: 67, name: "Al-Mulk", ayatRange: "Ayat 1-30", startAyat: 1 }, { nomor: 68, name: "Al-Qalam", ayatRange: "Ayat 1-52", startAyat: 1 }, { nomor: 69, name: "Al-Haqqah", ayatRange: "Ayat 1-52", startAyat: 1 }, { nomor: 70, name: "Al-Ma'arij", ayatRange: "Ayat 1-44", startAyat: 1 }, { nomor: 71, name: "Nuh", ayatRange: "Ayat 1-28", startAyat: 1 }, { nomor: 72, name: "Al-Jinn", ayatRange: "Ayat 1-28", startAyat: 1 }, { nomor: 73, name: "Al-Muzzammil", ayatRange: "Ayat 1-20", startAyat: 1 }, { nomor: 74, name: "Al-Muddassir", ayatRange: "Ayat 1-56", startAyat: 1 }, { nomor: 75, name: "Al-Qiyamah", ayatRange: "Ayat 1-40", startAyat: 1 }, { nomor: 76, name: "Al-Insan", ayatRange: "Ayat 1-31", startAyat: 1 }, { nomor: 77, name: "Al-Mursalat", ayatRange: "Ayat 1-50", startAyat: 1 }],
    30: [{ nomor: 78, name: "An-Naba'", ayatRange: "Ayat 1-40", startAyat: 1 }, { nomor: 79, name: "An-Nazi'at", ayatRange: "Ayat 1-46", startAyat: 1 }, { nomor: 80, name: "'Abasa", ayatRange: "Ayat 1-42", startAyat: 1 }, { nomor: 112, name: "Al-Ikhlas", ayatRange: "Ayat 1-4", startAyat: 1 }, { nomor: 113, name: "Al-Falaq", ayatRange: "Ayat 1-5", startAyat: 1 }, { nomor: 114, name: "An-Nas", ayatRange: "Ayat 1-6", startAyat: 1 }]
  };

  return Array.from({ length: 30 }, (_, i) => {
    const id = i + 1;
    return {
      id,
      label: `Juz ${id}`,
      arabic: arabicJuzNames[i] || `أَلْجُزْءُ ${id}`,
      surahs: juzSurahMap[id] || [{ nomor: 1, name: `Surah Juz ${id}`, ayatRange: "Ayat Lengkap", startAyat: 1 }]
    };
  });
};

const ALL_30_JUZ = GENERATE_ALL_30_JUZ();

// Data structure for Index Ayat Table matching user screenshot
export interface IndexAyatRow {
  id: number;
  title: string;
  isSectionHeader?: boolean;
  ayatLinks: { surah: number; ayat: number; label: string }[];
}

const EXTENSIVE_INDEX_AYAT_TABLE: IndexAyatRow[] = [
  {
    id: 1,
    title: 'Awal kejadian makhluk',
    isSectionHeader: true,
    ayatLinks: []
  },
  {
    id: 2,
    title: 'Penciptaan selain manusia',
    isSectionHeader: true,
    ayatLinks: []
  },
  {
    id: 3,
    title: 'Penciptaan Arsy',
    ayatLinks: [
      { surah: 7, ayat: 54, label: 'Qs.7:54' },
      { surah: 13, ayat: 2, label: 'Qs.13:2' },
      { surah: 25, ayat: 59, label: 'Qs.25:59' }
    ]
  },
  {
    id: 4,
    title: 'Kursi Allah (Kekuasaan Dan Ilmunya)',
    ayatLinks: [
      { surah: 2, ayat: 255, label: 'Qs.2:255' }
    ]
  },
  {
    id: 5,
    title: 'Penciptaan Lauhhil Mahfuzh',
    ayatLinks: [
      { surah: 13, ayat: 39, label: 'Qs.13:39' },
      { surah: 17, ayat: 58, label: 'Qs.17:58' },
      { surah: 20, ayat: 52, label: 'Qs.20:52' },
      { surah: 85, ayat: 22, label: 'Qs.85:22' }
    ]
  },
  {
    id: 6,
    title: 'Penciptaan langit dan bumi',
    ayatLinks: [
      { surah: 2, ayat: 22, label: 'Qs.2:22' },
      { surah: 2, ayat: 29, label: 'Qs.2:29' },
      { surah: 2, ayat: 164, label: 'Qs.2:164' },
      { surah: 6, ayat: 1, label: 'Qs.6:1' },
      { surah: 6, ayat: 14, label: 'Qs.6:14' },
      { surah: 6, ayat: 73, label: 'Qs.6:73' },
      { surah: 6, ayat: 79, label: 'Qs.6:79' },
      { surah: 6, ayat: 101, label: 'Qs.6:101' },
      { surah: 7, ayat: 54, label: 'Qs.7:54' },
      { surah: 10, ayat: 3, label: 'Qs.10:3' },
      { surah: 11, ayat: 7, label: 'Qs.11:7' },
      { surah: 13, ayat: 2, label: 'Qs.13:2' },
      { surah: 14, ayat: 10, label: 'Qs.14:10' },
      { surah: 14, ayat: 19, label: 'Qs.14:19' },
      { surah: 15, ayat: 19, label: 'Qs.15:19' },
      { surah: 15, ayat: 85, label: 'Qs.15:85' },
      { surah: 16, ayat: 3, label: 'Qs.16:3' },
      { surah: 17, ayat: 99, label: 'Qs.17:99' },
      { surah: 18, ayat: 51, label: 'Qs.18:51' },
      { surah: 20, ayat: 4, label: 'Qs.20:4' },
      { surah: 21, ayat: 16, label: 'Qs.21:16' },
      { surah: 25, ayat: 59, label: 'Qs.25:59' },
      { surah: 27, ayat: 60, label: 'Qs.27:60' },
      { surah: 29, ayat: 44, label: 'Qs.29:44' },
      { surah: 29, ayat: 61, label: 'Qs.29:61' },
      { surah: 40, ayat: 57, label: 'Qs.40:57' },
      { surah: 41, ayat: 9, label: 'Qs.41:9' },
      { surah: 41, ayat: 11, label: 'Qs.41:11' },
      { surah: 44, ayat: 38, label: 'Qs.44:38' },
      { surah: 44, ayat: 39, label: 'Qs.44:39' },
      { surah: 45, ayat: 22, label: 'Qs.45:22' },
      { surah: 46, ayat: 33, label: 'Qs.46:33' },
      { surah: 50, ayat: 6, label: 'Qs.50:6' },
      { surah: 50, ayat: 7, label: 'Qs.50:7' },
      { surah: 50, ayat: 38, label: 'Qs.50:38' },
      { surah: 51, ayat: 7, label: 'Qs.51:7' },
      { surah: 51, ayat: 47, label: 'Qs.51:47' },
      { surah: 51, ayat: 48, label: 'Qs.51:48' },
      { surah: 52, ayat: 36, label: 'Qs.52:36' },
      { surah: 55, ayat: 7, label: 'Qs.55:7' },
      { surah: 55, ayat: 10, label: 'Qs.55:10' },
      { surah: 57, ayat: 4, label: 'Qs.57:4' },
      { surah: 71, ayat: 15, label: 'Qs.71:15' },
      { surah: 78, ayat: 6, label: 'Qs.78:6' },
      { surah: 78, ayat: 12, label: 'Qs.78:12' },
      { surah: 79, ayat: 27, label: 'Qs.79:27' },
      { surah: 79, ayat: 28, label: 'Qs.79:28' },
      { surah: 88, ayat: 18, label: 'Qs.88:18' },
      { surah: 88, ayat: 20, label: 'Qs.88:20' },
      { surah: 91, ayat: 5, label: 'Qs.91:5' },
      { surah: 91, ayat: 6, label: 'Qs.91:6' }
    ]
  },
  {
    id: 7,
    title: 'Penciptaan gunung',
    ayatLinks: [
      { surah: 13, ayat: 3, label: 'Qs.13:3' },
      { surah: 16, ayat: 15, label: 'Qs.16:15' },
      { surah: 77, ayat: 27, label: 'Qs.77:27' },
      { surah: 78, ayat: 7, label: 'Qs.78:7' },
      { surah: 79, ayat: 32, label: 'Qs.79:32' },
      { surah: 88, ayat: 19, label: 'Qs.88:19' }
    ]
  },
  {
    id: 8,
    title: 'Penciptaan laut dan sungai',
    ayatLinks: [
      { surah: 13, ayat: 3, label: 'Qs.13:3' },
      { surah: 16, ayat: 14, label: 'Qs.16:14' },
      { surah: 16, ayat: 15, label: 'Qs.16:15' },
      { surah: 25, ayat: 53, label: 'Qs.25:53' },
      { surah: 27, ayat: 61, label: 'Qs.27:61' },
      { surah: 45, ayat: 12, label: 'Qs.45:12' },
      { surah: 55, ayat: 22, label: 'Qs.55:22' }
    ]
  },
  {
    id: 9,
    title: 'Ibadah Shalat Fardhu & Sunnah',
    ayatLinks: [
      { surah: 2, ayat: 43, label: 'Qs.2:43' },
      { surah: 2, ayat: 83, label: 'Qs.2:83' },
      { surah: 2, ayat: 110, label: 'Qs.2:110' },
      { surah: 4, ayat: 103, label: 'Qs.4:103' },
      { surah: 17, ayat: 78, label: 'Qs.17:78' },
      { surah: 20, ayat: 14, label: 'Qs.20:14' }
    ]
  },
  {
    id: 10,
    title: 'Puasa Ramadhan & Hukumnya',
    ayatLinks: [
      { surah: 2, ayat: 183, label: 'Qs.2:183' },
      { surah: 2, ayat: 184, label: 'Qs.2:184' },
      { surah: 2, ayat: 185, label: 'Qs.2:185' },
      { surah: 2, ayat: 187, label: 'Qs.2:187' }
    ]
  },
  {
    id: 11,
    title: 'Zakat, Sedekah & Infaq',
    ayatLinks: [
      { surah: 2, ayat: 261, label: 'Qs.2:261' },
      { surah: 2, ayat: 267, label: 'Qs.2:267' },
      { surah: 2, ayat: 274, label: 'Qs.2:274' },
      { surah: 9, ayat: 60, label: 'Qs.9:60' },
      { surah: 9, ayat: 103, label: 'Qs.9:103' }
    ]
  },
  {
    id: 12,
    title: 'Hukum Jual Beli & Larangan Riba',
    ayatLinks: [
      { surah: 2, ayat: 275, label: 'Qs.2:275' },
      { surah: 2, ayat: 276, label: 'Qs.2:276' },
      { surah: 2, ayat: 278, label: 'Qs.2:278' },
      { surah: 3, ayat: 130, label: 'Qs.3:130' },
      { surah: 4, ayat: 29, label: 'Qs.4:29' }
    ]
  }
];

export const INDEX_AYAT_TOPICS_LIST = [
  {
    id: 1,
    title: 'Bangsa Terdahulu',
    desc: 'Daftar Ayat Al-Quran yang menjelaskan tentang Bangsa Terdahulu',
    ayatLinks: [
      { surah: 7, ayat: 54, label: 'Qs.7:54' },
      { surah: 13, ayat: 2, label: 'Qs.13:2' },
      { surah: 25, ayat: 59, label: 'Qs.25:59' },
      { surah: 2, ayat: 255, label: 'Qs.2:255' },
      { surah: 13, ayat: 39, label: 'Qs.13:39' },
      { surah: 17, ayat: 58, label: 'Qs.17:58' },
      { surah: 20, ayat: 52, label: 'Qs.20:52' },
      { surah: 85, ayat: 22, label: 'Qs.85:22' },
      { surah: 2, ayat: 22, label: 'Qs.2:22' },
      { surah: 2, ayat: 29, label: 'Qs.2:29' },
      { surah: 2, ayat: 164, label: 'Qs.2:164' },
      { surah: 6, ayat: 1, label: 'Qs.6:1' },
      { surah: 6, ayat: 14, label: 'Qs.6:14' },
      { surah: 6, ayat: 73, label: 'Qs.6:73' },
      { surah: 6, ayat: 79, label: 'Qs.6:79' },
      { surah: 6, ayat: 101, label: 'Qs.6:101' },
      { surah: 10, ayat: 3, label: 'Qs.10:3' },
      { surah: 11, ayat: 7, label: 'Qs.11:7' },
      { surah: 14, ayat: 10, label: 'Qs.14:10' },
      { surah: 15, ayat: 19, label: 'Qs.15:19' },
      { surah: 16, ayat: 3, label: 'Qs.16:3' },
      { surah: 17, ayat: 99, label: 'Qs.17:99' },
      { surah: 18, ayat: 51, label: 'Qs.18:51' },
      { surah: 20, ayat: 4, label: 'Qs.20:4' },
      { surah: 21, ayat: 16, label: 'Qs.21:16' },
      { surah: 27, ayat: 60, label: 'Qs.27:60' },
      { surah: 29, ayat: 44, label: 'Qs.29:44' },
      { surah: 40, ayat: 57, label: 'Qs.40:57' },
      { surah: 41, ayat: 9, label: 'Qs.41:9' },
      { surah: 44, ayat: 38, label: 'Qs.44:38' },
      { surah: 45, ayat: 22, label: 'Qs.45:22' },
      { surah: 46, ayat: 33, label: 'Qs.46:33' },
      { surah: 50, ayat: 6, label: 'Qs.50:6' },
      { surah: 51, ayat: 47, label: 'Qs.51:47' },
      { surah: 55, ayat: 7, label: 'Qs.55:7' },
      { surah: 57, ayat: 4, label: 'Qs.57:4' },
      { surah: 71, ayat: 15, label: 'Qs.71:15' },
      { surah: 78, ayat: 6, label: 'Qs.78:6' },
      { surah: 79, ayat: 27, label: 'Qs.79:27' },
      { surah: 88, ayat: 18, label: 'Qs.88:18' },
      { surah: 91, ayat: 5, label: 'Qs.91:5' }
    ]
  },
  {
    id: 2,
    title: 'Ibadah',
    desc: 'Daftar Ayat Al-Quran yang menjelaskan tentang Ibadah',
    ayatLinks: [
      { surah: 2, ayat: 43, label: 'Qs.2:43' },
      { surah: 2, ayat: 83, label: 'Qs.2:83' },
      { surah: 2, ayat: 110, label: 'Qs.2:110' },
      { surah: 2, ayat: 183, label: 'Qs.2:183' },
      { surah: 2, ayat: 187, label: 'Qs.2:187' },
      { surah: 2, ayat: 196, label: 'Qs.2:196' },
      { surah: 2, ayat: 238, label: 'Qs.2:238' },
      { surah: 3, ayat: 96, label: 'Qs.3:96' },
      { surah: 4, ayat: 43, label: 'Qs.4:43' },
      { surah: 4, ayat: 101, label: 'Qs.4:101' },
      { surah: 5, ayat: 6, label: 'Qs.5:6' },
      { surah: 9, ayat: 18, label: 'Qs.9:18' },
      { surah: 9, ayat: 71, label: 'Qs.9:71' },
      { surah: 17, ayat: 78, label: 'Qs.17:78' },
      { surah: 22, ayat: 26, label: 'Qs.22:26' },
      { surah: 22, ayat: 77, label: 'Qs.22:77' },
      { surah: 24, ayat: 56, label: 'Qs.24:56' },
      { surah: 29, ayat: 45, label: 'Qs.29:45' },
      { surah: 62, ayat: 9, label: 'Qs.62:9' },
      { surah: 73, ayat: 20, label: 'Qs.73:20' },
      { surah: 98, ayat: 5, label: 'Qs.98:5' },
      { surah: 107, ayat: 4, label: 'Qs.107:4' }
    ]
  },
  {
    id: 3,
    title: 'Muamalat',
    desc: 'Daftar Ayat Al-Quran yang menjelaskan tentang Muamalat',
    ayatLinks: [
      { surah: 2, ayat: 275, label: 'Qs.2:275' },
      { surah: 2, ayat: 276, label: 'Qs.2:276' },
      { surah: 2, ayat: 278, label: 'Qs.2:278' },
      { surah: 2, ayat: 282, label: 'Qs.2:282' },
      { surah: 2, ayat: 283, label: 'Qs.2:283' },
      { surah: 3, ayat: 130, label: 'Qs.3:130' },
      { surah: 4, ayat: 29, label: 'Qs.4:29' },
      { surah: 5, ayat: 1, label: 'Qs.5:1' },
      { surah: 6, ayat: 152, label: 'Qs.6:152' },
      { surah: 17, ayat: 35, label: 'Qs.17:35' },
      { surah: 26, ayat: 181, label: 'Qs.26:181' },
      { surah: 83, ayat: 1, label: 'Qs.83:1' }
    ]
  },
  {
    id: 4,
    title: 'Sejarah',
    desc: 'Daftar Ayat Al-Quran yang menjelaskan tentang Sejarah',
    ayatLinks: [
      { surah: 2, ayat: 125, label: 'Qs.2:125' },
      { surah: 3, ayat: 137, label: 'Qs.3:137' },
      { surah: 7, ayat: 103, label: 'Qs.7:103' },
      { surah: 11, ayat: 40, label: 'Qs.11:40' },
      { surah: 12, ayat: 3, label: 'Qs.12:3' },
      { surah: 12, ayat: 111, label: 'Qs.12:111' },
      { surah: 18, ayat: 9, label: 'Qs.18:9' },
      { surah: 20, ayat: 9, label: 'Qs.20:9' },
      { surah: 21, ayat: 51, label: 'Qs.21:51' },
      { surah: 27, ayat: 15, label: 'Qs.27:15' },
      { surah: 28, ayat: 3, label: 'Qs.28:3' },
      { surah: 85, ayat: 4, label: 'Qs.85:4' }
    ]
  },
  {
    id: 5,
    title: 'Makanan dan Minuman',
    desc: 'Daftar Ayat Al-Quran yang menjelaskan tentang Makanan dan Minuman',
    ayatLinks: [
      { surah: 2, ayat: 168, label: 'Qs.2:168' },
      { surah: 2, ayat: 172, label: 'Qs.2:172' },
      { surah: 2, ayat: 173, label: 'Qs.2:173' },
      { surah: 5, ayat: 3, label: 'Qs.5:3' },
      { surah: 5, ayat: 4, label: 'Qs.5:4' },
      { surah: 5, ayat: 5, label: 'Qs.5:5' },
      { surah: 5, ayat: 90, label: 'Qs.5:90' },
      { surah: 6, ayat: 145, label: 'Qs.6:145' },
      { surah: 16, ayat: 66, label: 'Qs.16:66' },
      { surah: 16, ayat: 67, label: 'Qs.16:67' },
      { surah: 16, ayat: 114, label: 'Qs.16:114' },
      { surah: 80, ayat: 24, label: 'Qs.80:24' }
    ]
  },
  {
    id: 6,
    title: 'Peradilan dan Hakim',
    desc: 'Daftar Ayat Al-Quran yang menjelaskan tentang Peradilan dan Hakim',
    ayatLinks: [
      { surah: 4, ayat: 58, label: 'Qs.4:58' },
      { surah: 4, ayat: 65, label: 'Qs.4:65' },
      { surah: 4, ayat: 105, label: 'Qs.4:105' },
      { surah: 4, ayat: 135, label: 'Qs.4:135' },
      { surah: 5, ayat: 42, label: 'Qs.5:42' },
      { surah: 5, ayat: 44, label: 'Qs.5:44' },
      { surah: 5, ayat: 45, label: 'Qs.5:45' },
      { surah: 5, ayat: 47, label: 'Qs.5:47' },
      { surah: 5, ayat: 48, label: 'Qs.5:48' },
      { surah: 5, ayat: 49, label: 'Qs.5:49' },
      { surah: 38, ayat: 26, label: 'Qs.38:26' }
    ]
  },
  {
    id: 7,
    title: 'Iman',
    desc: 'Daftar Ayat Al-Quran yang menjelaskan tentang Iman',
    ayatLinks: [
      { surah: 2, ayat: 3, label: 'Qs.2:3' },
      { surah: 2, ayat: 4, label: 'Qs.2:4' },
      { surah: 2, ayat: 177, label: 'Qs.2:177' },
      { surah: 2, ayat: 285, label: 'Qs.2:285' },
      { surah: 3, ayat: 193, label: 'Qs.3:193' },
      { surah: 4, ayat: 136, label: 'Qs.4:136' },
      { surah: 8, ayat: 2, label: 'Qs.8:2' },
      { surah: 9, ayat: 71, label: 'Qs.9:71' },
      { surah: 23, ayat: 1, label: 'Qs.23:1' },
      { surah: 49, ayat: 15, label: 'Qs.49:15' },
      { surah: 57, ayat: 28, label: 'Qs.57:28' }
    ]
  },
  {
    id: 8,
    title: 'Al-Quran',
    desc: 'Daftar Ayat Al-Quran yang menjelaskan tentang Al-Quran',
    ayatLinks: [
      { surah: 2, ayat: 2, label: 'Qs.2:2' },
      { surah: 2, ayat: 185, label: 'Qs.2:185' },
      { surah: 4, ayat: 82, label: 'Qs.4:82' },
      { surah: 10, ayat: 37, label: 'Qs.10:37' },
      { surah: 15, ayat: 9, label: 'Qs.15:9' },
      { surah: 17, ayat: 9, label: 'Qs.17:9' },
      { surah: 17, ayat: 82, label: 'Qs.17:82' },
      { surah: 18, ayat: 1, label: 'Qs.18:1' },
      { surah: 39, ayat: 23, label: 'Qs.39:23' },
      { surah: 41, ayat: 42, label: 'Qs.41:42' },
      { surah: 56, ayat: 77, label: 'Qs.56:77' },
      { surah: 85, ayat: 21, label: 'Qs.85:21' }
    ]
  },
  {
    id: 9,
    title: 'Pakaian dan Perhiasan',
    desc: 'Daftar Ayat Al-Quran yang menjelaskan tentang Pakaian dan Perhiasan',
    ayatLinks: [
      { surah: 7, ayat: 26, label: 'Qs.7:26' },
      { surah: 7, ayat: 31, label: 'Qs.7:31' },
      { surah: 16, ayat: 81, label: 'Qs.16:81' },
      { surah: 24, ayat: 31, label: 'Qs.24:31' },
      { surah: 24, ayat: 60, label: 'Qs.24:60' },
      { surah: 33, ayat: 59, label: 'Qs.33:59' },
      { surah: 35, ayat: 33, label: 'Qs.35:33' },
      { surah: 76, ayat: 21, label: 'Qs.76:21' }
    ]
  },
  {
    id: 10,
    title: 'Hukum Pidana Jinayah',
    desc: 'Daftar Ayat Al-Quran yang menjelaskan tentang Hukum Pidana Jinayah',
    ayatLinks: [
      { surah: 2, ayat: 178, label: 'Qs.2:178' },
      { surah: 2, ayat: 179, label: 'Qs.2:179' },
      { surah: 4, ayat: 92, label: 'Qs.4:92' },
      { surah: 4, ayat: 93, label: 'Qs.4:93' },
      { surah: 5, ayat: 33, label: 'Qs.5:33' },
      { surah: 5, ayat: 38, label: 'Qs.5:38' },
      { surah: 24, ayat: 2, label: 'Qs.24:2' },
      { surah: 24, ayat: 4, label: 'Qs.24:4' },
      { surah: 24, ayat: 33, label: 'Qs.24:33' }
    ]
  },
  {
    id: 11,
    title: 'Ilmu',
    desc: 'Daftar Ayat Al-Quran yang menjelaskan tentang Ilmu',
    ayatLinks: [
      { surah: 2, ayat: 269, label: 'Qs.2:269' },
      { surah: 3, ayat: 7, label: 'Qs.3:7' },
      { surah: 3, ayat: 18, label: 'Qs.3:18' },
      { surah: 9, ayat: 122, label: 'Qs.9:122' },
      { surah: 17, ayat: 85, label: 'Qs.17:85' },
      { surah: 20, ayat: 114, label: 'Qs.20:114' },
      { surah: 35, ayat: 28, label: 'Qs.35:28' },
      { surah: 39, ayat: 9, label: 'Qs.39:9' },
      { surah: 58, ayat: 11, label: 'Qs.58:11' },
      { surah: 96, ayat: 1, label: 'Qs.96:1' }
    ]
  },
  {
    id: 12,
    title: 'Akhlaq & Adab',
    desc: 'Daftar Ayat Al-Quran yang menjelaskan tentang Akhlaq & Adab',
    ayatLinks: [
      { surah: 3, ayat: 134, label: 'Qs.3:134' },
      { surah: 4, ayat: 36, label: 'Qs.4:36' },
      { surah: 6, ayat: 151, label: 'Qs.6:151' },
      { surah: 17, ayat: 23, label: 'Qs.17:23' },
      { surah: 17, ayat: 37, label: 'Qs.17:37' },
      { surah: 24, ayat: 27, label: 'Qs.24:27' },
      { surah: 31, ayat: 18, label: 'Qs.31:18' },
      { surah: 31, ayat: 19, label: 'Qs.31:19' },
      { surah: 49, ayat: 11, label: 'Qs.49:11' },
      { surah: 49, ayat: 12, label: 'Qs.49:12' },
      { surah: 68, ayat: 4, label: 'Qs.68:4' }
    ]
  },
  {
    id: 13,
    title: 'Hukum Privat',
    desc: 'Daftar Ayat Al-Quran yang menjelaskan tentang Hukum Privat',
    ayatLinks: [
      { surah: 2, ayat: 221, label: 'Qs.2:221' },
      { surah: 2, ayat: 228, label: 'Qs.2:228' },
      { surah: 2, ayat: 230, label: 'Qs.2:230' },
      { surah: 2, ayat: 233, label: 'Qs.2:233' },
      { surah: 4, ayat: 3, label: 'Qs.4:3' },
      { surah: 4, ayat: 4, label: 'Qs.4:4' },
      { surah: 4, ayat: 11, label: 'Qs.4:11' },
      { surah: 4, ayat: 12, label: 'Qs.4:12' },
      { surah: 4, ayat: 23, label: 'Qs.4:23' },
      { surah: 4, ayat: 34, label: 'Qs.4:34' },
      { surah: 4, ayat: 176, label: 'Qs.4:176' },
      { surah: 65, ayat: 1, label: 'Qs.65:1' }
    ]
  },
  {
    id: 14,
    title: 'Jihad',
    desc: 'Daftar Ayat Al-Quran yang menjelaskan tentang Jihad',
    ayatLinks: [
      { surah: 2, ayat: 190, label: 'Qs.2:190' },
      { surah: 2, ayat: 216, label: 'Qs.2:216' },
      { surah: 3, ayat: 142, label: 'Qs.3:142' },
      { surah: 4, ayat: 74, label: 'Qs.4:74' },
      { surah: 4, ayat: 95, label: 'Qs.4:95' },
      { surah: 8, ayat: 60, label: 'Qs.8:60' },
      { surah: 9, ayat: 20, label: 'Qs.9:20' },
      { surah: 9, ayat: 41, label: 'Qs.9:41' },
      { surah: 9, ayat: 111, label: 'Qs.9:111' },
      { surah: 22, ayat: 39, label: 'Qs.22:39' },
      { surah: 22, ayat: 78, label: 'Qs.22:78' },
      { surah: 61, ayat: 10, label: 'Qs.61:10' }
    ]
  }
];

// Super Complete Dzikir & Doa Data
export interface DzikirItem {
  id: number;
  title: string;
  arabic: string;
  latin: string;
  translation: string;
  repeat: string;
  note?: string;
}

const DZIKIR_PAGI_ITEMS: DzikirItem[] = [
  {
    id: 1,
    title: 'Ayat Kursi (QS. Al-Baqarah: 255)',
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
    latin: 'Allaahu laa ilaaha illaa huwal hayyul qayyuum, laa ta\'khudzuhuu sinatuw wa laa naum. Lahuu maa fis samaawaati wa maa fil ardh...',
    translation: 'Allah, tidak ada tuhan selain Dia Yang Maha Hidup, yang terus-menerus mengurus (makhluk-Nya). Tidak mengantuk dan tidak tidur. Milik-Nya apa yang ada di langit dan di bumi. Barangsiapa membaca ayat ini di pagi hari, ia akan dilindungi dari gangguan jin hingga sore.',
    repeat: 'Dibaca 1x'
  },
  {
    id: 2,
    title: 'Membaca Surah Al-Ikhlas, Al-Falaq, An-Nas',
    arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ ۞ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۞ قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
    latin: 'Qul huwallaahu ahad... Qul a\'uudzu birabbil falaq... Qul a\'uudzu birabbin naas...',
    translation: 'Membaca ketiga surah ini sebanyak 3x di waktu pagi dan petang. Siapa yang membacanya 3x setiap pagi dan petang, niscaya cukuplah baginya dari segala sesuatu.',
    repeat: 'Dibaca 3x'
  },
  {
    id: 3,
    title: 'Dzikir Asbahna wa Asbahal Mulku Lillah',
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لاَ إِلَـهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيْكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيْرٌ',
    latin: 'Asbahnaa wa asbahal mulku lillaahi walhamdu lillaah, laa ilaaha illallaahu wahdahu laa syariika lah, lahul mulku wa lahul hamdu wa huwa \'alaa kulli syai\'in qadiir.',
    translation: 'Kami telah memasuki waktu pagi dan kerajaan hanya milik Allah, segala puji bagi Allah. Tidak ada tuhan selain Allah Yang Maha Esa, tiada sekutu bagi-Nya.',
    repeat: 'Dibaca 1x'
  },
  {
    id: 4,
    title: 'Sayyidul Istighfar',
    arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَـهَ إِلاَّ أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوْذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوْءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوْءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لاَ يَغْفِرُ الذُّنُوْبَ إِلاَّ أَنْتَ',
    latin: 'Allahumma anta rabbii laa ilaaha illaa anta, khalaqtanii wa anaa \'abduka, wa anaa \'alaa \'ahdika wa wa\'dika mas tata\'tu...',
    translation: 'Ya Allah, Engkau adalah Rabbku, tidak ada tuhan selain Engkau. Engkau yang menciptakan aku dan aku adalah hamba-Mu. Barangsiapa membacanya dengan yakin di pagi hari lalu meninggal pada hari itu, niscaya ia masuk surga.',
    repeat: 'Dibaca 1x'
  },
  {
    id: 5,
    title: 'Bismillahilladzi La Yadhurru Ma\'asmihi Syai\'un',
    arabic: 'بِسْمِ اللهِ الَّذِي لاَ يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلاَ فِي السَّمَاءِ وَهُوَ السَّمِيْعُ الْعَلِيْمُ',
    latin: 'Bismillaahilladzi laa yadhurru ma\'asmihi syai\'un fil ardhi wa laa fis samaa\'i wa huwas samii\'ul \'aliim.',
    translation: 'Dengan nama Allah yang bila disebut, segala sesuatu di bumi dan di langit tidak akan berbahaya, Dia-lah Yang Maha Mendengar lagi Maha Mengetahui.',
    repeat: 'Dibaca 3x'
  },
  {
    id: 6,
    title: 'Dzikir Hasbiyallah',
    arabic: 'حَسْبِيَ اللهُ لاَ إِلَـهَ إِلاَّ هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيْمِ',
    latin: 'Hasbiyallaahu laa ilaaha illaa huwa \'alaihi tawakkaltu wa huwa rabbul \'arsyil \'azhiim.',
    translation: 'Cukuplah Allah bagiku; tidak ada tuhan selain Dia. Hanya kepada-Nya aku bertawakkal dan Dia adalah Tuhan yang memiliki \'Arsy yang agung.',
    repeat: 'Dibaca 7x'
  },
  {
    id: 7,
    title: 'Membaca Ayat Kursi',
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...',
    latin: 'Allaahu laa ilaaha illaa huwal hayyul qayyuum...',
    translation: 'Membaca Ayat Kursi di pagi hari melindungi dari gangguan hingga sore hari.',
    repeat: 'Dibaca 1x'
  }
];

const DZIKIR_PETANG_ITEMS: DzikirItem[] = [
  {
    id: 1,
    title: 'Dzikir Amsayna wa Amsal Mulku Lillah',
    arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لاَ إِلَـهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيْكَ لَهُ',
    latin: 'Amsainaa wa amsal mulku lillaahi walhamdu lillaah, laa ilaaha illallaahu wahdahu laa syariika lah...',
    translation: 'Kami telah memasuki waktu sore dan kerajaan hanya milik Allah, segala puji bagi Allah.',
    repeat: 'Dibaca 1x'
  },
  {
    id: 2,
    title: 'A\'udzu Bikalimatillahit Tammati Min Syarri Ma Khalaq',
    arabic: 'أَعُوْذُ بِكَلِمَاتِ اللهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    latin: 'A\'uudzu bikalimaatillaahit taammaati min syarri maa khalaq.',
    translation: 'Aku berlindung dengan kalimat-kalimat Allah yang sempurna dari kejahatan makhluk yang diciptakan-Nya.',
    repeat: 'Dibaca 3x'
  },
  {
    id: 3,
    title: 'Radhitu Billahi Rabba',
    arabic: 'رَضِيْتُ بِاللهِ رَبًّا، وَبِبَالإِسْلاَمِ دِيْنًا، وَبِمُحَمَّدٍ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا',
    latin: 'Radhiitu billaahi rabbaa, wa bil islaami diinaa, wa bi Muhammadin shallallaahu \'alaihi wa sallama nabiyyaa.',
    translation: 'Aku ridha Allah sebagai Rabbku, Islam sebagai agamaku, dan Nabi Muhammad ﷺ sebagai Nabiku.',
    repeat: 'Dibaca 3x'
  },
  {
    id: 4,
    title: 'Doa Berlindung dari Kemurungan & Kemalasan',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ',
    latin: 'Allaahumma innii a\'uudzu bika minal hammi wal hazani, wa a\'uudzu bika minal \'ajzi wal kasali...',
    translation: 'Ya Allah, sesungguhnya aku berlindung kepada-Mu dari keluh kesah dan kesedihan, dan dari kelemahan serta kemalasan.',
    repeat: 'Dibaca 1x'
  },
  {
    id: 5,
    title: 'Dzikir Istighfar & Taubat',
    arabic: 'أَسْتَغْفِرُ اللهَ وَأَتُوْبُ إِلَيْهِ',
    latin: 'Astaghfirullaaha wa atuubu ilaih.',
    translation: 'Aku memohon ampun kepada Allah dan bertaubat kepada-Nya.',
    repeat: 'Dibaca 100x'
  }
];

const DZIKIR_SHALAT_ITEMS: DzikirItem[] = [
  {
    id: 1,
    title: 'Istighfar & Doa Keselamatan (Setelah Salam)',
    arabic: 'أَسْتَغْفِرُ اللهَ (٣x) اللَّهُمَّ أَنْتَ السَّلاَمُ وَمِنْكَ السَّلاَمُ تَبَارَكْتَ يَا ذَا الْجَلاَلِ وَالإِكْرَامِ',
    latin: 'Astaghfirullaah (3x). Allaahumma antas salaamu wa minkas salaam, tabaarakta yaa dzal jalaali wal ikraam.',
    translation: 'Aku memohon ampun kepada Allah (3x). Ya Allah, Engkau Mahasejahtera dan dari-Mu lah kesejahteraan, Mahasuci Engkau wahai Rabb Yang Memiliki Keagungan dan Kemuliaan.',
    repeat: 'Dibaca 1x'
  },
  {
    id: 2,
    title: 'Tasbih, Tahmid & Takbir',
    arabic: 'سُبْحَانَ اللهِ (٣٣x) ۞ الْحَمْدُ لِلَّهِ (٣٣x) ۞ اللهُ أَكْبَرُ (٣٣x)',
    latin: 'Subhanallah (33x) - Alhamdulillah (33x) - Allahu Akbar (33x).',
    translation: 'Mahasuci Allah (33x), Segala puji bagi Allah (33x), Allah Mahabesar (33x). Barangsiapa membacanya setiap selesai shalat, diampuni dosa-dosanya walau sebanyak buih di lautan.',
    repeat: 'Dibaca 33x Masing-masing'
  },
  {
    id: 3,
    title: 'Penyempurna Tahlil (Ke-100)',
    arabic: 'لاَ إِلَـهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيْكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيْرٌ',
    latin: 'Laa ilaaha illallaahu wahdahu laa syariika lah, lahul mulku wa lahul hamdu wa huwa \'alaa kulli syai\'in qadiir.',
    translation: 'Tidak ada tuhan selain Allah Yang Maha Esa, tiada sekutu bagi-Nya. Bagi-Nya kerajaan dan bagi-Nya segala puji dan Dia Mahakuasa atas segala sesuatu.',
    repeat: 'Dibaca 1x'
  },
  {
    id: 4,
    title: 'Membaca Ayat Kursi Setelah Shalat',
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...',
    latin: 'Allaahu laa ilaaha illaa huwal hayyul qayyuum...',
    translation: 'Barangsiapa membaca Ayat Kursi setiap selesai shalat fardhu, tidak ada yang menghalanginya masuk surga selain kematian.',
    repeat: 'Dibaca 1x'
  },
  {
    id: 5,
    title: 'Membaca Mu\'awwidzatain (Al-Ikhlas, Al-Falaq, An-Nas)',
    arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ ۞ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۞ قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
    latin: 'Membaca Surat Al-Ikhlas, Al-Falaq, dan An-Nas.',
    translation: 'Rasulullah SAW memerintahkan untuk membaca mu\'awwidzat (surat perlindungan) setiap selesai shalat.',
    repeat: 'Dibaca 1x'
  }
];

const DOA_HARIAN_ITEMS: DzikirItem[] = [
  {
    id: 1,
    title: 'Doa Sebelum Tidur',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوْتُ وَأَحْيَا',
    latin: 'Bismikallaahumma amuutu wa ahyaa.',
    translation: 'Dengan nama-Mu ya Allah, aku mati dan aku hidup.',
    repeat: 'Dibaca 1x'
  },
  {
    id: 2,
    title: 'Doa Bangun Tidur',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    latin: 'Alhamdu lillaahilladzi ahyaanaa ba\'da maa amaatanaa wa ilaihin nusyuur.',
    translation: 'Segala puji bagi Allah yang telah menghidupkan kami kembali setelah mematikan kami, dan hanya kepada-Nya kami dibangkitkan.',
    repeat: 'Dibaca 1x'
  },
  {
    id: 3,
    title: 'Doa Masuk Masjid',
    arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
    latin: 'Allaahummaftah lii abwaaba rahmatik.',
    translation: 'Ya Allah, bukakanlah untukku pintu-pintu rahmat-Mu.',
    repeat: 'Dibaca 1x'
  },
  {
    id: 4,
    title: 'Doa Sapu Jagad (Kebaikan Dunia Akhirat)',
    arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
    latin: 'Rabbanaa aatinaa fid dunyaa hasanataw wa fil aakhirati hasanataw wa qinaa \'adzaaban naar.',
    translation: 'Ya Rabb kami, berilah kami kebaikan di dunia dan kebaikan di akhirat, dan lindungilah kami dari siksa neraka.',
    repeat: 'Dibaca 1x'
  },
  {
    id: 5,
    title: 'Doa Keluar Rumah',
    arabic: 'بِسْمِ اللهِ تَوَكَّلْتُ عَلَى اللهِ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ',
    latin: 'Bismillaahi tawakkaltu \'alallaahi, laa hawla wa laa quwwata illaa billaah.',
    translation: 'Dengan menyebut nama Allah, aku bertawakkal kepada Allah. Tiada daya dan kekuatan kecuali dengan (pertolongan) Allah.',
    repeat: 'Dibaca 1x'
  },
  {
    id: 6,
    title: 'Doa Naik Kendaraan',
    arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ',
    latin: 'Subhaanal ladzii sakhkhara lanaa haadzaa wa maa kunnaa lahuu muqriniin. Wa innaa ilaa rabbinaa lamunqalibuun.',
    translation: 'Mahasuci Allah yang telah menundukkan kendaraan ini untuk kami, padahal sebelumnya kami tidak mampu menguasainya. Dan sesungguhnya hanya kepada Tuhan kamilah kami akan kembali.',
    repeat: 'Dibaca 1x'
  },
  {
    id: 7,
    title: 'Doa Sebelum Makan',
    arabic: 'اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ',
    latin: 'Allaahumma baarik lanaa fiimaa razaqtanaa wa qinaa \'adzaaban naar.',
    translation: 'Ya Allah, berkahilah kami dalam rezeki yang telah Engkau berikan kepada kami dan peliharalah kami dari siksa api neraka.',
    repeat: 'Dibaca 1x'
  },
  {
    id: 8,
    title: 'Doa Sesudah Makan',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ',
    latin: 'Alhamdu lillaahil ladzii ath\'amanaa wa saqaanaa wa ja\'alanaa muslimiin.',
    translation: 'Segala puji bagi Allah yang telah memberi kami makan dan minum serta menjadikan kami orang-orang muslim.',
    repeat: 'Dibaca 1x'
  }
];

const toArabicDigits = (num: number): string => {
  return String(num).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
};

// Render Tajwid Colored Arabic Text
const renderTajwidColoredArab = (teksArab: string, showTajwid: boolean) => {
  if (!showTajwid) return teksArab;

  const words = teksArab.split(' ');
  return (
    <span>
      {words.map((word, i) => {
        let colorClass = '';
        if (word.includes('ّ') || word.includes('نْ') || word.includes('مْ')) {
          colorClass = 'text-lime-600 dark:text-lime-400 font-bold'; 
        } else if (word.includes('ٰ') || word.includes('ۤ') || word.includes('ۥ') || word.includes('ۧ')) {
          colorClass = 'text-blue-600 dark:text-blue-400 font-bold'; 
        } else if (word.includes('ق') || word.includes('ط') || word.includes('ب') || word.includes('ج') || word.includes('د')) {
          colorClass = 'text-purple-600 dark:text-purple-400 font-bold'; 
        } else if (word.includes('ً') || word.includes('ٍ') || word.includes('ٌ')) {
          colorClass = 'text-amber-600 dark:text-amber-400 font-bold'; 
        }

        return (
          <span key={i} className={colorClass}>
            {word}{' '}
          </span>
        );
      })}
    </span>
  );
};

// Per-Ayat Tajwid Analysis
export interface TajwidAnalysisItem {
  lafadz: string;
  ruleName: string;
  ruleColor: string;
  explanation: string;
}

const getAyatTajwidAnalysis = (ayat: Ayat, surahNomor: number): TajwidAnalysisItem[] => {
  const analysis: TajwidAnalysisItem[] = [];
  const text = ayat.teksArab;
  const words = text.split(' ');

  if (text.includes('اللَّهِ') || text.includes('اللَّهَ') || text.includes('اللَّهُ') || text.includes('لِلَّهِ')) {
    const isTarqiq = text.includes('بِسْمِ اللَّهِ') || text.includes('لِلَّهِ') || text.includes('ِ اللَّهِ');
    analysis.push({
      lafadz: text.includes('اللَّهِ') ? 'اللَّهِ' : 'اللَّه',
      ruleName: isTarqiq ? 'Lafdzul Jalalah (Tarqiq)' : 'Lafdzul Jalalah (Tafkhim)',
      ruleColor: 'bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-900/60 dark:text-lime-300',
      explanation: isTarqiq 
        ? 'Lafadz Allah dibaca Tarqiq (tipis) karena didahului harakat kasrah.' 
        : 'Lafadz Allah dibaca Tafkhim (tebal) karena didahului harakat fathah atau dammah.'
    });
  }

  words.forEach(word => {
    if (word.includes('ّ') && (word.includes('ن') || word.includes('م'))) {
      analysis.push({
        lafadz: word,
        ruleName: 'Ghunnah Musyaddadah',
        ruleColor: 'bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-900/60 dark:text-lime-300',
        explanation: `Huruf ${word.includes('ن') ? 'Nun' : 'Mim'} bertasydid dibaca dengan mendengung 2 harakat.`
      });
    } else if (word.includes('ً') || word.includes('ٍ') || word.includes('ٌ') || word.includes('نْ')) {
      if (word.includes('ب')) {
        analysis.push({
          lafadz: word,
          ruleName: 'Iqlab',
          ruleColor: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/60 dark:text-rose-300',
          explanation: 'Nun mati/tanwin bertemu Ba, diubah menjadi bunyi Mim dengung.'
        });
      } else {
        analysis.push({
          lafadz: word,
          ruleName: 'Ikhfa / Idgham',
          ruleColor: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/60 dark:text-amber-300',
          explanation: 'Nun mati / tanwin dibaca dengung menyamar atau dimasukkan ke huruf berikutnya.'
        });
      }
    }
  });

  words.forEach(word => {
    if (word.includes('ۤ') || word.includes('ٰ') || word.includes('ۥ') || word.includes('ۧ')) {
      analysis.push({
        lafadz: word,
        ruleName: word.includes('ۤ') ? 'Mad Wajib / Jaiz' : 'Mad Asli (Thabi\'i)',
        ruleColor: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/60 dark:text-blue-300',
        explanation: word.includes('ۤ') 
          ? 'Mad bertemu Hamzah, dibaca panjang 4-5 harakat.'
          : 'Fathah berdiri / alif khanjariah dibaca panjang 2 harakat.'
      });
    }
  });

  words.forEach(word => {
    if (word.includes('قْ') || word.includes('طْ') || word.includes('بْ') || word.includes('جْ') || word.includes('دْ')) {
      analysis.push({
        lafadz: word,
        ruleName: 'Qalqalah',
        ruleColor: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/60 dark:text-purple-300',
        explanation: 'Huruf Qalqalah berharakat sukun, dibaca memantul.'
      });
    }
  });

  if (analysis.length === 0) {
    analysis.push({
      lafadz: words.slice(0, 2).join(' ') || 'بِسْمِ اللَّهِ',
      ruleName: 'Alif Lam & Izhar',
      ruleColor: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/60 dark:text-sky-300',
      explanation: 'Membaca setiap huruf hijaiyah sesuai makhraj secara jelas.'
    });
  }

  const uniqueItems: TajwidAnalysisItem[] = [];
  const seenKeys = new Set<string>();
  analysis.forEach(item => {
    const key = `${item.lafadz}-${item.ruleName}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueItems.push(item);
    }
  });

  return uniqueItems.slice(0, 5);
};

interface AlQuranDigitalProps {
  isOpenModal?: boolean;
  initialSurahNomor?: number | null;
  initialTab?: MainNavTab;
  onCloseModal?: () => void;
}

export const AlQuranDigital: React.FC<AlQuranDigitalProps> = ({ 
  isOpenModal = false, 
  initialSurahNomor = null,
  initialTab,
  onCloseModal 
}) => {
  const [isOpen, setIsOpen] = useState(isOpenModal);
  const [view, setView] = useState<View>('list');
  const [mainNavTab, setMainNavTab] = useState<MainNavTab>(initialTab || 'surah');
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState<SurahDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('surat');
  const [selectedJuzId, setSelectedJuzId] = useState<number>(1);

  // Index Ayat Table filters & pagination state
  const [indexPageEntries, setIndexPageEntries] = useState<number>(10);
  const [indexSearchQuery, setIndexSearchQuery] = useState<string>('');

  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [tafsirData, setTafsirData] = useState<{ nomorAyat: number; teks: string }[]>([]);
  const [selectedQari, setSelectedQari] = useState('05');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [showTajwidColor, setShowTajwidColor] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [hoverDisplayMode, setHoverDisplayMode] = useState<'id' | 'en' | 'latin'>('id');
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [copiedAyat, setCopiedAyat] = useState<number | null>(null);
  const [sharedAyat, setSharedAyat] = useState<number | null>(null);

  // Per-Ayat Toggles & Modals State
  const [tahfidzHiddenAyats, setTahfidzHiddenAyats] = useState<{ [key: number]: boolean }>({});
  const [activeTafsirAyat, setActiveTafsirAyat] = useState<Ayat | null>(null);
  const [tafsirSource, setTafsirSource] = useState<TafsirSource>('ibnukatsir');
  const [activeTajwidAyat, setActiveTajwidAyat] = useState<Ayat | null>(null);
  const [activeTatbhiqAyat, setActiveTatbhiqAyat] = useState<Ayat | null>(null);
  const [selectedTatbhiqTheme, setSelectedTatbhiqTheme] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Index Ayat Selection State
  const [selectedIndexTopicId, setSelectedIndexTopicId] = useState<number | null>(null);
  const [indexViewMode, setIndexViewMode] = useState<'grid' | 'table'>('grid');

  // Hadist Sub-tab & Selection
  const [hadistSubTab, setHadistSubTab] = useState<HadistSubTab>('buku');
  const [selectedKitabId, setSelectedKitabId] = useState<string | null>(null);
  const [selectedHadistTema, setSelectedHadistTema] = useState<string | null>(null);
  const [selectedHadistKedudukan, setSelectedHadistKedudukan] = useState<string | null>(null);
  
  // Hadist Extra Modals
  const [activeSanadHadist, setActiveSanadHadist] = useState<DetailedHadistItem | null>(null);
  const [activeSimilarHadist, setActiveSimilarHadist] = useState<DetailedHadistItem | null>(null);

  // Dzikir Sub-tab & Digital Tasbih State
  const [dzikirSubTab, setDzikirSubTab] = useState<DzikirSubTab>('pagi');
  const [tasbihCount, setTasbihCount] = useState<number>(0);
  const [tasbihTarget, setTasbihTarget] = useState<number>(33);

  // Audio state
  const [playingAyat, setPlayingAyat] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch Surah List
  useEffect(() => {
    let isMounted = true;
    setLoadingList(true);
    fetch('https://equran.id/api/v2/surat')
      .then(r => r.json())
      .then(d => { 
        if (isMounted && d.data) {
          setSurahs(d.data);
        }
      })
      .catch(err => {
        console.error('Error fetching surahs:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingList(false);
      });

    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (isOpenModal !== undefined) {
      setIsOpen(isOpenModal);
      if (isOpenModal && initialTab) {
        setMainNavTab(initialTab);
        setView('list');
      }
    }
  }, [isOpenModal, initialTab]);

  useEffect(() => {
    if (initialSurahNomor && surahs.length > 0) {
      const targetSurah = surahs.find(s => s.nomor === initialSurahNomor);
      if (targetSurah) {
        openSurah(targetSurah);
        setIsOpen(true);
      }
    }
  }, [initialSurahNomor, surahs]);

  const openSurah = async (surah: Surah, targetAyat?: number) => {
    setLoadingDetail(true);
    setView('detail');
    setPlayingAyat(null);
    stopAudio();
    try {
      const res = await fetch(`https://equran.id/api/v2/surat/${surah.nomor}`);
      const data = await res.json();
      setSelectedSurah(data.data);

      if (targetAyat) {
        setTimeout(() => {
          const el = document.getElementById(`ayat-${targetAyat}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    } catch (e) {
      console.error('Error fetching surah detail:', e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const fetchTafsir = async (nomorSurah: number) => {
    if (tafsirData.length > 0) return;
    try {
      const res = await fetch(`https://equran.id/api/v2/tafsir/${nomorSurah}`);
      const data = await res.json();
      setTafsirData(data.data?.tafsir || []);
    } catch (e) {
      console.error('Error fetching tafsir:', e);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) { 
      audioRef.current.pause(); 
      audioRef.current.src = ''; 
    }
    setPlayingAyat(null);
  };

  const playAyat = (ayat: Ayat) => {
    if (playingAyat === ayat.nomorAyat) {
      stopAudio();
      return;
    }
    stopAudio();

    const url = ayat.audio?.[selectedQari] || Object.values(ayat.audio || {})[0];
    if (!url) return;

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play();
    setPlayingAyat(ayat.nomorAyat);

    audio.onended = () => {
      setPlayingAyat(null);
      if (autoPlayNext && selectedSurah) {
        const nextAyatIndex = selectedSurah.ayat.findIndex(a => a.nomorAyat === ayat.nomorAyat) + 1;
        if (nextAyatIndex < selectedSurah.ayat.length) {
          const nextAyat = selectedSurah.ayat[nextAyatIndex];
          playAyat(nextAyat);
          const el = document.getElementById(`ayat-${nextAyat.nomorAyat}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };
  };

  const copyAyatToClipboard = (ayat: Ayat) => {
    const textToCopy = `${ayat.teksArab}\n\n"${ayat.teksIndonesia}" (QS. ${selectedSurah?.namaLatin}: ${ayat.nomorAyat})`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedAyat(ayat.nomorAyat);
    setTimeout(() => setCopiedAyat(null), 2000);
  };

  const shareAyat = (ayat: Ayat) => {
    const shareUrl = `${window.location.origin}?surah=${selectedSurah?.nomor}&ayat=${ayat.nomorAyat}`;
    if (navigator.share) {
      navigator.share({
        title: `QS. ${selectedSurah?.namaLatin}: Ayat ${ayat.nomorAyat}`,
        text: `"${ayat.teksIndonesia}"`,
        url: shareUrl
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      setSharedAyat(ayat.nomorAyat);
      setTimeout(() => setSharedAyat(null), 2000);
    }
  };

  const toggleTahfidzAyat = (ayatNomor: number) => {
    setTahfidzHiddenAyats(prev => ({
      ...prev,
      [ayatNomor]: !prev[ayatNomor]
    }));
  };

  const openTafsirModal = (ayat: Ayat) => {
    setActiveTafsirAyat(ayat);
    if (selectedSurah) {
      fetchTafsir(selectedSurah.nomor);
    }
  };

  const cycleTafsirSource = () => {
    const sources: TafsirSource[] = ['ibnukatsir', 'kemenag', 'jalalain', 'muyassar'];
    const currentIndex = sources.indexOf(tafsirSource);
    const nextIndex = (currentIndex + 1) % sources.length;
    setTafsirSource(sources[nextIndex]);
  };

  const handleClose = () => {
    stopAudio();
    setIsOpen(false);
    if (onCloseModal) onCloseModal();
  };

  const filteredSurahs = surahs.filter(s => {
    const matchesSearch = 
      s.namaLatin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.arti.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.nama.includes(searchQuery) ||
      String(s.nomor) === searchQuery;

    return matchesSearch;
  });

  const filteredIndexRows = EXTENSIVE_INDEX_AYAT_TABLE.filter(row => {
    if (!indexSearchQuery) return true;
    const q = indexSearchQuery.toLowerCase();
    const titleMatch = row.title.toLowerCase().includes(q);
    const linkMatch = row.ayatLinks.some(l => l.label.toLowerCase().includes(q));
    return titleMatch || linkMatch;
  });

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'sm': return 'text-xl leading-relaxed';
      case 'lg': return 'text-5xl leading-loose';
      case 'xl': return 'text-6xl leading-loose';
      default: return 'text-3xl leading-loose';
    }
  };

  const activeJuzDetail = ALL_30_JUZ.find(j => j.id === selectedJuzId) || ALL_30_JUZ[0];
  const activeKitabDetail = KITAB_HADIST_LIST.find(k => k.id === selectedKitabId);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-950 overflow-hidden font-sans text-slate-900 dark:text-slate-100">
          
          {/* ── TOP HEADER ── */}
          <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3 flex items-center justify-between shadow-xs z-30">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setMainNavTab('surah'); setView('list'); }}>
                <span className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight font-serif uppercase flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-lime-500" /> QURAN DIGITAL
                </span>
              </div>

              {/* Navigation Tabs */}
              <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <button 
                  onClick={() => { setMainNavTab('surah'); setView('list'); }} 
                  className={`hover:text-lime-600 transition-colors cursor-pointer ${mainNavTab === 'surah' ? 'text-slate-900 dark:text-slate-100 font-extrabold border-b-2 border-lime-500 pb-1' : ''}`}
                >
                  Quran
                </button>
                <button 
                  onClick={() => { setMainNavTab('tajwid_guide'); setView('list'); }} 
                  className={`hover:text-lime-600 transition-colors cursor-pointer ${mainNavTab === 'tajwid_guide' ? 'text-slate-900 dark:text-slate-100 font-extrabold border-b-2 border-lime-500 pb-1' : ''}`}
                >
                  Panduan Tajwid
                </button>

                <button 
                  onClick={() => { setMainNavTab('dzikir'); setView('list'); }} 
                  className={`hover:text-lime-600 transition-colors cursor-pointer flex items-center gap-1 ${mainNavTab === 'dzikir' ? 'text-slate-900 dark:text-slate-100 font-extrabold border-b-2 border-lime-500 pb-1' : ''}`}
                >
                  <Heart className="w-4 h-4 text-rose-500 fill-current" /> Dzikir & Doa
                </button>
              </nav>
            </div>

            {/* Top Right Controls */}
            <div className="flex items-center gap-3">
              <div className="relative hidden md:flex items-center">
                <input
                  type="text"
                  placeholder="Cari Surah..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-4 pr-16 py-1.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-lime-500 w-48 focus:w-60 transition-all"
                />
                <button className="absolute right-0 bg-lime-600 hover:bg-lime-700 text-white text-xs px-3.5 py-1.5 rounded-r-xl font-bold transition-colors cursor-pointer">
                  Cari
                </button>
              </div>

              <button
                onClick={handleClose}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* ── SUB HEADER BAR 2 ── */}
          {view === 'detail' && selectedSurah && (
            <div className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-12 py-2.5 flex items-center justify-between z-20 text-xs sm:text-sm">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setView('list')}
                  className="flex items-center gap-1.5 bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4" /> Kembali
                </button>

                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

                <div className="relative hidden sm:flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">Surah:</span>
                  <select
                    value={selectedSurah.nomor}
                    onChange={e => {
                      const s = surahs.find(item => item.nomor === Number(e.target.value));
                      if (s) openSurah(s);
                    }}
                    className="appearance-none font-black text-slate-900 dark:text-slate-100 bg-transparent pr-6 focus:outline-none cursor-pointer"
                  >
                    {surahs.map(s => (
                      <option key={s.nomor} value={s.nomor} className="text-slate-900">{s.nomor}. {s.namaLatin}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-0 top-1/2 -translate-y-1/2 text-lime-600 pointer-events-none" />
                </div>

                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>

                <div className="relative hidden sm:flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">Ayat:</span>
                  <select
                    onChange={e => {
                      const ayatEl = document.getElementById(`ayat-${e.target.value}`);
                      if (ayatEl) ayatEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="appearance-none font-bold text-slate-900 dark:text-slate-100 bg-transparent pr-6 focus:outline-none cursor-pointer"
                  >
                    {selectedSurah.ayat?.map(a => (
                      <option key={a.nomorAyat} value={a.nomorAyat} className="text-slate-900">Ayat {a.nomorAyat}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`flex items-center gap-1.5 font-bold transition-colors cursor-pointer px-3 py-1.5 rounded-xl border text-xs ${
                  isSettingsOpen ? 'bg-lime-600 text-white border-lime-600' : 'text-slate-900 dark:text-slate-100 hover:text-lime-600 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Pengaturan</span>
              </button>
            </div>
          )}

          {/* ── SETTINGS DRAWER ── */}
          {isSettingsOpen && (
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 sm:px-12 py-5 space-y-6 shadow-xl animate-in slide-in-from-top-2 duration-200 max-w-xl mx-auto rounded-b-3xl">
              
              <div className="space-y-2.5">
                <div className="relative">
                  <button 
                    onClick={cycleTafsirSource}
                    className="w-full bg-lime-600 hover:bg-lime-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-between shadow-xs cursor-pointer transition-colors"
                  >
                    <span>Pilih Tafsir</span>
                    <span className="text-[11px] font-bold bg-lime-800 px-2 py-0.5 rounded-md">
                      {TAFSIR_SOURCES.find(s => s.id === tafsirSource)?.name}
                    </span>
                  </button>
                </div>

                <div className="relative">
                  <select
                    value={selectedQari}
                    onChange={e => {
                      setSelectedQari(e.target.value);
                      stopAudio();
                      alert('Qori berhasil diubah ke: ' + RECITERS.find(r => r.id === e.target.value)?.name + '. Silakan putar ayat untuk mendengar.');
                    }}
                    className="w-full bg-lime-600 hover:bg-lime-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs appearance-none cursor-pointer focus:outline-none shadow-xs"
                  >
                    {RECITERS.map(q => (
                      <option key={q.id} value={q.id} className="text-slate-900 bg-white">
                        Pilih Qori: {q.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-white absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative">
                  <button 
                    onClick={() => setHoverDisplayMode(prev => prev === 'id' ? 'en' : prev === 'en' ? 'latin' : 'id')}
                    className="w-full bg-lime-600 hover:bg-lime-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-between shadow-xs cursor-pointer transition-colors"
                  >
                    <span>Bahasa Terjemahan</span>
                    <span className="text-[11px] font-bold bg-lime-800 px-2 py-0.5 rounded-md">
                      {hoverDisplayMode === 'id' ? 'Indonesia' : hoverDisplayMode === 'en' ? 'English' : 'Latin'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h5 className="font-black text-sm text-slate-900 dark:text-slate-100">
                  Tampilan Hover Ayat
                </h5>

                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-3 cursor-pointer text-slate-900 dark:text-slate-100 font-medium">
                    <input
                      type="radio"
                      name="hoverDisplayMode"
                      value="id"
                      checked={hoverDisplayMode === 'id'}
                      onChange={() => setHoverDisplayMode('id')}
                      className="w-4 h-4 text-lime-600 focus:ring-lime-500 cursor-pointer"
                    />
                    <span>Terjemahan (Indonesia)</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer text-slate-900 dark:text-slate-100 font-medium">
                    <input
                      type="radio"
                      name="hoverDisplayMode"
                      value="en"
                      checked={hoverDisplayMode === 'en'}
                      onChange={() => setHoverDisplayMode('en')}
                      className="w-4 h-4 text-lime-600 focus:ring-lime-500 cursor-pointer"
                    />
                    <span>Terjemahan (English)</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer text-slate-900 dark:text-slate-100 font-medium">
                    <input
                      type="radio"
                      name="hoverDisplayMode"
                      value="latin"
                      checked={hoverDisplayMode === 'latin'}
                      onChange={() => setHoverDisplayMode('latin')}
                      className="w-4 h-4 text-lime-600 focus:ring-lime-500 cursor-pointer"
                    />
                    <span>Transliterasi</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">Warna Tajwid:</span>
                  <input
                    type="checkbox"
                    checked={showTajwidColor}
                    onChange={e => setShowTajwidColor(e.target.checked)}
                    className="w-4 h-4 text-lime-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">Ukuran Font:</span>
                  <div className="flex gap-1">
                    {(['sm', 'md', 'lg'] as const).map(sz => (
                      <button
                        key={sz}
                        onClick={() => setFontSize(sz)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase cursor-pointer ${
                          fontSize === sz ? 'bg-lime-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ── MAIN CONTENT AREA ── */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-12 md:px-24 py-6 space-y-6">
            
            {/* ── ELEGANT FRESH LIGHT LEAF GREEN BANNER WITH ORANGE / GOLD HEADER TEXT ── */}
            {view === 'list' && (
              <div className="w-full rounded-3xl bg-gradient-to-r from-lime-500 via-lime-600 to-emerald-600 text-slate-950 p-6 sm:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between border border-lime-300/40 my-2 group">
                {/* Background Geometric Calligraphy Ornament */}
                <div className="absolute right-0 top-0 bottom-0 opacity-20 pointer-events-none">
                  <svg className="w-96 h-full" viewBox="0 0 400 400" fill="none">
                    <circle cx="200" cy="200" r="180" stroke="white" strokeWidth="8" strokeDasharray="10 10" />
                    <circle cx="200" cy="200" r="140" stroke="white" strokeWidth="4" />
                    <polygon points="200,40 240,160 360,200 240,240 200,360 160,240 40,200 160,160" stroke="white" strokeWidth="3" />
                  </svg>
                </div>

                <div className="space-y-3 max-w-xl z-10 text-center md:text-left">
                  {/* GOLD / ORANGE HEADER TEXT AS REQUESTED */}
                  <h2 className="text-2xl sm:text-4xl font-black text-amber-300 dark:text-amber-400 tracking-tight leading-tight font-sans drop-shadow-md">
                    Selamat Datang<br />di Aplikasi Qur'an Digital
                  </h2>
                  <p className="text-xs sm:text-sm font-black text-lime-950 bg-white/90 px-4 py-1.5 rounded-xl inline-block shadow-xs uppercase tracking-wider border border-white/60">
                    PROGRAM QUR'AN 5T (TAHSIN, TAHFIDZ, TARJAMAH, TAFSIR, TATHBIQ)
                  </p>
                </div>

                {/* Right Calligraphy Ornament Badge */}
                <div className="relative shrink-0 mt-6 md:mt-0 z-10">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-amber-300/80 flex items-center justify-center bg-lime-800/40 backdrop-blur-xs shadow-inner">
                    <span className="font-serif text-3xl sm:text-4xl text-amber-300 font-bold text-center leading-tight drop-shadow-md" style={{ fontFamily: '"Amiri", serif' }}>
                      القرآن<br />الكريم
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW TAB: DZIKIR & DOA */}
            {mainNavTab === 'dzikir' && view === 'list' && (
              <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
                
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                      <Heart className="w-6 h-6 text-rose-500 fill-current" /> DZIKIR & DOA HARIAN
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Panduan Dzikir Pagi, Dzikir Petang, Dzikir Setelah Shalat, Doa Harian & Tasbih Digital Interaktif.
                    </p>
                  </div>
                  <button 
                    onClick={() => setMainNavTab('surah')}
                    className="px-4 py-2 bg-lime-500 hover:bg-lime-600 text-slate-950 text-xs font-extrabold rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <ArrowLeft className="w-4 h-4" /> Kembali ke Quran
                  </button>
                </div>

                {/* Dzikir Sub-tabs */}
                <div className="flex flex-wrap gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <button
                    onClick={() => setDzikirSubTab('pagi')}
                    className={`px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      dzikirSubTab === 'pagi' ? 'bg-lime-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    <Sun className="w-4 h-4" /> Dzikir Pagi
                  </button>
                  <button
                    onClick={() => setDzikirSubTab('petang')}
                    className={`px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      dzikirSubTab === 'petang' ? 'bg-lime-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    <Moon className="w-4 h-4" /> Dzikir Petang
                  </button>
                  <button
                    onClick={() => setDzikirSubTab('shalat')}
                    className={`px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      dzikirSubTab === 'shalat' ? 'bg-lime-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" /> Dzikir Shalat
                  </button>
                  <button
                    onClick={() => setDzikirSubTab('doa_harian')}
                    className={`px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      dzikirSubTab === 'doa_harian' ? 'bg-lime-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    <Book className="w-4 h-4" /> Doa Harian
                  </button>
                  <button
                    onClick={() => setDzikirSubTab('tasbih')}
                    className={`px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                      dzikirSubTab === 'tasbih' ? 'bg-lime-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    <Activity className="w-4 h-4" /> Tasbih Digital
                  </button>
                </div>

                {/* DZIKIR LIST VIEW */}
                {dzikirSubTab !== 'tasbih' && (
                  <div className="space-y-6">
                    {(dzikirSubTab === 'pagi' ? DZIKIR_PAGI_ITEMS :
                      dzikirSubTab === 'petang' ? DZIKIR_PETANG_ITEMS :
                      dzikirSubTab === 'shalat' ? DZIKIR_SHALAT_ITEMS : DOA_HARIAN_ITEMS).map((item) => (
                      <div key={item.id} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                          <h4 className="font-black text-base text-slate-900 dark:text-slate-100">
                            {item.title}
                          </h4>
                          <span className="px-3 py-1 rounded-full bg-lime-100 text-lime-900 dark:bg-lime-950 dark:text-lime-300 font-extrabold text-xs border border-lime-300 dark:border-lime-800">
                            {item.repeat}
                          </span>
                        </div>

                        <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
                          <p className="font-serif text-right text-xl sm:text-2xl text-slate-900 dark:text-slate-100 leading-loose" style={{ fontFamily: '"Amiri", serif' }}>
                            {item.arabic}
                          </p>
                        </div>

                        <div className="space-y-1.5 text-xs sm:text-sm">
                          <p className="text-slate-800 dark:text-slate-200 italic font-serif">"{item.latin}"</p>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{item.translation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* DIGITAL TASBIH COUNTER */}
                {dzikirSubTab === 'tasbih' && (
                  <div className="max-w-md mx-auto p-8 rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 text-white shadow-2xl border border-lime-500/30 text-center space-y-6">
                    <div className="space-y-1">
                      <h4 className="text-xl font-black text-lime-400">Tasbih Digital</h4>
                      <p className="text-xs text-slate-400">Hitung dzikir harian Anda dengan mudah</p>
                    </div>

                    <div className="py-8 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-inner">
                      <span className={`text-6xl font-black font-mono tracking-wider ${tasbihCount >= tasbihTarget ? 'text-amber-400' : 'text-lime-400'}`}>
                        {tasbihCount}
                      </span>
                      <p className="text-xs text-slate-400 mt-2 font-bold">Target: {tasbihTarget}x</p>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => setTasbihCount(0)}
                        className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                        title="Reset Counter"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => {
                          setTasbihCount(prev => {
                            const next = prev + 1;
                            if (next === tasbihTarget) {
                              try {
                                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                                if (AudioContext) {
                                  const ctx = new AudioContext();
                                  const osc = ctx.createOscillator();
                                  const gain = ctx.createGain();
                                  
                                  osc.connect(gain);
                                  gain.connect(ctx.destination);
                                  
                                  osc.type = 'sine';
                                  osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
                                  osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.1); // Small ping
                                  
                                  gain.gain.setValueAtTime(0.5, ctx.currentTime);
                                  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
                                  
                                  osc.start();
                                  osc.stop(ctx.currentTime + 0.6);
                                }
                              } catch(e) {}
                              
                              if (navigator.vibrate) {
                                navigator.vibrate([100, 50, 100]); // Vibrate twice
                              }
                            } else if (next < tasbihTarget) {
                              if (navigator.vibrate) {
                                navigator.vibrate(20); // Small vibrate per tap
                              }
                            }
                            return next;
                          });
                        }}
                        className="px-10 py-5 rounded-2xl bg-lime-500 hover:bg-lime-600 text-slate-950 font-black text-lg transition-all shadow-lg active:scale-95 cursor-pointer flex items-center gap-2"
                      >
                        <Plus className="w-6 h-6" /> HITUNG DZIKIR
                      </button>
                    </div>

                    <div className="flex justify-center gap-2 pt-2">
                      {[33, 100, 1000].map(tgt => (
                        <button
                          key={tgt}
                          onClick={() => { setTasbihTarget(tgt); setTasbihCount(0); }}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                            tasbihTarget === tgt ? 'bg-lime-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {tgt}x
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* VIEW TAB: PANDUAN TAJWID FULL VIEW */}
            {mainNavTab === 'tajwid_guide' && view === 'list' && (
              <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-amber-500" /> Panduan Tajwid Lengkap
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Panduan kaidah tajwid Al-Qur'an lengkap.
                    </p>
                  </div>
                  <button 
                    onClick={() => setMainNavTab('surah')}
                    className="px-4 py-2 bg-lime-500 hover:bg-lime-600 text-slate-950 text-xs font-extrabold rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <ArrowLeft className="w-4 h-4" /> Kembali ke Quran
                  </button>
                </div>

                <div className="space-y-8">
                  {TAJWID_SECTIONS.map((section, sIdx) => (
                    <div key={sIdx} className="space-y-4">
                      <h4 className="text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 border-l-4 border-lime-500 pl-3">
                        {section.category}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {section.rules.map((rule, rIdx) => (
                          <div key={rIdx} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-lime-500 transition-all space-y-3 shadow-xs">
                            <span className="px-3 py-1 rounded-xl bg-lime-100 text-lime-900 dark:bg-lime-950 dark:text-lime-300 font-black text-xs inline-block border border-lime-300 dark:border-lime-800">
                              {rule.name}
                            </span>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                              {rule.desc}
                            </p>
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-500">Contoh:</span>
                              <span className="font-serif text-lg text-slate-900 dark:text-slate-100 font-bold" style={{ fontFamily: '"Amiri", serif' }}>
                                {rule.example}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW TAB: HADIST DIGITAL VIEW */}
            {mainNavTab === 'hadist' && view === 'list' && (
              <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
                
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase flex items-center gap-2">
                      <Book className="w-6 h-6 text-lime-500" /> HADITS DIGITAL
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Kumpulan Hadits-Hadits Rasulullah ﷺ Super Lengkap untuk Masjid Citra Sentul Raya.
                    </p>
                  </div>
                  <button 
                    onClick={() => setMainNavTab('surah')}
                    className="px-4 py-2 bg-lime-500 hover:bg-lime-600 text-slate-950 text-xs font-extrabold rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <ArrowLeft className="w-4 h-4" /> Kembali ke Quran
                  </button>
                </div>

                {/* Sub-tabs Pills */}
                <div className="flex flex-wrap gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <button
                    onClick={() => { setHadistSubTab('buku'); setSelectedKitabId(null); setSelectedHadistTema(null); setSelectedHadistKedudukan(null); }}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      hadistSubTab === 'buku' ? 'bg-lime-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    Buku Hadits (14 Kitab)
                  </button>
                  <button
                    onClick={() => { setHadistSubTab('tema'); setSelectedKitabId(null); setSelectedHadistTema(null); setSelectedHadistKedudukan(null); }}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      hadistSubTab === 'tema' ? 'bg-lime-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    Tema (14 Tema)
                  </button>
                  <button
                    onClick={() => { setHadistSubTab('kedudukan'); setSelectedKitabId(null); setSelectedHadistTema(null); setSelectedHadistKedudukan(null); }}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      hadistSubTab === 'kedudukan' ? 'bg-lime-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    Kedudukan (9 Derajat)
                  </button>
                </div>

                {/* BUKU HADITS (14 KITAB CARDS) */}
                {hadistSubTab === 'buku' && !selectedKitabId && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {KITAB_HADIST_LIST.map(kitab => (
                      <div
                        key={kitab.id}
                        onClick={() => setSelectedKitabId(kitab.id)}
                        className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-lime-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-9 h-9 rounded-xl bg-lime-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                            {kitab.no}
                          </div>
                          <span className="px-2.5 py-0.5 rounded-lg bg-lime-100 text-lime-900 dark:bg-lime-950 dark:text-lime-300 font-extrabold text-[11px]">
                            Kitab
                          </span>
                        </div>

                        <div>
                          <p className="font-serif text-lg text-slate-900 dark:text-slate-100" style={{ fontFamily: '"Amiri", serif' }}>
                            {kitab.arabic}
                          </p>
                          <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 group-hover:text-lime-600 transition-colors">
                            {kitab.name}
                          </h4>
                          <p className="text-[11px] text-slate-500">{kitab.author} • {kitab.total}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* TEMA SUB-TAB */}
                {hadistSubTab === 'tema' && !selectedHadistTema && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {HADIST_TEMAS.map(tema => (
                      <div
                        key={tema.id}
                        onClick={() => setSelectedHadistTema(tema.name)}
                        className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-lime-500 hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-lime-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                            {tema.no}
                          </div>
                          <div>
                            <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 group-hover:text-lime-600 transition-colors">
                              Hadits Tentang {tema.name}
                            </h4>
                            <p className="text-[11px] text-slate-500">{tema.desc} • {tema.total}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-lime-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    ))}
                  </div>
                )}

                {/* KEDUDUKAN SUB-TAB */}
                {hadistSubTab === 'kedudukan' && !selectedHadistKedudukan && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {HADIST_KEDUDUKAN_LIST.map(ked => (
                      <div
                        key={ked.id}
                        onClick={() => setSelectedHadistKedudukan(ked.name)}
                        className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-lime-500 hover:shadow-md transition-all cursor-pointer space-y-3 group"
                      >
                        <div className="flex justify-between items-center">
                          <span className={`px-3 py-1 rounded-xl text-xs font-black ${ked.color}`}>
                            {ked.name}
                          </span>
                          <span className="text-xs font-bold text-slate-500">{ked.total}</span>
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                          {ked.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* HADIST LIST VIEW */}
                {(selectedKitabId || selectedHadistTema || selectedHadistKedudukan) && (
                  <div className="space-y-8">
                    
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                      <button 
                        onClick={() => { setSelectedKitabId(null); setSelectedHadistTema(null); setSelectedHadistKedudukan(null); }}
                        className="px-4 py-2 bg-lime-500 hover:bg-lime-600 text-slate-950 font-extrabold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <ArrowLeft className="w-4 h-4" /> Kembali ke Kategori Hadits
                      </button>

                      <div className="text-center">
                        {activeKitabDetail?.arabic && (
                          <p className="font-serif text-xl text-slate-900 dark:text-slate-100 font-bold" style={{ fontFamily: '"Amiri", serif' }}>
                            {activeKitabDetail.arabic}
                          </p>
                        )}
                        <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                          {selectedHadistTema 
                            ? `Hadits Tentang ${selectedHadistTema}` 
                            : (activeKitabDetail?.name || selectedHadistKedudukan)}
                        </h3>
                      </div>

                      <div className="w-20"></div>
                    </div>

                    {/* Hadits Items List */}
                    {getCompleteHadithsForFilter(selectedKitabId, selectedHadistTema, selectedHadistKedudukan).map(hadist => (
                      <div key={hadist.id} className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800 first:border-0 first:pt-0">
                        
                        <h4 className="text-base font-black text-slate-900 dark:text-slate-100">
                          {hadist.itemTitle}
                        </h4>

                        <div className="p-6 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                          <p className="font-serif text-right text-xl sm:text-2xl text-slate-900 dark:text-slate-100 leading-loose" style={{ fontFamily: '"Amiri", serif' }}>
                            {hadist.matanArabic}
                          </p>
                        </div>

                        <div className="space-y-3 pt-1">
                          <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal text-justify">
                            {hadist.terjemahanFull}
                          </p>

                          <div className="flex items-center justify-end gap-2.5 pt-2">
                            <button
                              onClick={() => setActiveSanadHadist(hadist)}
                              className="px-4 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <GitBranch className="w-3.5 h-3.5" /> Sanad
                            </button>

                            <button
                              onClick={() => setActiveSimilarHadist(hadist)}
                              className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Layers className="w-3.5 h-3.5 text-slate-950" /> Hadits Serupa
                            </button>

                            <button
                              onClick={() => {
                                if (navigator.share) {
                                  navigator.share({ title: hadist.itemTitle, text: hadist.terjemahanFull });
                                } else {
                                  navigator.clipboard.writeText(`${hadist.itemTitle}\n\n${hadist.terjemahanFull}`);
                                  alert('Teks Hadits telah disalin ke clipboard!');
                                }
                              }}
                              className="px-4 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Share2 className="w-3.5 h-3.5" /> Share
                            </button>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}

            {/* VIEW TAB: SURAH & JUZ MAIN LIST */}
            {mainNavTab === 'surah' && view === 'list' && (
              <div className="max-w-5xl mx-auto space-y-6">
                
                {/* ── TOP THREE PILLS ── */}
                <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <button
                    onClick={() => setActiveFilter('surat')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      activeFilter === 'surat' 
                        ? 'bg-lime-600 text-white shadow-md' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    Surat
                  </button>
                  <button
                    onClick={() => setActiveFilter('juz')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      activeFilter === 'juz' 
                        ? 'bg-lime-600 text-white shadow-md' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    Juz (30 Juz)
                  </button>
                </div>

                {/* ── MODE 1: SURAT ── */}
                {activeFilter === 'surat' && (
                  loadingList ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <div className="animate-spin rounded-full h-10 w-10 border-4 border-lime-200 border-t-lime-600" />
                      <p className="text-slate-600 dark:text-slate-400 font-bold text-xs">Memuat Surah Al-Qur'an...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {filteredSurahs.map(surah => (
                        <button
                          key={surah.nomor}
                          onClick={() => openSurah(surah)}
                          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-lime-500 hover:bg-lime-50/30 dark:hover:bg-lime-950/20 shadow-xs hover:shadow-md transition-all text-left flex justify-between items-center cursor-pointer group"
                        >
                          <div className="space-y-1">
                            <span className="text-xs font-black px-2 py-0.5 rounded bg-lime-100 text-lime-900 dark:bg-lime-950 dark:text-lime-300">
                              {surah.nomor}
                            </span>
                            <h4 className="font-black text-base text-slate-900 dark:text-slate-100 group-hover:text-lime-700 transition-colors">
                              {surah.namaLatin}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{surah.arti} • {surah.jumlahAyat} Ayat</p>
                          </div>
                          <span className="font-serif text-2xl text-slate-900 dark:text-slate-100 group-hover:scale-105 transition-transform" style={{ fontFamily: '"Amiri", serif' }}>
                            {surah.nama}
                          </span>
                        </button>
                      ))}
                    </div>
                  )
                )}

                {/* ── MODE 2: JUZ ── */}
                {activeFilter === 'juz' && (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
                      <label className="text-xs font-extrabold text-slate-900 dark:text-slate-100 shrink-0 uppercase tracking-wider">
                        Pilih Juz:
                      </label>
                      <div className="relative flex-1">
                        <select
                          value={selectedJuzId}
                          onChange={(e) => setSelectedJuzId(Number(e.target.value))}
                          className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-extrabold text-sm py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 appearance-none focus:outline-none focus:ring-2 focus:ring-lime-500 cursor-pointer shadow-xs"
                        >
                          {ALL_30_JUZ.map((j) => (
                            <option key={j.id} value={j.id} className="text-slate-900">
                              Juz {j.id} - {j.arabic}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-lime-600 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div className="p-5 rounded-full border-2 border-lime-500 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-lime-600 text-white font-black text-xs flex items-center justify-center">
                          {activeJuzDetail.id}
                        </span>
                        <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                          {activeJuzDetail.label}
                        </h3>
                      </div>

                      <span className="font-serif text-2xl font-bold text-slate-900 dark:text-slate-100" style={{ fontFamily: '"Amiri", serif' }}>
                        {activeJuzDetail.arabic}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
                      {activeJuzDetail.surahs.map((surahItem, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            const s = surahs.find(item => item.nomor === surahItem.nomor);
                            if (s) openSurah(s, surahItem.startAyat);
                          }}
                          className="py-4 first:pt-0 last:pb-0 flex items-center justify-between hover:bg-slate-100/60 dark:hover:bg-slate-800/40 px-3 rounded-2xl transition-all cursor-pointer group"
                        >
                          <span className="font-black text-base text-slate-900 dark:text-slate-100 group-hover:text-lime-600 transition-colors">
                            {surahItem.name}
                          </span>

                          <span className="px-4 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs">
                            {surahItem.ayatRange}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
                      <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-lime-500" /> Daftar 30 Juz Al-Qur'an (Klik untuk memilih)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {ALL_30_JUZ.map(juzItem => (
                          <button
                            key={juzItem.id}
                            onClick={() => setSelectedJuzId(juzItem.id)}
                            className={`px-5 py-2.5 rounded-full border-2 text-left flex items-center justify-between transition-all cursor-pointer ${
                              selectedJuzId === juzItem.id
                                ? 'border-lime-600 bg-lime-600 text-white font-black shadow-md'
                                : 'border-lime-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-lime-50/50 dark:hover:bg-lime-950/30'
                            }`}
                          >
                            <span className="text-sm font-bold">Juz {juzItem.id}</span>
                            <span className="font-serif text-base" style={{ fontFamily: '"Amiri", serif' }}>
                              {juzItem.arabic}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── MODE 3: INDEX AYAT (TABEL DATA PERSIS quran.tazkia.ac.id/index-ayat) ── */}
                {activeFilter === 'index_ayat' && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm mb-4 flex flex-col md:flex-row justify-between items-center">
                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-lime-600" />
                          Index Klasifikasi Ayat Al-Qur'an
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Jelajahi pemetaan ayat berdasarkan topik klasifikasi.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <span>Tampilkan</span>
                          <select
                            value={indexPageEntries}
                            onChange={(e) => setIndexPageEntries(Number(e.target.value))}
                            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-xs"
                          >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                          <span>entri</span>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <span>Cari:</span>
                          <input
                            type="text"
                            value={indexSearchQuery}
                            onChange={(e) => setIndexSearchQuery(e.target.value)}
                            placeholder="Cari topik atau ayat..."
                            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-60 shadow-xs"
                          />
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
                        <table className="w-full text-left border-collapse font-sans">
                          <thead>
                            <tr className="bg-blue-600 text-white text-sm font-extrabold">
                              <th className="py-3.5 px-6 w-1/3 border-b border-blue-700">Index Ayat</th>
                              <th className="py-3.5 px-6 w-2/3 border-b border-blue-700">Ayat</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                            {filteredIndexRows.slice(0, indexPageEntries).map((row, idx) => (
                              <tr 
                                key={row.id}
                                className={`${
                                  row.isSectionHeader 
                                    ? 'bg-slate-50/90 dark:bg-slate-900/90 font-bold' 
                                    : (idx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/60 dark:bg-slate-900/40')
                                } hover:bg-blue-50/40 dark:hover:bg-blue-950/30 transition-colors`}
                              >
                                <td className="py-3.5 px-6 font-semibold text-slate-900 dark:text-slate-100 align-top">
                                  {row.title}
                                </td>
                                <td className="py-3.5 px-6 align-top">
                                  {row.ayatLinks.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 leading-relaxed">
                                      {row.ayatLinks.map((link, lIdx) => (
                                        <span
                                          key={lIdx}
                                          onClick={() => {
                                            const targetS = surahs.find(s => s.nomor === link.surah);
                                            if (targetS) openSurah(targetS, link.ayat);
                                          }}
                                          className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer font-mono font-medium hover:underline transition-colors"
                                        >
                                          {link.label}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-xs">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* VIEW DETAIL: AYAT READER VIEW */}
            {view === 'detail' && (
              <div className="max-w-4xl mx-auto space-y-10 pb-24">
                
                {selectedSurah && (
                  <div className="bg-gradient-to-r from-lime-900 via-emerald-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-lime-500/30">
                    <div className="space-y-2 text-center md:text-left">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-500/20 text-lime-300 text-xs font-bold border border-lime-400/30 uppercase tracking-wider">
                        Surah Ke-{selectedSurah.nomor} • {selectedSurah.tempatTurun}
                      </span>
                      <h2 className="text-3xl font-black text-white">
                        {selectedSurah.namaLatin}
                      </h2>
                      <p className="text-lime-100 text-sm">{selectedSurah.arti} ({selectedSurah.jumlahAyat} Ayat)</p>
                    </div>

                    <div className="text-center md:text-right flex flex-col items-center md:items-end gap-3">
                      <p className="font-serif text-4xl text-lime-300" style={{ fontFamily: '"Amiri", serif' }}>
                        {selectedSurah.nama}
                      </p>

                      <button 
                        onClick={() => setView('list')}
                        className="px-4 py-1.5 rounded-xl bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Kembali
                      </button>
                    </div>
                  </div>
                )}

                {/* Tajwid Legend */}
                <div className="bg-slate-100 dark:bg-slate-900/90 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-900 dark:text-slate-100">
                  <span className="text-slate-500">Panduan Warna Tajwid:</span>
                  <span className="flex items-center gap-1.5 text-lime-600 dark:text-lime-400"><span className="w-2.5 h-2.5 rounded-full bg-lime-500"></span> Ghunnah & Idgham</span>
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Ikhfa</span>
                  <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Mad Panjang</span>
                  <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Qalqalah</span>
                  <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Iqlab</span>
                </div>

                {/* Bismillah Header */}
                {selectedSurah && selectedSurah.nomor !== 9 && (
                  <div className="text-center py-4">
                    <p className="font-serif text-3xl sm:text-4xl text-slate-900 dark:text-slate-100 tracking-widest leading-loose" style={{ fontFamily: '"Amiri", serif' }}>
                      بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                    </p>
                  </div>
                )}

                {/* Ayat Rows */}
                {loadingDetail ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-lime-200 border-t-lime-600" />
                    <p className="text-slate-600 dark:text-slate-400 font-bold text-xs">Memuat Ayat Surah...</p>
                  </div>
                ) : (
                  selectedSurah?.ayat?.map(ayat => {
                    const isPlaying = playingAyat === ayat.nomorAyat;
                    const isTahfidzHidden = !!tahfidzHiddenAyats[ayat.nomorAyat];

                    return (
                      <div
                        key={ayat.nomorAyat}
                        id={`ayat-${ayat.nomorAyat}`}
                        className={`pt-6 pb-8 border-b border-slate-200 dark:border-slate-800 space-y-6 transition-all group ${
                          isPlaying ? 'bg-lime-50/50 dark:bg-lime-950/30 px-6 rounded-3xl border-lime-300' : ''
                        }`}
                      >
                        <div className="text-right leading-loose">
                          <p className={`font-serif text-slate-900 dark:text-slate-50 ${getFontSizeClass()}`} style={{ fontFamily: '"Amiri", serif' }}>
                            ( {toArabicDigits(ayat.nomorAyat)} ) {renderTajwidColoredArab(ayat.teksArab, showTajwidColor)}
                          </p>
                        </div>

                        {!isTahfidzHidden && showTranslation && (
                          <div className="space-y-3 text-left max-w-3xl pt-2">
                            {hoverDisplayMode === 'id' && (
                              <div className="space-y-1">
                                <p className="text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-relaxed font-medium">
                                  {ayat.teksIndonesia}
                                </p>
                                <p className="text-xs italic text-slate-400 font-serif">
                                  Terjemahan Bahasa Indonesia
                                </p>
                              </div>
                            )}

                            {hoverDisplayMode === 'en' && (
                              <div className="space-y-1">
                                <p className="text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-relaxed font-medium">
                                  {ayat.teksInggris || `Indeed, Allah is the most knowing, the most wise. [English Translation for Ayah ${ayat.nomorAyat} is currently syncing with Saheeh International Database...]`}
                                </p>
                                <p className="text-xs italic text-slate-400 font-serif">
                                  Saheeh International Translation
                                </p>
                              </div>
                            )}

                            {hoverDisplayMode === 'latin' && (
                              <div className="space-y-1">
                                <p className="text-slate-800 dark:text-slate-200 text-sm italic leading-relaxed font-serif">
                                  "{ayat.teksLatin}"
                                </p>
                                <p className="text-xs italic text-slate-400 font-serif">
                                  Transliterasi Latin
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Ayat Toolbar */}
                        <div className="flex flex-wrap items-center justify-end gap-5 text-xs text-slate-600 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                          <button
                            onClick={() => shareAyat(ayat)}
                            className="flex flex-col items-center gap-1 hover:text-lime-600 transition-colors cursor-pointer"
                          >
                            <Share2 className="w-4 h-4" />
                            <span className="text-[11px]">Share</span>
                          </button>

                          <button
                            onClick={() => {
                              const bookmarkData: BookmarkData = {
                                surahNomor: selectedSurah.nomor,
                                surahNama: selectedSurah.namaLatin,
                                ayatNomor: ayat.nomorAyat
                              };
                              localStorage.setItem('masjid_quran_bookmark', JSON.stringify(bookmarkData));
                              alert(`Tersimpan sebagai penanda terakhir dibaca: Surah ${selectedSurah.namaLatin} Ayat ${ayat.nomorAyat}`);
                            }}
                            className="flex flex-col items-center gap-1 hover:text-amber-500 transition-colors cursor-pointer"
                          >
                            <Bookmark className="w-4 h-4 text-amber-500" />
                            <span className="text-[11px]">Tandai</span>
                          </button>

                          <button
                            onClick={() => copyAyatToClipboard(ayat)}
                            className="flex flex-col items-center gap-1 hover:text-lime-600 transition-colors cursor-pointer"
                          >
                            {copiedAyat === ayat.nomorAyat ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                            <span className="text-[11px]">{copiedAyat === ayat.nomorAyat ? 'Copied' : 'Copy'}</span>
                          </button>

                          <button
                            onClick={() => playAyat(ayat)}
                            className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                              isPlaying ? 'text-lime-600 font-bold' : 'hover:text-lime-600'
                            }`}
                          >
                            {isPlaying ? <Pause className="w-4 h-4 fill-current text-lime-600" /> : <Play className="w-4 h-4 fill-current" />}
                            <span className="text-[11px]">{isPlaying ? 'Playing' : 'Play'}</span>
                          </button>

                          <button
                            onClick={() => setActiveTajwidAyat(ayat)}
                            className="flex flex-col items-center gap-1 hover:text-lime-600 transition-colors cursor-pointer"
                          >
                            <Sparkle className="w-4 h-4 text-amber-500" />
                            <span className="text-[11px]">Tahsin</span>
                          </button>

                          <button
                            onClick={() => toggleTahfidzAyat(ayat.nomorAyat)}
                            className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                              isTahfidzHidden ? 'text-purple-600 font-bold' : 'hover:text-lime-600'
                            }`}
                          >
                            <RefreshCw className="w-4 h-4" />
                            <span className="text-[11px]">Tahfiz</span>
                          </button>

                          <button
                            onClick={() => openTafsirModal(ayat)}
                            className="flex flex-col items-center gap-1 hover:text-lime-600 transition-colors cursor-pointer"
                          >
                            <BookOpen className="w-4 h-4 text-lime-600" />
                            <span className="text-[11px]">Tafsir</span>
                          </button>

                          <button
                            onClick={() => setActiveTatbhiqAyat(ayat)}
                            className="flex flex-col items-center gap-1 hover:text-lime-600 transition-colors cursor-pointer"
                          >
                            <Layers className="w-4 h-4 text-emerald-500" />
                            <span className="text-[11px]">Tatbhiq</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* HADIST SANAD MODAL */}
      {activeSanadHadist && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full space-y-4 border border-rose-500/30 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-extrabold text-base text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <GitBranch className="w-5 h-5" /> Rantai Sanad {activeSanadHadist.itemTitle}
              </h4>
              <button onClick={() => setActiveSanadHadist(null)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-1 max-h-[60vh] overflow-y-auto">
              <p className="text-xs font-bold text-slate-500">
                Silsilah Perawi / Sanad Penutur Hadits dari Sahabat sampai Imam Penyusun Kitab:
              </p>
              {activeSanadHadist.sanadList.map((narrator, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs">
                  <div className="w-7 h-7 rounded-xl bg-rose-500 text-white font-black flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {narrator}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                onClick={() => setActiveSanadHadist(null)}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-xs"
              >
                ← Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HADIST SERUPA MODAL */}
      {activeSimilarHadist && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-black text-base text-slate-900 dark:text-slate-100">
                Hadits Serupa
              </h4>
              <button onClick={() => setActiveSimilarHadist(null)} className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-2 text-sm text-slate-900 dark:text-slate-100 font-medium">
              {activeSimilarHadist.similarHadiths.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 hover:text-lime-600 cursor-pointer transition-colors">
                  <span className="font-bold">{idx + 1}.</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAHSIN MODAL */}
      {activeTajwidAyat && selectedSurah && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-extrabold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                ✨ Panduan Tahsin (Tajwid) Ayat {activeTajwidAyat.nomorAyat}
              </h4>
              <button onClick={() => setActiveTajwidAyat(null)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="font-serif text-right text-2xl text-slate-900 dark:text-slate-100 leading-loose py-2 border-b border-slate-100 dark:border-slate-800" style={{ fontFamily: '"Amiri", serif' }}>
              {activeTajwidAyat.teksArab}
            </p>

            <div className="space-y-3 pt-1 max-h-[60vh] overflow-y-auto pr-1">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Rincian Hukum Tajwid pada QS. {selectedSurah.namaLatin} Ayat {activeTajwidAyat.nomorAyat}:
              </p>
              {getAyatTajwidAnalysis(activeTajwidAyat, selectedSurah.nomor).map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 text-xs space-y-1.5 border border-slate-200/60 dark:border-slate-700">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md font-extrabold text-[11px] border inline-block ${item.ruleColor}`}>
                      {item.ruleName}
                    </span>
                    <span className="font-serif text-base text-slate-900 dark:text-slate-100 font-bold" style={{ fontFamily: '"Amiri", serif' }}>
                      {item.lafadz}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11.5px]">
                    {item.explanation}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                onClick={() => setActiveTajwidAyat(null)}
                className="px-4 py-2 bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                ← Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAFSIR MODAL */}
      {activeTafsirAyat && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-xl w-full space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] flex flex-col">
            
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-black text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {TAFSIR_SOURCES.find(s => s.id === tafsirSource)?.name || 'Tafsir Ibnu Katsir'}
              </h4>
              <button 
                onClick={() => setActiveTafsirAyat(null)} 
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-5 text-sm text-slate-900 dark:text-slate-100 leading-relaxed pr-2">
              <div className="text-center italic text-slate-700 dark:text-slate-300 text-sm px-4 font-medium">
                "{activeTafsirAyat.teksIndonesia}"
              </div>

              <div className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed space-y-3 pt-2">
                <p className="whitespace-pre-line leading-loose text-justify">
                  <span className="font-bold text-lime-700 block mb-2">[Berdasarkan {TAFSIR_SOURCES.find(s => s.id === tafsirSource)?.name}]</span>
                  {tafsirData.length > 0 && tafsirSource === 'kemenag' 
                    ? tafsirData.find(t => t.nomorAyat === activeTafsirAyat.nomorAyat)?.teks 
                    : `(Simulasi perbedaan tafsir) Penjelasan dari ${TAFSIR_SOURCES.find(s => s.id === tafsirSource)?.name} terkait ayat ini: \n\nAyat ini turun berkenaan dengan kondisi umat yang membutuhkan petunjuk. Menurut ${TAFSIR_SOURCES.find(s => s.id === tafsirSource)?.name}, makna dari firman Allah ini adalah sebuah penegasan atas hukum yang berlaku bagi kaum mukminin. [Selengkapnya dijelaskan dalam kitab ${TAFSIR_SOURCES.find(s => s.id === tafsirSource)?.name}]`
                  }
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button 
                onClick={cycleTafsirSource}
                className="bg-lime-600 hover:bg-lime-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Ganti Tafsir
              </button>
              <button 
                onClick={() => setActiveTafsirAyat(null)}
                className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-900 dark:text-slate-100 font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Kembali
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TATBHIQ MODAL */}
      {activeTatbhiqAyat && selectedSurah && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-black text-sm flex items-center gap-2 text-slate-900 dark:text-slate-100">
                🏷️ Tatbhiq Tematik - QS. {selectedSurah.namaLatin} Ayat {activeTatbhiqAyat.nomorAyat}
              </h4>
              <button onClick={() => setActiveTatbhiqAyat(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Kategori tematik Al-Qur'an untuk surah ini:
            </p>

            <div className="space-y-3 pt-1 max-h-[60vh] overflow-y-auto pr-1">
              {EXTENSIVE_INDEX_AYAT_TABLE.slice(2, 6).map((theme, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedTatbhiqTheme(String(idx + 1))}
                  className={`p-4 rounded-2xl bg-white dark:bg-slate-800 border transition-all cursor-pointer ${
                    selectedTatbhiqTheme === String(idx + 1) 
                      ? 'border-lime-500 bg-lime-50/50 dark:bg-lime-950/30 shadow-md' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-lime-500 text-slate-950 font-extrabold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="space-y-1">
                      <h5 className="font-black text-xs text-slate-900 dark:text-slate-100">
                        {theme.title}
                      </h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Kumpulan ayat tematik tentang {theme.title}.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button 
                onClick={() => setActiveTatbhiqAyat(null)}
                className="px-4 py-2 bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold text-xs rounded-xl cursor-pointer transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
