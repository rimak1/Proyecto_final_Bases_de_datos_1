// DAO de Notificacion. El destinatario es idCliente o el cliente de la reserva (RN-26).
import { BaseDAO } from './BaseDAO.js';

class NotificacionDAO extends BaseDAO {
  constructor() {
    super('Notificacion', 'idNotificacion',
      ['tipo', 'canal', 'mensaje', 'fechaProgramada', 'fechaEnvio', 'estado', 'idCliente', 'idReserva'],
      { orden: 'idNotificacion DESC' });
  }

  async listarTodos(conn) {
    const [filas] = await this.db(conn).query(
      `SELECT n.*, COALESCE(n.idCliente, rs.idCliente) AS destinatario,
              CONCAT(c.nombres, ' ', c.apellidos) AS cliente
       FROM Notificacion n
       LEFT JOIN Reserva rs ON rs.idReserva = n.idReserva
       JOIN Cliente c ON c.idCliente = COALESCE(n.idCliente, rs.idCliente)
       ORDER BY n.fechaProgramada DESC, n.idNotificacion DESC`);
    return filas;
  }

  /** Historial de un cliente: directas y las de sus reservas. */
  async listarPorCliente(idCliente, conn) {
    const [filas] = await this.db(conn).execute(
      `SELECT n.* FROM Notificacion n LEFT JOIN Reserva rs ON rs.idReserva = n.idReserva
       WHERE n.idCliente = ? OR rs.idCliente = ?
       ORDER BY n.fechaProgramada DESC, n.idNotificacion DESC`, [idCliente, idCliente]);
    return filas;
  }

  async listarPendientes(conn) {
    const [filas] = await this.db(conn).query(
      `SELECT * FROM Notificacion WHERE estado = 'pendiente' AND fechaProgramada <= NOW() ORDER BY fechaProgramada`);
    return filas;
  }

  async marcarEnviada(idNotificacion, conn) {
    await this.db(conn).execute(
      `UPDATE Notificacion SET estado = 'enviada', fechaEnvio = GREATEST(NOW(), fechaProgramada) WHERE idNotificacion = ?`,
      [idNotificacion]);
  }

  async marcarLeida(idNotificacion, conn) {
    await this.db(conn).execute(
      `UPDATE Notificacion SET estado = 'leída', fechaEnvio = COALESCE(fechaEnvio, GREATEST(NOW(), fechaProgramada))
       WHERE idNotificacion = ?`, [idNotificacion]);
  }
}

export default new NotificacionDAO();
