// Cliente HTTP de la API REST. La pantalla nunca consulta tablas: solo llama a estas rutas.
const CLAVE = 'quindiostay.sesion';

export function leerSesion() {
  try { return JSON.parse(localStorage.getItem(CLAVE)); } catch { return null; }
}
export function guardarSesion(s) {
  try { s ? localStorage.setItem(CLAVE, JSON.stringify(s)) : localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ }
}

export async function api(ruta, { method = 'GET', body, params } = {}) {
  const sesion = leerSesion();
  let url = `/api${ruta}`;
  if (params) {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined));
    if ([...q].length) url += `?${q}`;
  }
  const res = await fetch(url, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(sesion?.token ? { Authorization: `Bearer ${sesion.token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const datos = await res.json().catch(() => ({}));
  if (res.status === 401 && sesion) {
    guardarSesion(null);
    window.location.assign('/login');
  }
  if (!res.ok) throw Object.assign(new Error(datos.mensaje ?? `Error ${res.status}`), { status: res.status, datos });
  return datos;
}

export const pesos = (n) => (n === null || n === undefined ? '' : Number(n).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }));
export const fecha = (f) => {
  if (!f) return '';
  const [a, m, d] = String(f).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
};
export const hoyISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

/** Lee archivos de imagen como data URL (base64) para enviarlos a la API. */
export const leerArchivos = (files) => Promise.all([...files].map((f) => new Promise((ok, mal) => {
  const r = new FileReader();
  r.onload = () => ok({ nombre: f.name, datos: r.result });
  r.onerror = mal;
  r.readAsDataURL(f);
})));

/** Regla de cancelación del núcleo: más de 5 días antes del servicio se reembolsa el 80 % de lo pagado. */
export function textoReembolso(r) {
  const dias = Math.round((Date.parse(`${r.fechaServicio}T00:00:00Z`) - Date.parse(`${hoyISO()}T00:00:00Z`)) / 86400000);
  const pagado = Number(r.totalPagado) || 0;
  if (!pagado) return 'La reserva no tiene pagos, así que no hay reembolso.';
  if (dias > 5) return `Faltan ${dias} días para el servicio: se reembolsa el 80 % de lo pagado, ${pesos(pagado * 0.8)}.`;
  return `Faltan ${Math.max(dias, 0)} días para el servicio: con 5 días o menos de anticipación no hay reembolso de los ${pesos(pagado)} pagados.`;
}
