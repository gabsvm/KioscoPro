import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import lineClamp from '@tailwindcss/line-clamp';

// All configuration is now in this single file
export default defineConfig({
  css: {
    postcss: {
      plugins: [
        tailwindcss({
          content: [
            "./index.html",
            "./*.{js,ts,jsx,tsx}",
            "./components/**/*.{js,ts,jsx,tsx}",
          ],
          theme: {
            extend: {
              fontFamily: {
                sans: ['Outfit', 'sans-serif'],
              },
              boxShadow: {
                'sm': '0 2px 8px -1px rgb(0 0 0 / 0.05)',
                'md': '0 4px 12px -2px rgb(0 0 0 / 0.08)',
                'lg': '0 10px 25px -3px rgb(0 0 0 / 0.1)',
                'xl': '0 20px 35px -5px rgb(0 0 0 / 0.12)',
              },
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
          plugins: [lineClamp],
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
