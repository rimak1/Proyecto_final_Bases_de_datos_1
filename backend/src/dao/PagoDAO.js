// DAO de Pago.
import { BaseDAO } from './BaseDAO.js';

class PagoDAO extends BaseDAO {
  constructor() {
    super('Pago', 'idPago', ['fecha', 'monto', 'metodo', 'estado', 'referenciaTransaccion', 'idReserva'],
      { orden: 'idPago DESC' });
  }

  async listarTodos(conn) {
    const [filas] = await this.db(conn).query(
      `SELECT pg.*, CONCAT(c.nombres, ' ', c.apellidos) AS cliente
       FROM Pago pg JOIN Reserva rs ON rs.idReserva = pg.idReserva JOIN Cliente c ON c.idCliente = rs.idCliente
       ORDER BY pg.idPago DESC`);
    return filas;
  }

  async listarPorReserva(idReserva, conn) {
    const [filas] = await this.db(conn).execute('SELECT * FROM Pago WHERE idReserva = ? ORDER BY fecha, idPago', [idReserva]);
    return filas;
  }
}

export default new PagoDAO();
