// Pantalla genérica de CRUD: listado con búsqueda y paginación, formulario agrupado y eliminación confirmada.
// Cada entidad se describe en pages/admin/configCrud.js (columnas, campos y validaciones del formulario).
// Gestalt: los campos se agrupan por tema en fieldsets (región común/proximidad); la acción destructiva se
// separa de las demás. Usabilidad: validación visible en el campo, botón ocupado mientras guarda, estado vacío.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { useSesion } from '../auth.jsx';
import { Alerta, Cargando, Modal, Titulo, Vacio, useLista, IconoBasura } from './comunes.jsx';
import { Icono } from './Iconos.jsx';

const POR_PAGINA = 15;

/** Lista desplegable. Las opciones de una clave foránea llegan de la API después del valor: la `key`
 *  hace que el select se vuelva a montar cuando llegan, para que muestre el valor guardado. */
function SelectCampo({ campo, props }) {
  const lista = useLista(Array.isArray(campo.opciones) ? null : campo.opciones?.ruta);
  const items = Array.isArray(campo.opciones)
    ? campo.opciones.map((o) => (typeof o === 'object' ? o : { valor: o, texto: o }))
    : lista.map((x) => ({ valor: x[campo.opciones.valor], texto: campo.opciones.texto(x) }));
  return (
    <select key={items.length} {...props}>
      <option value="">{campo.requerido ? 'Seleccione…' : '(ninguno)'}</option>
      {items.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
    </select>
  );
}

export function CampoFormulario({ campo, valor, onChange, editando }) {
  const comun = {
    id: `f-${campo.campo}`, className: campo.tipo === 'select' ? 'form-select' : 'form-control',
    value: valor ?? '', required: campo.requerido && !(editando && campo.tipo === 'password'),
    disabled: editando && campo.soloCrear, maxLength: campo.max, pattern: campo.patron, min: campo.min, step: campo.paso,
    onChange: (e) => onChange(campo.campo, e.target.value), 'aria-describedby': campo.nota ? `n-${campo.campo}` : undefined,
  };
  let control;
  if (campo.tipo === 'select') control = <SelectCampo campo={campo} props={comun} />;
  else if (campo.tipo === 'textarea') control = <textarea {...comun} rows={3} />;
  else control = <input {...comun} type={campo.tipo ?? 'text'} placeholder={campo.ayuda} />;
  return (
    <div className={campo.ancho ?? 'col-md-6'}>
      <label className="form-label small fw-semibold" htmlFor={comun.id}>
        {campo.etiqueta}{campo.requerido && <span className="obligatorio" aria-hidden="true"> *</span>}
      </label>
      {control}
      <div className="invalid-feedback">{campo.error ?? (campo.requerido ? 'Este dato es obligatorio o no tiene el formato esperado.' : 'Formato no válido.')}</div>
      {campo.nota && <div className="form-text" id={`n-${campo.campo}`}>{campo.nota}</div>}
      {editando && campo.soloCrear && <div className="form-text">No se puede cambiar después de creado.</div>}
    </div>
  );
}

/** Dibuja los campos agrupados por la propiedad `grupo` de cada uno. */
export function CamposAgrupados({ campos, datos, onChange, editando }) {
  const grupos = [];
  for (const c of campos) {
    const g = c.grupo ?? 'Datos';
    let actual = grupos.find((x) => x.nombre === g);
    if (!actual) { actual = { nombre: g, campos: [] }; grupos.push(actual); }
    actual.campos.push(c);
  }
  return grupos.map((g) => (
    <fieldset className="grupo" key={g.nombre}>
      <legend>{g.nombre}</legend>
      <div className="row g-3">
        {g.campos.map((c) => <CampoFormulario key={c.campo} campo={c} valor={datos[c.campo]} editando={editando} onChange={onChange} />)}
      </div>
    </fieldset>
  ));
}

export function Paginacion({ total, pagina, setPagina, porPagina = POR_PAGINA }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (total <= porPagina) return <div className="paginacion"><span>{total} registros</span></div>;
  return (
    <div className="paginacion">
      <span>Mostrando {(pagina - 1) * porPagina + 1}–{Math.min(total, pagina * porPagina)} de {total}</span>
      <div className="btn-group btn-group-sm" role="group" aria-label="Paginación">
        <button className="btn btn-outline-secondary" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>‹ Anterior</button>
        <span className="btn btn-outline-secondary disabled">{pagina} / {paginas}</span>
        <button className="btn btn-outline-secondary" disabled={pagina === paginas} onClick={() => setPagina(pagina + 1)}>Siguiente ›</button>
      </div>
    </div>
  );
}

export default function CrudPage({ config }) {
  const { usuario } = useSesion();
  const puedeEscribir = (config.rolesEscritura ?? ['admin']).includes(usuario?.rol);
  const [filas, setFilas] = useState(null);
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);
  const [form, setForm] = useState(null);       // { datos, id }
  const [validado, setValidado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [borrar, setBorrar] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(() => {
    api(config.ruta).then(setFilas).catch((e) => { setError(e.message); setFilas([]); });
  }, [config.ruta]);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => setPagina(1), [buscar]);

  const visibles = useMemo(() => {
    if (!filas) return [];
    const t = buscar.trim().toLowerCase();
    return t ? filas.filter((f) => Object.values(f).some((v) => String(v ?? '').toLowerCase().includes(t))) : filas;
  }, [filas, buscar]);
  const pag = visibles.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const abrir = (fila) => {
    const datos = {};
    for (const c of config.campos) datos[c.campo] = fila ? (fila[c.campo] ?? '') : (c.porDefecto ?? '');
    setError('');
    setValidado(false);
    setForm({ datos, id: fila ? fila[config.id] : null });
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    if (!e.currentTarget.checkValidity()) { setValidado(true); return; }
    setGuardando(true);
    try {
      const body = config.antesDeEnviar ? config.antesDeEnviar({ ...form.datos }, form.id) : form.datos;
      if (form.id !== null) await api(`${config.ruta}/${form.id}`, { method: 'PUT', body });
      else await api(config.ruta, { method: 'POST', body });
      setAviso(form.id !== null ? `${config.singular[0].toUpperCase()}${config.singular.slice(1)} actualizado.` : `${config.singular[0].toUpperCase()}${config.singular.slice(1)} creado.`);
      setForm(null);
      cargar();
    } catch (err) { setError(err.message); } finally { setGuardando(false); }
  };

  const eliminar = async () => {
    try {
      await api(`${config.ruta}/${borrar[config.id]}`, { method: 'DELETE' });
      setAviso('Registro eliminado.');
      setBorrar(null);
      cargar();
    } catch (err) { setBorrar(null); setError(err.message); }
  };

  const columnas = config.columnas;
  return (
    <div>
      <Titulo sub={config.descripcion} acciones={puedeEscribir && config.crear !== false &&
        <button className="btn btn-primary" onClick={() => abrir(null)}>+ Nuevo {config.singular}</button>}>{config.titulo}</Titulo>
      <Alerta mensaje={aviso} tipo="success" onCerrar={() => setAviso('')} />
      {!form && <Alerta mensaje={error} onCerrar={() => setError('')} />}
      <div className="card">
        <div className="card-body">
          <div className="barra-herramientas">
            <div className="buscador">
              <input className="form-control" type="search" placeholder={`Buscar ${config.titulo.toLowerCase()}…`} aria-label="Buscar" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
            </div>
            {buscar && <button className="btn btn-sm btn-link" onClick={() => setBuscar('')}>Limpiar búsqueda</button>}
          </div>
          {!filas ? <Cargando /> : (
            <>
              <div className="tabla-scroll">
                <table className="table table-hover align-middle">
                  <thead><tr>{columnas.map((c) => <th key={c.campo} className={c.num ? 'num' : ''} scope="col">{c.titulo}</th>)}{puedeEscribir && <th className="text-end" scope="col">Acciones</th>}</tr></thead>
                  <tbody>
                    {pag.map((f) => (
                      <tr key={f[config.id]}>
                        {columnas.map((c) => <td key={c.campo} className={c.num ? 'num' : c.nowrap ? 'nowrap' : ''}>{c.formato ? c.formato(f[c.campo], f) : f[c.campo]}</td>)}
                        {puedeEscribir && (
                          <td>
                            <div className="acciones">
                              {config.acciones?.(f, cargar, setError, setAviso)}
                              {config.editar !== false && <button className="btn btn-sm btn-outline-primary" onClick={() => abrir(f)}>Editar</button>}
                              {config.eliminar !== false && <>
                                <span className="separador" aria-hidden="true" />
                                <button className="btn btn-sm btn-outline-danger btn-icono" title="Eliminar" aria-label={`Eliminar ${config.describir ? config.describir(f) : f[config.id]}`} onClick={() => setBorrar(f)}><IconoBasura /></button>
                              </>}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!visibles.length && (
                <Vacio icono="buscar" titulo={buscar ? 'Ningún registro coincide con la búsqueda' : 'Todavía no hay registros'}>
                  {buscar ? <button className="btn btn-sm btn-link" onClick={() => setBuscar('')}>Ver todos</button>
                    : puedeEscribir && config.crear !== false && <button className="btn btn-sm btn-primary mt-2" onClick={() => abrir(null)}>Crear el primero</button>}
                </Vacio>
              )}
              <Paginacion total={visibles.length} pagina={pagina} setPagina={setPagina} />
            </>
          )}
        </div>
      </div>

      {form && (
        <Modal titulo={`${form.id !== null ? 'Editar' : 'Nuevo'} ${config.singular}`} onCerrar={() => setForm(null)}>
          <form onSubmit={guardar} noValidate className={validado ? 'was-validated' : ''}>
            <Alerta mensaje={error} />
            <CamposAgrupados campos={config.campos.filter((c) => !(form.id === null && c.soloEditar))} datos={form.datos} editando={form.id !== null}
              onChange={(k, v) => setForm((s) => ({ ...s, datos: { ...s.datos, [k]: v } }))} />
            <div className="d-flex justify-content-between align-items-center mt-2">
              <span className="nota-obligatorio"><span className="obligatorio">*</span> Obligatorio</span>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setForm(null)}>Cancelar</button>
                <button className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {borrar && (
        <Modal chico titulo={`Eliminar ${config.singular}`} onCerrar={() => setBorrar(null)}
          pie={<><button className="btn btn-outline-secondary" onClick={() => setBorrar(null)}>Cancelar</button>
            <button className="btn btn-danger" onClick={eliminar}>Sí, eliminar</button></>}>
          ¿Seguro que desea eliminar <strong>{config.describir ? config.describir(borrar) : `#${borrar[config.id]}`}</strong>?
          <div className="small text-muted mt-2">Esta acción no se puede deshacer. Si tiene registros relacionados, la base de datos no lo permitirá.</div>
        </Modal>
      )}
    </div>
  );
}
