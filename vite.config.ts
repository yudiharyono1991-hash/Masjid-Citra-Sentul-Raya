import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import {GoogleGenAI} from '@google/genai';

function geminiAiPlugin(): Plugin {
  return {
    name: 'gemini-ai-consultation-middleware',
    configureServer(server) {
      server.middlewares.use('/api/ai/consultation', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({error: 'Method Not Allowed'}));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const prompt = parsed.prompt || 'Apa keutamaan wakaf masjid?';

            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  reply:
                    "Assalamu'alaikum! Wakaf Pembangunan Masjid Citra Sentul Raya menyalurkan donasi via BSI No. 7257159102 a.n. Masjid Citra Sentul Raya. Silakan hubungi Pak Leo di +62 812-1920-0400 untuk konfirmasi.",
                })
              );
              return;
            }

            const ai = new GoogleGenAI({
              apiKey,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build',
                },
              },
            });

            const systemInstruction = `Anda adalah "AI Asisten Masjid Citra Sentul Raya" yang ramah, santun, islami, dan berwawasan luas.
Tugas Anda adalah menjawab pertanyaan jamaah, muwakif, dan warga seputar:
1. Program Wakaf Pembangunan Masjid Citra Sentul Raya (Target Rp 15 Miliar, Rekening BSI 7257159102 a.n. Masjid Citra Sentul Raya).
2. Kontak Panitia: Pak Leo (+62 812-1920-0400) dan Pak Aria (+62 818-1885-1377).
3. Lokasi: Kawasan Citra Sentul Raya, Sirkuit Sentul, Kabupaten Bogor.
4. Fiqih Wakaf, keutamaan membangun rumah Allah di surga (HR. Bukhari & Muslim), QS. Al-Baqarah: 261.
5. Media Dakwah Ashabul Yamin TV (https://youtube.com/@ashabulyamintv).
6. Benchmark syariah & jaringan pendidikan Tazkia.

Gunakan bahasa Indonesia yang halus, sebut "Bapak/Ibu" atau "Jamaah yang dirahmati Allah", serta sertakan ucapan salam dan doa. Jawab dengan ringkas, ramah, jelas, dan mengarahkan pada kemudahan berwakaf.`;

            const response = await ai.models.generateContent({
              model: 'gemini-3.6-flash',
              contents: prompt,
              config: {
                systemInstruction,
                temperature: 0.7,
              },
            });

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({reply: response.text}));
          } catch (err: any) {
            console.error('Error in Gemini AI endpoint:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({error: err.message || 'Gagal memproses pertanyaan.'}));
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(), 
      geminiAiPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Masjid Citra Sentul Raya',
          short_name: 'Masjid CSR',
          description: 'Aplikasi Portal Layanan Masjid Citra Sentul Raya',
          theme_color: '#059669',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=192&q=80',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=512&q=80',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 4000000 // 4MB to avoid PWA build error on large chunks
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
