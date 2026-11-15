import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { Protegida } from './auth.jsx';
import Login from './pages/Login.jsx';
import Registro from './pages/Registro.jsx';
import Explorar from './pages/Explorar.jsx';
import DetalleObjeto from './pages/DetalleObjeto.jsx';
import MisReservas from './pages/cliente/MisReservas.jsx';
import PublicarResena from './pages/cliente/PublicarResena.jsx';
import MisResenas from './pages/cliente/MisResenas.jsx';
import Perfil from './pages/cliente/Perfil.jsx';
import Notificaciones from './pages/cliente/Notificaciones.jsx';
import ResenasRecibidas from './pages/encargado/ResenasRecibidas.jsx';
import Tablero from './pages/admin/Tablero.jsx';
import Destinos from './pages/admin/Destinos.jsx';
import Criterios from './pages/admin/Criterios.jsx';
import Moderacion from './pages/admin/Moderacion.jsx';
import ResenasAdmin from './pages/admin/ResenasAdmin.jsx';
import Reportes from './pages/admin/Reportes.jsx';
import ReservasAdmin from './pages/admin/ReservasAdmin.jsx';
import NotificacionesAdmin from './pages/admin/NotificacionesAdmin.jsx';
import CrudPage from './components/CrudPage.jsx';
import { CONFIG_CRUD } from './pages/admin/configCrud.js';

const A = ['admin'];

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route element={<Layout />}>
        <Route index element={<Explorar />} />
        <Route path="/prestador/:id" element={<DetalleObjeto tipo="prestador" />} />
        <Route path="/destino/:id" element={<DetalleObjeto tipo="destino" />} />

        <Route path="/mis-reservas" element={<Protegida roles={['cliente']}><MisReservas /></Protegida>} />
        <Route path="/publicar" element={<Protegida roles={['cliente']}><PublicarResena /></Protegida>} />
        <Route path="/mis-resenas" element={<Protegida roles={['cliente']}><MisResenas /></Protegida>} />
        <Route path="/perfil" element={<Protegida roles={['cliente']}><Perfil /></Protegida>} />
        <Route path="/notificaciones" element={<Protegida roles={['cliente']}><Notificaciones /></Protegida>} />

        <Route path="/encargado" element={<Protegida roles={['encargado']}><ResenasRecibidas /></Protegida>} />

        <Route path="/admin" element={<Protegida roles={A}><Tablero /></Protegida>} />
        <Route path="/admin/destinos" element={<Protegida roles={A}><Destinos /></Protegida>} />
        <Route path="/admin/criterios" element={<Protegida roles={A}><Criterios /></Protegida>} />
        <Route path="/admin/moderacion" element={<Protegida roles={A}><Moderacion /></Protegida>} />
        <Route path="/admin/resenas" element={<Protegida roles={A}><ResenasAdmin /></Protegida>} />
        <Route path="/admin/reportes" element={<Protegida roles={A}><Reportes /></Protegida>} />
        <Route path="/admin/reservas" element={<Protegida roles={['admin', 'operador']}><ReservasAdmin /></Protegida>} />
        <Route path="/admin/notificaciones" element={<Protegida roles={['admin', 'operador']}><NotificacionesAdmin /></Protegida>} />
        {Object.entries(CONFIG_CRUD).map(([clave, cfg]) => (
          <Route key={clave} path={`/admin/${clave}`}
            element={<Protegida roles={cfg.roles ?? A}><CrudPage key={clave} config={cfg} /></Protegida>} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
