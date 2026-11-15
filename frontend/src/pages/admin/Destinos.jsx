// CRUD completo de destinos (RF-07), como en el prototipo: listado con búsqueda y filtros, formulario y
// eliminación. Resena.idDestino es RESTRICT: un destino con reseñas se ofrece marcar como inactivo (RN-24).
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { Alerta, Cargando, Insignia, Modal, Nota, Titulo, Vacio, useLista, IconoBasura } from '../../components/comunes.jsx';
import { Paginacion } from '../../components/CrudPage.jsx';
import { Icono } from '../../components/Iconos.jsx';

const VACIO = { nombre: '', descripcion: '', estado: 'activo', codDane: '', idTipoDestino: '' };

export default function Destinos() {
  const municipios = useLista('/municipios');
  const tipos = useLista('/tipos-destino');
  const [filtros, setFiltros] = useState({ nombre: '', codDane: '', idTipoDestino: '', estado: '' });
  const [lista, setLista] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [form, setForm] = useState(null);
  const [borrar, setBorrar] = useState(null);
  const [conResenas, setConResenas] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(() => api('/destinos', { params: filtros }).then(setLista).catch((e) => setError(e.message)), [filtros]);
  useEffect(() => { const t = setTimeout(cargar, 200); return () => clearTimeout(t); }, [cargar]);
  useEffect(() => setPagina(1), [filtros]);

  const guardar = async (e) => {
    e.preventDefault();
    try {
      const { idDestino, ...datos } = form;
      if (idDestino) await api(`/destinos/${idDestino}`, { method: 'PUT', body: datos });
      else await api('/destinos', { method: 'POST', body: datos });
      setForm(null); setAviso(idDestino ? 'Destino actualizado.' : 'Destino creado.'); cargar();
    } catch (err) { setError(err.message); }
  };

  const eliminar = async () => {
    try {
      await api(`/destinos/${borrar.idDestino}`, { method: 'DELETE' });
      setBorrar(null); setAviso('Destino eliminado.'); cargar();
    } catch (err) {
      if (err.status === 409) setConResenas(err.message); else { setBorrar(null); setError(err.message); }
    }
  };
  const inactivar = async () => {
    await api(`/destinos/${borrar.idDestino}/estado`, { method: 'PATCH', body: { estado: 'inactivo' } });
    setBorrar(null); setConResenas(''); setAviso('Destino marcado como inactivo; sus reseñas se conservan.'); cargar();
  };

  const set = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div>
      <Titulo sub="Lugares turísticos que se reseñan sin reserva." acciones={<button className="btn btn-primary" onClick={() => { setError(''); setForm({ ...VACIO }); }}>+ Nuevo destino</button>}>Destinos</Titulo>
      <Alerta mensaje={aviso} tipo="success" onCerrar={() => setAviso('')} />
      {!form && <Alerta mensaje={error} onCerrar={() => setError('')} />}
      <div className="card"><div className="card-body">
        <div className="row g-2 mb-3">
          <div className="col-md-4"><div className="buscador mw-100"><input className="form-control" type="search" aria-label="Buscar por nombre" placeholder="Buscar por nombre" value={filtros.nombre} onChange={(e) => setFiltros({ ...filtros, nombre: e.target.value })} /></div></div>
          <div className="col-md-3"><select className="form-select" aria-label="Municipio" value={filtros.codDane} onChange={(e) => setFiltros({ ...filtros, codDane: e.target.value })}>
            <option value="">Todos los municipios</option>{municipios.map((m) => <option key={m.codDane} value={m.codDane}>{m.nombre}</option>)}</select></div>
          <div className="col-md-3"><select className="form-select" aria-label="Tipo" value={filtros.idTipoDestino} onChange={(e) => setFiltros({ ...filtros, idTipoDestino: e.target.value })}>
            <option value="">Todos los tipos</option>{tipos.map((t) => <option key={t.idTipoDestino} value={t.idTipoDestino}>{t.nombre}</option>)}</select></div>
          <div className="col-md-2"><select className="form-select" aria-label="Estado" value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}>
            <option value="">Todos</option><option>activo</option><option>inactivo</option></select></div>
        </div>
        {!lista ? <Cargando /> : (
          <div className="tabla-scroll"><table className="table table-sm table-hover align-middle mb-0">
            <thead><tr><th className="num">ID</th><th>Nombre</th><th>Municipio</th><th>Tipo</th><th>Calificación</th><th>Estado</th><th className="text-end">Acciones</th></tr></thead>
            <tbody>
              {lista.slice((pagina - 1) * 10, pagina * 10).map((d) => (
                <tr key={d.idDestino}>
                  <td className="num text-muted">{d.idDestino}</td><td><Link to={`/destino/${d.idDestino}`}>{d.nombre}</Link></td><td>{d.municipio}</td><td>{d.tipo}</td>
                  <td>{d.calificacionPromedio ? <Nota valor={d.calificacionPromedio} cantidad={d.cantidadResenas} /> : <span className="text-muted">Sin reseñas</span>}</td>
                  <td><Insignia valor={d.estado} /></td>
                  <td>
                    <div className="acciones">
                    <button className="btn btn-sm btn-outline-primary" onClick={() => { setError(''); setForm({ idDestino: d.idDestino, nombre: d.nombre, descripcion: d.descripcion, estado: d.estado, codDane: d.codDane, idTipoDestino: d.idTipoDestino }); }}>Editar</button>
                    <span className="separador" aria-hidden="true" />
                    <button className="btn btn-sm btn-outline-danger btn-icono" title="Eliminar" aria-label={`Eliminar ${d.nombre}`} onClick={() => { setConResenas(''); setBorrar(d); }}><IconoBasura /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!lista.length && <tr><td colSpan={7}><Vacio icono="paisaje" titulo="No hay destinos con esos filtros" /></td></tr>}
            </tbody>
          </table></div>
        )}
        {lista && <Paginacion total={lista.length} pagina={pagina} setPagina={setPagina} porPagina={10} />}
      </div></div>

      {form && (
        <Modal titulo={form.idDestino ? 'Editar destino' : 'Nuevo destino'} onCerrar={() => setForm(null)}>
          <form onSubmit={guardar}>
            <Alerta mensaje={error} />
            <fieldset className="grupo"><legend>Identificación</legend>
            <div className="row g-3">
              <div className="col-12"><label className="form-label small fw-semibold" htmlFor="dn">Nombre <span className="obligatorio">*</span></label>
                <input id="dn" className="form-control" required maxLength={100} value={form.nombre} onChange={(e) => set('nombre', e.target.value)} /></div>
              <div className="col-md-6"><label className="form-label small fw-semibold" htmlFor="dm">Municipio <span className="obligatorio">*</span></label>
                <select id="dm" className="form-select" required value={form.codDane} onChange={(e) => set('codDane', e.target.value)}>
                  <option value="">Seleccione…</option>{municipios.map((m) => <option key={m.codDane} value={m.codDane}>{m.nombre}</option>)}</select></div>
              <div className="col-md-6"><label className="form-label small fw-semibold" htmlFor="dt">Tipo de destino <span className="obligatorio">*</span></label>
                <select id="dt" className="form-select" required value={form.idTipoDestino} onChange={(e) => set('idTipoDestino', e.target.value)}>
                  <option value="">Seleccione…</option>{tipos.map((t) => <option key={t.idTipoDestino} value={t.idTipoDestino}>{t.nombre}</option>)}</select></div>
            </div></fieldset>
            <fieldset className="grupo"><legend>Descripción y estado</legend>
            <div className="row g-3">
              <div className="col-12"><label className="form-label small fw-semibold" htmlFor="dd">Descripción <span className="obligatorio">*</span></label>
                <textarea id="dd" className="form-control" rows={4} required maxLength={1000} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
                <div className="form-text">{form.descripcion.length}/1000</div></div>
              <div className="col-12"><span className="form-label small fw-semibold d-block">Estado</span>
                {['activo', 'inactivo'].map((v) => (
                  <div className="form-check form-check-inline" key={v}>
                    <input className="form-check-input" type="radio" name="estado" id={`de-${v}`} checked={form.estado === v} onChange={() => set('estado', v)} />
                    <label className="form-check-label" htmlFor={`de-${v}`}>{v}</label>
                  </div>
                ))}
                <div className="form-text">Un destino inactivo conserva sus reseñas pero no recibe nuevas.</div>
                {form.idDestino && (() => { const d = lista?.find((x) => x.idDestino === form.idDestino); return d?.calificacionPromedio
                  ? <div className="form-text">Calificación promedio: {d.calificacionPromedio} ({d.cantidadResenas} reseñas visibles). Es un dato calculado, no se edita.</div> : null; })()}
              </div>
            </div></fieldset>
            <div className="d-flex justify-content-between align-items-center mt-2">
              <span className="nota-obligatorio"><span className="obligatorio">*</span> Obligatorio</span>
              <div className="d-flex gap-2">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setForm(null)}>Cancelar</button>
              <button className="btn btn-primary">Guardar</button>
            </div>
            </div>
          </form>
        </Modal>
      )}

      {borrar && (
        <Modal titulo="Eliminar destino" onCerrar={() => setBorrar(null)}
          pie={conResenas
            ? <><button className="btn btn-outline-secondary" onClick={() => setBorrar(null)}>Cancelar</button>
              {borrar.estado === 'activo' && <button className="btn btn-warning" onClick={inactivar}>Marcar como inactivo</button>}</>
            : <><button className="btn btn-outline-secondary" onClick={() => setBorrar(null)}>Cancelar</button><button className="btn btn-danger" onClick={eliminar}>Eliminar</button></>}>
          {conResenas
            ? <div className="alert alert-warning mb-0">{conResenas}</div>
            : <>¿Eliminar el destino <strong>{borrar.nombre}</strong> ({borrar.municipio})?</>}
        </Modal>
      )}
    </div>
  );
}
