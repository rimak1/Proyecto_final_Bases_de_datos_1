// Estructura de la aplicación según el prototipo de Figma: menú lateral (marca, rol y opciones) y
// encabezado blanco con la ubicación y el usuario. El menú depende del rol (RF-01).
// Gestalt: las opciones se agrupan por tema con un título (proximidad, región común); la opción activa se
// distingue por fondo y peso (semejanza/contraste). Usabilidad: todas las opciones visibles (reconocer antes
// que recordar), migas de pan, enlace para saltar al contenido y menú plegable en pantallas pequeñas.
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSesion } from '../auth.jsx';
import { Icono } from './Iconos.jsx';

const MENUS = {
  admin: [
    { items: [['/admin', 'Tablero', 'tablero', true], ['/admin/reportes', 'Reportes', 'grafico']] },
    { titulo: 'Reseñas', items: [['/admin/resenas', 'Reseñas', 'estrella'], ['/admin/moderacion', 'Moderación', 'bandera'], ['/admin/destinos', 'Destinos', 'ubicacion'],
      ['/admin/tipos-destino', 'Tipos de destino', 'etiqueta'], ['/admin/criterios', 'Criterios', 'lista']] },
    { titulo: 'Núcleo común', items: [['/admin/prestadores', 'Prestadores', 'edificio'], ['/admin/planes', 'Planes', 'documento'], ['/admin/clientes', 'Clientes', 'usuario'],
      ['/admin/reservas', 'Reservas', 'calendario'], ['/admin/pagos', 'Pagos', 'tarjeta'], ['/admin/notificaciones', 'Notificaciones', 'campana'],
      ['/admin/municipios', 'Municipios', 'mapa'], ['/admin/tipos-prestador', 'Tipos de prestador', 'etiqueta']] },
    { titulo: 'Usuarios y roles', items: [['/admin/usuarios', 'Usuarios del sistema', 'llave'], ['/admin/roles', 'Roles', 'escudo']] },
    { titulo: 'Sitio público', items: [['/', 'Explorar', 'brujula', true]] },
  ],
  operador: [
    { items: [['/admin/reservas', 'Reservas', 'calendario'], ['/admin/pagos', 'Pagos', 'tarjeta'], ['/admin/notificaciones', 'Notificaciones', 'campana']] },
    { titulo: 'Sitio público', items: [['/', 'Explorar', 'brujula', true]] },
  ],
  encargado: [{ items: [['/encargado', 'Reseñas recibidas', 'estrella']] }, { titulo: 'Sitio público', items: [['/', 'Explorar', 'brujula', true]] }],
  cliente: [
    { items: [['/', 'Explorar', 'brujula', true]] },
    { titulo: 'Mis viajes', items: [['/mis-reservas', 'Mis reservas', 'calendario'], ['/publicar', 'Publicar reseña', 'lapiz'], ['/mis-resenas', 'Mis reseñas', 'estrella']] },
    { titulo: 'Mi cuenta', items: [['/notificaciones', 'Notificaciones', 'campana'], ['/perfil', 'Mi perfil', 'usuario']] },
  ],
  visitante: [{ items: [['/', 'Explorar', 'brujula', true]] }],
};

const EXTRA = { '/prestador': ['Explorar', 'Prestador'], '/destino': ['Explorar', 'Destino'] };

/** Migas de pan a partir del menú del rol. */
function migas(menu, pathname) {
  for (const g of menu) {
    const it = g.items.find(([a, , , exacto]) => (exacto ? pathname === a : pathname.startsWith(a)));
    if (it) return g.titulo && g.titulo !== 'Sitio público' ? [g.titulo, it[1]] : [it[1]];
  }
  const extra = Object.keys(EXTRA).find((k) => pathname.startsWith(k));
  return extra ? EXTRA[extra] : [];
}

const iniciales = (n = '') => n.split(/[\s.]+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

export default function Layout() {
  const { usuario, salir } = useSesion();
  const navegar = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setAbierto(false); window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && setAbierto(false);
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, []);
  const menu = MENUS[usuario?.rol ?? 'visitante'];
  const ruta = migas(menu, pathname);

  return (
    <div className={`app ${abierto ? 'menu-abierto' : ''}`}>
      <a href="#contenido" className="saltar">Saltar al contenido</a>

      <aside className="lateral" aria-label="Menú principal">
        <Link to="/" className="lateral-marca">
          <span className="marca">QuindíoStay</span>
          <span className="rol">{usuario ? usuario.nombreRol : 'Reseñas y recomendaciones'}</span>
        </Link>
        <nav>
          {menu.map((g, i) => (
            <div className="lateral-grupo" key={g.titulo ?? i} role="group" aria-label={g.titulo}>
              {g.titulo && <div className="lateral-titulo">{g.titulo}</div>}
              {g.items.map(([a, t, icono, exacto]) => (
                <NavLink key={a} to={a} end={exacto} className="lateral-enlace">
                  <span className="icono"><Icono nombre={icono} tam={17} /></span>{t}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="lateral-pie">Bases de Datos I · Grupo 02D</div>
      </aside>
      <div className="velo" onClick={() => setAbierto(false)} aria-hidden="true" />

      <div className="principal">
        <header className="cabecera">
          <button className="btn btn-sm btn-outline-secondary d-lg-none" onClick={() => setAbierto(true)} aria-label="Abrir menú" aria-expanded={abierto}><Icono nombre="menu" tam={18} /></button>
          <nav aria-label="Ubicación" className="flex-grow-1 min-w-0">
            <ol className="breadcrumb m-0">
              <li className="breadcrumb-item"><Link to="/">Inicio</Link></li>
              {ruta.map((r, i) => <li key={`${i}-${r}`} className={`breadcrumb-item ${i === ruta.length - 1 ? 'active' : ''}`} aria-current={i === ruta.length - 1 ? 'page' : undefined}>{r}</li>)}
            </ol>
          </nav>
          {usuario ? (
            <div className="d-flex align-items-center gap-2">
              <span className="avatar" aria-hidden="true">{iniciales(usuario.nombre)}</span>
              <span className="small d-none d-sm-inline usuario-nombre" title={usuario.nombre}>{usuario.nombre}</span>
              <span className="text-muted d-none d-sm-inline">·</span>
              <button className="btn btn-sm btn-link px-1" onClick={() => { salir(); navegar('/login'); }}>Cerrar sesión</button>
            </div>
          ) : (
            <Link className="btn btn-sm btn-primary" to="/login">Iniciar sesión</Link>
          )}
        </header>
        <main id="contenido" className="contenido">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
