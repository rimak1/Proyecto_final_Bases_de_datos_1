// DAO de la tabla TipoDestino (CRUD heredado de BaseDAO).
import { BaseDAO } from './BaseDAO.js';

class TipoDestinoDAO extends BaseDAO {
  constructor() {
    super('TipoDestino', 'idTipoDestino', ['nombre'], { orden: 'nombre' });
  }
}

export default new TipoDestinoDAO();
