// Encargado de prestador: reseñas recibidas por su prestador y respuesta única a cada una (RF-14).
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Alerta, Cargando, Estrellas, Modal, Titulo, IconoBasura, useConfirmar } from '../../components/comunes.jsx';
import ResenaCard from '../../components/ResenaCard.jsx';

export default function ResenasRecibidas() {
  const confirmar = useConfirmar();
  const [datos, setDatos] = useState(null);
  const [filtro, setFiltro] = useState('sin');
  const [respondiendo, setRespondiendo] = useState(null);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const cargar = useCallback(() => api('/encargado/resenas').then(setDatos).catch((e) => setError(e.message)), []);
  useEffect(() => { cargar(); }, [cargar]);

  const responder = async () => {
    const editando = !!respondiendo.idRespuesta;
    try {
      await api(`/resenas/${respondiendo.idResena}/respuesta`, { method: editando ? 'PUT' : 'POST', body: { texto } });
      setRespondiendo(null); setTexto(''); setAviso(editando ? 'Respuesta actualizada.' : 'Respuesta publicada.'); cargar();
    } catch (e) { setError(e.message); setRespondiendo(null); }
  };
  const eliminarRespuesta = async (r) => {
    if (!(await confirmar({ titulo: 'Eliminar respuesta', mensaje: `Se quitará su respuesta a «${r.titulo}». Podrá volver a responder la reseña.`, textoAceptar: 'Sí, eliminar', peligro: true }))) return;
    try { await api(`/resenas/${r.idResena}/respuesta`, { method: 'DELETE' }); setAviso('Respuesta eliminada.'); cargar(); } catch (e) { setError(e.message); }
  };

  if (!datos) return <><Alerta mensaje={error} /><Cargando /></>;
  const lista = datos.resenas.filter((r) => (filtro === 'sin' ? !r.idRespuesta : filtro === 'con' ? r.idRespuesta : true));
  const sin = datos.resenas.filter((r) => !r.idRespuesta).length;

  return (
    <div>
      <Titulo sub={<>Calificación promedio <Estrellas valor={datos.resumen.calificacionPromedio} /> {datos.resumen.calificacionPromedio} · {datos.resumen.cantidadResenas} reseñas visibles · {sin} sin responder</>}>
        Reseñas de {datos.prestador.nombreComercial}
      </Titulo>
      <Alerta mensaje={aviso} tipo="success" onCerrar={() => setAviso('')} />
      <Alerta mensaje={error} onCerrar={() => setError('')} />
      <div className="btn-group mb-3">
        {[['sin', `Sin responder (${sin})`], ['con', 'Respondidas'], ['todas', 'Todas']].map(([k, t]) => (
          <button key={k} className={`btn btn-sm ${filtro === k ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setFiltro(k)}>{t}</button>
        ))}
      </div>
      {lista.map((r) => (
        <ResenaCard key={r.idResena} r={r} acciones={!r.idRespuesta
          ? <button className="btn btn-sm btn-primary" onClick={() => { setTexto(''); setRespondiendo(r); }}>Responder</button>
          : <>
            <button className="btn btn-sm btn-outline-primary" onClick={() => { setTexto(r.respuesta); setRespondiendo(r); }}>Editar respuesta</button>
            <button className="btn btn-sm btn-outline-danger btn-icono" title="Eliminar respuesta" aria-label="Eliminar respuesta" onClick={() => eliminarRespuesta(r)}><IconoBasura /></button>
          </>} />
      ))}
      {!lista.length && <p className="text-muted">No hay reseñas en esta vista.</p>}
      {respondiendo && (
        <Modal titulo={`${respondiendo.idRespuesta ? 'Editar respuesta a' : 'Responder a'} «${respondiendo.titulo}»`} onCerrar={() => setRespondiendo(null)}
          pie={<><button className="btn btn-outline-secondary" onClick={() => setRespondiendo(null)}>Cancelar</button>
            <button className="btn btn-primary" disabled={!texto.trim()} onClick={responder}>{respondiendo.idRespuesta ? 'Guardar cambios' : 'Publicar respuesta'}</button></>}>
          <p className="small text-muted">Cada reseña tiene una sola respuesta (RN-13); puede corregirla o eliminarla después.</p>
          <blockquote className="small border-start ps-2">{respondiendo.comentario ?? 'Sin comentario'}</blockquote>
          <textarea className="form-control" rows={4} maxLength={1000} value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Respuesta" />
        </Modal>
      )}
    </div>
  );
}
