// DAO de Criterio y de la tabla puente CriterioTipoPrestador (relación APLICA).
import { BaseDAO } from './BaseDAO.js';

class CriterioDAO extends BaseDAO {
  constructor() {
    super('Criterio', 'idCriterio', ['nombre'], { orden: 'nombre' });
  }

  async listarTodos(conn) {
    const [filas] = await this.db(conn).query(
      `SELECT c.idCriterio, c.nombre,
              GROUP_CONCAT(tp.idTipoPrestador ORDER BY tp.nombre) AS idsTipos,
              GROUP_CONCAT(tp.nombre ORDER BY tp.nombre SEPARATOR ', ') AS tipos
       FROM Criterio c
       LEFT JOIN CriterioTipoPrestador ct ON ct.idCriterio = c.idCriterio
       LEFT JOIN TipoPrestador tp ON tp.idTipoPrestador = ct.idTipoPrestador
       GROUP BY c.idCriterio, c.nombre ORDER BY c.nombre`);
    return filas.map((f) => ({ ...f, idsTipos: f.idsTipos ? f.idsTipos.split(',').map(Number) : [] }));
  }

  async listarPorTipo(idTipoPrestador, conn) {
    const [filas] = await this.db(conn).execute(
      `SELECT c.* FROM Criterio c JOIN CriterioTipoPrestador ct ON ct.idCriterio = c.idCriterio
       WHERE ct.idTipoPrestador = ? ORDER BY c.nombre`, [idTipoPrestador]);
    return filas;
  }

  async asignarATipo(idCriterio, idTipoPrestador, conn) {
    await this.db(conn).execute(
      'INSERT IGNORE INTO CriterioTipoPrestador (idCriterio, idTipoPrestador) VALUES (?, ?)', [idCriterio, idTipoPrestador]);
  }

  async quitarDeTipo(idCriterio, idTipoPrestador, conn) {
    await this.db(conn).execute(
      'DELETE FROM CriterioTipoPrestador WHERE idCriterio = ? AND idTipoPrestador = ?', [idCriterio, idTipoPrestador]);
  }
}

export default new CriterioDAO();
