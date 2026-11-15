// Verificación del token JWT y del rol antes de llegar al controlador.
import jwt from 'jsonwebtoken';
import { ErrorNegocio } from './errores.js';

export const ROLES = { ADMIN: 'admin', ENCARGADO: 'encargado', OPERADOR: 'operador', CLIENTE: 'cliente' };

export function firmarToken(usuario) {
  return jwt.sign(usuario, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES ?? '8h' });
}

function leerToken(req) {
  const h = req.headers.authorization ?? '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

export function verificarToken(req, _res, next) {
  const token = leerToken(req);
  if (!token) throw new ErrorNegocio(401, 'Debe iniciar sesión.');
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ErrorNegocio(401, 'La sesión expiró; inicie sesión de nuevo.');
  }
  next();
}

/** Si viene un token válido lo lee; si no, sigue como visitante. */
export function tokenOpcional(req, _res, next) {
  const token = leerToken(req);
  if (token) {
    try { req.usuario = jwt.verify(token, process.env.JWT_SECRET); } catch { /* visitante */ }
  }
  next();
}

export const requiereRol = (...roles) => (req, _res, next) => {
  if (!req.usuario) throw new ErrorNegocio(401, 'Debe iniciar sesión.');
  if (!roles.includes(req.usuario.rol)) throw new ErrorNegocio(403, 'Su rol no tiene permiso para esta operación.');
  next();
};
