import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// All configuration is now in this single file
export default defineConfig({
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          content: [
            "./index.html",
            "./**/*.{js,ts,jsx,tsx}",
          ],
          theme: {
            extend: {
              colors: {
                brand: {
                  50: '#f0f9ff',
                  100: '#e0f2fe',
                  500: '#0ea5e9',
                  600: '#0284c7',
                  700: '#0369a1',
                  900: '#0c4a6e',
                }
              }
            },
          },
          plugins: [],
        }),
        autoprefixer,
      ],
    },
  },
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  },
});
