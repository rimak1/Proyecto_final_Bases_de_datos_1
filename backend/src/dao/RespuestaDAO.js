// DAO de Respuesta (una por reseña, RN-13).
import { BaseDAO } from './BaseDAO.js';

class RespuestaDAO extends BaseDAO {
  constructor() {
    super('Respuesta', 'idRespuesta', ['texto', 'fecha', 'idResena', 'idEncargado'], { orden: 'fecha DESC' });
  }

  async buscarPorResena(idResena, conn) {
    const [filas] = await this.db(conn).execute('SELECT * FROM Respuesta WHERE idResena = ?', [idResena]);
    return filas[0] ?? null;
  }
}

export default new RespuestaDAO();
