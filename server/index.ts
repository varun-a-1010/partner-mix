import { resolve } from 'node:path';
import { buildApp } from './app';
import { FileStore } from './store';
import { createQloo } from './qloo';
import { createBrandAnalyst } from './brand-analyst';

const production = process.env.NODE_ENV === 'production';
const app = await buildApp(new FileStore(resolve(process.env.DATA_DIR ?? '.data')), {
  qloo: createQloo({ apiKey: process.env.QLOO_API_KEY }),
  analyst: createBrandAnalyst({
    project: process.env.VERTEX_LLM_PROJECT_ID,
    serviceAccount: process.env.VERTEX_LLM_SERVICE_ACCOUNT,
    location: process.env.VERTEX_LLM_REGION,
    backup: {
      project: process.env.VERTEX_LLM_BACKUP_PROJECT_ID,
      serviceAccount: process.env.VERTEX_LLM_BACKUP_SERVICE_ACCOUNT,
    },
    model: process.env.BRAND_MODEL,
  }),
  origin: process.env.APP_ORIGIN,
  production,
  staticRoot: production ? resolve('dist/client') : undefined,
});
const port = Number(process.env.PORT ?? 3193);
await app.listen({ port, host: process.env.HOST ?? '127.0.0.1' });
console.info(`Partner Mix API listening on port ${port}. Local private storage enabled.`);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, async () => {
    await app.close();
    process.exit(0);
  });
