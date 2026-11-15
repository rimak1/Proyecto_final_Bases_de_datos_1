// Registro de cliente y creación de su cuenta (RF-02): inserta Cliente y PerfilCliente en una transacción.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSesion } from '../auth.jsx';
import { Alerta } from '../components/comunes.jsx';
import { CamposAgrupados } from '../components/CrudPage.jsx';
import { CONFIG_CRUD } from './admin/configCrud.js';
import { hoyISO } from '../api.js';

const CAMPOS_PERFIL = [
  { campo: 'contrasena', grupo: 'Cuenta y preferencias', etiqueta: 'Contraseña', tipo: 'password', requerido: true, nota: 'Mínimo 8 caracteres.' },
  { campo: 'idioma', grupo: 'Cuenta y preferencias', etiqueta: 'Idioma', tipo: 'select', requerido: true, opciones: ['español', 'inglés'], porDefecto: 'español' },
  { campo: 'canalPreferido', grupo: 'Cuenta y preferencias', etiqueta: 'Canal preferido', tipo: 'select', requerido: true, opciones: ['correo', 'SMS', 'WhatsApp'], porDefecto: 'correo' },
  { campo: 'diasAnticipacion', grupo: 'Cuenta y preferencias', etiqueta: 'Recordatorios con anticipación de', tipo: 'select', requerido: true,
    opciones: [{ valor: 1, texto: '1 día' }, { valor: 3, texto: '3 días' }, { valor: 7, texto: '7 días' }], porDefecto: 3 },
  { campo: 'aceptaPromociones', grupo: 'Cuenta y preferencias', etiqueta: '¿Acepta recibir promociones?', tipo: 'select', requerido: true,
    opciones: [{ valor: 'S', texto: 'Sí' }, { valor: 'N', texto: 'No' }], porDefecto: 'N' },
];

export default function Registro() {
  const { registrar } = useSesion();
  const navegar = useNavigate();
  const campos = [...CONFIG_CRUD.clientes.campos, ...CAMPOS_PERFIL];
  const [datos, setDatos] = useState(Object.fromEntries(campos.map((c) => [c.campo, c.porDefecto ?? ''])));
  const [error, setError] = useState('');

  const enviar = async (e) => {
    e.preventDefault();
    if (datos.fechaNacimiento >= hoyISO()) return setError('La fecha de nacimiento debe ser anterior a hoy.');
    try {
      await registrar(datos);
      navegar('/');
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="login-fondo d-flex align-items-center justify-content-center p-3">
      <div className="card" style={{ maxWidth: 760, width: '100%' }}>
        <div className="card-body p-4">
          <div className="login-marca">QuindíoStay</div>
          <h4 className="mt-2">Crear cuenta de cliente</h4>
          <p className="text-muted small">Sus datos básicos y las preferencias de su perfil. Los campos con <span className="obligatorio">*</span> son obligatorios.</p>
          <Alerta mensaje={error} />
          <form onSubmit={enviar}>
            <CamposAgrupados campos={campos} datos={datos} onChange={(k, v) => setDatos({ ...datos, [k]: v })} />
            <div className="d-flex justify-content-between align-items-center mt-4">
              <Link to="/login">Ya tengo cuenta</Link>
              <button className="btn btn-primary">Registrarme</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
