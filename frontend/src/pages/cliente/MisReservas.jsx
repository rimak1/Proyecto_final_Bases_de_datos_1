// Mis reservas: pagar (simulado), cancelar, descargar documentos (RF-05, RF-20) y reseñar las completadas.
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, fecha, pesos, textoReembolso } from '../../api.js';
import { Alerta, Cargando, Insignia, Modal, Titulo, Vacio, useConfirmar } from '../../components/comunes.jsx';
import { generarDocumento } from '../../util/pdf.js';

const DOCUMENTOS = [
  ['reserva', '🧾', 'Comprobante de reserva', 'Datos del cliente, del servicio y saldo pendiente.'],
  ['factura', '💵', 'Factura', 'Detalle del plan, base gravable, IVA y pagos aplicados.'],
  ['autorizacion', '✍', 'Autorización', 'Tratamiento de datos y prestación del servicio, para firmar.'],
];

/** Un solo botón abre los documentos de la reserva (menos opciones a la vista por fila). */
export function BotonesDocumentos({ idReserva, onError }) {
  const [datos, setDatos] = useState(null);
  const abrir = async () => {
    try { setDatos(await api(`/documentos/reserva/${idReserva}`)); } catch (e) { onError?.(e.message); }
  };
  const descargar = (tipo, pago) => generarDocumento(tipo, datos, pago);
  return (
    <>
      <button className="btn btn-sm btn-outline-secondary" onClick={abrir} title="Comprobantes, factura y autorización en PDF">📄 Documentos</button>
      {datos && (
        <Modal titulo={`Documentos de la reserva #${idReserva}`} onCerrar={() => setDatos(null)}>
          <div className="card-titulo">De la reserva</div>
          <div className="list-group mb-3">
            {DOCUMENTOS.map(([tipo, icono, titulo, desc]) => (
              <button key={tipo} className="list-group-item list-group-item-action d-flex gap-3 align-items-center" onClick={() => descargar(tipo)}>
                <span className="fs-4" aria-hidden="true">{icono}</span>
                <span className="flex-grow-1"><strong>{titulo}</strong><br /><span className="small text-muted">{desc}</span></span>
                <span className="small" style={{ color: 'var(--qs-verde)' }}>Descargar PDF</span>
              </button>
            ))}
          </div>
          <div className="card-titulo">Comprobantes de pago</div>
          {!datos.pagos.length ? <p className="text-muted small mb-0">La reserva todavía no tiene pagos.</p> : (
            <table className="table table-sm">
              <thead><tr><th>#</th><th>Fecha</th><th>Método</th><th className="num">Monto</th><th>Estado</th><th /></tr></thead>
              <tbody>{datos.pagos.map((p) => (
                <tr key={p.idPago}><td>{p.idPago}</td><td>{fecha(p.fecha)}</td><td>{p.metodo}</td><td className="num">{pesos(p.monto)}</td><td><Insignia valor={p.estado} /></td>
                  <td className="text-end"><button className="btn btn-sm btn-outline-primary" onClick={() => descargar('pago', p)}>PDF</button></td></tr>
              ))}</tbody>
            </table>
          )}
        </Modal>
      )}
    </>
  );
}

