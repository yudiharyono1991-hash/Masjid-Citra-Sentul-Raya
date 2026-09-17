import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rbvqqmmmzyvmvdbwebcc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJidnFxbW1tenl2bXZkYndlYmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNDUyNzMsImV4cCI6MjEwMzcyMTI3M30.5k4TPt16nISTZgvytG19tvsl3ilgFW7h-0hCuKzCCRE';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixData() {
  console.log('Fetching donations...');
  const { data: donations } = await supabase.from('donations').select('*');
  console.log(`Found ${donations?.length} donations.`);

  console.log('Fetching jurnal_umum...');
  const { data: jurnals } = await supabase.from('jurnal_umum').select('*');
  console.log(`Found ${jurnals?.length} jurnal_umum records.`);

  for (const j of jurnals || []) {
    let newKode = j.kode_akun;
    const ket = (j.keterangan || '').toLowerCase();
    
    if (j.kode_akun === '1-10002') {
      if (ket.includes('zakat')) newKode = '1104';
      else if (ket.includes('wakaf')) newKode = '1105';
      else newKode = '1106';
    } else if (j.kode_akun === '4-20001') {
      newKode = '4106';
    } else if (j.kode_akun === '4-30001') {
      newKode = '4104';
    } else if (j.kode_akun === '4-10001') {
      newKode = '4103';
    }

    let newTanggal = j.tanggal;
    // Try to find matching donation to fix the date
    if (j.no_bukti && j.no_bukti.startsWith('BKM-DON-')) {
      const nominal = j.debit > 0 ? j.debit : j.kredit;
      // Match donation by nominal and name in keterangan
      const matchingDonation = donations?.find(d => 
        d.nominal === nominal && 
        (ket.includes(d.nama_donatur.toLowerCase()) || d.nama_donatur === 'Hamba Allah')
      );
      
      if (matchingDonation) {
        // Parse donation.tanggal format. Assuming it's YYYY-MM-DD or DD-MMM-YYYY.
        // App.tsx uses: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) -> e.g. "17 Sep 2026"
        // And ModulLaporanKeuangan auto date uses YYYY-MM-DD.
        // Let's format it to YYYY-MM-DD for standard storage in jurnal_umum.
        const tglStr = matchingDonation.tanggal;
        let dObj;
        if (tglStr.includes('-')) {
            if (tglStr.split('-')[0].length === 4) {
               dObj = new Date(tglStr); // YYYY-MM-DD
            } else {
               dObj = new Date(tglStr); // might be DD-MMM-YYYY, JS Date can parse "17 Sep 2026"
            }
        } else {
            dObj = new Date(tglStr);
        }
        
        if (!isNaN(dObj.getTime())) {
          newTanggal = dObj.toISOString().split('T')[0];
        }
      }
    }

    if (newKode !== j.kode_akun || newTanggal !== j.tanggal) {
      console.log(`Updating ${j.id}: ${j.kode_akun} -> ${newKode}, date: ${j.tanggal} -> ${newTanggal}`);
      await supabase.from('jurnal_umum').update({ kode_akun: newKode, tanggal: newTanggal }).eq('id', j.id);
    }
  }

  console.log('Done fixing data.');
}

fixData().catch(console.error);
