# 🦷 Dental Clinic API

REST API para gestión de clínica dental construida con **Node.js + Express + Supabase**.

---

## Inicio rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# → Edite .env con sus credenciales de Supabase

# 3. Ejecutar el schema en Supabase
# → Abra Supabase → SQL Editor → pegue y ejecute sql/schema.sql

# 4. Iniciar en desarrollo
npm run dev

# 5. Iniciar en producción
npm start
```

---

## Arquitectura por capas

```
server.js                 ← Entrada, graceful shutdown
src/
  app.js                  ← Express: seguridad, middlewares, rutas
  config/
    env.js                ← Variables de entorno validadas
    supabase.js           ← Clientes Supabase (admin, anon, por-petición)
  middlewares/
    auth.middleware.js    ← Verifica JWT, adjunta req.user + req.db
    error.middleware.js   ← Handler global de errores (sin info sensible)
    rateLimiter.js        ← 100 req/15min global; 10 req/15min auth
    validate.middleware.js← Lee resultados de express-validator
  modules/
    auth/                 ← Registro, login, logout, refresh
    patients/             ← CRUD pacientes + control financiero
    appointments/         ← CRUD citas + despacho de recordatorios
    notifications/        ← Nodemailer (email) + Twilio simulado (SMS)
sql/
  schema.sql              ← Tablas, índices, triggers, RLS, función add_payment
```

---

## Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Clave anónima pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (secreta) |
| `ALLOWED_ORIGINS` | Orígenes CORS permitidos (CSV) |
| `EMAIL_*` | Configuración SMTP (opcional en desarrollo) |

---

## Endpoints

### Autenticación — `/api/auth`

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/register` | Registrar nuevo dentista | No |
| POST | `/login` | Iniciar sesión → devuelve `access_token` | No |
| POST | `/logout` | Cerrar sesión | Sí |
| POST | `/refresh` | Renovar `access_token` con `refresh_token` | No |

**Login response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "...", "full_name": "..." },
    "access_token": "eyJ...",
    "refresh_token": "...",
    "expires_at": 1234567890
  }
}
```

---

### Pacientes — `/api/patients`  🔒

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar todos los pacientes del dentista |
| GET | `/:id` | Obtener paciente por ID |
| POST | `/` | Crear nuevo paciente |
| PUT | `/:id` | Actualizar paciente completo |
| DELETE | `/:id` | Eliminar paciente |
| POST | `/:id/payments` | Registrar pago (atómico) |
| **GET** | **`/:id/summary`** | **Servicio propio: balance + historial de citas** |

**POST `/api/patients` body:**
```json
{
  "full_name": "Ana Torres",
  "email": "ana@email.com",
  "phone": "+52 55 1234 5678",
  "treatment_description": "Ortodoncia completa",
  "total_cost": 25000.00,
  "total_paid": 5000.00
}
```

**POST `/:id/payments` body:**
```json
{
  "amount_paid": 3000.00,
  "payment_method": "card",
  "notes": "Abono mensual"
}
```

**GET `/:id/summary` response (Servicio Propio):**
```json
{
  "success": true,
  "data": {
    "paciente": { "id": "...", "nombre": "Ana Torres", "email": "..." },
    "resumen_financiero": {
      "costo_total": 25000.00,
      "total_pagado": 8000.00,
      "balance_restante": 17000.00,
      "pagado_en_su_totalidad": false,
      "porcentaje_pagado": 32
    },
    "historial_pagos": [...],
    "citas_recientes": [...],
    "generado_en": "2025-01-15T10:30:00.000Z"
  }
}
```

---

### Citas — `/api/appointments`  🔒

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/?date=&status=&patient_id=` | Listar citas (con filtros opcionales) |
| GET | `/:id` | Obtener cita por ID |
| POST | `/` | Crear nueva cita |
| PUT | `/:id` | Actualizar cita |
| DELETE | `/:id` | Eliminar cita |
| **POST** | **`/reminders/dispatch`** | **Servicio de terceros: enviar recordatorios** |

**POST `/api/appointments` body:**
```json
{
  "patient_id": "uuid-del-paciente",
  "appointment_date": "2025-02-10",
  "appointment_time": "09:30",
  "reason": "Limpieza dental",
  "status": "scheduled",
  "notes": "Paciente con sensibilidad"
}
```

**POST `/reminders/dispatch` — Twilio (simulado) + Nodemailer:**
```json
{
  "success": true,
  "procesadas": 3,
  "resultados": [
    { "id": "uuid", "status": "sent", "channels": { "email": "sent", "sms": "sent" } },
    { "id": "uuid", "status": "failed", "error": "..." }
  ]
}
```

---

## Seguridad implementada

| Capa | Detalle |
|------|---------|
| **Autenticación** | Supabase Auth (JWT). Cada petición crea un cliente RLS-aware. |
| **Autorización** | Row Level Security en todas las tablas: `auth.uid() = dentist_id`. |
| **Validación** | `express-validator` en todos los endpoints (tipos, longitudes, formatos). |
| **Helmet** | 12 cabeceras HTTP de seguridad + CSP configurado. |
| **CORS** | Lista blanca de orígenes; pre-flight cacheado. |
| **Rate Limit** | 100 req/15 min global; 10 req/15 min en rutas de auth. |
| **Error Handler** | No expone stack traces ni detalles internos en producción. |
| **Atomic Payments** | Función PL/pgSQL con `SELECT ... FOR UPDATE` previene condiciones de carrera. |
| **Body Size** | Límite de 10 KB para prevenir payloads maliciosos. |

---

## Servicio de notificaciones

Las notificaciones se envían de forma **no bloqueante** (`fire-and-forget`) al crear o cancelar citas.

- **Email**: Nodemailer con Ethereal en desarrollo (la URL de preview se imprime en consola). Configure `EMAIL_*` para producción.
- **SMS**: Twilio simulado — imprime la respuesta mock en consola. Para activar Twilio real, instale el paquete `twilio` y reemplace `sendSMS()` en `notification.service.js`.

---

## Flujo de autenticación

```
POST /api/auth/login
  → access_token (JWT)

Authorization: Bearer <access_token>   ← en todas las peticiones protegidas
  → auth.middleware verifica con Supabase
  → crea cliente RLS-aware (req.db)
  → RLS filtra datos automáticamente por dentist_id
```
