# 🦷 Molar — Frontend (Vanilla JS)

Interfaz web para la **Dental Clinic API** (Node.js + Express + Supabase). Sin frameworks: HTML, CSS y JavaScript puro con módulos ES.

## Estructura

```
dental-frontend/
  index.html              ← Login / registro
  app.html                ← Shell de la app (sidebar + vistas)
  css/
    styles.css             ← Sistema de diseño (tokens, componentes)
  js/
    config.js              ← URL base de la API (edítala aquí)
    storage.js              ← Sesión en localStorage
    api.js                   ← Cliente HTTP con refresh automático de token
    auth.page.js             ← Lógica del login/registro
    app.js                    ← Router por hash + guard de sesión
    services/
      auth.service.js
      patients.service.js
      appointments.service.js
    ui/
      modal.js               ← Modal reutilizable
      toast.js                ← Notificaciones
      format.js                ← Moneda, fechas, etiquetas de estado
    views/
      dashboard.view.js       ← Resumen / estadísticas
      patients.view.js        ← CRUD pacientes + pagos + resumen financiero
      appointments.view.js    ← CRUD citas + filtros + recordatorios
```

## Configuración

1. Abre `js/config.js` y ajusta la URL de tu backend:

   ```js
   export const API_BASE_URL = 'http://localhost:3000/api';
   ```

2. Asegúrate de que el backend tenga tu origen (el que sirva estos archivos) en la variable `ALLOWED_ORIGINS` de su `.env`, o las peticiones fallarán por CORS.

## Ejecutar

Como es HTML/JS estático (usa módulos ES, `import`/`export`), necesitas servirlo con un servidor HTTP simple — abrir el `index.html` con `file://` no funcionará por las restricciones de CORS de los módulos.

```bash
# Con Python
python3 -m http.server 5173

# o con Node
npx serve .
```

Luego abre `http://localhost:5173`.

## Flujo

1. **Login / registro** (`index.html`) → guarda `access_token` y `refresh_token` en `localStorage`.
2. **Panel** (`app.html`) → sidebar con navegación por hash (`#/dashboard`, `#/patients`, `#/appointments`).
3. Cada vista consume su `service` correspondiente, que a su vez usa `api.js`, el cual:
   - agrega el header `Authorization: Bearer <token>` automáticamente,
   - si recibe un `401`, intenta refrescar el token una vez con `/auth/refresh` y reintenta la petición,
   - si el refresh falla, limpia la sesión y redirige a `index.html`.

## Funcionalidad cubierta

- **Autenticación**: registro, login, logout, refresh automático.
- **Pacientes**: listar, crear, editar, eliminar, registrar pagos, ver resumen financiero (balance, historial de pagos, citas recientes).
- **Citas**: listar con filtros (fecha, estado, paciente), crear, editar, eliminar, disparar el envío de recordatorios (email + SMS simulado).
- **Dashboard**: pacientes activos, citas de hoy, balance pendiente total, pacientes al día.

## Notas de diseño

- Paleta clínica cálida: verde consultorio (`--primary`) + acento dorado (`--accent`, evocando una incrustación dental).
- El diagrama del login es un arco dental numerado (1–16), inspirado en la nomenclatura universal que usan los odontogramas reales.
- Tipografía: `Fraunces` (títulos), `Inter` (interfaz), `IBM Plex Mono` (montos, horas, folios).
- Todo el CRUD usa modales reutilizables (`ui/modal.js`) y notificaciones tipo toast (`ui/toast.js`).
