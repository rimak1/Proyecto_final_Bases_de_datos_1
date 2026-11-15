// Tablero del administrador: indicadores y recomendaciones (mejor calificados).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { Cargando, Estrellas, Titulo } from '../../components/comunes.jsx';

export default function Tablero() {
  const [d, setD] = useState(null);
  useEffect(() => { api('/tablero').then(setD); }, []);
  if (!d) return <Cargando />;
  const kpis = [
    ['Reseñas visibles', d.totalResenas, '/admin/resenas'], ['Reportes pendientes', d.reportesPendientes, '/admin/moderacion'],
    ['Prestadores', d.prestadores, '/admin/prestadores'], ['Destinos', d.destinos, '/admin/destinos'],
  ];
  const Lista = ({ titulo, items, ruta, nombre }) => (
    <div className="col-md-6"><div className="card h-100"><div className="card-body">
      <h6>{titulo}</h6>
      <ol className="mb-0">
        {items.map((x) => (
          <li key={x[`id${ruta}`]} className="mb-1">
            <Link to={`/${ruta.toLowerCase()}/${x[`id${ruta}`]}`}>{x[nombre]}</Link> <span className="small text-muted">· {x.municipio}</span><br />
            <Estrellas valor={x.calificacionPromedio} /> {x.calificacionPromedio} <span className="small text-muted">({x.cantidadResenas} reseñas)</span>
          </li>
        ))}
      </ol>
    </div></div></div>
  );
  return (
    <div>
      <Titulo sub="Resumen del módulo de reseñas y recomendaciones turísticas.">Tablero</Titulo>
      <div className="row g-3 mb-3">
        {kpis.map(([t, v, a]) => (
          <div className="col-6 col-md-3" key={t}><Link to={a} className="text-decoration-none"><div className={`card tarjeta-objeto tarjeta-kpi ${t === 'Reportes pendientes' && v > 0 ? 'alerta' : ''}`}><div className="card-body">
            <div className="kpi">{v}</div><div className="text-muted small">{t}{t === 'Reportes pendientes' && v > 0 ? ' · por revisar' : ''}</div>
          </div></div></Link></div>
        ))}
      </div>
      <div className="row g-3">
        <Lista titulo="Prestadores mejor calificados (mín. 3 reseñas)" items={d.mejoresPrestadores} ruta="Prestador" nombre="nombreComercial" />
        <Lista titulo="Destinos mejor calificados (mín. 3 reseñas)" items={d.mejoresDestinos} ruta="Destino" nombre="nombre" />
      </div>
      <div className="mt-3"><Link className="btn btn-primary" to="/admin/reportes">Ver los 10 reportes</Link></div>
    </div>
  );
}
