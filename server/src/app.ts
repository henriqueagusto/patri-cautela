import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import cors from 'cors';
import express, { Router } from 'express';
import { env } from './env.js';
import { errorHandler } from './middleware/error.js';
import { prisma } from './prisma.js';
import { authRouter } from './routes/auth.js';
import { catalogRouter } from './routes/catalog.js';
import { cautelasRouter } from './routes/cautelas.js';
import { collectionsRouter } from './routes/collections.js';
import { equipmentsRouter } from './routes/equipments.js';
import { historyRouter } from './routes/history.js';
import { locationsRouter } from './routes/locations.js';
import { meRouter } from './routes/me.js';
import { peopleRouter } from './routes/people.js';
import { settingsRouter } from './routes/settings.js';
import { PASTA_UPLOADS, uploadsRouter } from './routes/uploads.js';
import { usersRouter } from './routes/users.js';

/** Pasta do frontend compilado, se este servidor também entrega as telas. */
export const PASTA_FRONTEND = (() => {
  if (!env.FRONTEND_DIR) return undefined;
  const pasta = resolve(env.FRONTEND_DIR);
  if (existsSync(join(pasta, 'index.html'))) return pasta;
  console.warn(`\nFRONTEND_DIR aponta para "${pasta}", mas não há index.html lá.`);
  console.warn('Rode `npm run build` na raiz do projeto. Por enquanto, só a API está no ar.\n');
  return undefined;
})();

/** Diz se o servidor está de pé e se consegue falar com o banco. */
async function saude(_req: express.Request, res: express.Response) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, banco: true });
  } catch {
    res.status(503).json({ ok: false, banco: false });
  }
}

/** Todas as rotas da API. Montado em /api e, sem frontend embutido, também na raiz. */
function criarApi() {
  const api = Router();

  // Fotos enviadas ficam em disco, na pasta UPLOAD_DIR. O banco guarda só
  // o caminho relativo /uploads/<arquivo>; o frontend completa com a base da API.
  api.use('/uploads', express.static(PASTA_UPLOADS, { maxAge: '7d', fallthrough: true }));

  api.get('/health', saude);

  api.use('/auth', authRouter);
  api.use('/me', meRouter);
  api.use('/equipments', equipmentsRouter);
  api.use('/cautelas', cautelasRouter);
  api.use('/locations', locationsRouter);
  api.use('/people', peopleRouter);
  api.use('/history', historyRouter);
  api.use('/users', usersRouter);
  api.use('/settings', settingsRouter);
  api.use('/uploads', uploadsRouter);
  api.use('/', catalogRouter);
  api.use('/', collectionsRouter);

  api.use((_req, res) => res.status(404).json({ mensagem: 'Rota não encontrada.' }));
  return api;
}

export function criarApp() {
  const app = express();
  const api = criarApi();

  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean) }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', api);

  if (PASTA_FRONTEND) {
    // Servidor único: telas e API no mesmo endereço. Os endereços das telas
    // (/cautelas, /locais…) pertencem ao frontend; a API fica só em /api.
    const indice = join(PASTA_FRONTEND, 'index.html');
    const semCache = (res: express.Response) => res.setHeader('Cache-Control', 'no-cache');

    app.get('/health', saude);

    app.use(
      express.static(PASTA_FRONTEND, {
        index: false,
        setHeaders: (res, arquivo) => {
          // Arquivos em /assets têm hash no nome: podem ficar em cache para sempre.
          // O resto (index.html, sw.js, manifest) é sempre conferido com o servidor.
          if (/[\\/]assets[\\/]/.test(arquivo)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          else semCache(res);
        },
      }),
    );
    // Qualquer outro endereço de tela devolve o app; o roteador do frontend resolve.
    app.get('*', (req, res, next) => {
      // Pedido de arquivo (tem extensão) que não existe é 404, não a tela inicial.
      if (extname(req.path) || !req.accepts('html')) return next();
      semCache(res);
      res.sendFile(indice);
    });
    app.use((_req, res) => res.status(404).json({ mensagem: 'Rota não encontrada.' }));
  } else {
    // Só API (frontend separado): mantém as rotas também na raiz, como sempre foi.
    app.use('/', api);
  }

  app.use(errorHandler);
  return app;
}
