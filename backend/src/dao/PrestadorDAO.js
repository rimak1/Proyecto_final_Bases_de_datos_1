// DAO de Prestador. Incluye la calificación promedio calculada (atributo derivado, RN-21).
import { BaseDAO } from './BaseDAO.js';

class PrestadorDAO extends BaseDAO {
  constructor() {
    super('Prestador', 'idPrestador',
      ['nombreComercial', 'nit', 'rnt', 'direccion', 'telefono', 'correo', 'estado', 'codDane', 'idTipoPrestador'],
      { orden: 'nombreComercial' });
  }

  /** buscar(nombre, municipio, tipo, estado) con el nombre del municipio, del tipo y el promedio. */
  async buscar({ nombre, codDane, idTipoPrestador, estado } = {}, conn) {
    const [filas] = await this.db(conn).execute(
      `SELECT p.*, m.nombre AS municipio, tp.nombre AS tipo,
              COUNT(r.idResena) AS cantidadResenas, ROUND(AVG(r.calificacionGeneral), 2) AS calificacionPromedio
       FROM Prestador p
       JOIN Municipio m ON m.codDane = p.codDane
       JOIN TipoPrestador tp ON tp.idTipoPrestador = p.idTipoPrestador
       LEFT JOIN Resena r ON r.idPrestador = p.idPrestador AND r.estado = 'visible'
       WHERE (? IS NULL OR p.nombreComercial LIKE CONCAT(?, '%'))
         AND (? IS NULL OR p.codDane = ?)
         AND (? IS NULL OR p.idTipoPrestador = ?)
         AND (? IS NULL OR p.estado = ?)
       GROUP BY p.idPrestador
       ORDER BY p.nombreComercial`,
      [nombre ?? null, nombre ?? null, codDane ?? null, codDane ?? null,
        idTipoPrestador ?? null, idTipoPrestador ?? null, estado ?? null, estado ?? null]);
    return filas;
  }

  async contarResenas(idPrestador, conn) {
    const [[f]] = await this.db(conn).execute('SELECT COUNT(*) AS n FROM Resena WHERE idPrestador = ?', [idPrestador]);
    return f.n;
  }

  async cambiarEstado(idPrestador, estado, conn) {
    await this.db(conn).execute('UPDATE Prestador SET estado = ? WHERE idPrestador = ?', [estado, idPrestador]);
    return this.buscarPorId(idPrestador, conn);
  }
}

export default new PrestadorDAO();
