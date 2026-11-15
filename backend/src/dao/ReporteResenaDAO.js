// DAO de ReporteResena (denuncias de reseñas y su moderación).
import { BaseDAO } from './BaseDAO.js';

class ReporteResenaDAO extends BaseDAO {
  constructor() {
    super('ReporteResena', 'idReporte',
      ['motivo', 'estado', 'fechaReporte', 'fechaResolucion', 'idResena', 'idCliente', 'idAdministrador'],
      { orden: 'fechaReporte' });
  }

  async listar({ estado } = {}, conn) {
    const [filas] = await this.db(conn).execute(
      `SELECT rr.*, CONCAT(c.nombres, ' ', c.apellidos) AS reportadoPor, r.titulo, r.comentario,
              r.calificacionGeneral, r.estado AS estadoResena, COALESCE(p.nombreComercial, d.nombre) AS objetoResenado,
              u.nombreUsuario AS administrador, DATEDIFF(CURDATE(), rr.fechaReporte) AS diasEspera
       FROM ReporteResena rr
       JOIN Cliente c ON c.idCliente = rr.idCliente
       JOIN Resena r ON r.idResena = rr.idResena
       LEFT JOIN Prestador p ON p.idPrestador = r.idPrestador
       LEFT JOIN Destino d ON d.idDestino = r.idDestino
       LEFT JOIN UsuarioSistema u ON u.idUsuario = rr.idAdministrador
       WHERE (? IS NULL OR rr.estado = ?)
       ORDER BY rr.fechaReporte, rr.idReporte`, [estado ?? null, estado ?? null]);
    return filas;
  }

  async listarPendientes(conn) { return this.listar({ estado: 'pendiente' }, conn); }

  /** resolver: estado, fecha de resolución y administrador (RN-25). */
  async resolver(idReporte, estado, idAdministrador, conn) {
    await this.db(conn).execute(
      `UPDATE ReporteResena SET estado = ?, fechaResolucion = CURDATE(), idAdministrador = ? WHERE idReporte = ?`,
      [estado, idAdministrador, idReporte]);
    return this.buscarPorId(idReporte, conn);
  }

  async eliminarDeCliente(idCliente, idResena, conn) {
    await this.db(conn).execute("DELETE FROM ReporteResena WHERE idCliente = ? AND idResena = ? AND estado = 'pendiente'", [idCliente, idResena]);
  }

  async listarPorCliente(idCliente, conn) {
    const [filas] = await this.db(conn).execute('SELECT idResena, motivo, estado FROM ReporteResena WHERE idCliente = ?', [idCliente]);
    return filas;
  }
}

export default new ReporteResenaDAO();
