// CRUD de reservas (RF-06): crear (con precio congelado y notificaciones), consultar, actualizar,
// cambiar estado (pendiente, confirmada, completada) y eliminar; documentos PDF de cada reserva (RF-20).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, fecha, hoyISO, pesos, textoReembolso } from '../../api.js';
import { useSesion } from '../../auth.jsx';
import { Alerta, Cargando, Insignia, Modal, Titulo, Vacio, useLista, useConfirmar, IconoBasura } from '../../components/comunes.jsx';
import { Paginacion } from '../../components/CrudPage.jsx';
import { BotonesDocumentos } from '../cliente/MisReservas.jsx';
import { Icono } from '../../components/Iconos.jsx';

const SIGUIENTE = { pendiente: ['confirmada', 'cancelada'], confirmada: ['completada', 'cancelada'] };

export default function ReservasAdmin() {
  const confirmar = useConfirmar();
  const { usuario } = useSesion();
  const esAdmin = usuario.rol === 'admin';
  const [lista, setLista] = useState(null);
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('');
  const [pagina, setPagina] = useState(1);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const clientes = useLista(esAdmin ? '/clientes' : null);
  const planes = useLista('/planes');
  const cargar = useCallback(() => api('/reservas').then(setLista).catch((e) => setError(e.message)), []);
  useEffect(() => { cargar(); }, [cargar]);

  const visibles = useMemo(() => (lista ?? []).filter((r) => (!estado || r.estado === estado)
    && (!buscar || `${r.idReserva} ${r.cliente} ${r.prestador} ${r.plan}`.toLowerCase().includes(buscar.toLowerCase()))), [lista, buscar, estado]);

  const accion = async (fn, ok) => { setError(''); try { await fn(); setAviso(ok); cargar(); } catch (e) { setError(e.message); } };

  const guardar = async (e) => {
    e.preventDefault();
    try {
      if (form.idReserva) await api(`/reservas/${form.idReserva}`, { method: 'PUT', body: { fechaServicio: form.fechaServicio, valorTotal: form.valorTotal, canal: form.canal } });
      else await api('/reservas', { method: 'POST', body: form });
      setForm(null); setAviso('Reserva guardada.'); cargar();
    } catch (err) { setError(err.message); }
  };
  const plan = planes.find((p) => p.idPlan === Number(form?.idPlan));

  return (
    <div>
      <Titulo sub="Una reserva solo pasa a completada si antes estuvo confirmada; la completada habilita la reseña del prestador."
        acciones={esAdmin && <button className="btn btn-primary" onClick={() => { setError(''); setForm({ idCliente: '', idPlan: '', fechaServicio: '', cantidad: 1, canal: 'mostrador' }); }}>+ Nueva reserva</button>}>Reservas</Titulo>
      <Alerta mensaje={aviso} tipo="success" onCerrar={() => setAviso('')} />
      {!form && <Alerta mensaje={error} onCerrar={() => setError('')} />}
      <div className="card"><div className="card-body">
        <div className="barra-herramientas">
          <div className="buscador"><input className="form-control" type="search" aria-label="Buscar" placeholder="Buscar cliente, prestador o número" value={buscar} onChange={(e) => { setBuscar(e.target.value); setPagina(1); }} /></div>
          <div className="segmentado" role="tablist" aria-label="Filtrar por estado">
            {['', 'pendiente', 'confirmada', 'completada', 'cancelada'].map((s) => (
              <button key={s} role="tab" aria-selected={estado === s} className={estado === s ? 'activo' : ''} onClick={() => { setEstado(s); setPagina(1); }}>
                {s || 'todas'} <span className="text-muted small">{(lista ?? []).filter((r) => !s || r.estado === s).length}</span>
              </button>
            ))}
          </div>
        </div>
        {!lista ? <Cargando /> : (
          <>
          <div className="tabla-scroll"><table className="table table-hover align-middle">
            <thead><tr><th>#</th><th>Cliente</th><th>Prestador / plan</th><th>Servicio</th><th className="num">Valor</th><th className="num">Pagado</th><th>Estado</th><th className="text-end">Acciones</th></tr></thead>
            <tbody>{visibles.slice((pagina - 1) * 15, pagina * 15).map((r) => {
              const avanzar = (SIGUIENTE[r.estado] ?? []).find((s) => s !== 'cancelada');
              return (
              <tr key={r.idReserva}>
                <td className="text-muted">{r.idReserva}</td>
                <td>{r.cliente}<div className="small text-muted">{r.canal}</div></td>
                <td>{r.prestador}<div className="small text-muted">{r.plan}</div></td>
                <td>{fecha(r.fechaServicio)}<div className="small text-muted">creada {fecha(r.fechaCreacion)}</div></td>
                <td className="num">{pesos(r.valorTotal)}</td><td className="num">{pesos(r.totalPagado)}</td>
                <td><Insignia valor={r.estado} />{r.idResena && <div className="small text-muted">reseña #{r.idResena}</div>}</td>
                <td>
                  <div className="acciones">
                    {avanzar && <button className="btn btn-sm btn-primary" title={`Pasar a ${avanzar}`}
                      onClick={() => accion(() => api(`/reservas/${r.idReserva}/estado`, { method: 'PATCH', body: { estado: avanzar } }), `Reserva #${r.idReserva} ${avanzar}.`)}>{avanzar === 'confirmada' ? 'Confirmar' : 'Completar'}</button>}
                    {esAdmin && <button className="btn btn-sm btn-outline-primary" onClick={() => { setError(''); setForm({ ...r }); }}>Editar</button>}
                    <BotonesDocumentos idReserva={r.idReserva} onError={setError} />
                    {((SIGUIENTE[r.estado] ?? []).includes('cancelada') || (esAdmin && !['cancelada', 'completada'].includes(r.estado))) && <span className="separador" aria-hidden="true" />}
                    {(SIGUIENTE[r.estado] ?? []).includes('cancelada') && <button className="btn btn-sm btn-outline-danger"
                      onClick={async () => (await confirmar({ titulo: `Cancelar la reserva #${r.idReserva}`, mensaje: <>Se cancelará la reserva de {r.cliente} con {r.prestador} y se le notificará.<div className="alert alert-warning small mt-2 mb-0">{textoReembolso(r)}</div></>, textoAceptar: 'Sí, cancelar', textoCancelar: 'No', peligro: true }))
                        && accion(() => api(`/reservas/${r.idReserva}/estado`, { method: 'PATCH', body: { estado: 'cancelada' } }), `Reserva #${r.idReserva} cancelada.`)}>Cancelar</button>}
                    {esAdmin && !['cancelada', 'completada'].includes(r.estado) && <button className="btn btn-sm btn-outline-danger btn-icono" title="Eliminar" aria-label={`Eliminar reserva ${r.idReserva}`} onClick={async () => (await confirmar({ titulo: 'Eliminar reserva', mensaje: `¿Eliminar la reserva #${r.idReserva} de ${r.cliente}? Si tiene pagos o una reseña, la base de datos no lo permitirá; en ese caso cancélela.`, textoAceptar: 'Sí, eliminar', peligro: true })) && accion(() => api(`/reservas/${r.idReserva}`, { method: 'DELETE' }), 'Reserva eliminada.')}><IconoBasura /></button>}
                  </div>
                </td>
              </tr>
            ); })}</tbody>
          </table></div>
          {!visibles.length && <Vacio icono="buscar" titulo="No hay reservas con ese filtro" />}
          <Paginacion total={visibles.length} pagina={pagina} setPagina={setPagina} />
          </>
        )}
      </div></div>

      {form && (
        <Modal titulo={form.idReserva ? `Editar reserva #${form.idReserva}` : 'Nueva reserva'} onCerrar={() => setForm(null)}>
          <form onSubmit={guardar}>
            <Alerta mensaje={error} />
            <div className="row g-3">
              {!form.idReserva && <>
                <div className="col-12"><label className="form-label small fw-semibold" htmlFor="rc">Cliente *</label>
                  <select id="rc" className="form-select" required value={form.idCliente} onChange={(e) => setForm({ ...form, idCliente: e.target.value })}>
                    <option value="">Seleccione…</option>{clientes.map((c) => <option key={c.idCliente} value={c.idCliente}>{c.nombres} {c.apellidos} · {c.numeroDocumento}</option>)}</select></div>
                <div className="col-12"><label className="form-label small fw-semibold" htmlFor="rp">Plan *</label>
                  <select id="rp" className="form-select" required value={form.idPlan} onChange={(e) => setForm({ ...form, idPlan: e.target.value })}>
                    <option value="">Seleccione…</option>{planes.filter((p) => p.estado === 'activo').map((p) => <option key={p.idPlan} value={p.idPlan}>{p.prestador} · {p.nombre} · {pesos(p.precio)}</option>)}</select></div>
                <div className="col-md-4"><label className="form-label small fw-semibold" htmlFor="rq">Cantidad</label>
                  <input id="rq" type="number" min={1} className="form-control" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} /></div>
              </>}
              <div className="col-md-4"><label className="form-label small fw-semibold" htmlFor="rf">Fecha del servicio *</label>
                <input id="rf" type="date" className="form-control" required min={form.idReserva ? form.fechaCreacion : hoyISO()} value={form.fechaServicio} onChange={(e) => setForm({ ...form, fechaServicio: e.target.value })} /></div>
              <div className="col-md-4"><label className="form-label small fw-semibold" htmlFor="rca">Canal *</label>
                <select id="rca" className="form-select" value={form.canal} onChange={(e) => setForm({ ...form, canal: e.target.value })}>
                  {['web', 'aplicación móvil', 'teléfono', 'mostrador', 'agencia intermediaria'].map((c) => <option key={c}>{c}</option>)}</select></div>
              {form.idReserva && <div className="col-md-4"><label className="form-label small fw-semibold" htmlFor="rv">Valor total pactado *</label>
                <input id="rv" type="number" min={1} className="form-control" required value={form.valorTotal} onChange={(e) => setForm({ ...form, valorTotal: e.target.value })} /></div>}
            </div>
            {!form.idReserva && plan && <p className="mt-3 mb-0">Valor total: <strong>{pesos(plan.precio * (Number(form.cantidad) || 1))}</strong></p>}
            <div className="d-flex justify-content-end gap-2 mt-4">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setForm(null)}>Cancelar</button>
              <button className="btn btn-primary">Guardar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
