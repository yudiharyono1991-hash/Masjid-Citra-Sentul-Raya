import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { KONTAK_PANITIA as KONTAK_DEFAULT } from '../data/mockData';

export const useKontakPanitia = () => {
  const [kontakList, setKontakList] = useState(KONTAK_DEFAULT);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchKontak = async () => {
      try {
        const { data, error } = await supabase.from('kontak_panitia').select('*').order('urutan', { ascending: true });
        if (!error && data && data.length > 0) {
          setKontakList(data.map((item: any) => ({
            nama: item.nama,
            noTelepon: item.no_telepon,
            noWa: item.no_wa
          })));
        }
      } catch (err) {
        console.error('Error fetching kontak panitia:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchKontak();
  }, []);

  return { kontakList, isLoading };
};
