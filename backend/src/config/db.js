// Pool de conexiones con mysql2 (versión con promesas). Se crea una sola vez al iniciar la API.
import mysql from 'mysql2/promise';
import 'dotenv/config';

export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  database: process.env.DB_NAME ?? 'quindiostay',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  charset: 'utf8mb4',
  timezone: '-05:00',
  dateStrings: true,          // DATE y DATETIME llegan como texto 'YYYY-MM-DD'
  decimalNumbers: true,       // DECIMAL llega como número
  waitForConnections: true,
  connectionLimit: 10,
});

/** Ejecuta fn(conn) dentro de una transacción: commit si todo sale bien, rollback si falla. */
export async function enTransaccion(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await fn(conn);
    await conn.commit();
    return resultado;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
