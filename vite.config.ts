import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Plugin to copy public dir while skipping files with spaces in their names
// (avoids EAGAIN errors on locked files like "* copy.jpeg")
function safePublicCopy(): import('vite').Plugin {
  return {
    name: 'safe-public-copy',
    apply: 'build',
    closeBundle() {
      const publicDir = path.resolve(__dirname, 'public');
      const outDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(publicDir)) return;
      const files = fs.readdirSync(publicDir);
      for (const file of files) {
        if (file.includes(' ')) continue; // skip files with spaces (locked/copy files)
        const src = path.join(publicDir, file);
        const dest = path.join(outDir, file);
        try {
          fs.copyFileSync(src, dest);
        } catch {
          // ignore individual copy failures
        }
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), safePublicCopy()],
  publicDir: false, // disable default public copy; handled by safePublicCopy plugin
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
