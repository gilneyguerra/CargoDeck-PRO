import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          // Chunks dedicados para libs pesadas — só baixam quando solicitadas
          // via dynamic import. Isso reduz o bundle inicial.
          if (id.includes('/jspdf/') || id.includes('jspdf-autotable')) return 'pdf';
          if (id.includes('/pdfjs-dist/')) return 'pdfjs';
          if (id.includes('/tesseract.js/')) return 'tesseract';
          if (id.includes('/dompurify/') || id.includes('/zod/')) return 'security';
          if (id.includes('/@dnd-kit/')) return 'dnd';
          if (id.includes('/@supabase/')) return 'supabase';
          if (id.includes('/lucide-react/')) return 'icons';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/zustand/')) return 'vendor';
          return undefined;
        }
      }
    }
  }
})
