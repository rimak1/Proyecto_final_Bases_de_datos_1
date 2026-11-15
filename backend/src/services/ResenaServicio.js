// Reglas de negocio de las reseñas que miran otras tablas (RN-02, RN-03, RN-10, RN-11, RN-14, RN-16, RN-19, RN-23).
// Lo que se verifica con la fila (CHECK, UNIQUE, FK) lo protege además la base de datos.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { enTransaccion } from '../config/db.js';
import ResenaDAO from '../dao/ResenaDAO.js';
import ReservaDAO from '../dao/ReservaDAO.js';
import DestinoDAO from '../dao/DestinoDAO.js';
import CriterioDAO from '../dao/CriterioDAO.js';
import PrestadorDAO from '../dao/PrestadorDAO.js';
import RespuestaDAO from '../dao/RespuestaDAO.js';
import VotoDAO from '../dao/VotoDAO.js';
import ReporteResenaDAO from '../dao/ReporteResenaDAO.js';
import { ErrorNegocio, noEncontrado } from '../middleware/errores.js';
import { hoy } from '../util/fechas.js';

const DIR_FOTOS = path.resolve('uploads', 'resenas');
const TIPOS_IMAGEN = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX_FOTOS = 6;

/** Guarda las fotos (data URL en base64) en uploads/resenas y devuelve sus rutas. */
async function guardarFotos(fotos = []) {
  const rutas = [];
  await fs.mkdir(DIR_FOTOS, { recursive: true });
  for (const f of fotos) {
    const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(f?.datos ?? '');
    if (!m || !TIPOS_IMAGEN[m[1]]) throw new ErrorNegocio(400, 'Las fotos deben ser imágenes JPG, PNG, WEBP o GIF.');
    const nombre = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${TIPOS_IMAGEN[m[1]]}`;
    await fs.writeFile(path.join(DIR_FOTOS, nombre), Buffer.from(m[2], 'base64'));
    rutas.push(`/uploads/resenas/${nombre}`);
  }
  return rutas;
}

function validarTexto({ calificacionGeneral, titulo }) {
  const c = Number(calificacionGeneral);
  if (!Number.isInteger(c) || c < 1 || c > 5) throw new ErrorNegocio(400, 'La calificación general debe ser un entero de 1 a 5 (RN-06).');
  if (!titulo?.trim()) throw new ErrorNegocio(400, 'La reseña debe tener título (RN-07).');
}

/** RN-10: solo los criterios del tipo del prestador, cada uno una vez, con puntaje de 1 a 5. */
async function validarCriterios(idTipoPrestador, criterios = [], conn) {
  const permitidos = new Set((await CriterioDAO.listarPorTipo(idTipoPrestador, conn)).map((c) => c.idCriterio));
  const vistos = new Set();
  for (const c of criterios) {
    const id = Number(c.idCriterio);
    const p = Number(c.puntaje);
    if (!permitidos.has(id)) throw new ErrorNegocio(400, 'Se calificó un criterio que no aplica al tipo de este prestador (RN-10).');
    if (vistos.has(id)) throw new ErrorNegocio(400, 'Cada criterio se califica una sola vez (RN-09).');
    if (!Number.isInteger(p) || p < 1 || p > 5) throw new ErrorNegocio(400, 'Cada criterio se califica de 1 a 5 (RN-08).');
    vistos.add(id);
  }
  return criterios.map((c) => ({ idCriterio: Number(c.idCriterio), puntaje: Number(c.puntaje) }));
}

/** Reservas completadas del cliente que todavía no respaldan una reseña (RF-09). */
export async function reservasResenables(idCliente) {
  const reservas = await ReservaDAO.listarPorCliente(idCliente);
  return reservas.filter((r) => r.estado === 'completada' && !r.idResena);
}

/** RF-09 / RF-10 / RF-11 / RF-12: publicar la reseña de un prestador o de un destino. */
export async function crear(idCliente, datos) {
  validarTexto(datos);
  if ((datos.fotos?.length ?? 0) > MAX_FOTOS) throw new ErrorNegocio(400, `Máximo ${MAX_FOTOS} fotos por reseña.`);
  const base = {
    calificacionGeneral: Number(datos.calificacionGeneral), titulo: datos.titulo.trim(),
    comentario: datos.comentario?.trim() || null, fecha: hoy(), estado: 'visible', idCliente,
  };

  return enTransaccion(async (conn) => {
    let calificaciones = [];
    if (datos.idReserva) {
      // Reseña de prestador: RN-02, RN-03, RN-04, RN-23
      const r = await ReservaDAO.buscarDetalle(datos.idReserva, conn);
      if (!r) throw noEncontrado('La reserva');
      if (r.idCliente !== idCliente) throw new ErrorNegocio(403, 'La reserva no es suya (RN-03).');
      if (r.estado !== 'completada') throw new ErrorNegocio(400, 'Solo una reserva completada respalda una reseña (RN-02).');
      if (r.idResena) throw new ErrorNegocio(409, 'Esa reserva ya respalda otra reseña (RN-04).');
      if (base.fecha < r.fechaServicio) throw new ErrorNegocio(400, 'La reseña no puede ser anterior a la fecha del servicio (RN-23).');
      const prestador = await PrestadorDAO.buscarPorId(r.idPrestador, conn);
      calificaciones = await validarCriterios(prestador.idTipoPrestador, datos.criterios, conn);
      Object.assign(base, { idPrestador: r.idPrestador, idReserva: r.idReserva, idDestino: null });
    } else if (datos.idDestino) {
      // Reseña de destino: sin reserva y sin criterios (RN-11)
      const d = await DestinoDAO.buscarPorId(datos.idDestino, conn);
      if (!d) throw noEncontrado('El destino');
      if (d.estado !== 'activo') throw new ErrorNegocio(400, 'El destino está inactivo.');
      if (datos.criterios?.length) throw new ErrorNegocio(400, 'Las reseñas de destinos no llevan criterios (RN-11).');
      Object.assign(base, { idDestino: d.idDestino, idPrestador: null, idReserva: null });
    } else {
      throw new ErrorNegocio(400, 'Indique la reserva (para un prestador) o el destino (RN-05).');
    }
    const rutas = await guardarFotos(datos.fotos);
    const nueva = await ResenaDAO.crear(base, calificaciones, rutas, conn);
    return ResenaDAO.buscarDetalle(nueva.idResena, conn);
  });
}

async function propia(idResena, idCliente, conn) {
  const r = await ResenaDAO.buscarPorId(idResena, conn);
  if (!r) throw noEncontrado('La reseña');
  if (r.idCliente !== idCliente) throw new ErrorNegocio(403, 'Solo el autor puede modificar o eliminar su reseña.');
  return r;
}

/** RF-13: modificar la reseña propia (no cambia de reserva, prestador ni destino). */
export async function actualizar(idResena, idCliente, datos) {
  validarTexto(datos);
  return enTransaccion(async (conn) => {
    const r = await propia(idResena, idCliente, conn);
    if (r.estado === 'oculta') throw new ErrorNegocio(400, 'Una reseña oculta por moderación no se puede editar.');
    await ResenaDAO.actualizar(idResena, {
      calificacionGeneral: Number(datos.calificacionGeneral), titulo: datos.titulo.trim(), comentario: datos.comentario?.trim() || null,
    }, conn);
    if (r.idPrestador && datos.criterios) {
      const prestador = await PrestadorDAO.buscarPorId(r.idPrestador, conn);
      await ResenaDAO.guardarCalificaciones(idResena, await validarCriterios(prestador.idTipoPrestador, datos.criterios, conn), conn);
    }
    for (const n of datos.eliminarFotos ?? []) await ResenaDAO.eliminarFoto(idResena, Number(n), conn);
    const actuales = (await ResenaDAO.buscarDetalle(idResena, conn)).fotos.length;
    if (actuales + (datos.fotos?.length ?? 0) > MAX_FOTOS) throw new ErrorNegocio(400, `Máximo ${MAX_FOTOS} fotos por reseña.`);
    await ResenaDAO.agregarFotos(idResena, await guardarFotos(datos.fotos), conn);
    return ResenaDAO.buscarDetalle(idResena, conn);
  });
}

export async function eliminar(idResena, idCliente) {
  await propia(idResena, idCliente);
  await ResenaDAO.eliminar(idResena);   // puntajes, fotos, respuesta, votos y reportes se borran en cascada
}

/** RF-14 / RN-13 / RN-14 / RN-23: el encargado responde una vez una reseña de su prestador. */
export async function responder(idResena, encargado, texto) {
  if (!texto?.trim()) throw new ErrorNegocio(400, 'Escriba el texto de la respuesta.');
  const r = await ResenaDAO.buscarPorId(idResena);
  if (!r) throw noEncontrado('La reseña');
  if (!r.idPrestador) throw new ErrorNegocio(400, 'Solo las reseñas de prestadores reciben respuesta (RN-14).');
  if (r.idPrestador !== encargado.idPrestador) throw new ErrorNegocio(403, 'Solo puede responder reseñas de su prestador (RN-14).');
  if (await RespuestaDAO.buscarPorResena(idResena)) throw new ErrorNegocio(409, 'Esta reseña ya tiene respuesta (RN-13).');
  return RespuestaDAO.crear({ texto: texto.trim(), fecha: hoy(), idResena, idEncargado: encargado.id });
}

async function respuestaDeSuPrestador(idResena, usuario) {
  const r = await ResenaDAO.buscarPorId(idResena);
  if (!r) throw noEncontrado('La reseña');
  const resp = await RespuestaDAO.buscarPorResena(idResena);
  if (!resp) throw noEncontrado('La respuesta');
  if (usuario.rol === 'encargado' && r.idPrestador !== usuario.idPrestador) throw new ErrorNegocio(403, 'Solo gestiona respuestas de su prestador (RN-14).');
  return resp;
}

/** El encargado corrige el texto de su respuesta (sigue siendo una sola por reseña). */
export async function editarRespuesta(idResena, encargado, texto) {
  if (!texto?.trim()) throw new ErrorNegocio(400, 'Escriba el texto de la respuesta.');
  const resp = await respuestaDeSuPrestador(idResena, encargado);
  return RespuestaDAO.actualizar(resp.idRespuesta, { texto: texto.trim() });
}

/** El encargado (o el administrador) retira la respuesta; la reseña puede volver a responderse. */
export async function eliminarRespuesta(idResena, usuario) {
  const resp = await respuestaDeSuPrestador(idResena, usuario);
  await RespuestaDAO.eliminar(resp.idRespuesta);
}

/** RF-15 / RN-15 / RN-16: votar una reseña de otro cliente. Si ya votó, cambia el sentido del voto. */
export async function votar(idResena, idCliente, tipoVoto) {
  if (!['útil', 'no útil'].includes(tipoVoto)) throw new ErrorNegocio(400, 'El voto es útil o no útil.');
  const r = await ResenaDAO.buscarPorId(idResena);
  if (!r || r.estado !== 'visible') throw noEncontrado('La reseña');
  if (r.idCliente === idCliente) throw new ErrorNegocio(400, 'No puede votar su propia reseña (RN-16).');
  const previo = await VotoDAO.buscarPorClienteYResena(idCliente, idResena);
  if (previo) return VotoDAO.actualizar(previo.idVoto, { tipoVoto });
  return VotoDAO.crear({ tipoVoto, fecha: hoy(), idCliente, idResena });
}

/** RF-16 / RN-17 / RN-19: reportar una reseña de otro cliente, una sola vez. */
export async function reportar(idResena, idCliente, motivo) {
  if (!['ofensiva', 'falsa', 'spam', 'no corresponde'].includes(motivo)) throw new ErrorNegocio(400, 'Motivo de reporte inválido (RN-17).');
  const r = await ResenaDAO.buscarPorId(idResena);
  if (!r || r.estado !== 'visible') throw noEncontrado('La reseña');
  if (r.idCliente === idCliente) throw new ErrorNegocio(400, 'No puede reportar su propia reseña (RN-19).');
  return ReporteResenaDAO.crear({ motivo, estado: 'pendiente', fechaReporte: hoy(), idResena, idCliente });
}

/** RF-17 / RN-18 / RN-25: el administrador acepta o rechaza; al aceptar, la reseña queda oculta. */
export async function resolverReporte(idReporte, idAdministrador, estado) {
  if (!['aceptado', 'rechazado'].includes(estado)) throw new ErrorNegocio(400, 'El reporte se acepta o se rechaza.');
  return enTransaccion(async (conn) => {
    const rep = await ReporteResenaDAO.buscarPorId(idReporte, conn);
    if (!rep) throw noEncontrado('El reporte');
    if (rep.estado !== 'pendiente') throw new ErrorNegocio(400, 'El reporte ya fue resuelto.');
    const resuelto = await ReporteResenaDAO.resolver(idReporte, estado, idAdministrador, conn);
    if (estado === 'aceptado') await ResenaDAO.cambiarEstado(rep.idResena, 'oculta', conn);
    return resuelto;
  });
}
