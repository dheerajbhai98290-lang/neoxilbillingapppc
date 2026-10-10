import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './server/db.ts';
import { apiRouter } from './server/routes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  // Parse JSON payloads up to 50MB (for invoice PDFs, backup restores, images)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize SQLite database
  console.log('Initializing NEOXILINDIA SQLite Relational Database...');
  await initDatabase();
  console.log('Database ready.');

  // Mount API endpoints
  app.use('/api', apiRouter);

  if (!isProd) {
    // Development mode: attach Vite dev server middleware
    console.log('Attaching Vite development middleware...');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve built assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`NEOXILINDIA Business Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
