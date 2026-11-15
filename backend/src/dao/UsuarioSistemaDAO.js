// DAO de UsuarioSistema. Nunca devuelve la contraseña cifrada al listar.
import { BaseDAO } from './BaseDAO.js';

class UsuarioSistemaDAO extends BaseDAO {
  constructor() {
    super('UsuarioSistema', 'idUsuario', ['nombreUsuario', 'contrasenaCifrada', 'estado', 'idRol', 'idPrestador'],
      { orden: 'nombreUsuario' });
  }

  async listarTodos(conn) {
    const [filas] = await this.db(conn).query(
      `SELECT u.idUsuario, u.nombreUsuario, u.estado, u.idRol, u.idPrestador, r.nombre AS rol,
              p.nombreComercial AS prestador
       FROM UsuarioSistema u JOIN Rol r ON r.idRol = u.idRol
       LEFT JOIN Prestador p ON p.idPrestador = u.idPrestador ORDER BY u.nombreUsuario`);
    return filas;
  }

  async buscarPorId(id, conn) {
    const [filas] = await this.db(conn).execute(
      `SELECT u.idUsuario, u.nombreUsuario, u.estado, u.idRol, u.idPrestador, r.nombre AS rol
       FROM UsuarioSistema u JOIN Rol r ON r.idRol = u.idRol WHERE u.idUsuario = ?`, [id]);
    return filas[0] ?? null;
  }

  /** Para el inicio de sesión. */
  async buscarPorNombreUsuario(nombreUsuario, conn) {
    const [filas] = await this.db(conn).execute(
      `SELECT u.*, r.nombre AS rol FROM UsuarioSistema u JOIN Rol r ON r.idRol = u.idRol
       WHERE u.nombreUsuario = ?`, [nombreUsuario]);
    return filas[0] ?? null;
  }

  async cambiarEstado(idUsuario, estado, conn) {
    await this.db(conn).execute('UPDATE UsuarioSistema SET estado = ? WHERE idUsuario = ?', [estado, idUsuario]);
    return this.buscarPorId(idUsuario, conn);
  }
}

export default new UsuarioSistemaDAO();
