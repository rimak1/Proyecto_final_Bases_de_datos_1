// Los 10 reportes del sistema (RF-19): filtros, tabla, gráfico (R2, R6, R7) y exportación a PDF.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Chart as ChartJS, BarElement, CategoryScale, Legend, LinearScale, Tooltip, Title } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { api, fecha } from '../../api.js';
import { Alerta, Cargando, Insignia, Titulo, Vacio, useLista } from '../../components/comunes.jsx';
import { exportarReporte } from '../../util/pdf.js';
import { Icono } from '../../components/Iconos.jsx';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, Title);

const VERDE = '#2f6b3a';
const CAFE = '#b07a3f';
const MOTIVOS = ['ofensiva', 'falsa', 'spam', 'no corresponde'];
const anios = [2025, 2026];

const F = {
  motivo: { campo: 'motivo', etiqueta: 'Motivo', tipo: 'select', opciones: MOTIVOS.map((m) => [m, m]) },
  desde: { campo: 'desde', etiqueta: 'Desde', tipo: 'date' },
  hasta: { campo: 'hasta', etiqueta: 'Hasta', tipo: 'date' },
  anio: { campo: 'anio', etiqueta: 'Año', tipo: 'select', opciones: anios.map((a) => [a, a]) },
  municipio: { campo: 'codDane', etiqueta: 'Municipio', tipo: 'municipio' },
  tipoP: { campo: 'idTipoPrestador', etiqueta: 'Tipo de prestador', tipo: 'tipoPrestador' },
  tipoD: { campo: 'idTipoDestino', etiqueta: 'Tipo de destino', tipo: 'tipoDestino' },
  minR: { campo: 'minResenas', etiqueta: 'Mínimo de reseñas', tipo: 'number', porDefecto: 2 },
  minC: { campo: 'minCalificaciones', etiqueta: 'Mínimo de calificaciones', tipo: 'number', porDefecto: 3 },
  minD: { campo: 'minDias', etiqueta: 'Días mínimos sin respuesta', tipo: 'number', porDefecto: 0 },
};
const num = (d = 2) => (v) => (v === null || v === undefined ? '' : Number(v).toFixed(d));
const pct = (v) => `${Number(v).toFixed(2)} %`;

