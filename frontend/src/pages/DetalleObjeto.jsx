// Reseñas visibles y calificación promedio de un prestador o un destino (RF-18); votar y reportar (RF-15, RF-16).
// Para un prestador muestra además sus planes y permite reservar (RF-05).
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, hoyISO, pesos } from '../api.js';
import { useSesion } from '../auth.jsx';
import { Alerta, Cargando, Estrellas, Modal } from '../components/comunes.jsx';
import ResenaCard from '../components/ResenaCard.jsx';

function Reservar({ plan, onCerrar }) {
  const navegar = useNavigate();
  const [datos, setDatos] = useState({ fechaServicio: '', cantidad: 1 });
  const [error, setError] = useState('');
  const enviar = async (e) => {
    e.preventDefault();
    try {
      await api('/mis/reservas', { method: 'POST', body: { idPlan: plan.idPlan, ...datos } });
      navegar('/mis-reservas', { state: { aviso: 'Reserva creada. Puede pagarla desde aquí.' } });
    } catch (err) { setError(err.message); }
  };
  return (
    <Modal titulo={`Reservar: ${plan.nombre}`} onCerrar={onCerrar}>
      <form onSubmit={enviar}>
        <Alerta mensaje={error} />
        <p className="small text-muted">{plan.descripcion}</p>
        <div className="row g-3">
          <div className="col-6">
            <label className="form-label small fw-semibold" htmlFor="fs">Fecha del servicio *</label>
            <input id="fs" type="date" className="form-control" required min={hoyISO()} max={plan.fechaFinVigencia}
              value={datos.fechaServicio} onChange={(e) => setDatos({ ...datos, fechaServicio: e.target.value })} />
          </div>
          <div className="col-6">
            <label className="form-label small fw-semibold" htmlFor="ca">Cantidad (personas o unidades)</label>
            <input id="ca" type="number" min={1} max={20} className="form-control" value={datos.cantidad} onChange={(e) => setDatos({ ...datos, cantidad: e.target.value })} />
          </div>
        </div>
        <div className="mt-3">Valor total: <strong>{pesos(plan.precio * (Number(datos.cantidad) || 1))}</strong> <span className="small text-muted">(precio congelado al reservar)</span></div>
        <div className="d-flex justify-content-end gap-2 mt-3">
          <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn-primary">Confirmar reserva</button>
        </div>
      </form>
    </Modal>
  );
}

export default function DetalleObjeto({ tipo }) {
  const { id } = useParams();
  const { usuario } = useSesion();
  const esCliente = usuario?.rol === 'cliente';
  const [obj, setObj] = useState(null);
  const [datos, setDatos] = useState(null);
  const [planes, setPlanes] = useState([]);
  const [reservando, setReservando] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(() => {
    const filtro = tipo === 'prestador' ? { idPrestador: id } : { idDestino: id };
    api('/resenas', { params: filtro }).then(setDatos).catch((e) => setError(e.message));
  }, [id, tipo]);

  useEffect(() => {
    setObj(null);
    if (tipo === 'prestador') {
      api('/prestadores').then((l) => setObj(l.find((p) => p.idPrestador === Number(id)) ?? {}));
      api(`/prestadores/${id}/planes`).then(setPlanes);
    } else {
      api('/destinos').then((l) => setObj(l.find((d) => d.idDestino === Number(id)) ?? {}));
    }
    cargar();
  }, [id, tipo, cargar]);

  const accion = async (fn, ok) => {
    setError('');
    try { await fn(); setAviso(ok); cargar(); } catch (e) { setError(e.message); }
  };

  if (!obj || !datos) return <Cargando />;
  const hoy = hoyISO();

  return (
    <div>
      <Link to="/" className="small">← Volver a explorar</Link>
      <div className="card my-3"><div className="card-body">
        <span className="chip">{obj.tipo}</span> <span className="small text-muted">{obj.municipio}</span>
        <h2 className="mt-2">{obj.nombre ?? obj.nombreComercial}</h2>
        <div className="fs-5"><Estrellas valor={datos.resumen?.calificacionPromedio} /> <strong>{datos.resumen?.calificacionPromedio ?? 'Sin calificar'}</strong>
          <span className="text-muted fs-6"> · {datos.resumen?.cantidadResenas ?? 0} reseñas visibles</span></div>
        {obj.descripcion && <p className="mt-2 mb-0">{obj.descripcion}</p>}
        {obj.direccion && <p className="mt-2 mb-0 text-muted">{obj.direccion} · {obj.telefono} · {obj.correo}</p>}
        {tipo === 'destino' && esCliente && obj.estado === 'activo' &&
          <Link className="btn btn-primary mt-3" to={`/publicar?destino=${id}`}>Escribir una reseña de este destino</Link>}
      </div></div>

      {tipo === 'prestador' && planes.length > 0 && (
        <>
          <h5>Planes</h5>
          <div className="row g-3 mb-4">
            {planes.map((p) => {
              const vigente = p.estado === 'activo' && p.fechaFinVigencia >= hoy && obj.estado === 'activo';
              return (
                <div className="col-md-4" key={p.idPlan}><div className="card h-100"><div className="card-body d-flex flex-column">
                  <span className="chip align-self-start">{p.tipo}</span>
                  <h6 className="mt-2">{p.nombre}</h6>
                  <p className="small text-muted flex-grow-1">{p.descripcion}</p>
                  <div className="d-flex justify-content-between align-items-center">
                    <strong>{pesos(p.precio)}</strong>
                    {esCliente && vigente && <button className="btn btn-sm btn-primary" onClick={() => setReservando(p)}>Reservar</button>}
                    {!vigente && <span className="small text-muted">No disponible</span>}
                  </div>
                </div></div></div>
              );
            })}
          </div>
        </>
      )}

      <h5>Reseñas</h5>
      {tipo === 'prestador' && <p className="small text-muted">Solo pueden reseñar este prestador los clientes con una reserva completada.</p>}
      <Alerta mensaje={error} onCerrar={() => setError('')} />
      <Alerta mensaje={aviso} tipo="success" onCerrar={() => setAviso('')} />
      {datos.resenas.map((r) => {
        const propia = esCliente && r.idCliente === usuario.idCliente;
        return (
          <ResenaCard key={r.idResena} r={r} miVoto={datos.votos?.[r.idResena]} reportada={datos.reportados?.includes(r.idResena)}
            onVotar={esCliente && !propia ? (t) => (datos.votos?.[r.idResena] === t
              ? accion(() => api(`/resenas/${r.idResena}/votos`, { method: 'DELETE' }), 'Voto retirado.')
              : accion(() => api(`/resenas/${r.idResena}/votos`, { method: 'POST', body: { tipoVoto: t } }), 'Voto registrado.')) : null}
            onRetirarReporte={() => accion(() => api(`/resenas/${r.idResena}/reportes`, { method: 'DELETE' }), 'Reporte retirado.')}
            onReportar={esCliente && !propia ? (m) => accion(() => api(`/resenas/${r.idResena}/reportes`, { method: 'POST', body: { motivo: m } }), 'Reporte enviado a moderación.') : null}
            acciones={propia && <span className="chip">Tu reseña</span>} />
        );
      })}
      {!datos.resenas.length && <p className="text-muted">Todavía no hay reseñas visibles.</p>}
      {!usuario && <p className="small"><Link to="/login">Inicie sesión</Link> como cliente para votar, reportar o reseñar.</p>}
      {reservando && <Reservar plan={reservando} onCerrar={() => setReservando(null)} />}
    </div>
  );
}