function Pagar({ reserva, onCerrar, onPagado }) {
  const saldo = reserva.valorTotal - reserva.totalPagado;
  const [datos, setDatos] = useState({ metodo: 'tarjeta de crédito', monto: saldo, tarjeta: '' });
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);
  const enviar = async (e) => {
    e.preventDefault();
    setProcesando(true);
    try {
      await api(`/mis/reservas/${reserva.idReserva}/pagos`, { method: 'POST', body: { metodo: datos.metodo, monto: Number(datos.monto) } });
      onPagado();
    } catch (err) { setError(err.message); setProcesando(false); }
  };
  return (
    <Modal titulo={`Pagar reserva #${reserva.idReserva}`} onCerrar={onCerrar}>
      <form onSubmit={enviar}>
        <Alerta mensaje={error} />
        <div className="alert alert-info small">Pago en línea <strong>simulado</strong>: no se cobra dinero real ni se piden datos de tarjeta. La pasarela genera una referencia de prueba.</div>
        <p>{reserva.prestador} · {reserva.plan}<br />Valor: {pesos(reserva.valorTotal)} · Pagado: {pesos(reserva.totalPagado)} · <strong>Saldo: {pesos(saldo)}</strong></p>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label small fw-semibold" htmlFor="met">Medio de pago</label>
            <select id="met" className="form-select" value={datos.metodo} onChange={(e) => setDatos({ ...datos, metodo: e.target.value })}>
              {['tarjeta de crédito', 'tarjeta débito', 'PSE', 'transferencia', 'efectivo'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label small fw-semibold" htmlFor="mon">Monto (abono o saldo)</label>
            <input id="mon" type="number" className="form-control" min={1} max={saldo} value={datos.monto} onChange={(e) => setDatos({ ...datos, monto: e.target.value })} />
          </div>
        </div>
        <div className="d-flex justify-content-end gap-2 mt-3">
          <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn-primary" disabled={procesando}>{procesando ? 'Procesando…' : `Pagar ${pesos(datos.monto)}`}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function MisReservas() {
  const confirmar = useConfirmar();
  const { state } = useLocation();
  const [reservas, setReservas] = useState(null);
  const [pagando, setPagando] = useState(null);
  const [grupo, setGrupo] = useState('proximas');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState(state?.aviso ?? '');
  const cargar = useCallback(() => api('/mis/reservas').then(setReservas).catch((e) => setError(e.message)), []);
  useEffect(() => { cargar(); }, [cargar]);

  const cancelar = async (r) => {
    if (!(await confirmar({ titulo: `Cancelar la reserva #${r.idReserva}`, mensaje: <>Se cancelará su reserva con {r.prestador} para el {fecha(r.fechaServicio)}.<div className="alert alert-warning small mt-2 mb-0">{textoReembolso(r)}</div></>, textoAceptar: 'Sí, cancelar reserva', textoCancelar: 'No, conservarla', peligro: true }))) return;
    try { await api(`/mis/reservas/${r.idReserva}/cancelar`, { method: 'POST' }); setAviso('Reserva cancelada.'); cargar(); } catch (e) { setError(e.message); }
  };

  const GRUPOS = {
    proximas: ['Próximas', (r) => ['pendiente', 'confirmada'].includes(r.estado)],
    resenar: ['Por reseñar', (r) => r.estado === 'completada' && !r.idResena],
    historial: ['Historial', (r) => r.estado === 'cancelada' || (r.estado === 'completada' && r.idResena)],
  };
  const lista = (reservas ?? []).filter(GRUPOS[grupo][1]);

  return (
    <div>
      <Titulo sub="Una reserva completada le permite reseñar al prestador (una reseña por reserva).">Mis reservas</Titulo>
      <Alerta mensaje={aviso} tipo="success" onCerrar={() => setAviso('')} />
      <Alerta mensaje={error} onCerrar={() => setError('')} />
      <div className="segmentado mb-3" role="tablist">
        {Object.entries(GRUPOS).map(([k, [t, f]]) => (
          <button key={k} role="tab" aria-selected={grupo === k} className={grupo === k ? 'activo' : ''} onClick={() => setGrupo(k)}>
            {t} <span className="badge text-bg-light ms-1">{(reservas ?? []).filter(f).length}</span>
          </button>
        ))}
      </div>
      {!reservas ? <Cargando /> : (
        <div className="card"><div className="card-body">
          <div className="tabla-scroll">
          <table className="table align-middle">
            <thead><tr><th>#</th><th>Prestador / plan</th><th>Servicio</th><th className="num">Valor</th><th className="num">Pagado</th><th>Estado</th><th className="text-end">Acciones</th></tr></thead>
            <tbody>
              {lista.map((r) => (
                <tr key={r.idReserva}>
                  <td className="text-muted">{r.idReserva}</td>
                  <td><Link to={`/prestador/${r.idPrestador}`} className="fw-semibold">{r.prestador}</Link><div className="small text-muted">{r.plan}</div></td>
                  <td>{fecha(r.fechaServicio)}</td>
                  <td className="num">{pesos(r.valorTotal)}</td>
                  <td className="num">{pesos(r.totalPagado)}{r.totalPagado < r.valorTotal && r.estado !== 'cancelada' && <div className="small text-danger">Saldo {pesos(r.valorTotal - r.totalPagado)}</div>}</td>
                  <td><Insignia valor={r.estado} /></td>
                  <td>
                    <div className="acciones">
                      {['pendiente', 'confirmada'].includes(r.estado) && r.totalPagado < r.valorTotal &&
                        <button className="btn btn-sm btn-primary" onClick={() => setPagando(r)}>Pagar</button>}
                      {r.estado === 'completada' && !r.idResena && <Link className="btn btn-sm btn-primary" to={`/publicar?reserva=${r.idReserva}`}>★ Reseñar</Link>}
                      {r.idResena && <span className="chip">✓ Reseñada</span>}
                      <BotonesDocumentos idReserva={r.idReserva} onError={setError} />
                      {['pendiente', 'confirmada'].includes(r.estado) && <>
                        <span className="separador" aria-hidden="true" />
                        <button className="btn btn-sm btn-outline-danger" onClick={() => cancelar(r)}>Cancelar</button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {!lista.length && (
            <Vacio icono="🧳" titulo={grupo === 'resenar' ? 'No tiene reservas pendientes de reseñar' : grupo === 'proximas' ? 'No tiene reservas próximas' : 'Sin reservas en el historial'}>
              {grupo === 'proximas' && <Link className="btn btn-sm btn-primary mt-2" to="/">Explorar prestadores</Link>}
            </Vacio>
          )}
        </div></div>
      )}
      {pagando && <Pagar reserva={pagando} onCerrar={() => setPagando(null)} onPagado={() => { setPagando(null); setAviso('Pago registrado. Le enviamos la confirmación.'); cargar(); }} />}
    </div>
  );
}
