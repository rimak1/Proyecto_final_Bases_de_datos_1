// DAO base: operaciones CRUD sobre una tabla. Cada DAO concreto define tabla, clave y columnas.
// Solo esta capa (y sus subclases) ejecuta SQL. Todas las consultas usan parámetros (?).
import { pool } from '../config/db.js';

export class BaseDAO {
  /**
   * @param {string} tabla   nombre de la tabla
   * @param {string} pk      columna clave primaria
   * @param {string[]} columnas columnas que se pueden escribir (sin la PK autoincremental)
   * @param {object} opciones { pkAuto: true, orden: 'col' }
   */
  constructor(tabla, pk, columnas, { pkAuto = true, orden } = {}) {
    this.tabla = tabla;
    this.pk = pk;
    this.columnas = columnas;
    this.pkAuto = pkAuto;
    this.orden = orden ?? pk;
  }

  db(conn) { return conn ?? pool; }

  /** Deja solo las columnas permitidas; convierte '' en NULL. */
  limpiar(obj, incluirPk = false) {
    const permitidas = incluirPk || !this.pkAuto ? [this.pk, ...this.columnas] : this.columnas;
    const datos = {};
    for (const c of permitidas) {
      if (obj[c] !== undefined) datos[c] = obj[c] === '' ? null : obj[c];
    }
    return datos;
  }

  async crear(obj, conn) {
    const datos = this.limpiar(obj);
    const cols = Object.keys(datos);
    const sql = `INSERT INTO ${this.tabla} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`;
    const [res] = await this.db(conn).execute(sql, cols.map((c) => datos[c]));
    const id = this.pkAuto ? res.insertId : datos[this.pk];
    return this.buscarPorId(id, conn);
  }

  async buscarPorId(id, conn) {
    const [filas] = await this.db(conn).execute(`SELECT * FROM ${this.tabla} WHERE ${this.pk} = ?`, [id]);
    return filas[0] ?? null;
  }

  async listarTodos(conn) {
    const [filas] = await this.db(conn).query(`SELECT * FROM ${this.tabla} ORDER BY ${this.orden}`);
    return filas;
  }

  async actualizar(id, obj, conn) {
    const datos = this.limpiar(obj);
    delete datos[this.pk];
    const cols = Object.keys(datos);
    if (cols.length) {
      const sql = `UPDATE ${this.tabla} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE ${this.pk} = ?`;
      await this.db(conn).execute(sql, [...cols.map((c) => datos[c]), id]);
    }
    return this.buscarPorId(id, conn);
  }

  async eliminar(id, conn) {
    const [res] = await this.db(conn).execute(`DELETE FROM ${this.tabla} WHERE ${this.pk} = ?`, [id]);
    return res.affectedRows > 0;
  }
}
