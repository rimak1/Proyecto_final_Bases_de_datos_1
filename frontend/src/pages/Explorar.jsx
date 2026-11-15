// Explorar prestadores y destinos con su calificación promedio (RF-18). Base de las recomendaciones.
// Gestalt: tarjetas iguales para elementos del mismo tipo (similitud); la franja de color distingue destino
// de prestador; la calificación es la figura principal de cada tarjeta (figura-fondo).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Estrellas, Titulo, Vacio, useLista } from '../components/comunes.jsx';
import { Icono } from '../components/Iconos.jsx';

const ORDENES = { calificacion: 'Mejor calificados', resenas: 'Más reseñados', nombre: 'Nombre (A–Z)' };

export default function Explorar() {
  const [vista, setVista] = useState('destinos');
  const [filtros, setFiltros] = useState({ nombre: '', codDane: '', tipo: '' });
  const [orden, setOrden] = useState('calificacion');
  const [lista, setLista] = useState(null);
  const municipios = useLista('/municipios');
  const tiposP = useLista('/tipos-prestador');
  const tiposD = useLista('/tipos-destino');

  useEffect(() => {
    setLista(null);
    const params = vista === 'destinos'
      ? { nombre: filtros.nombre, codDane: filtros.codDane, idTipoDestino: filtros.tipo, estado: 'activo' }
      : { nombre: filtros.nombre, codDane: filtros.codDane, idTipoPrestador: filtros.tipo, estado: 'activo' };
    const t = setTimeout(() => api(`/${vista}`, { params }).then(setLista).catch(() => setLista([])), 250);
    return () => clearTimeout(t);
  }, [vista, filtros]);

  const nombreDe = (x) => x.nombre ?? x.nombreComercial;
  const ordenada = (lista ?? []).slice().sort((a, b) => {
    if (orden === 'nombre') return nombreDe(a).localeCompare(nombreDe(b), 'es');
    if (orden === 'resenas') return b.cantidadResenas - a.cantidadResenas;
    return (b.calificacionPromedio ?? 0) - (a.calificacionPromedio ?? 0) || b.cantidadResenas - a.cantidadResenas;
  });
  const tipos = vista === 'destinos' ? tiposD.map((t) => [t.idTipoDestino, t.nombre]) : tiposP.map((t) => [t.idTipoPrestador, t.nombre]);
  const hayFiltros = filtros.nombre || filtros.codDane || filtros.tipo;
  const cambiarVista = (v) => { setVista(v); setFiltros({ ...filtros, tipo: '' }); };

  return (
    <div>
      <Titulo sub="Recomendaciones según la calificación promedio de las reseñas visibles de otros viajeros.">Descubre el Quindío</Titulo>

      <div className="card mb-3"><div className="card-body">
        <div className="d-flex flex-wrap gap-3 align-items-end">
          <div>
            <div className="form-label small fw-semibold">Quiero ver</div>
            <div className="segmentado" role="tablist">
              <button role="tab" aria-selected={vista === 'destinos'} className={vista === 'destinos' ? 'activo' : ''} onClick={() => cambiarVista('destinos')}><Icono nombre="paisaje" className="me-1" />Destinos</button>
              <button role="tab" aria-selected={vista === 'prestadores'} className={vista === 'prestadores' ? 'activo' : ''} onClick={() => cambiarVista('prestadores')}><Icono nombre="edificio" className="me-1" />Prestadores</button>
            </div>
          </div>
          <div className="flex-grow-1" style={{ minWidth: 200 }}>
            <label className="form-label small fw-semibold" htmlFor="ex-nombre">Nombre</label>
            <div className="buscador mw-100"><input id="ex-nombre" type="search" className="form-control" placeholder="Ej.: Cocora" value={filtros.nombre} onChange={(e) => setFiltros({ ...filtros, nombre: e.target.value })} /></div>
          </div>
          <div style={{ minWidth: 170 }}>
            <label className="form-label small fw-semibold" htmlFor="ex-mun">Municipio</label>
            <select id="ex-mun" className="form-select" value={filtros.codDane} onChange={(e) => setFiltros({ ...filtros, codDane: e.target.value })}>
              <option value="">Todos</option>
              {municipios.map((m) => <option key={m.codDane} value={m.codDane}>{m.nombre}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 170 }}>
            <label className="form-label small fw-semibold" htmlFor="ex-tipo">Tipo</label>
            <select id="ex-tipo" className="form-select" value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}>
              <option value="">Todos</option>
              {tipos.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 170 }}>
            <label className="form-label small fw-semibold" htmlFor="ex-orden">Ordenar por</label>
            <select id="ex-orden" className="form-select" value={orden} onChange={(e) => setOrden(e.target.value)}>
              {Object.entries(ORDENES).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select>
          </div>
        </div>
      </div></div>

      <div className="d-flex justify-content-between align-items-center mb-2 small text-muted">
        <span>{lista ? `${ordenada.length} ${vista} encontrados` : 'Buscando…'}</span>
        {hayFiltros && <button className="btn btn-sm btn-link p-0" onClick={() => setFiltros({ nombre: '', codDane: '', tipo: '' })}>Quitar filtros</button>}
      </div>

      <div className="row g-3">
        {!lista && Array.from({ length: 6 }, (_, i) => <div className="col-sm-6 col-lg-4" key={i}><div className="esqueleto" style={{ height: 150 }} /></div>)}
        {lista && ordenada.map((x) => {
          const id = vista === 'destinos' ? x.idDestino : x.idPrestador;
          return (
            <div className="col-sm-6 col-lg-4" key={id}>
              <Link to={`/${vista === 'destinos' ? 'destino' : 'prestador'}/${id}`} className="text-decoration-none text-reset d-block h-100">
                <div className={`card tarjeta-objeto ${vista === 'prestadores' ? 'prestador' : ''}`}>
                  <div className="franja" />
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex justify-content-between gap-2">
                      <div>
                        <h5 className="mb-1">{nombreDe(x)}</h5>
                        <div className="small text-muted"><Icono nombre="ubicacion" /> {x.municipio} · <span className={`chip ${vista === 'prestadores' ? 'cafe' : ''}`}>{x.tipo}</span></div>
                      </div>
                      <div className="nota-grande" aria-label={x.calificacionPromedio ? `Calificación ${x.calificacionPromedio} de 5` : 'Sin calificaciones'}>
                        <div className="valor">{x.calificacionPromedio ?? '—'}</div>
                        <div className="cuantas">{x.cantidadResenas} reseñas</div>
                      </div>
                    </div>
                    <div className="mt-2"><Estrellas valor={x.calificacionPromedio} /></div>
                    {(x.descripcion || x.direccion) && (
                      <p className="small text-muted mt-2 mb-0">{(x.descripcion ?? x.direccion).slice(0, 110)}{(x.descripcion ?? '').length > 110 ? '…' : ''}</p>
                    )}
                    <span className="mt-auto pt-2 small fw-semibold" style={{ color: 'var(--qs-verde)' }}>Ver reseñas <Icono nombre="flechaDerecha" /></span>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
      {lista && !ordenada.length && (
        <Vacio icono="brujula" titulo="No hay resultados con esos filtros">
          <button className="btn btn-sm btn-outline-primary mt-2" onClick={() => setFiltros({ nombre: '', codDane: '', tipo: '' })}>Quitar filtros</button>
        </Vacio>
      )}
    </div>
  );
}