const REPORTES = [
  { codigo: 'R1', nivel: 'Simple', titulo: 'Reportes de reseñas pendientes de moderación', pregunta: '¿Qué denuncias de reseñas siguen sin resolver y cuántos días llevan esperando?',
    filtros: [F.motivo], columnas: [['idReporte', 'Reporte'], ['idResena', 'Reseña'], ['motivo', 'Motivo'], ['fechaReporte', 'Fecha del reporte', fecha], ['diasEspera', 'Días de espera']] },
  { codigo: 'R2', nivel: 'Simple', titulo: 'Distribución de la calificación general', pregunta: '¿Cuántas reseñas visibles hay con cada calificación de 1 a 5 y qué porcentaje del total representa cada una?',
    filtros: [F.desde, F.hasta], columnas: [['calificacion', 'Calificación', (v) => `${v} de 5`], ['cantidadResenas', 'Cantidad de reseñas'], ['porcentaje', 'Porcentaje', pct]],
    grafico: (filas) => ({ tipo: 'vertical', labels: [1, 2, 3, 4, 5].map((n) => `${n} ${n === 1 ? 'estrella' : 'estrellas'}`),
      datasets: [{ label: 'Reseñas', data: [1, 2, 3, 4, 5].map((n) => filas.find((f) => f.calificacion === n)?.cantidadResenas ?? 0), backgroundColor: VERDE }] }) },
  { codigo: 'R3', nivel: 'Simple', titulo: 'Reseñas publicadas por mes', pregunta: '¿Cómo cambia mes a mes la cantidad de reseñas publicadas y su calificación promedio?',
    filtros: [F.anio], columnas: [['mes', 'Mes'], ['cantidadResenas', 'Cantidad de reseñas'], ['calificacionPromedio', 'Calificación promedio', num()]] },
  { codigo: 'R4', nivel: 'Intermedio', titulo: 'Prestadores mejor calificados por municipio', pregunta: '¿Cuáles son los prestadores con mejor calificación promedio en cada municipio, contando solo los que tienen suficientes reseñas?',
    filtros: [F.municipio, F.tipoP, F.minR, F.desde, F.hasta], columnas: [['municipio', 'Municipio'], ['prestador', 'Prestador'], ['tipo', 'Tipo'], ['cantidadResenas', 'Reseñas'], ['calificacionPromedio', 'Calificación promedio', num()]] },
  { codigo: 'R5', nivel: 'Intermedio', titulo: 'Destinos mejor calificados por municipio', pregunta: '¿Cuáles son los destinos turísticos mejor calificados en cada municipio?',
    filtros: [F.municipio, F.tipoD, F.minR], columnas: [['municipio', 'Municipio'], ['destino', 'Destino'], ['tipo', 'Tipo'], ['cantidadResenas', 'Reseñas'], ['calificacionPromedio', 'Calificación promedio', num()]] },
  { codigo: 'R6', nivel: 'Intermedio', titulo: 'Criterios peor calificados por tipo de prestador', pregunta: '¿En qué aspectos (limpieza, atención, ubicación, relación precio-calidad) les va peor a los prestadores de cada tipo?',
    filtros: [F.tipoP, F.desde, F.hasta, F.minC], columnas: [['tipo', 'Tipo'], ['criterio', 'Criterio'], ['promedio', 'Promedio', num()], ['cantidadCalificaciones', 'Calificaciones'], ['porcentajeBajo', '% con puntaje 1 o 2', pct]],
    grafico: (filas) => {
      const top = filas.slice(0, 12);
      return { tipo: 'horizontal', labels: top.map((f) => `${f.criterio} (${f.tipo})`),
        datasets: [{ label: 'Puntaje promedio (1 a 5)', data: top.map((f) => f.promedio), backgroundColor: top.map((f) => (f.promedio < 3 ? '#b23b3b' : CAFE)) }] };
    } },
  { codigo: 'R7', nivel: 'Intermedio', titulo: 'Destinos más reseñados por temporada', pregunta: '¿Qué destinos reciben más reseñas en temporada alta (diciembre, enero, junio y julio) y cuáles en temporada baja?',
    filtros: [F.anio, F.municipio], columnas: [['temporada', 'Temporada'], ['destino', 'Destino'], ['municipio', 'Municipio'], ['cantidadResenas', 'Reseñas'], ['calificacionPromedio', 'Calificación promedio', num()]],
    grafico: (filas) => {
      const totales = {};
      for (const f of filas) totales[f.destino] = (totales[f.destino] ?? 0) + f.cantidadResenas;
      const destinos = Object.keys(totales).sort((a, b) => totales[b] - totales[a]).slice(0, 10);
      const serie = (t) => destinos.map((d) => filas.find((f) => f.destino === d && f.temporada === t)?.cantidadResenas ?? 0);
      return { tipo: 'vertical', labels: destinos, datasets: [{ label: 'Temporada alta', data: serie('alta'), backgroundColor: VERDE }, { label: 'Temporada baja', data: serie('baja'), backgroundColor: CAFE }] };
    } },
  { codigo: 'R8', nivel: 'Avanzado', titulo: 'Reseñas con más reportes', pregunta: '¿Qué reseñas acumulan más denuncias que el promedio de las reseñas reportadas y en qué estado quedaron?',
    filtros: [F.desde, F.hasta, F.motivo], columnas: [['idResena', 'Reseña'], ['objetoResenado', 'Objeto reseñado'], ['autor', 'Autor'], ['totalReportes', 'Total de reportes'], ['aceptados', 'Aceptados'], ['pendientes', 'Pendientes'], ['estadoResena', 'Estado de la reseña', null, true]] },
  { codigo: 'R9', nivel: 'Avanzado', titulo: 'Prestadores por debajo del promedio de su tipo', pregunta: '¿Qué prestadores tienen una calificación promedio menor que la de los prestadores de su mismo tipo?',
    filtros: [F.tipoP, F.municipio], columnas: [['prestador', 'Prestador'], ['tipo', 'Tipo'], ['municipio', 'Municipio'], ['promedioPrestador', 'Promedio del prestador', num()], ['promedioTipo', 'Promedio del tipo', num()], ['diferencia', 'Diferencia', num()]] },
  { codigo: 'R10', nivel: 'Avanzado', titulo: 'Prestadores con reseñas sin responder', pregunta: '¿Qué prestadores tienen reseñas visibles sin respuesta y desde hace cuántos días está la más antigua?',
    filtros: [F.municipio, F.minD], columnas: [['prestador', 'Prestador'], ['municipio', 'Municipio'], ['resenasSinResponder', 'Reseñas sin responder'], ['fechaMasAntigua', 'Fecha de la más antigua', fecha], ['diasSinRespuesta', 'Días sin respuesta']] },
];

