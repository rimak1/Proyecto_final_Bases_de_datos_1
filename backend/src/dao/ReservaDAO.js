// DAO de Reserva.
import { BaseDAO } from './BaseDAO.js';

const SELECT_DETALLE = `
  SELECT rs.*, pl.nombre AS plan, pl.tipo AS tipoPlan, pl.precio AS precioPlan,
         p.idPrestador, p.idTipoPrestador, p.nombreComercial AS prestador, p.nit AS nitPrestador, p.rnt AS rntPrestador,
         p.direccion AS direccionPrestador, p.telefono AS telefonoPrestador, m.nombre AS municipio,
         CONCAT(c.nombres, ' ', c.apellidos) AS cliente, c.tipoDocumento, c.numeroDocumento,
         c.correo AS correoCliente, c.telefono AS telefonoCliente,
         (SELECT COALESCE(SUM(pg.monto), 0) FROM Pago pg WHERE pg.idReserva = rs.idReserva AND pg.estado = 'exitoso') AS totalPagado,
         (SELECT r.idResena FROM Resena r WHERE r.idReserva = rs.idReserva) AS idResena
  FROM Reserva rs
  JOIN Plan pl ON pl.idPlan = rs.idPlan
  JOIN Prestador p ON p.idPrestador = pl.idPrestador
  JOIN Municipio m ON m.codDane = p.codDane
  JOIN Cliente c ON c.idCliente = rs.idCliente`;

class ReservaDAO extends BaseDAO {
  constructor() {
    super('Reserva', 'idReserva',
      ['fechaCreacion', 'fechaServicio', 'estado', 'valorTotal', 'canal', 'idCliente', 'idPlan'],
      { orden: 'idReserva DESC' });
  }

  async listarTodos(conn) {
    const [filas] = await this.db(conn).query(`${SELECT_DETALLE} ORDER BY rs.idReserva DESC`);
    return filas;
  }

  async buscarDetalle(idReserva, conn) {
    const [filas] = await this.db(conn).execute(`${SELECT_DETALLE} WHERE rs.idReserva = ?`, [idReserva]);
    return filas[0] ?? null;
  }

  async listarPorCliente(idCliente, conn) {
    const [filas] = await this.db(conn).execute(`${SELECT_DETALLE} WHERE rs.idCliente = ? ORDER BY rs.fechaServicio DESC`, [idCliente]);
    return filas;
  }

  async cambiarEstado(idReserva, estado, conn) {
    await this.db(conn).execute('UPDATE Reserva SET estado = ? WHERE idReserva = ?', [estado, idReserva]);
    return this.buscarPorId(idReserva, conn);
  }
}

export default new ReservaDAO();
