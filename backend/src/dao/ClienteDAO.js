// DAO de Cliente y de su entidad débil PerfilCliente.
import { BaseDAO } from './BaseDAO.js';

const COLS_PERFIL = ['idioma', 'canalPreferido', 'diasAnticipacion', 'aceptaPromociones'];

class ClienteDAO extends BaseDAO {
  constructor() {
    super('Cliente', 'idCliente',
      ['nombres', 'apellidos', 'tipoDocumento', 'numeroDocumento', 'correo', 'telefono', 'fechaNacimiento', 'ciudadOrigen'],
      { orden: 'apellidos, nombres' });
  }

  async listarTodos(conn) {
    const [filas] = await this.db(conn).query(
      `SELECT c.*, (pc.idCliente IS NOT NULL) AS tieneCuenta
       FROM Cliente c LEFT JOIN PerfilCliente pc ON pc.idCliente = c.idCliente
       ORDER BY c.apellidos, c.nombres`);
    return filas;
  }

  /** Para el inicio de sesión: cliente con la contraseña de su perfil. */
  async buscarPorCorreo(correo, conn) {
    const [filas] = await this.db(conn).execute(
      `SELECT c.*, pc.contrasenaCifrada FROM Cliente c
       LEFT JOIN PerfilCliente pc ON pc.idCliente = c.idCliente WHERE c.correo = ?`, [correo]);
    return filas[0] ?? null;
  }

  async buscarPerfil(idCliente, conn) {
    const [filas] = await this.db(conn).execute(
      `SELECT idCliente, idioma, canalPreferido, diasAnticipacion, aceptaPromociones
       FROM PerfilCliente WHERE idCliente = ?`, [idCliente]);
    return filas[0] ?? null;
  }

  async crearPerfil(idCliente, contrasenaCifrada, perfil = {}, conn) {
    const cols = COLS_PERFIL.filter((c) => perfil[c] !== undefined && perfil[c] !== '');
    await this.db(conn).execute(
      `INSERT INTO PerfilCliente (idCliente, contrasenaCifrada${cols.map((c) => ', ' + c).join('')})
       VALUES (?, ?${cols.map(() => ', ?').join('')})`,
      [idCliente, contrasenaCifrada, ...cols.map((c) => perfil[c])]);
    return this.buscarPerfil(idCliente, conn);
  }

  async actualizarPerfil(idCliente, perfil, conn) {
    const cols = COLS_PERFIL.filter((c) => perfil[c] !== undefined && perfil[c] !== '');
    if (perfil.contrasenaCifrada) cols.push('contrasenaCifrada');
    if (cols.length) {
      await this.db(conn).execute(
        `UPDATE PerfilCliente SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE idCliente = ?`,
        [...cols.map((c) => perfil[c]), idCliente]);
    }
    return this.buscarPerfil(idCliente, conn);
  }

  async eliminarPerfil(idCliente, conn) {
    const [res] = await this.db(conn).execute('DELETE FROM PerfilCliente WHERE idCliente = ?', [idCliente]);
    return res.affectedRows > 0;
  }

  async listarQueAceptanPromociones(conn) {
    const [filas] = await this.db(conn).query(
      `SELECT c.idCliente, pc.canalPreferido FROM Cliente c
       JOIN PerfilCliente pc ON pc.idCliente = c.idCliente WHERE pc.aceptaPromociones = 'S'`);
    return filas;
  }
}

export default new ClienteDAO();
