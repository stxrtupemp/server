import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import fs from 'fs';
import path from 'path';

async function bootstrap(): Promise<void> {
  // ── Ensure upload directory exists ────────────────────────────────────────
  const uploadDir = path.resolve(env.UPLOAD_DIR);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`📁  Upload directory created: ${uploadDir}`);
  }

  // ── Connect to database ───────────────────────────────────────────────────
  await connectDatabase();

  // ── Create and start Express app ─────────────────────────────────────────
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`\n🚀  Server running on http://localhost:${env.PORT}`);
    console.log(`    Environment : ${env.NODE_ENV}`);
    console.log(`    Health      : http://localhost:${env.PORT}/health`);
    console.log(`    API base    : http://localhost:${env.PORT}/api\n`);
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received — shutting down gracefully...`);

    server.close(async () => {
      console.log('✅  HTTP server closed');
      await disconnectDatabase();
      console.log('✅  Shutdown complete');
      process.exit(0);
    });

    // Force shutdown if graceful shutdown takes > 10 s
    setTimeout(() => {
      console.error('❌  Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT',  () => void shutdown('SIGINT'));

  // ── Unhandled rejections / exceptions ─────────────────────────────────────
  process.on('unhandledRejection', (reason) => {
    console.error('❌  Unhandled Rejection:', reason);
    // In production, crash so the process manager (Docker/PM2) can restart
    if (env.NODE_ENV === 'production') process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    console.error('❌  Uncaught Exception:', err);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error('❌  Failed to start server:', err);
  process.exit(1);
});
