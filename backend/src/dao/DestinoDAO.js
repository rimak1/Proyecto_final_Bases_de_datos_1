// DAO de Destino. Un destino con reseñas no se elimina: pasa a inactivo (RN-24).
import { BaseDAO } from './BaseDAO.js';

class DestinoDAO extends BaseDAO {
  constructor() {
    super('Destino', 'idDestino', ['nombre', 'descripcion', 'estado', 'codDane', 'idTipoDestino'], { orden: 'nombre' });
  }

  async buscar({ nombre, codDane, idTipoDestino, estado } = {}, conn) {
    const [filas] = await this.db(conn).execute(
      `SELECT d.*, m.nombre AS municipio, td.nombre AS tipo,
              COUNT(r.idResena) AS cantidadResenas, ROUND(AVG(r.calificacionGeneral), 2) AS calificacionPromedio
       FROM Destino d
       JOIN Municipio m ON m.codDane = d.codDane
       JOIN TipoDestino td ON td.idTipoDestino = d.idTipoDestino
       LEFT JOIN Resena r ON r.idDestino = d.idDestino AND r.estado = 'visible'
       WHERE (? IS NULL OR d.nombre LIKE CONCAT('%', ?, '%'))
         AND (? IS NULL OR d.codDane = ?)
         AND (? IS NULL OR d.idTipoDestino = ?)
         AND (? IS NULL OR d.estado = ?)
       GROUP BY d.idDestino
       ORDER BY d.nombre`,
      [nombre ?? null, nombre ?? null, codDane ?? null, codDane ?? null,
        idTipoDestino ?? null, idTipoDestino ?? null, estado ?? null, estado ?? null]);
    return filas;
  }

  async contarResenas(idDestino, conn) {
    const [[f]] = await this.db(conn).execute('SELECT COUNT(*) AS n FROM Resena WHERE idDestino = ?', [idDestino]);
    return f.n;
  }

  async cambiarEstado(idDestino, estado, conn) {
    await this.db(conn).execute('UPDATE Destino SET estado = ? WHERE idDestino = ?', [estado, idDestino]);
    return this.buscarPorId(idDestino, conn);
  }
}

export default new DestinoDAO();
