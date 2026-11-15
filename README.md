# QuindíoStay — Dominio 10: Reseñas y recomendaciones turísticas

Proyecto final de Bases de Datos I · Grupo 02D · Universidad del Quindío · 2026-2.

Aplicación web en cuatro capas: **React 19 (Vite)** → **API REST Node.js 24 + Express 5** → **DAO con mysql2 (sin ORM)** → **MySQL 8.4 en Docker**.

## Estructura

```
database/
  01_DDL_Grupo02D.sql        tablas, llaves, CHECK, triggers (RN-25, RN-26), índices y vistas
  02_DML_Grupo02D.sql        datos de ejemplo (5.997 registros: 160 clientes, 565 reservas, 790 pagos, 2.001 notificaciones)
  03_Reportes_Grupo02D.sql   consultas de los 10 reportes
  tools/generar_dml.py       generador del script 02 (semilla fija)
  tools/completar_documento.py  arma el documento final con capturas y consultas
backend/                     API REST (src/dao, src/services, src/routes, src/dto)
frontend/                    aplicación React (pages, components, util/pdf.js)
entrega/                     capturas y PDF de reportes y documentos
docker-compose.yml           MySQL 8.4 que ejecuta 01 y 02 al crearse
```

## Instalación y ejecución

Requisitos: Docker Desktop, Node.js 24 LTS.

```bash
docker compose up -d
```

```bash
cd backend && cp .env.example .env && npm install && npm run dev
```

```bash
cd frontend && npm install && npm run dev
```

Abrir http://localhost:5173. La API queda en http://localhost:3000 (`/api/salud` verifica la conexión).

En `backend/.env` cambie `JWT_SECRET` por una clave larga propia.

Para volver a los datos iniciales: `docker compose down -v` y luego `docker compose up -d`.

## Usuarios de prueba

| Rol | Usuario | Contraseña |
|---|---|---|
| Administrador de la plataforma | `admin` | `Admin123*` |
| Encargado (Hotel Mirador del Cocora) | `enc.miradorcocora` | `Encargado123*` |
| Cliente | `ana.gomez@correo.com` | `Cliente123*` |

Todos los clientes con cuenta usan `Cliente123*`. Todos los encargados (`enc.*`) usan `Encargado123*`. La clienta Ana tiene dos reservas completadas sin reseña (#563 y #564) para probar la publicación.

## Reglas en la base y en los servicios

- **En la base (fila):** CHECK de dominios, arco exclusivo de `Resena` (RN-05), UNIQUE de una reseña por reserva (RN-04), un voto o reporte por cliente (RN-15, RN-19) y una respuesta por reseña (RN-13).
- **Con triggers:** RN-25 y RN-26. MySQL no permite un CHECK sobre columnas de una FK con CASCADE o SET NULL (error 3823), por eso esas dos reglas van en triggers.
- **En los servicios** (`backend/src/services`), las reglas que miran otras tablas:
  - RN-03: reserva completada del mismo cliente y del mismo prestador.
  - RN-10 y RN-11: criterios según el tipo de prestador.
  - RN-14: solo responde el encargado del prestador.
  - RN-16 y RN-19: no se vota ni se reporta la reseña propia.
  - RN-18: aceptar un reporte oculta la reseña.
  - RN-23: fechas.
  - RN-24: un prestador o destino con reseñas no se borra.
