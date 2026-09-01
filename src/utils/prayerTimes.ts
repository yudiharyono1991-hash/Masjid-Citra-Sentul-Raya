import { JadwalWaktu } from '../types';

let cachedPrayerTimes: JadwalWaktu | null = null;
let cachedHijriDate: string | null = null;
let lastFetchDate: string | null = null;

export async function fetchPrayerTimesOnline(city: string = 'Bogor', country: string = 'Indonesia'): Promise<{jadwal: JadwalWaktu, hijri: string}> {
  const todayStr = new Date().toISOString().split('T')[0];
  
  if (cachedPrayerTimes && cachedHijriDate && lastFetchDate === todayStr) {
    return { jadwal: cachedPrayerTimes, hijri: cachedHijriDate };
  }

  try {
    const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=11`);
    if (!res.ok) throw new Error('API Error');
    const json = await res.json();
    
    if (json.data && json.data.timings) {
      const t = json.data.timings;
      const h = json.data.date.hijri;
      
      const newJadwal = {
        imsak: t.Imsak,
        subuh: t.Fajr,
        syuruq: t.Sunrise,
        dzuhur: t.Dhuhr,
        ashar: t.Asr,
        maghrib: t.Maghrib,
        isya: t.Isha
      };
      
      const newHijri = `${h.day} ${h.month.en} ${h.year} H`;
      
      cachedPrayerTimes = newJadwal;
      cachedHijriDate = newHijri;
      lastFetchDate = todayStr;
      
      return { jadwal: newJadwal, hijri: newHijri };
    }
  } catch (err) {
    console.error('Gagal mengambil jadwal dari API, menggunakan data offline (fallback)', err);
  }
  
  // Fallback
  return { 
    jadwal: getPrayerTimesSentul(),
    hijri: getHijriDateIndo()
  };
}

/**
 * Static or calculated Prayer Times for Sentul / Kabupaten Bogor region
 */
export function getPrayerTimesSentul(date: Date = new Date()): JadwalWaktu {
  // Approximate standard Sentul/Bogor prayer times (UTC+7)
  // Adjusted slightly by month
  const month = date.getMonth();
  
  // Baseline adjustments
  const baseTimes: Record<number, JadwalWaktu> = {
    0: { imsak: '04:22', subuh: '04:32', syuruq: '05:48', dzuhur: '12:08', ashar: '15:29', maghrib: '18:19', isya: '19:31' },
    1: { imsak: '04:27', subuh: '04:37', syuruq: '05:51', dzuhur: '12:11', ashar: '15:25', maghrib: '18:18', isya: '19:28' },
    2: { imsak: '04:26', subuh: '04:36', syuruq: '05:49', dzuhur: '12:07', ashar: '15:13', maghrib: '18:11', isya: '19:19' },
    3: { imsak: '04:22', subuh: '04:32', syuruq: '05:45', dzuhur: '11:58', ashar: '15:16', maghrib: '17:59', isya: '19:09' },
    4: { imsak: '04:21', subuh: '04:31', syuruq: '05:46', dzuhur: '11:54', ashar: '15:15', maghrib: '17:52', isya: '19:05' },
    5: { imsak: '04:24', subuh: '04:34', syuruq: '05:51', dzuhur: '11:56', ashar: '15:18', maghrib: '17:54', isya: '19:08' },
    6: { imsak: '04:28', subuh: '04:38', syuruq: '05:55', dzuhur: '12:01', ashar: '15:22', maghrib: '18:00', isya: '19:13' },
    7: { imsak: '04:27', subuh: '04:37', syuruq: '05:53', dzuhur: '12:01', ashar: '15:20', maghrib: '18:00', isya: '19:12' },
    8: { imsak: '04:20', subuh: '04:30', syuruq: '05:45', dzuhur: '11:55', ashar: '15:06', maghrib: '17:57', isya: '19:06' },
    9: { imsak: '04:11', subuh: '04:21', syuruq: '05:37', dzuhur: '11:47', ashar: '14:55', maghrib: '17:53', isya: '19:03' },
    10: { imsak: '04:05', subuh: '04:15', syuruq: '05:34', dzuhur: '11:46', ashar: '15:03', maghrib: '17:54', isya: '19:07' },
    11: { imsak: '04:10', subuh: '04:20', syuruq: '05:39', dzuhur: '11:55', ashar: '15:17', maghrib: '18:05', isya: '19:19' },
  };

  return baseTimes[month] || baseTimes[6];
}

/**
 * Get current Hijri date approximation in Indonesian
 */
export function getHijriDateIndo(): string {
  try {
    const today = new Date();
    // Using Intl DateTimeFormat with Islamic civil calendar
    const formatter = new Intl.DateTimeFormat('id-ID-u-ca-islamic-uma', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return formatter.format(today) + ' H';
  } catch {
    return '14 Safar 1448 H';
  }
}

/**
 * Determine the next prayer time and remaining seconds
 */
export function getNextPrayerInfo(jadwal: JadwalWaktu): { name: string; time: string; remainingText: string } {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const list: { name: string; timeStr: string; minutes: number }[] = [
    { name: 'Imsak', timeStr: jadwal.imsak, minutes: parseToMinutes(jadwal.imsak) },
    { name: 'Subuh', timeStr: jadwal.subuh, minutes: parseToMinutes(jadwal.subuh) },
    { name: 'Syuruq', timeStr: jadwal.syuruq, minutes: parseToMinutes(jadwal.syuruq) },
    { name: 'Dzuhur', timeStr: jadwal.dzuhur, minutes: parseToMinutes(jadwal.dzuhur) },
    { name: 'Ashar', timeStr: jadwal.ashar, minutes: parseToMinutes(jadwal.ashar) },
    { name: 'Maghrib', timeStr: jadwal.maghrib, minutes: parseToMinutes(jadwal.maghrib) },
    { name: 'Isya', timeStr: jadwal.isya, minutes: parseToMinutes(jadwal.isya) },
  ];

  for (const item of list) {
    if (item.minutes > currentMinutes) {
      const diff = item.minutes - currentMinutes;
      const hours = Math.floor(diff / 60);
      const mins = diff % 60;
      const text = hours > 0 ? `${hours} jam ${mins} mnt` : `${mins} mnt lagi`;
      return { name: item.name, time: item.timeStr, remainingText: text };
    }
  }

  // If past Isya, next prayer is Subuh tomorrow
  const nextSubuhMinutes = list[0].minutes + 24 * 60;
  const diff = nextSubuhMinutes - currentMinutes;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  return { name: 'Subuh (Besok)', time: list[0].timeStr, remainingText: `${hours} jam ${mins} mnt` };
}

function parseToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}
