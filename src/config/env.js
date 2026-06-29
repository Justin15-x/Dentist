'use strict';

const REQUIRED = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

for (const key of REQUIRED) {
  if (!process.env[key]) {
    throw new Error(`[Config] Variable de entorno requerida no definida: ${key}`);
  }
}

module.exports = Object.freeze({
  NODE_ENV:                  process.env.NODE_ENV                 || 'development',
  PORT:                      parseInt(process.env.PORT, 10)       || 3000,

  // Supabase
  SUPABASE_URL:              process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY:         process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

  // CORS
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),

  // Nodemailer
  EMAIL_HOST: process.env.EMAIL_HOST  || 'smtp.ethereal.email',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT, 10) || 587,
  EMAIL_USER: process.env.EMAIL_USER  || null,
  EMAIL_PASS: process.env.EMAIL_PASS  || null,
  EMAIL_FROM: process.env.EMAIL_FROM  || 'Clínica Dental <noreply@clinicadental.com>',
});
