// Publicar reseña (RF-09 a RF-12): de un prestador con una reserva completada, o de un destino.
// También se usa para modificar una reseña propia (RF-13).
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, fecha, leerArchivos } from '../../api.js';
import { Alerta, EstrellasInput, Titulo, useLista } from '../../components/comunes.jsx';

export function FormularioResena({ inicial, onGuardado }) {
  const editando = !!inicial?.idResena;
  const [params] = useSearchParams();
  const [tipo, setTipo] = useState(inicial ? (inicial.idPrestador ? 'prestador' : 'destino') : (params.get('destino') ? 'destino' : 'prestador'));
  const [idReserva, setIdReserva] = useState(inicial?.idReserva ?? params.get('reserva') ?? '');
  const [idDestino, setIdDestino] = useState(inicial?.idDestino ?? params.get('destino') ?? '');
  const [cal, setCal] = useState(inicial?.calificacionGeneral ?? 0);
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '');
  const [comentario, setComentario] = useState(inicial?.comentario ?? '');
  const [puntajes, setPuntajes] = useState(Object.fromEntries((inicial?.criterios ?? []).map((c) => [c.idCriterio, c.puntaje])));
  const [fotos, setFotos] = useState([]);
  const [quitar, setQuitar] = useState([]);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const reservas = useLista(!editando ? '/mis/reservas-resenables' : null);
  const destinos = useLista('/destinos', { estado: 'activo' });
  const [criterios, setCriterios] = useState([]);

  const reserva = reservas.find((r) => r.idReserva === Number(idReserva));
  const idTipoPrestador = inicial?.idTipoPrestador ?? reserva?.idTipoPrestador;

  useEffect(() => {   // el tipo del prestador de la reserva define los criterios que se califican (RN-10)
    if (tipo === 'prestador' && idTipoPrestador) api(`/criterios/tipo/${idTipoPrestador}`).then(setCriterios);
    else setCriterios([]);
  }, [tipo, idTipoPrestador]);

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (!cal) return setError('Asigne la calificación general de 1 a 5.');
    if (tipo === 'prestador' && criterios.some((c) => !puntajes[c.idCriterio])) return setError('Califique todos los criterios del prestador.');
    setEnviando(true);
    try {
      const body = {
        calificacionGeneral: cal, titulo, comentario, fotos: await leerArchivos(fotos),
        criterios: tipo === 'prestador' ? criterios.map((c) => ({ idCriterio: c.idCriterio, puntaje: puntajes[c.idCriterio] })) : [],
      };
      let r;
      if (editando) r = await api(`/resenas/${inicial.idResena}`, { method: 'PUT', body: { ...body, eliminarFotos: quitar } });
      else r = await api('/resenas', { method: 'POST', body: { ...body, ...(tipo === 'prestador' ? { idReserva: Number(idReserva) } : { idDestino: Number(idDestino) }) } });
      onGuardado(r);
    } catch (err) { setError(err.message); setEnviando(false); }
  };

  return (
    <form onSubmit={enviar}>
      <Alerta mensaje={error} />
      {!editando && (
        <div className="btn-group mb-3">
          <button type="button" className={`btn ${tipo === 'prestador' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setTipo('prestador')}>Un prestador que usé</button>
          <button type="button" className={`btn ${tipo === 'destino' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setTipo('destino')}>Un destino que visité</button>
        </div>
      )}
      <div className="row g-3">
        {!editando && tipo === 'prestador' && (
          <div className="col-12">
            <label className="form-label small fw-semibold" htmlFor="res">Reserva completada que respalda la reseña *</label>
            <select id="res" className="form-select" required value={idReserva} onChange={(e) => setIdReserva(e.target.value)}>
              <option value="">Seleccione…</option>
              {reservas.map((r) => <option key={r.idReserva} value={r.idReserva}>#{r.idReserva} · {r.prestador} · {r.plan} · {fecha(r.fechaServicio)}</option>)}
            </select>
            {!reservas.length && <div className="form-text text-warning">No tiene reservas completadas sin reseña. Solo se reseña un prestador con una reserva completada (RN-02).</div>}
          </div>
        )}
        {!editando && tipo === 'destino' && (
          <div className="col-12">
            <label className="form-label small fw-semibold" htmlFor="des">Destino *</label>
            <select id="des" className="form-select" required value={idDestino} onChange={(e) => setIdDestino(e.target.value)}>
              <option value="">Seleccione…</option>
              {destinos.map((d) => <option key={d.idDestino} value={d.idDestino}>{d.nombre} · {d.municipio}</option>)}
            </select>
          </div>
        )}
        {editando && <div className="col-12"><strong>{inicial.objetoResenado}</strong></div>}
        <div className="col-12">
          <label className="form-label small fw-semibold d-block">Calificación general *</label>
          <EstrellasInput valor={cal} onChange={setCal} etiqueta="Calificación general" conTexto />
        </div>
        {tipo === 'prestador' && criterios.length > 0 && (
          <div className="col-12">
            <label className="form-label small fw-semibold d-block">Criterios de este tipo de prestador *</label>
            <div className="row g-2">
              {criterios.map((c) => (
                <div className="col-md-6" key={c.idCriterio}><div className="criterio-fila">
                  <span>{c.nombre[0].toUpperCase() + c.nombre.slice(1)}</span>
                  <EstrellasInput valor={puntajes[c.idCriterio] ?? 0} onChange={(n) => setPuntajes({ ...puntajes, [c.idCriterio]: n })} etiqueta={c.nombre} conTexto />
                </div></div>
              ))}
            </div>
          </div>
        )}
        <div className="col-12">
          <label className="form-label small fw-semibold" htmlFor="tit">Título *</label>
          <input id="tit" className="form-control" required maxLength={100} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>
        <div className="col-12">
          <label className="form-label small fw-semibold" htmlFor="com">Comentario (opcional)</label>
          <textarea id="com" className="form-control" rows={4} maxLength={2000} value={comentario} onChange={(e) => setComentario(e.target.value)} />
          <div className="form-text">{comentario.length}/2000</div>
        </div>
        {editando && inicial.fotos.length > 0 && (
          <div className="col-12">
            <label className="form-label small fw-semibold d-block">Fotos actuales (marque las que quiere quitar)</label>
            <div className="d-flex gap-2 flex-wrap">
              {inicial.fotos.map((f) => (
                <label key={f.numeroFoto} className={`text-center ${quitar.includes(f.numeroFoto) ? 'opacity-50' : ''}`}>
                  <img src={f.rutaArchivo} alt="" className="foto-resena d-block" />
                  <input type="checkbox" checked={quitar.includes(f.numeroFoto)}
                    onChange={(e) => setQuitar(e.target.checked ? [...quitar, f.numeroFoto] : quitar.filter((n) => n !== f.numeroFoto))} /> quitar
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="col-12">
          <label className="form-label small fw-semibold" htmlFor="fot">Adjuntar fotos (hasta 6, JPG/PNG/WEBP)</label>
          <input id="fot" type="file" className="form-control" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(e) => setFotos([...e.target.files].slice(0, 6))} />
        </div>
      </div>
      <div className="d-flex justify-content-end mt-4">
        <button className="btn btn-primary" disabled={enviando}>{enviando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Publicar reseña'}</button>
      </div>
    </form>
  );
}

export default function PublicarResena() {
  const navegar = useNavigate();
  return (
    <div>
      <Titulo sub="Su opinión ayuda a otros viajeros y al prestador a mejorar.">Publicar reseña</Titulo>
      <div className="card"><div className="card-body">
        <FormularioResena onGuardado={() => navegar('/mis-resenas', { state: { aviso: 'Reseña publicada.' } })} />
      </div></div>
    </div>
  );
}
