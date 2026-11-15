// Tarjeta de una reseña: calificación, criterios, fotos, respuesta del prestador, votos y reporte.
import { useState } from 'react';
import { fecha } from '../api.js';
import { Estrellas, Insignia, Modal } from './comunes.jsx';

export default function ResenaCard({ r, mostrarObjeto, acciones, miVoto, reportada, onVotar, onReportar, onRetirarReporte }) {
  const [foto, setFoto] = useState(null);
  const [reportando, setReportando] = useState(false);
  const [motivo, setMotivo] = useState('falsa');

  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="d-flex justify-content-between flex-wrap gap-2">
          <div>
            <Estrellas valor={r.calificacionGeneral} /> <strong className="ms-1">{r.titulo}</strong>
            {r.estado === 'oculta' && <span className="ms-2"><Insignia valor="oculta" /></span>}
            <div className="small text-muted">
              {r.autor} · {fecha(r.fecha)}
              {mostrarObjeto && <> · <span className="chip">{r.prestador ? 'Prestador' : 'Destino'}</span> {r.objetoResenado}</>}
            </div>
          </div>
          {acciones && <div className="d-flex gap-1 align-items-start">{acciones}</div>}
        </div>
        {r.comentario && <p className="mt-2 mb-2">{r.comentario}</p>}
        {!!r.criterios?.length && (
          <div className="d-flex flex-wrap gap-3 small mb-2">
            {r.criterios.map((c) => <span key={c.idCriterio}>{c.nombre}: <Estrellas valor={c.puntaje} /></span>)}
          </div>
        )}
        {!!r.fotos?.length && (
          <div className="d-flex gap-2 flex-wrap mb-2">
            {r.fotos.map((f) => <img key={f.numeroFoto} src={f.rutaArchivo} alt={`Foto ${f.numeroFoto} de la reseña`} className="foto-resena" onClick={() => setFoto(f)} />)}
          </div>
        )}
        {r.respuesta && (
          <div className="respuesta small mb-2">
            <strong>Respuesta del prestador</strong> · {fecha(r.fechaRespuesta)}
            <div>{r.respuesta}</div>
          </div>
        )}
        <div className="d-flex flex-wrap gap-2 align-items-center small text-muted">
          <span>👍 {r.votosUtiles} útil · 👎 {r.votosNoUtiles} no útil</span>
          {onVotar && (
            <>
              <button className={`btn btn-sm ${miVoto === 'útil' ? 'btn-primary' : 'btn-outline-primary'}`} aria-pressed={miVoto === 'útil'} title={miVoto === 'útil' ? 'Quitar mi voto' : 'Marcar como útil'} onClick={() => onVotar('útil')}>Útil</button>
              <button className={`btn btn-sm ${miVoto === 'no útil' ? 'btn-secondary' : 'btn-outline-secondary'}`} aria-pressed={miVoto === 'no útil'} title={miVoto === 'no útil' ? 'Quitar mi voto' : 'Marcar como no útil'} onClick={() => onVotar('no útil')}>No útil</button>
              {miVoto && <span className="small">(clic de nuevo para quitar tu voto)</span>}
            </>
          )}
          {onReportar && (reportada
            ? <span className="text-danger">Ya la reportaste{onRetirarReporte && <button className="btn btn-sm btn-link p-0 ms-1" onClick={onRetirarReporte}>Retirar reporte</button>}</span>
            : <button className="btn btn-sm btn-link text-danger" onClick={() => setReportando(true)}>Reportar</button>)}
        </div>
      </div>
      {foto && <Modal titulo={`Foto ${foto.numeroFoto}`} onCerrar={() => setFoto(null)}><img src={foto.rutaArchivo} alt="" className="img-fluid rounded" /></Modal>}
      {reportando && (
        <Modal titulo="Reportar reseña" onCerrar={() => setReportando(false)}
          pie={<><button className="btn btn-outline-secondary" onClick={() => setReportando(false)}>Cancelar</button>
            <button className="btn btn-danger" onClick={() => { onReportar(motivo); setReportando(false); }}>Enviar reporte</button></>}>
          <label className="form-label" htmlFor="motivo">Motivo</label>
          <select id="motivo" className="form-select" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            {['ofensiva', 'falsa', 'spam', 'no corresponde'].map((m) => <option key={m}>{m}</option>)}
          </select>
          <div className="form-text">Un administrador revisará el reporte. Si lo acepta, la reseña quedará oculta.</div>
        </Modal>
      )}
    </div>
  );
}
