// Punto de entrada de la API REST de QuindíoStay (Express 5).
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import api from './routes/index.js';
import { manejadorErrores } from './middleware/errores.js';
import { pool } from './config/db.js';

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el archivo .env (copie .env.example como .env).');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));          // las fotos llegan en base64
app.use('/uploads', express.static(path.resolve('uploads')));
app.get('/api/salud', async (_req, res) => {
  const [[f]] = await pool.query('SELECT DATABASE() AS base, VERSION() AS version, NOW() AS hora');
  res.json({ ok: true, ...f });
});
app.use('/api', api);
app.use((_req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada.' }));
app.use(manejadorErrores);

const PORT = Number(process.env.PORT ?? 3000);
app.listen(PORT, () => console.log(`API de QuindíoStay en http://localhost:${PORT}`));
