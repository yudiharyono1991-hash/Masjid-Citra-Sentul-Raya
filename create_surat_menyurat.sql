-- ====================================================================
-- TABEL & KEBIJAKAN AKSES (RLS) UNTUK MODUL SURAT MENYURAT DKM
-- Jalankan skrip ini di Supabase SQL Editor (https://supabase.com/dashboard)
-- ====================================================================

-- 1. Buat Tabel dkm_surat_menyurat jika belum ada
CREATE TABLE IF NOT EXISTS public.dkm_surat_menyurat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_surat VARCHAR(100) NOT NULL,
    jenis VARCHAR(50) NOT NULL,
    perihal VARCHAR(255) NOT NULL,
    tanggal VARCHAR(50) NOT NULL,
    pengirim_penerima VARCHAR(255),
    penandatangan VARCHAR(255) NOT NULL,
    jabatan_ttd VARCHAR(100),
    keterangan TEXT,
    file_url TEXT,
    file_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'final',
    dibuat_oleh VARCHAR(100) DEFAULT 'direktur',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.dkm_surat_menyurat ENABLE ROW LEVEL SECURITY;

-- 3. Hapus kebijakan lama jika ada agar tidak bentrok
DROP POLICY IF EXISTS "Public Read Surat" ON public.dkm_surat_menyurat;
DROP POLICY IF EXISTS "Public Insert Surat" ON public.dkm_surat_menyurat;
DROP POLICY IF EXISTS "Public Update Surat" ON public.dkm_surat_menyurat;
DROP POLICY IF EXISTS "Public Delete Surat" ON public.dkm_surat_menyurat;
DROP POLICY IF EXISTS "Public Access Surat" ON public.dkm_surat_menyurat;
DROP POLICY IF EXISTS "Allow All Surat Menyurat" ON public.dkm_surat_menyurat;

-- 4. Berikan Kebijakan Akses Penuh (SELECT, INSERT, UPDATE, DELETE) untuk peran anonim & terotentikasi
CREATE POLICY "Allow All Surat Menyurat" 
ON public.dkm_surat_menyurat 
FOR ALL 
TO public, anon, authenticated 
USING (true) 
WITH CHECK (true);

-- 5. Berikan Hak Akses ke role anon, authenticated, dan service_role
GRANT ALL ON TABLE public.dkm_surat_menyurat TO anon;
GRANT ALL ON TABLE public.dkm_surat_menyurat TO authenticated;
GRANT ALL ON TABLE public.dkm_surat_menyurat TO service_role;

-- --------------------------------------------------------------------
-- 6. STORAGE BUCKET: masjid-assets (Penyimpanan Dokumen PDF & Lampiran)
-- --------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('masjid-assets', 'masjid-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Kebijakan akses (RLS) untuk upload dan baca file di bucket masjid-assets
DROP POLICY IF EXISTS "Public Access Masjid Assets" ON storage.objects;
CREATE POLICY "Public Access Masjid Assets" ON storage.objects
FOR ALL
TO public, anon, authenticated
USING (bucket_id = 'masjid-assets')
WITH CHECK (bucket_id = 'masjid-assets');

