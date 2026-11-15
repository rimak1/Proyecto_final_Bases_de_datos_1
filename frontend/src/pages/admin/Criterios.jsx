// Criterios de calificación y su asignación a tipos de prestador (RF-08, tabla puente CriterioTipoPrestador).
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Alerta, Cargando, Modal, Titulo, useLista, useConfirmar } from '../../components/comunes.jsx';

export default function Criterios() {
  const confirmar = useConfirmar();
  const tipos = useLista('/tipos-prestador');
  const [lista, setLista] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const cargar = useCallback(() => api('/criterios').then(setLista), []);
  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.idsTipos.length) return setError('Asigne el criterio al menos a un tipo de prestador.');
    try {
      const c = form.idCriterio
        ? await api(`/criterios/${form.idCriterio}`, { method: 'PUT', body: { nombre: form.nombre } })
        : await api('/criterios', { method: 'POST', body: { nombre: form.nombre } });
      await api(`/criterios/${c.idCriterio}/tipos`, { method: 'PUT', body: { idsTipos: form.idsTipos } });
      setForm(null); setAviso('Criterio guardado.'); cargar();
    } catch (err) { setError(err.message); }
  };
  const eliminar = async (c) => {
    if (!(await confirmar({ titulo: 'Eliminar criterio', mensaje: `¿Eliminar el criterio «${c.nombre}» y su asignación a los tipos de prestador?`, textoAceptar: 'Sí, eliminar', peligro: true }))) return;
    try { await api(`/criterios/${c.idCriterio}`, { method: 'DELETE' }); setAviso('Criterio eliminado.'); cargar(); }
    catch (err) { setError(err.status === 409 ? 'El criterio ya fue calificado en reseñas y no se puede eliminar (RESTRICT): se perderían puntajes.' : err.message); }
  };
  const alternar = (id) => setForm({ ...form, idsTipos: form.idsTipos.includes(id) ? form.idsTipos.filter((x) => x !== id) : [...form.idsTipos, id] });

  return (
    <div>
      <Titulo sub="Aspectos que el cliente califica de 1 a 5 según el tipo del prestador reseñado."
        acciones={<button className="btn btn-primary" onClick={() => { setError(''); setForm({ nombre: '', idsTipos: [] }); }}>+ Nuevo criterio</button>}>Criterios</Titulo>
      <Alerta mensaje={aviso} tipo="success" onCerrar={() => setAviso('')} />
      {!form && <Alerta mensaje={error} onCerrar={() => setError('')} />}
      {!lista ? <Cargando /> : (
        <div className="card"><div className="card-body tabla-scroll">
          <table className="table table-sm align-middle mb-0">
            <thead><tr><th>ID</th><th>Criterio</th>{tipos.map((t) => <th key={t.idTipoPrestador} className="text-center small">{t.nombre}</th>)}<th /></tr></thead>
            <tbody>{lista.map((c) => (
              <tr key={c.idCriterio}>
                <td>{c.idCriterio}</td><td className="text-capitalize">{c.nombre}</td>
                {tipos.map((t) => <td key={t.idTipoPrestador} className="text-center">{c.idsTipos.includes(t.idTipoPrestador) ? '✔' : ''}</td>)}
                <td className="text-end text-nowrap">
                  <button className="btn btn-sm btn-outline-primary" onClick={() => { setError(''); setForm({ ...c }); }}>Editar</button>
                  <button className="btn btn-sm btn-outline-danger ms-1" onClick={() => eliminar(c)}>Eliminar</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div></div>
      )}
      {form && (
        <Modal titulo={form.idCriterio ? 'Editar criterio' : 'Nuevo criterio'} onCerrar={() => setForm(null)}>
          <form onSubmit={guardar}>
            <Alerta mensaje={error} />
            <label className="form-label small fw-semibold" htmlFor="cn">Nombre *</label>
            <input id="cn" className="form-control mb-3" required maxLength={40} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            <label className="form-label small fw-semibold d-block">Aplica a los tipos de prestador *</label>
            {tipos.map((t) => (
              <div className="form-check form-check-inline" key={t.idTipoPrestador}>
                <input className="form-check-input" type="checkbox" id={`t${t.idTipoPrestador}`} checked={form.idsTipos.includes(t.idTipoPrestador)} onChange={() => alternar(t.idTipoPrestador)} />
                <label className="form-check-label" htmlFor={`t${t.idTipoPrestador}`}>{t.nombre}</label>
              </div>
            ))}
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
