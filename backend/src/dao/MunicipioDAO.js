// DAO de la tabla Municipio (CRUD heredado de BaseDAO).
import { BaseDAO } from './BaseDAO.js';

class MunicipioDAO extends BaseDAO {
  constructor() {
    super('Municipio', 'codDane', ['nombre'], { orden: 'nombre', pkAuto: false });
  }
}

export default new MunicipioDAO();
