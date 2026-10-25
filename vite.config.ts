import { defineConfig, Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

function copyDirRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyStaticLegacyAssets(): Plugin {
  return {
    name: 'copy-static-legacy-assets',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      copyDirRecursive(path.resolve(__dirname, 'js'), path.join(distDir, 'js'));
      copyDirRecursive(path.resolve(__dirname, 'assets'), path.join(distDir, 'assets'));
      copyDirRecursive(path.resolve(__dirname, 'css'), path.join(distDir, 'css'));
    },
    transformIndexHtml(html) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mkhzvzgluddaqaxilgkz.supabase.co';
      const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
      const envScript = `<script>window.__ENV__ = Object.assign(window.__ENV__ || {}, { VITE_SUPABASE_URL: ${JSON.stringify(supabaseUrl)}, VITE_SUPABASE_PUBLISHABLE_KEY: ${JSON.stringify(supabaseKey)} });</script>`;
      return html.replace('</head>', `${envScript}</head>`);
    }
  };
}

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  plugins: [copyStaticLegacyAssets()],
});
