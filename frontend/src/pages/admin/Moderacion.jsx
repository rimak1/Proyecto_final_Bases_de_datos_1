// Moderación: resolver los reportes pendientes; al aceptar uno, la reseña queda oculta (RF-17, RN-18, RN-25).
import { useCallback, useEffect, useState } from 'react';
import { api, fecha } from '../../api.js';
import { Alerta, Cargando, Estrellas, IconoBasura, Insignia, Titulo, useConfirmar } from '../../components/comunes.jsx';

export default function Moderacion() {
  const [estado, setEstado] = useState('pendiente');
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const cargar = useCallback(() => api('/moderacion/reportes', { params: { estado } }).then(setLista).catch((e) => setError(e.message)), [estado]);
  useEffect(() => { setLista(null); cargar(); }, [cargar]);

  const confirmar = useConfirmar();
  const eliminar = async (r) => {
    if (!(await confirmar({ titulo: 'Eliminar reporte', mensaje: `¿Eliminar el reporte #${r.idReporte} (${r.motivo})? Si fue aceptado, la reseña sigue oculta hasta que la muestre desde Reseñas.`, textoAceptar: 'Sí, eliminar', peligro: true }))) return;
    try { await api(`/moderacion/reportes/${r.idReporte}`, { method: 'DELETE' }); setAviso('Reporte eliminado.'); cargar(); } catch (e) { setError(e.message); }
  };
  const resolver = async (r, nuevo) => {
    try {
      await api(`/moderacion/reportes/${r.idReporte}`, { method: 'PUT', body: { estado: nuevo } });
      setAviso(nuevo === 'aceptado' ? `Reporte aceptado: la reseña #${r.idResena} quedó oculta.` : 'Reporte rechazado: la reseña sigue visible.');
      cargar();
    } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <Titulo sub="Denuncias de clientes sobre reseñas ofensivas, falsas, spam o que no corresponden.">Moderación de reseñas</Titulo>
      <Alerta mensaje={aviso} tipo="success" onCerrar={() => setAviso('')} />
      <Alerta mensaje={error} onCerrar={() => setError('')} />
      <div className="btn-group mb-3">
        {['pendiente', 'aceptado', 'rechazado', ''].map((e) => (
          <button key={e} className={`btn btn-sm ${estado === e ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setEstado(e)}>{e || 'todos'}</button>
        ))}
      </div>
      {!lista ? <Cargando /> : (
        <div className="card"><div className="card-body tabla-scroll">
          <table className="table table-sm align-middle">
            <thead><tr><th>#</th><th>Reseña reportada</th><th>Motivo</th><th>Reportó</th><th>Fecha</th><th>Espera</th><th>Estado</th><th className="text-end">Acciones</th></tr></thead>
            <tbody>{lista.map((r) => (
              <tr key={r.idReporte}>
                <td>{r.idReporte}</td>
                <td style={{ maxWidth: 360 }}>
                  <div><Estrellas valor={r.calificacionGeneral} /> <strong>{r.titulo}</strong> <span className="small text-muted">#{r.idResena} · {r.objetoResenado}</span></div>
                  <div className="small text-muted">{r.comentario}</div>
                  <Insignia valor={r.estadoResena} />
                </td>
                <td><span className="chip">{r.motivo}</span></td><td className="small">{r.reportadoPor}</td>
                <td>{fecha(r.fechaReporte)}</td><td>{r.estado === 'pendiente' ? `${r.diasEspera} d` : <span className="small">{fecha(r.fechaResolucion)} · {r.administrador}</span>}</td>
                <td><Insignia valor={r.estado} /></td>
                <td><div className="acciones">{r.estado === 'pendiente' && <>
                  <button className="btn btn-sm btn-danger" onClick={() => resolver(r, 'aceptado')}>Aceptar y ocultar</button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => resolver(r, 'rechazado')}>Rechazar</button></>}
                  <span className="separador" aria-hidden="true" />
                  <button className="btn btn-sm btn-outline-danger btn-icono" title="Eliminar reporte" aria-label={`Eliminar reporte ${r.idReporte}`} onClick={() => eliminar(r)}><IconoBasura /></button>
                </div></td>
              </tr>
            ))}
              {!lista.length && <tr><td colSpan={8} className="text-center text-muted py-4">No hay reportes en este estado.</td></tr>}
            </tbody>
          </table>
        </div></div>
      )}
    </div>
  );
}
