import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/** Injects the list of built assets into sw.js so every screen works offline. */
function precache(): Plugin {
  let outDir = 'dist';
  return {
    name: 'wardrobe-precache',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const assets = fs.readdirSync(path.join(outDir, 'assets')).map((f) => `/assets/${f}`);
      const sw = path.join(outDir, 'sw.js');
      const version = crypto.createHash('sha1').update(assets.join()).digest('hex').slice(0, 10);
      const src = fs.readFileSync(sw, 'utf8')
        .replace("const VERSION = 'v1';", `const VERSION = '${version}';`)
        .replace('const PRECACHE = [];', `const PRECACHE = ${JSON.stringify(assets)};`);
      fs.writeFileSync(sw, src);
    },
  };
}

export default defineConfig({
  plugins: [react(), precache()],
  build: { target: 'es2020', sourcemap: false, chunkSizeWarningLimit: 700 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as any);
