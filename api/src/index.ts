import { env } from './config/env';
import app from './app';
import { getSequelize, initModels, syncModelsIfEnabled } from './models';

function logConnectionHints(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  const combined = `${msg} ${(err as { parent?: Error })?.parent?.message ?? ''}`;

  if (/ETIMEDOUT|ECONNREFUSED|EAI_AGAIN/i.test(combined)) {
    console.error(`
[database] Could not reach PostgreSQL. Typical causes:
  • Wrong DATABASE_URL (copy the connection string from Neon dashboard)
  • Use the Neon "pooled" / pooler URL if direct connections are blocked
  • Outbound port 5432 blocked by firewall, VPN, or corporate network
  • Neon project paused — open the Neon console and resume the project
`);
  }
}

async function bootstrap() {
  env();
  const sequelize = getSequelize();
  initModels(sequelize);
  try {
    await sequelize.authenticate();
  } catch (err) {
    logConnectionHints(err);
    throw err;
  }
  await syncModelsIfEnabled();

  const port = env().PORT;
  app.listen(port, () => {
    console.log(`API listening on port ${port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server', err);
  logConnectionHints(err);
  process.exit(1);
});
