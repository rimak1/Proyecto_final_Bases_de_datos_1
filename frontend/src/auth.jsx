// Contexto de sesión: usuario autenticado, su rol y su token JWT.
import { createContext, useContext, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, guardarSesion, leerSesion } from './api.js';

const Ctx = createContext(null);

export function ProveedorSesion({ children }) {
  const [sesion, setSesion] = useState(leerSesion);

  const entrar = async (tipo, usuario, contrasena) => {
    const s = await api('/auth/login', { method: 'POST', body: { tipo, usuario, contrasena } });
    guardarSesion(s);
    setSesion(s);
    return s.usuario;
  };
  const registrar = async (datos) => {
    const s = await api('/auth/registro', { method: 'POST', body: datos });
    guardarSesion(s);
    setSesion(s);
    return s.usuario;
  };
  const salir = () => { guardarSesion(null); setSesion(null); };

  return <Ctx.Provider value={{ usuario: sesion?.usuario ?? null, entrar, registrar, salir }}>{children}</Ctx.Provider>;
}

export const useSesion = () => useContext(Ctx);

export const inicioPorRol = (rol) => ({ admin: '/admin', operador: '/admin/reservas', encargado: '/encargado', cliente: '/' }[rol] ?? '/');

/** Protege una ruta según el rol. */
export function Protegida({ roles, children }) {
  const { usuario } = useSesion();
  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to={inicioPorRol(usuario.rol)} replace />;
  return children;
}
