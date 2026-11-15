// Notificaciones (RF-04): CRUD completo, envío simulado de las pendientes y promociones para quienes las aceptan.
// Una notificación va al cliente directamente o a través de una de sus reservas, nunca por los dos (RN-26).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { useSesion } from '../../auth.jsx';
import { Alerta, Cargando, IconoBasura, Insignia, Modal, Titulo, Vacio, useConfirmar, useLista } from '../../components/comunes.jsx';
import { CamposAgrupados, Paginacion } from '../../components/CrudPage.jsx';

const TIPOS = ['recordatorio de reserva', 'confirmación de reserva', 'confirmación de pago', 'cambio de estado', 'promoción'];
const ESTADOS = ['pendiente', 'enviada', 'fallida', 'leída'];
const POR_PAGINA = 15;
const aLocal = (v) => (v ? String(v).replace(' ', 'T').slice(0, 16) : '');

function FormularioNotificacion({ inicial, onCerrar, onGuardado }) {
  const clientes = useLista('/clientes');
  const reservas = useLista('/reservas');
  const [datos, setDatos] = useState(inicial);
  const [via, setVia] = useState(inicial.idCliente && !inicial.idReserva ? 'cliente' : 'reserva');
  const [error, setError] = useState('');
  const campos = [
    { campo: 'tipo', grupo: 'Mensaje', etiqueta: 'Tipo', tipo: 'select', requerido: true, opciones: TIPOS },
    { campo: 'canal', grupo: 'Mensaje', etiqueta: 'Canal', tipo: 'select', requerido: true, opciones: ['correo', 'SMS', 'WhatsApp'] },
    { campo: 'mensaje', grupo: 'Mensaje', etiqueta: 'Mensaje', tipo: 'textarea', requerido: true, max: 500, ancho: 'col-12' },
    { campo: 'fechaProgramada', grupo: 'Envío', etiqueta: 'Fecha programada', tipo: 'datetime-local', requerido: true },
    { campo: 'fechaEnvio', grupo: 'Envío', etiqueta: 'Fecha real de envío', tipo: 'datetime-local', nota: 'Vacía si está pendiente; no puede ser anterior a la programada.' },
    { campo: 'estado', grupo: 'Envío', etiqueta: 'Estado', tipo: 'select', requerido: true, opciones: ESTADOS },
  ];
  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    const body = { ...datos, idCliente: via === 'cliente' ? datos.idCliente : null, idReserva: via === 'reserva' ? datos.idReserva : null };
    try {
      if (inicial.idNotificacion) await api(`/notificaciones/${inicial.idNotificacion}`, { method: 'PUT', body });
      else await api('/notificaciones', { method: 'POST', body });
      onGuardado(inicial.idNotificacion ? 'Notificación actualizada.' : 'Notificación creada.');
    } catch (err) { setError(err.message); }
  };
  return (
    <Modal titulo={inicial.idNotificacion ? `Editar notificación #${inicial.idNotificacion}` : 'Nueva notificación'} onCerrar={onCerrar}>
      <form onSubmit={guardar}>
        <Alerta mensaje={error} />
        <fieldset className="grupo">
          <legend>Destinatario</legend>
          <div className="segmentado mb-2" role="radiogroup" aria-label="Dirigida a">
            <button type="button" role="radio" aria-checked={via === 'reserva'} className={via === 'reserva' ? 'activo' : ''} onClick={() => setVia('reserva')}>A través de una reserva</button>
            <button type="button" role="radio" aria-checked={via === 'cliente'} className={via === 'cliente' ? 'activo' : ''} onClick={() => setVia('cliente')}>Directa al cliente</button>
          </div>
          {via === 'reserva' ? (
            <select key={reservas.length} className="form-select" required aria-label="Reserva" value={datos.idReserva ?? ''} onChange={(e) => setDatos({ ...datos, idReserva: e.target.value })}>
              <option value="">Seleccione la reserva…</option>
              {reservas.map((r) => <option key={r.idReserva} value={r.idReserva}>#{r.idReserva} · {r.cliente} · {r.prestador} · {r.fechaServicio}</option>)}
            </select>
          ) : (
            <select key={clientes.length} className="form-select" required aria-label="Cliente" value={datos.idCliente ?? ''} onChange={(e) => setDatos({ ...datos, idCliente: e.target.value })}>
              <option value="">Seleccione el cliente…</option>
              {clientes.map((c) => <option key={c.idCliente} value={c.idCliente}>{c.nombres} {c.apellidos} · {c.correo}</option>)}
            </select>
          )}
          <div className="form-text">Las promociones van directas al cliente y solo a quien las aceptó en su perfil; el destinatario de una notificación de reserva es el cliente de esa reserva.</div>
        </fieldset>
        <CamposAgrupados campos={campos} datos={datos} onChange={(k, v) => setDatos({ ...datos, [k]: v })} />
        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn-primary">Guardar</button>
        </div>
      </form>
    </Modal>
  );
}

export default function NotificacionesAdmin() {
  const confirmar = useConfirmar();
  const { usuario } = useSesion();
  const [lista, setLista] = useState(null);
  const [filtro, setFiltro] = useState({ tipo: '', estado: '', texto: '' });
  const [pagina, setPagina] = useState(1);
  const [promo, setPromo] = useState(null);
  const [form, setForm] = useState(null);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const cargar = useCallback(() => api('/notificaciones').then(setLista).catch((e) => setError(e.message)), []);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => setPagina(1), [filtro]);

  const visibles = useMemo(() => (lista ?? []).filter((n) => (!filtro.tipo || n.tipo === filtro.tipo) && (!filtro.estado || n.estado === filtro.estado)
    && (!filtro.texto || `${n.cliente} ${n.mensaje}`.toLowerCase().includes(filtro.texto.toLowerCase()))), [lista, filtro]);

  const procesar = async () => {
    try { const r = await api('/notificaciones/procesar', { method: 'POST' }); setAviso(`${r.enviadas} notificaciones pendientes enviadas (simulado).`); cargar(); } catch (e) { setError(e.message); }
  };
  const enviarPromo = async () => {
    try { const r = await api('/notificaciones/promocion', { method: 'POST', body: { mensaje: promo } }); setPromo(null); setAviso(`Promoción programada para ${r.creadas} clientes que aceptan promociones.`); cargar(); } catch (e) { setError(e.message); }
  };
  const eliminar = async (n) => {
    if (!(await confirmar({ titulo: 'Eliminar notificación', mensaje: `¿Eliminar la notificación #${n.idNotificacion} (${n.tipo})?`, textoAceptar: 'Sí, eliminar', peligro: true }))) return;
    try { await api(`/notificaciones/${n.idNotificacion}`, { method: 'DELETE' }); setAviso('Notificación eliminada.'); cargar(); } catch (e) { setError(e.message); }
  };
  const nueva = () => setForm({ tipo: 'recordatorio de reserva', canal: 'correo', mensaje: '', fechaProgramada: '', fechaEnvio: '', estado: 'pendiente', idCliente: '', idReserva: '' });
  const editar = (n) => setForm({ ...n, fechaProgramada: aLocal(n.fechaProgramada), fechaEnvio: aLocal(n.fechaEnvio), idCliente: n.idCliente ?? '', idReserva: n.idReserva ?? '' });

  return (
    <div>
      <Titulo sub="Una notificación va al cliente directamente (promoción) o a través de una de sus reservas (RN-26)."
        acciones={<>
          <button className="btn btn-outline-primary" onClick={procesar}>Enviar pendientes</button>
          {usuario.rol === 'admin' && <button className="btn btn-outline-primary" onClick={() => setPromo('')}>+ Promoción masiva</button>}
          <button className="btn btn-primary" onClick={nueva}>+ Nueva notificación</button>
        </>}>Notificaciones</Titulo>
      <Alerta mensaje={aviso} tipo="success" onCerrar={() => setAviso('')} />
      <Alerta mensaje={error} onCerrar={() => setError('')} />
      <div className="card"><div className="card-body">
        <div className="barra-herramientas">
          <div className="buscador"><input className="form-control" type="search" aria-label="Buscar" placeholder="Buscar cliente o mensaje" value={filtro.texto} onChange={(e) => setFiltro({ ...filtro, texto: e.target.value })} /></div>
          <div className="d-flex gap-2 flex-wrap">
            <select className="form-select" style={{ maxWidth: 230 }} aria-label="Tipo" value={filtro.tipo} onChange={(e) => setFiltro({ ...filtro, tipo: e.target.value })}>
              <option value="">Todos los tipos</option>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
            <select className="form-select" style={{ maxWidth: 180 }} aria-label="Estado" value={filtro.estado} onChange={(e) => setFiltro({ ...filtro, estado: e.target.value })}>
              <option value="">Todos los estados</option>{ESTADOS.map((t) => <option key={t}>{t}</option>)}</select>
          </div>
        </div>
        {!lista ? <Cargando /> : (
          <>
            <div className="tabla-scroll"><table className="table table-hover align-middle">
              <thead><tr><th>#</th><th>Tipo</th><th>Destinatario</th><th>Vía</th><th>Mensaje</th><th>Programada</th><th>Enviada</th><th>Estado</th><th className="text-end">Acciones</th></tr></thead>
              <tbody>{visibles.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).map((n) => (
                <tr key={n.idNotificacion}>
                  <td className="text-muted">{n.idNotificacion}</td><td className="small">{n.tipo}</td><td className="small">{n.cliente}</td>
                  <td className="small">{n.idReserva ? `reserva #${n.idReserva}` : 'directa'} · {n.canal}</td>
                  <td className="small" style={{ maxWidth: 300 }}>{n.mensaje}</td>
                  <td className="small text-nowrap">{n.fechaProgramada?.slice(0, 16)}</td><td className="small text-nowrap">{n.fechaEnvio?.slice(0, 16) ?? '—'}</td>
                  <td><Insignia valor={n.estado} /></td>
                  <td><div className="acciones">
                    <button className="btn btn-sm btn-outline-primary" onClick={() => editar(n)}>Editar</button>
                    <span className="separador" aria-hidden="true" />
                    <button className="btn btn-sm btn-outline-danger btn-icono" title="Eliminar" aria-label={`Eliminar notificación ${n.idNotificacion}`} onClick={() => eliminar(n)}><IconoBasura /></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table></div>
            {!visibles.length && <Vacio icono="🔔" titulo="No hay notificaciones con esos filtros" />}
            <Paginacion total={visibles.length} pagina={pagina} setPagina={setPagina} />
          </>
        )}
      </div></div>
      {form && <FormularioNotificacion inicial={form} onCerrar={() => setForm(null)} onGuardado={(m) => { setForm(null); setAviso(m); cargar(); }} />}
      {promo !== null && (
        <Modal titulo="Nueva promoción masiva" onCerrar={() => setPromo(null)}
          pie={<><button className="btn btn-outline-secondary" onClick={() => setPromo(null)}>Cancelar</button><button className="btn btn-primary" disabled={!promo.trim()} onClick={enviarPromo}>Programar</button></>}>
          <p className="small text-muted">Se crea una notificación por cada cliente cuyo perfil acepta promociones, por su canal preferido.</p>
          <textarea className="form-control" rows={3} maxLength={500} value={promo} onChange={(e) => setPromo(e.target.value)} aria-label="Mensaje" />
        </Modal>
      )}
    </div>
  );
}
