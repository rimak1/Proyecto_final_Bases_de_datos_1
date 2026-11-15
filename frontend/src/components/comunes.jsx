// Componentes pequeños reutilizables y el proveedor de avisos y confirmaciones.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { Icono } from './Iconos.jsx';

export function Estrellas({ valor, total = 5 }) {
  const v = Math.round(Number(valor) || 0);
  return (
    <span className="estrellas" role="img" aria-label={valor ? `${valor} de 5 estrellas` : 'Sin calificaciones'} title={valor ? `${valor} de 5` : 'Sin calificaciones'}>
      {Array.from({ length: total }, (_, i) => <Icono key={i} nombre="estrella" className={i < v ? '' : 'vacia'} />)}
    </span>
  );
}

/** Calificación con número: el número evita depender solo del color de las estrellas. */
export function Nota({ valor, cantidad }) {
  return (
    <span className="nota"><Estrellas valor={valor} /> <strong>{valor ?? '—'}</strong>
      {cantidad !== undefined && <span className="text-muted small">({cantidad} {cantidad === 1 ? 'reseña' : 'reseñas'})</span>}</span>
  );
}

const TEXTO_ESTRELLAS = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];

export function EstrellasInput({ valor, onChange, etiqueta, conTexto }) {
  const [sobre, setSobre] = useState(0);
  const mostrado = sobre || valor;
  return (
    <span className="d-inline-flex align-items-center gap-2">
      <span className="estrellas-input" role="radiogroup" aria-label={etiqueta} onMouseLeave={() => setSobre(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} role="radio" aria-checked={n === valor} className={n <= mostrado ? 'llena' : ''}
            onMouseEnter={() => setSobre(n)} onClick={() => onChange(n)} aria-label={`${n} estrellas`} title={TEXTO_ESTRELLAS[n]}><Icono nombre="estrella" /></button>
        ))}
      </span>
      {conTexto && <span className="small text-muted" style={{ minWidth: 70 }}>{mostrado ? `${mostrado}/5 · ${TEXTO_ESTRELLAS[mostrado]}` : 'Sin calificar'}</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ Avisos y confirmaciones */
const CtxUI = createContext(null);

export function ProveedorUI({ children }) {
  const [avisos, setAvisos] = useState([]);
  const [pregunta, setPregunta] = useState(null);
  const id = useRef(0);

  const avisar = useCallback((mensaje, tipo = 'success') => {
    id.current += 1;
    const n = id.current;
    let repetido = false;
    setAvisos((a) => {
      repetido = a.some((x) => x.mensaje === mensaje);   // no apilar el mismo aviso dos veces
      return repetido ? a : [...a, { n, mensaje, tipo }];
    });
    setTimeout(() => setAvisos((a) => a.filter((x) => x.n !== n)), tipo === 'danger' ? 7000 : 4000);
  }, []);

  const confirmar = useCallback((opciones) => new Promise((resolver) => setPregunta({ ...opciones, resolver })), []);
  const responder = (si) => { pregunta.resolver(si); setPregunta(null); };
  const ICONO = { success: 'check', danger: 'alerta', warning: 'alerta', info: 'info' };

  return (
    <CtxUI.Provider value={{ avisar, confirmar }}>
      {children}
      <div className="avisos" role="status" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.n} className={`aviso ${a.tipo}`}>
            <span className="aviso-icono"><Icono nombre={ICONO[a.tipo]} tam={18} /></span>
            <span className="flex-grow-1">{a.mensaje}</span>
            <button type="button" className="btn-close btn-sm" aria-label="Cerrar aviso" onClick={() => setAvisos((x) => x.filter((y) => y.n !== a.n))} />
          </div>
        ))}
      </div>
      {pregunta && (
        <Modal chico titulo={pregunta.titulo ?? '¿Está seguro?'} onCerrar={() => responder(false)}
          pie={<>
            <button className="btn btn-outline-secondary" onClick={() => responder(false)}>{pregunta.textoCancelar ?? 'Cancelar'}</button>
            <button className={`btn ${pregunta.peligro ? 'btn-danger' : 'btn-primary'}`} autoFocus onClick={() => responder(true)}>{pregunta.textoAceptar ?? 'Aceptar'}</button>
          </>}>
          <div>{pregunta.mensaje}</div>
          {pregunta.peligro && <div className="small text-muted mt-2">Esta acción no se puede deshacer.</div>}
        </Modal>
      )}
    </CtxUI.Provider>
  );
}

export const useAvisos = () => useContext(CtxUI).avisar;
export const useConfirmar = () => useContext(CtxUI).confirmar;

/**
 * Mensaje para el usuario. Los de éxito aparecen como aviso flotante que se cierra solo (retroalimentación
 * sin interrumpir); los errores quedan fijos junto al contenido hasta que se cierran.
 */
