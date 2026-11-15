// DAO de la tabla Rol (CRUD heredado de BaseDAO).
import { BaseDAO } from './BaseDAO.js';

class RolDAO extends BaseDAO {
  constructor() {
    super('Rol', 'idRol', ['nombre'], { orden: 'idRol' });
  }
}

export default new RolDAO();
