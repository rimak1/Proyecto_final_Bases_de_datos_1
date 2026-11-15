// Inicio de sesión de usuarios internos (UsuarioSistema + Rol) y de clientes (Cliente + PerfilCliente).
import bcrypt from 'bcryptjs';
import ClienteDAO from '../dao/ClienteDAO.js';
import UsuarioSistemaDAO from '../dao/UsuarioSistemaDAO.js';
import { enTransaccion } from '../config/db.js';
import { firmarToken, ROLES } from '../middleware/auth.js';
import { ErrorNegocio } from '../middleware/errores.js';
import { hoy } from '../util/fechas.js';

const ROL_POR_NOMBRE = {
  'administrador de la plataforma': ROLES.ADMIN,
  'encargado de prestador': ROLES.ENCARGADO,
  operador: ROLES.OPERADOR,
};

const CREDENCIALES_INVALIDAS = new ErrorNegocio(401, 'Usuario o contraseña incorrectos.');

export async function loginInterno(nombreUsuario, contrasena) {
  const u = await UsuarioSistemaDAO.buscarPorNombreUsuario(nombreUsuario ?? '');
  if (!u || !(await bcrypt.compare(contrasena ?? '', u.contrasenaCifrada))) throw CREDENCIALES_INVALIDAS;
  if (u.estado !== 'activo') throw new ErrorNegocio(403, 'El usuario está bloqueado.');
  const usuario = {
    id: u.idUsuario, nombre: u.nombreUsuario, rol: ROL_POR_NOMBRE[u.rol], nombreRol: u.rol, idPrestador: u.idPrestador,
  };
  return { token: firmarToken(usuario), usuario };
}

export async function loginCliente(correo, contrasena) {
  const c = await ClienteDAO.buscarPorCorreo(correo ?? '');
  if (!c || !c.contrasenaCifrada || !(await bcrypt.compare(contrasena ?? '', c.contrasenaCifrada))) throw CREDENCIALES_INVALIDAS;
  const usuario = { id: c.idCliente, nombre: `${c.nombres} ${c.apellidos}`, rol: ROLES.CLIENTE, nombreRol: 'cliente', idCliente: c.idCliente };
  return { token: firmarToken(usuario), usuario };
}

export function validarCliente(datos) {
  if (datos.fechaNacimiento && datos.fechaNacimiento >= hoy()) {
    throw new ErrorNegocio(400, 'La fecha de nacimiento debe ser anterior a la fecha actual.');
  }
}

/** RF-02: registra el cliente y crea su cuenta (PerfilCliente) en una transacción. */
export async function registrar(datos) {
  validarCliente(datos);
  if (!datos.contrasena || datos.contrasena.length < 8) throw new ErrorNegocio(400, 'La contraseña debe tener al menos 8 caracteres.');
  const hash = await bcrypt.hash(datos.contrasena, 10);
  const cliente = await enTransaccion(async (conn) => {
    const c = await ClienteDAO.crear(datos, conn);
    await ClienteDAO.crearPerfil(c.idCliente, hash, datos, conn);
    return c;
  });
  return loginCliente(cliente.correo, datos.contrasena);
}

export const hashContrasena = (txt) => bcrypt.hash(txt, 10);