export function Alerta({ mensaje, tipo = 'danger', onCerrar }) {
  const avisar = useAvisos();
  const flotante = tipo === 'success';
  useEffect(() => {
    if (flotante && mensaje) { avisar(mensaje, 'success'); onCerrar?.(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensaje, flotante]);
  if (!mensaje || flotante) return null;
  return (
    <div className={`alert alert-${tipo} d-flex justify-content-between align-items-start gap-2`} role="alert">
      <span><strong className="me-1">{tipo === 'danger' ? 'No se pudo completar:' : ''}</strong>{mensaje}</span>
      {onCerrar && <button type="button" className="btn-close" onClick={onCerrar} aria-label="Cerrar" />}
    </div>
  );
}

export function Modal({ titulo, onCerrar, children, pie, chico }) {
  const ref = useRef(null);
  useEffect(() => {
    const f = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', f);
    const anterior = document.activeElement;
    ref.current?.querySelector('input, select, textarea, button.btn-primary, button.btn-danger')?.focus();
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', f); document.body.style.overflow = ''; anterior?.focus?.(); };
  }, [onCerrar]);
  return (
    <div className="modal-qs" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className={`contenido ${chico ? 'chico' : ''}`} role="dialog" aria-modal="true" aria-label={titulo} ref={ref}>
        <div className="d-flex justify-content-between align-items-center border-bottom px-3 py-2">
          <h5 className="m-0">{titulo}</h5>
          <button type="button" className="btn-close" onClick={onCerrar} aria-label="Cerrar" />
        </div>
        <div className="p-3">{children}</div>
        {pie && <div className="border-top px-3 py-2 d-flex justify-content-end gap-2">{pie}</div>}
      </div>
    </div>
  );
}

/** Esqueleto de carga: muestra la forma del contenido que viene (estado visible del sistema). */
export function Cargando({ filas = 4 }) {
  return (
    <div className="py-2" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: filas }, (_, i) => <div key={i} className="esqueleto mb-2" style={{ height: 36, opacity: 1 - i * 0.15 }} />)}
    </div>
  );
}

export function Vacio({ icono = 'carpeta', titulo, children }) {
  return (
    <div className="vacio">
      <span className="icono"><Icono nombre={icono} tam={36} /></span>
      <div className="fw-semibold text-body">{titulo}</div>
      {children && <div className="small mt-1">{children}</div>}
    </div>
  );
}

export function Titulo({ children, sub, acciones }) {
  return (
    <div className="encabezado-pagina d-flex flex-wrap justify-content-between align-items-end gap-2">
      <div>
        <h3 className="m-0">{children}</h3>
        {sub && <div className="text-muted small mt-1">{sub}</div>}
      </div>
      {acciones && <div className="d-flex gap-2 flex-wrap">{acciones}</div>}
    </div>
  );
}

/** Carga una lista de la API una vez (para los <select> de claves foráneas). */
export function useLista(ruta, params) {
  const [lista, setLista] = useState([]);
  const clave = JSON.stringify(params ?? {});
  useEffect(() => {
    if (!ruta) return;
    api(ruta, { params }).then(setLista).catch(() => setLista([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruta, clave]);
  return lista;
}

export const ESTADO_COLOR = {
  activo: 'success', inactivo: 'secondary', suspendido: 'warning', retirado: 'secondary', bloqueado: 'danger',
  pendiente: 'warning', confirmada: 'primary', completada: 'success', cancelada: 'secondary',
  exitoso: 'success', fallido: 'danger', reembolsado: 'info', enviada: 'success', fallida: 'danger', 'leída': 'secondary',
  visible: 'success', oculta: 'danger', aceptado: 'danger', rechazado: 'secondary',
};
// Un ícono por estado: la información no depende solo del color
const ESTADO_ICONO = {
  activo: 'circulo', inactivo: 'pausa', suspendido: 'pausa', retirado: 'prohibido', bloqueado: 'prohibido',
  pendiente: 'reloj', confirmada: 'check', completada: 'checkDoble', cancelada: 'cerrar',
  exitoso: 'check', fallido: 'cerrar', reembolsado: 'deshacer', enviada: 'check', fallida: 'cerrar', 'leída': 'ojo',
  visible: 'ojo', oculta: 'prohibido', aceptado: 'prohibido', rechazado: 'cerrar',
};

export const Insignia = ({ valor }) => (
  <span className={`badge text-bg-${ESTADO_COLOR[valor] ?? 'light'}`}>
    {ESTADO_ICONO[valor] && <Icono nombre={ESTADO_ICONO[valor]} className="me-1" tam={11} />}{valor}
  </span>
);

/** Ícono de papelera en SVG: toma el color del botón (currentColor). */
export const IconoBasura = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
  </svg>
);
