// Administración de reseñas: consultar todas (visibles y ocultas), ocultar/mostrar y eliminar.
// La creación y edición las hace el cliente autor (RF-09 a RF-13).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../api.js';
import { Alerta, Cargando, Titulo, useConfirmar } from '../../components/comunes.jsx';
import ResenaCard from '../../components/ResenaCard.jsx';

export default function ResenasAdmin() {
  const confirmar = useConfirmar();
  const [filtros, setFiltros] = useState({ tipo: '', estado: '', texto: '' });
  const [lista, setLista] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [limite, setLimite] = useState(30);
  const cargar = useCallback(() => api('/resenas', { params: { tipo: filtros.tipo, estado: filtros.estado } }).then((d) => setLista(d.resenas)).catch((e) => setError(e.message)), [filtros.tipo, filtros.estado]);
  useEffect(() => { setLista(null); cargar(); }, [cargar]);

  const visibles = useMemo(() => {
    const t = filtros.texto.toLowerCase();
    return (lista ?? []).filter((r) => !t || [r.titulo, r.comentario, r.objetoResenado, r.autor].some((x) => x?.toLowerCase().includes(t)));
  }, [lista, filtros.texto]);

  const accion = async (fn, ok) => { try { await fn(); setAviso(ok); cargar(); } catch (e) { setError(e.message); } };

  return (
    <div>
      <Titulo sub="Las reseñas ocultas no cuentan para los promedios ni los reportes (RN-20).">Reseñas</Titulo>
      <Alerta mensaje={aviso} tipo="success" onCerrar={() => setAviso('')} />
      <Alerta mensaje={error} onCerrar={() => setError('')} />
      <div className="card mb-3"><div className="card-body row g-2">
        <div className="col-md-5"><input className="form-control" placeholder="Buscar por título, autor u objeto" value={filtros.texto} onChange={(e) => setFiltros({ ...filtros, texto: e.target.value })} /></div>
        <div className="col-md-3"><select className="form-select" aria-label="Objeto" value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}>
          <option value="">Prestadores y destinos</option><option value="prestador">Solo prestadores</option><option value="destino">Solo destinos</option></select></div>
        <div className="col-md-2"><select className="form-select" aria-label="Estado" value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}>
          <option value="">Todas</option><option>visible</option><option>oculta</option></select></div>
        <div className="col-md-2 align-self-center small text-muted">{visibles.length} reseñas</div>
      </div></div>
      {!lista ? <Cargando /> : visibles.slice(0, limite).map((r) => (
        <ResenaCard key={r.idResena} r={r} mostrarObjeto acciones={(
          <>
            <span className="small text-muted me-2">#{r.idResena} · {r.totalReportes} reportes</span>
            {r.estado === 'visible'
              ? <button className="btn btn-sm btn-outline-warning" onClick={() => accion(() => api(`/resenas/${r.idResena}/estado`, { method: 'PATCH', body: { estado: 'oculta' } }), 'Reseña oculta.')}>Ocultar</button>
              : <button className="btn btn-sm btn-outline-success" onClick={() => accion(() => api(`/resenas/${r.idResena}/estado`, { method: 'PATCH', body: { estado: 'visible' } }), 'Reseña visible.')}>Mostrar</button>}
            <button className="btn btn-sm btn-outline-danger" onClick={async () => (await confirmar({ titulo: 'Eliminar reseña', mensaje: `¿Eliminar la reseña #${r.idResena} «${r.titulo}» con sus puntajes, fotos, votos y reportes? Si solo quiere que no se vea, use Ocultar.`, textoAceptar: 'Sí, eliminar', peligro: true })) && accion(() => api(`/resenas/${r.idResena}`, { method: 'DELETE' }), 'Reseña eliminada.')}>Eliminar</button>
          </>
        )} />
      ))}
      {visibles.length > limite && <div className="text-center"><button className="btn btn-outline-primary" onClick={() => setLimite(limite + 30)}>Ver más</button></div>}
    </div>
  );
}
