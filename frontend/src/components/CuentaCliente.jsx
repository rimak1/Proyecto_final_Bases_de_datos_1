// CRUD de PerfilCliente (entidad débil de Cliente) desde la administración:
// crear la cuenta de un cliente registrado en mostrador, cambiar sus preferencias o contraseña, o eliminarla.
import { useState } from 'react';
import { api } from '../api.js';
import { Alerta, Modal, useConfirmar } from './comunes.jsx';
import { CamposAgrupados } from './CrudPage.jsx';

const CAMPOS = [
  { campo: 'contrasena', grupo: 'Acceso', etiqueta: 'Contraseña', tipo: 'password', requerido: true, nota: 'Mínimo 8 caracteres. Al editar, déjela vacía para conservarla.' },
  { campo: 'idioma', grupo: 'Preferencias', etiqueta: 'Idioma', tipo: 'select', requerido: true, opciones: ['español', 'inglés'] },
  { campo: 'canalPreferido', grupo: 'Preferencias', etiqueta: 'Canal preferido', tipo: 'select', requerido: true, opciones: ['correo', 'SMS', 'WhatsApp'] },
  { campo: 'diasAnticipacion', grupo: 'Preferencias', etiqueta: 'Recordatorios con anticipación de', tipo: 'select', requerido: true,
    opciones: [{ valor: 1, texto: '1 día' }, { valor: 3, texto: '3 días' }, { valor: 7, texto: '7 días' }] },
  { campo: 'aceptaPromociones', grupo: 'Preferencias', etiqueta: 'Acepta promociones', tipo: 'select', requerido: true,
    opciones: [{ valor: 'S', texto: 'Sí' }, { valor: 'N', texto: 'No' }] },
];

export default function CuentaCliente({ cliente, onCambio, onError }) {
  const [datos, setDatos] = useState(null);
  const [existe, setExiste] = useState(false);
  const [error, setError] = useState('');
  const confirmar = useConfirmar();
  const tiene = Number(cliente.tieneCuenta) === 1;

  const abrir = async () => {
    setError('');
    if (tiene) {
      const p = await api(`/clientes/${cliente.idCliente}/perfil`);
      setDatos({ ...p, contrasena: '' });
      setExiste(true);
    } else {
      setDatos({ contrasena: '', idioma: 'español', canalPreferido: 'correo', diasAnticipacion: 3, aceptaPromociones: 'N' });
      setExiste(false);
    }
  };
  const guardar = async (e) => {
    e.preventDefault();
    try {
      await api(`/clientes/${cliente.idCliente}/perfil`, { method: existe ? 'PUT' : 'POST', body: datos });
      setDatos(null);
      onCambio(existe ? 'Cuenta actualizada.' : `Cuenta creada: ${cliente.nombres} ya puede iniciar sesión con su correo.`);
    } catch (err) { setError(err.message); }
  };
  const eliminar = async () => {
    if (!(await confirmar({ titulo: 'Eliminar cuenta', mensaje: `${cliente.nombres} ${cliente.apellidos} ya no podrá iniciar sesión. Sus reservas y reseñas se conservan.`, textoAceptar: 'Sí, eliminar cuenta', peligro: true }))) return;
    try { await api(`/clientes/${cliente.idCliente}/perfil`, { method: 'DELETE' }); setDatos(null); onCambio('Cuenta eliminada.'); } catch (err) { onError(err.message); }
  };

  return (
    <>
      <button className={`btn btn-sm ${tiene ? 'btn-outline-secondary' : 'btn-outline-primary'}`} onClick={abrir}
        title={tiene ? 'Ver o cambiar la cuenta y preferencias' : 'Crear la cuenta para que pueda reservar en línea'}>
        {tiene ? 'Cuenta' : '+ Cuenta'}
      </button>
      {datos && (
        <Modal titulo={`${existe ? 'Cuenta' : 'Crear cuenta'} de ${cliente.nombres} ${cliente.apellidos}`} onCerrar={() => setDatos(null)}>
          <form onSubmit={guardar}>
            <Alerta mensaje={error} />
            <p className="small text-muted">Usuario de acceso: <strong>{cliente.correo}</strong></p>
            <CamposAgrupados campos={CAMPOS.map((c) => (c.campo === 'contrasena' && existe ? { ...c, requerido: false } : c))}
              datos={datos} editando={existe} onChange={(k, v) => setDatos({ ...datos, [k]: v })} />
            <div className="d-flex justify-content-between mt-2">
              {existe ? <button type="button" className="btn btn-outline-danger" onClick={eliminar}>Eliminar cuenta</button> : <span />}
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setDatos(null)}>Cancelar</button>
                <button className="btn btn-primary">{existe ? 'Guardar' : 'Crear cuenta'}</button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
