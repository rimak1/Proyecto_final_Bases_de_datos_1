// DAO de Voto.
import { BaseDAO } from './BaseDAO.js';

class VotoDAO extends BaseDAO {
  constructor() {
    super('Voto', 'idVoto', ['tipoVoto', 'fecha', 'idCliente', 'idResena'], { orden: 'idVoto DESC' });
  }

  /** totalVotosUtiles (atributo derivado, RN-22). */
  async contarUtiles(idResena, conn) {
    const [[f]] = await this.db(conn).execute(
      "SELECT COUNT(*) AS n FROM Voto WHERE idResena = ? AND tipoVoto = 'útil'", [idResena]);
    return f.n;
  }

  async buscarPorClienteYResena(idCliente, idResena, conn) {
    const [filas] = await this.db(conn).execute('SELECT * FROM Voto WHERE idCliente = ? AND idResena = ?', [idCliente, idResena]);
    return filas[0] ?? null;
  }

  async listarPorCliente(idCliente, conn) {
    const [filas] = await this.db(conn).execute('SELECT idResena, tipoVoto FROM Voto WHERE idCliente = ?', [idCliente]);
    return filas;
  }
}

export default new VotoDAO();
