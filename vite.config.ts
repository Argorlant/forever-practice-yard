import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * `npm run dev` only: your own wow.export folder, for this computer. ~/wow.export/yard-models.json says which file
 * each model slot draws (src/own-model.ts). Builds use the separately prepared public/wow selection.
 */
const localWowExport = (): Plugin => ({
  name: 'local-wow-export',
  apply: 'serve',
  configureServer(server) {
    const root = path.join(os.homedir(), 'wow.export');
    server.middlewares.use('/@local-wow/', (req, res) => {
      // A map export is many files: the names under the folders it asks for.
      if (req.url?.startsWith('/@list?')) {
        const dirs = new URLSearchParams(req.url.slice(7)).get('dirs')?.split(',') ?? [];
        const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true })
          .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.relative(root, path.join(d, e.name)).replaceAll(path.sep, '/')]));
        const inside = dirs.map((d) => path.resolve(root, d)).filter((d) => d.startsWith(root + path.sep) && fs.existsSync(d));
        res.end(JSON.stringify(inside.flatMap(walk)));
        return;
      }
      const file = path.resolve(root, decodeURIComponent((req.url ?? '').split('?')[0]).replace(/^\/+/, ''));
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.statusCode = 404;
        res.end();
        return;
      }
      fs.createReadStream(file).pipe(res);
    });
  },
});

// base relativa: el sitio funciona igual en un dominio propio o en una
// subcarpeta de GitHub Pages.
export default defineConfig({
  base: './',
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
  plugins: [localWowExport()],
});
