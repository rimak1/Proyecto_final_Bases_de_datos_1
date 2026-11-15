// DAO de Plan. actualizar() no cambia el prestador del plan (mantiene la coherencia de Resena.idPrestador).
import { BaseDAO } from './BaseDAO.js';

class PlanDAO extends BaseDAO {
  constructor() {
    super('Plan', 'idPlan',
      ['nombre', 'descripcion', 'tipo', 'precio', 'fechaInicioVigencia', 'fechaFinVigencia', 'estado', 'idPrestador'],
      { orden: 'idPrestador, nombre' });
  }

  async listarTodos(conn) {
    const [filas] = await this.db(conn).query(
      `SELECT pl.*, p.nombreComercial AS prestador FROM Plan pl
       JOIN Prestador p ON p.idPrestador = pl.idPrestador ORDER BY p.nombreComercial, pl.nombre`);
    return filas;
  }

  async listarPorPrestador(idPrestador, conn) {
    const [filas] = await this.db(conn).execute(
      'SELECT * FROM Plan WHERE idPrestador = ? ORDER BY precio', [idPrestador]);
    return filas;
  }

  async actualizar(id, obj, conn) {
    const { idPrestador, ...resto } = obj;   // el prestador de un plan no cambia
    return super.actualizar(id, resto, conn);
  }
}

export default new PlanDAO();
