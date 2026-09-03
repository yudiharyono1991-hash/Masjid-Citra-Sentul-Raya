/**
 * Format number to Indonesian Rupiah currency format
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date string to Indonesian formatted date
 */
export function formatTanggalIndo(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Generate WhatsApp confirmation link pre-filled with donation details
 */
export function buildWhatsAppLink(
  phone: string,
  data: {
    nama: string;
    nominal: number;
    paket?: string;
    pesanDoa?: string;
    keterangan?: string;
    metode: string;
    kodeUnik?: number;
    tanggal?: string;
  }
): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const targetPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;

  const text = `Assalamu'alaikum Warahmatullahi Wabarakatuh.

Saya hendak mengonfirmasi donasi Wakaf Pembangunan Masjid Citra Sentul Raya:

📌 *Data Wakif / Donatur:*
• Nama: ${data.nama}
• Paket Wakaf: ${data.paket || 'Wakaf Nominal Bebas'}
• Nominal Wakaf: ${formatRupiah(data.nominal)}
• Metode Pembayaran: ${data.metode} (Bank BSI No. 7257159102 a.n. Masjid Citra Sentul Raya)
• Tanggal: ${formatTanggalIndo(data.tanggal || new Date().toISOString())}
${data.keterangan ? `• Keterangan: ${data.keterangan}\n` : ''}
🤲 *Doa / Niat:*
"${data.pesanDoa || 'Semoga menjadi amal jariyah yang mengalir pahalanya dan berkah untuk keluarga.'}"

Mohon dapat diverifikasi. Terima kasih.
Jazakumullah Khairan Katsiran.`;

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Generate a random 3-digit unique transfer code (e.g., 412)
 */
export function generateUniqueCode(): number {
  return Math.floor(Math.random() * 899) + 100;
}

/**
 * Get today's date as YYYY-MM-DD string using LOCAL timezone (not UTC).
 * Fixes timezone bug where toISOString() returns previous day for UTC+7 users at midnight.
 */
export function toLocalDateString(date?: Date): string {
  const d = date || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Get the first day of the current month as YYYY-MM-DD string (local timezone).
 */
export function getFirstDayOfMonth(): string {
  const d = new Date();
  return toLocalDateString(new Date(d.getFullYear(), d.getMonth(), 1));
}