function Filtro({ f, valor, onChange, listas }) {
  const id = `fl-${f.campo}`;
  let control;
  const opciones = { municipio: listas.municipios.map((m) => [m.codDane, m.nombre]), tipoPrestador: listas.tiposP.map((t) => [t.idTipoPrestador, t.nombre]), tipoDestino: listas.tiposD.map((t) => [t.idTipoDestino, t.nombre]) }[f.tipo] ?? f.opciones;
  if (opciones) {
    control = (
      <select id={id} className="form-select form-select-sm" value={valor ?? ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Todos</option>{opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    );
  } else control = <input id={id} className="form-control form-control-sm" type={f.tipo} min={0} value={valor ?? ''} onChange={(e) => onChange(e.target.value)} />;
  return <div className="col-6 col-md"><label className="form-label small mb-1" htmlFor={id}>{f.etiqueta}</label>{control}</div>;
}

export default function Reportes() {
  const [codigo, setCodigo] = useState('R1');
  const rep = REPORTES.find((r) => r.codigo === codigo);
  const [valores, setValores] = useState({});
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState('');
  const graficoRef = useRef(null);
  const listas = { municipios: useLista('/municipios'), tiposP: useLista('/tipos-prestador'), tiposD: useLista('/tipos-destino') };

  useEffect(() => { setValores(Object.fromEntries(rep.filtros.map((f) => [f.campo, f.porDefecto ?? '']))); }, [rep]);
  useEffect(() => {
    setFilas(null);
    setError('');
    const t = setTimeout(() => api(`/reportes/${codigo.toLowerCase()}`, { params: valores }).then(setFilas).catch((e) => { setError(e.message); setFilas([]); }), 250);
    return () => clearTimeout(t);
  }, [codigo, valores]);

  const grafico = useMemo(() => (rep.grafico && filas?.length ? rep.grafico(filas) : null), [rep, filas]);
  const columnas = rep.columnas.map(([campo, titulo, formato, insignia]) => ({ campo, titulo, formato, insignia }));

  const textoFiltros = () => rep.filtros.filter((f) => valores[f.campo] !== '' && valores[f.campo] !== undefined).map((f) => {
    const v = valores[f.campo];
    const nombre = f.tipo === 'municipio' ? listas.municipios.find((m) => m.codDane === v)?.nombre
      : f.tipo === 'tipoPrestador' ? listas.tiposP.find((t) => String(t.idTipoPrestador) === String(v))?.nombre
        : f.tipo === 'tipoDestino' ? listas.tiposD.find((t) => String(t.idTipoDestino) === String(v))?.nombre : v;
    return `${f.etiqueta}: ${nombre}`;
  }).join(' · ');

  const pdf = () => exportarReporte({
    codigo: rep.codigo, titulo: rep.titulo, pregunta: rep.pregunta, filtros: textoFiltros(), filas,
    columnas: columnas.map((c) => ({ ...c, texto: c.formato ?? undefined })), canvas: graficoRef.current?.canvas,
  });

  return (
    <div>
      <Titulo sub="Solo se cuentan las reseñas visibles. Simples: una tabla; intermedios: JOIN, GROUP BY y HAVING; avanzados: subconsultas.">Reportes</Titulo>
      <div className="row g-3">
        <div className="col-lg-3">
          <nav className="list-group lista-reportes" aria-label="Reportes">
            {['Simple', 'Intermedio', 'Avanzado'].map((nivel) => (
              <div key={nivel} role="group" aria-label={`Reportes de nivel ${nivel.toLowerCase()}`}>
                <div className="grupo-titulo">{nivel === 'Simple' ? 'Simples · una tabla' : nivel === 'Intermedio' ? 'Intermedios · JOIN y HAVING' : 'Avanzados · subconsultas'}</div>
                {REPORTES.filter((r) => r.nivel === nivel).map((r) => (
                  <button key={r.codigo} className={`list-group-item list-group-item-action ${r.codigo === codigo ? 'active' : ''}`}
                    aria-current={r.codigo === codigo ? 'page' : undefined} onClick={() => setCodigo(r.codigo)}>
                    <div className="d-flex justify-content-between"><strong>{r.codigo}</strong>{r.grafico && <Icono nombre="grafico" titulo="Incluye gráfico" />}</div>
                    <div className="small">{r.titulo}</div>
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </div>
        <div className="col-lg-9">
          <div className="card"><div className="card-body">
            <div className="d-flex justify-content-between flex-wrap gap-2">
              <div><h5 className="mb-1">{rep.codigo} — {rep.titulo}</h5><p className="text-muted small mb-2">{rep.pregunta}</p></div>
              <button className="btn btn-primary align-self-start" disabled={!filas?.length} onClick={pdf} title={filas?.length ? 'Descargar tabla y gráfico en PDF' : 'No hay datos para exportar'}><Icono nombre="descargar" className="me-1" />Exportar PDF</button>
            </div>
            <div className="filtros-region" role="search" aria-label="Filtros del reporte">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="card-titulo m-0">Filtros</span>
                <button className="btn btn-sm btn-link p-0" onClick={() => setValores(Object.fromEntries(rep.filtros.map((f) => [f.campo, f.porDefecto ?? ''])))}>Restablecer</button>
              </div>
              <div className="row g-2">
                {rep.filtros.map((f) => <Filtro key={f.campo} f={f} valor={valores[f.campo]} listas={listas} onChange={(v) => setValores({ ...valores, [f.campo]: v })} />)}
              </div>
            </div>
            <Alerta mensaje={error} />
            {grafico && (
              <div className="mb-3" style={{ height: grafico.tipo === 'horizontal' ? Math.max(260, grafico.labels.length * 30) : 300 }}>
                <Bar ref={graficoRef} data={{ labels: grafico.labels, datasets: grafico.datasets }}
                  options={{
                    indexAxis: grafico.tipo === 'horizontal' ? 'y' : 'x', maintainAspectRatio: false, animation: false,
                    plugins: { legend: { display: grafico.datasets.length > 1, position: 'bottom' } },
                    scales: grafico.tipo === 'horizontal' ? { x: { min: 0, max: 5 } } : { y: { beginAtZero: true, ticks: { precision: 0 } } },
                  }} />
              </div>
            )}
            {!filas ? <Cargando /> : (
              <div className="tabla-scroll">
                <table className="table table-sm table-striped mb-0">
                  <thead><tr>{columnas.map((c) => <th key={c.campo} className={typeof filas?.[0]?.[c.campo] === 'number' ? 'num' : ''}>{c.titulo}</th>)}</tr></thead>
                  <tbody>
                    {filas.map((f, i) => <tr key={i}>{columnas.map((c) => <td key={c.campo} className={typeof f[c.campo] === 'number' ? 'num' : ''}>{c.insignia ? <Insignia valor={f[c.campo]} /> : c.formato ? c.formato(f[c.campo]) : f[c.campo]}</td>)}</tr>)}
                    {!filas.length && <tr><td colSpan={99}><Vacio icono="bandeja" titulo="Sin resultados con estos filtros">Pruebe con otros valores o use Restablecer.</Vacio></td></tr>}
                  </tbody>
                </table>
                <div className="small text-muted mt-2">{filas.length} filas</div>
              </div>
            )}
          </div></div>
        </div>
      </div>
    </div>
  );
}
