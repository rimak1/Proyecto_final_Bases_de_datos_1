// DAO de la tabla TipoPrestador (CRUD heredado de BaseDAO).
import { BaseDAO } from './BaseDAO.js';

class TipoPrestadorDAO extends BaseDAO {
  constructor() {
    super('TipoPrestador', 'idTipoPrestador', ['nombre'], { orden: 'nombre' });
  }
}

export default new TipoPrestadorDAO();
