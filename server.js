'use strict';

require('dotenv').config();
require('./src/config/env'); // Validate env vars eagerly — fail fast

const app = require('./src/app');
const env = require('./src/config/env');

const server = app.listen(env.PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║      🦷   Dental Clinic API Server   🦷      ║
  ╠══════════════════════════════════════════════╣
  ║  Entorno  : ${env.NODE_ENV.padEnd(30)}║
  ║  Puerto   : ${String(env.PORT).padEnd(30)}║
  ║  Estado   : ${'En línea ✅'.padEnd(30)}║
  ╚══════════════════════════════════════════════╝
  `);
});

// ── Graceful shutdown ──────────────────────────────────────────────
const shutdown = (signal) => {
  console.log(`\n[Server] ${signal} recibido. Cerrando servidor...`);
  server.close(() => {
    console.log('[Server] Servidor HTTP cerrado correctamente.');
    process.exit(0);
  });

  // Force-exit if connections hang
  setTimeout(() => {
    console.error('[Server] Cierre forzado por timeout.');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── Unhandled errors ───────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught Exception:', error);
  process.exit(1);
});
