import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rbvqqmmmzyvmvdbwebcc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJidnFxbW1tenl2bXZkYndlYmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNDUyNzMsImV4cCI6MjEwMzcyMTI3M30.5k4TPt16nISTZgvytG19tvsl3ilgFW7h-0hCuKzCCRE';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function syncDonationsToJurnal() {
  console.log('Fetching donations...');
  const { data: donations } = await supabase.from('donations').select('*').eq('status', 'Berhasil');
  console.log(`Found ${donations?.length || 0} Berhasil donations.`);

  console.log('Fetching existing jurnal_umum for donations...');
  const { data: existingJurnals } = await supabase.from('jurnal_umum').select('no_bukti').like('no_bukti', 'BKM-DON-%');
  const existingNoBukti = new Set((existingJurnals || []).map(j => j.no_bukti));

  const inserts = [];

  for (const d of donations || []) {
    const isZakat = d.program_name.toLowerCase().includes('zakat');
    const isWakaf = d.program_name.toLowerCase().includes('wakaf');
    const isInfaq = d.program_name.toLowerCase().includes('infaq');
    
    let akunDebit = '1106'; // default Bank Infak & Sodaqoh
    let akunKredit = '4103'; // default Sedekah Jamaah
    
    if (isZakat) { akunDebit = '1104'; akunKredit = '4106'; }
    else if (isInfaq) { akunDebit = '1106'; akunKredit = '4102'; }
    else if (isWakaf) { akunDebit = '1105'; akunKredit = '4104'; }

    // Format date correctly (donation.tanggal is usually like '17 Sep 2026' or '2026-09-17' or '05-Sep-2026')
    let tanggal = d.tanggal;
    let tglObj;
    if (tanggal.includes('-') && tanggal.split('-')[0].length === 4) {
       tglObj = new Date(tanggal); // YYYY-MM-DD
    } else {
       tglObj = new Date(tanggal); // Let JS parse
    }
    
    if (!isNaN(tglObj.getTime())) {
       tanggal = tglObj.toISOString().split('T')[0];
    } else {
       tanggal = new Date().toISOString().split('T')[0]; // Fallback
    }

    const noBukti = `BKM-DON-${d.id}`; // deterministic ID based on donation
    
    if (!existingNoBukti.has(noBukti)) {
       console.log(`Will insert jurnal for donation: ${d.id}`);
       const keterangan = `Penerimaan Donasi ${d.program_name} a.n ${d.nama_donatur}`;
       
       inserts.push({
          id: `JU-${d.id}-1`,
          tanggal: tanggal,
          no_bukti: noBukti,
          keterangan: keterangan,
          kode_akun: akunDebit,
          debit: d.nominal,
          kredit: 0,
          user_input: 'Sistem ZISWAF (Sync)'
       });
       inserts.push({
          id: `JU-${d.id}-2`,
          tanggal: tanggal,
          no_bukti: noBukti,
          keterangan: keterangan,
          kode_akun: akunKredit,
          debit: 0,
          kredit: d.nominal,
          user_input: 'Sistem ZISWAF (Sync)'
       });
    }
  }

  if (inserts.length > 0) {
     console.log(`Inserting ${inserts.length} rows to jurnal_umum...`);
     const { error } = await supabase.from('jurnal_umum').insert(inserts);
     if (error) {
        console.error('Error inserting:', error);
     } else {
        console.log('Sync successful.');
     }
  } else {
     console.log('Nothing to insert.');
  }
}

syncDonationsToJurnal().catch(console.error);
