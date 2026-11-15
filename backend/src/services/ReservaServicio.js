// Reservas, pagos (simulados) y las notificaciones que generan (RF-04, RF-05).
import { enTransaccion } from '../config/db.js';
import ReservaDAO from '../dao/ReservaDAO.js';
import PlanDAO from '../dao/PlanDAO.js';
import PagoDAO from '../dao/PagoDAO.js';
import ClienteDAO from '../dao/ClienteDAO.js';
import PrestadorDAO from '../dao/PrestadorDAO.js';
import NotificacionDAO from '../dao/NotificacionDAO.js';
import { ErrorNegocio, noEncontrado } from '../middleware/errores.js';
import { ahora, hoy, sumarDias } from '../util/fechas.js';

const METODOS_CON_REFERENCIA = ['tarjeta de crédito', 'tarjeta débito', 'PSE'];

/** Solo se reserva un plan activo y vigente en la fecha del servicio, de un prestador activo. */
async function validarPlan(idPlan, fechaServicio, conn) {
  const plan = await PlanDAO.buscarPorId(idPlan, conn);
  if (!plan) throw noEncontrado('El plan');
  const prestador = await PrestadorDAO.buscarPorId(plan.idPrestador, conn);
  if (plan.estado !== 'activo' || prestador.estado !== 'activo') throw new ErrorNegocio(400, 'El plan o el prestador no están activos.');
  if (fechaServicio < plan.fechaInicioVigencia || fechaServicio > plan.fechaFinVigencia) {
    throw new ErrorNegocio(400, `El plan solo está vigente entre ${plan.fechaInicioVigencia} y ${plan.fechaFinVigencia}.`);
  }
  return { plan, prestador };
}

/** Programa la confirmación y el recordatorio según los días de anticipación del perfil. */
async function notificarReserva(reserva, prestador, conn) {
  const perfil = await ClienteDAO.buscarPerfil(reserva.idCliente, conn);
  const canal = perfil?.canalPreferido ?? 'correo';
  const ya = ahora();
  await NotificacionDAO.crear({
    tipo: 'confirmación de reserva', canal, idReserva: reserva.idReserva, fechaProgramada: ya, fechaEnvio: ya, estado: 'enviada',
    mensaje: `Tu reserva #${reserva.idReserva} con ${prestador.nombreComercial} quedó registrada para el ${reserva.fechaServicio}.`,
  }, conn);
  let fechaRecordatorio = sumarDias(reserva.fechaServicio, -(perfil?.diasAnticipacion ?? 3));
  if (fechaRecordatorio < hoy()) fechaRecordatorio = hoy();
  await NotificacionDAO.crear({
    tipo: 'recordatorio de reserva', canal, idReserva: reserva.idReserva, fechaProgramada: `${fechaRecordatorio} 08:00:00`,
    mensaje: `Recuerda: tu servicio con ${prestador.nombreComercial} es el ${reserva.fechaServicio}.`,
  }, conn);
}

export async function crearReserva({ idCliente, idPlan, fechaServicio, cantidad = 1, canal = 'web', estado, valorTotal }) {
  if (!fechaServicio || fechaServicio < hoy()) throw new ErrorNegocio(400, 'La fecha del servicio no puede ser anterior a hoy.');
  return enTransaccion(async (conn) => {
    const { plan, prestador } = await validarPlan(idPlan, fechaServicio, conn);
    const reserva = await ReservaDAO.crear({
      idCliente, idPlan, fechaServicio, canal, estado: estado ?? 'pendiente', fechaCreacion: hoy(),
      valorTotal: valorTotal ?? Number(plan.precio) * Math.max(1, Number(cantidad)),   // precio congelado
    }, conn);
    await notificarReserva(reserva, prestador, conn);
    return ReservaDAO.buscarDetalle(reserva.idReserva, conn);
  });
}

const TRANSICIONES = {
  pendiente: ['confirmada', 'cancelada'],
  confirmada: ['completada', 'cancelada'],
  cancelada: [],
  completada: [],
};

/** Una reserva solo pasa a completada si antes estuvo confirmada. */
export async function cambiarEstado(idReserva, estado) {
  return enTransaccion(async (conn) => {
    const r = await ReservaDAO.buscarDetalle(idReserva, conn);
    if (!r) throw noEncontrado('La reserva');
    if (r.estado !== estado) {
      if (!TRANSICIONES[r.estado]?.includes(estado)) {
        throw new ErrorNegocio(400, `Una reserva ${r.estado} no puede pasar a ${estado}.`);
      }
      if (estado === 'completada' && r.fechaServicio > hoy()) {
        throw new ErrorNegocio(400, 'Solo se completa una reserva cuya fecha de servicio ya llegó.');
      }
      await ReservaDAO.cambiarEstado(idReserva, estado, conn);
      let detalle = '';
      if (estado === 'cancelada') {
        const c = await aplicarReglaCancelacion(r, conn);
        if (c.reembolso) detalle = ` Te reembolsamos el 80 % de lo pagado: $${c.reembolso.toLocaleString('es-CO')}.`;
        else if (c.pagado) detalle = ' Al cancelar con 5 días o menos de anticipación no hay reembolso.';
      }
      const perfil = await ClienteDAO.buscarPerfil(r.idCliente, conn);
      const ya = ahora();
      await NotificacionDAO.crear({
        tipo: 'cambio de estado', canal: perfil?.canalPreferido ?? 'correo', idReserva, fechaProgramada: ya, fechaEnvio: ya,
        estado: 'enviada', mensaje: `Tu reserva #${idReserva} con ${r.prestador} cambió a ${estado}.${detalle}`,
      }, conn);
    }
    return ReservaDAO.buscarDetalle(idReserva, conn);
  });
}

/** Días completos entre hoy y la fecha del servicio. */
export const diasAntesDelServicio = (fechaServicio) =>
  Math.round((Date.parse(`${fechaServicio}T00:00:00Z`) - Date.parse(`${hoy()}T00:00:00Z`)) / 86400000);

/**
 * Regla de cancelación del núcleo: si se cancela con más de 5 días de anticipación se reembolsa el 80 % de lo
 * pagado (pagos exitosos); con 5 días o menos no hay reembolso. El reembolso queda como un Pago en estado
 * «reembolsado» por el mismo medio del último pago, para conservar el historial contable.
 */
async function aplicarReglaCancelacion(r, conn) {
  const pagos = await PagoDAO.listarPorReserva(r.idReserva, conn);
  const pagado = pagos.filter((p) => p.estado === 'exitoso').reduce((s, p) => s + Number(p.monto), 0);
  const yaReembolsado = pagos.filter((p) => p.estado === 'reembolsado').reduce((s, p) => s + Number(p.monto), 0);
  if (!pagado || diasAntesDelServicio(r.fechaServicio) <= 5) return { pagado, reembolso: 0 };
  const reembolso = Math.round(pagado * 0.8 * 100) / 100 - yaReembolsado;
  if (reembolso <= 0) return { pagado, reembolso: 0 };
  const ultimo = pagos.filter((p) => p.estado === 'exitoso').at(-1);
  const referencia = METODOS_CON_REFERENCIA.includes(ultimo.metodo)
    ? `RF${hoy().replaceAll('-', '')}${Math.floor(100000 + Math.random() * 900000)}` : null;
  await PagoDAO.crear({ fecha: hoy(), monto: reembolso, metodo: ultimo.metodo, estado: 'reembolsado', referenciaTransaccion: referencia, idReserva: r.idReserva }, conn);
  return { pagado, reembolso };
}

/** Pago en línea simulado: genera la referencia de la pasarela; el primer abono exitoso confirma la reserva. */
export async function pagar(idReserva, { metodo, monto }, idClienteDueno) {
  return enTransaccion(async (conn) => {
    const r = await ReservaDAO.buscarDetalle(idReserva, conn);
    if (!r) throw noEncontrado('La reserva');
    if (idClienteDueno && r.idCliente !== idClienteDueno) throw new ErrorNegocio(403, 'La reserva no es suya.');
    if (!['pendiente', 'confirmada'].includes(r.estado)) throw new ErrorNegocio(400, `No se puede pagar una reserva ${r.estado}.`);
    const saldo = Number(r.valorTotal) - Number(r.totalPagado);
    const valor = Number(monto ?? saldo);
    if (!(valor > 0) || valor > saldo + 0.001) throw new ErrorNegocio(400, `El monto debe ser mayor que 0 y no superar el saldo (${saldo}).`);
    const referencia = METODOS_CON_REFERENCIA.includes(metodo)
      ? `TX${hoy().replaceAll('-', '')}${Math.floor(100000 + Math.random() * 900000)}` : null;
    const pago = await PagoDAO.crear({ fecha: hoy(), monto: valor, metodo, estado: 'exitoso', referenciaTransaccion: referencia, idReserva }, conn);
    if (r.estado === 'pendiente') await ReservaDAO.cambiarEstado(idReserva, 'confirmada', conn);
    const perfil = await ClienteDAO.buscarPerfil(r.idCliente, conn);
    const ya = ahora();
    await NotificacionDAO.crear({
      tipo: 'confirmación de pago', canal: perfil?.canalPreferido ?? 'correo', idReserva, fechaProgramada: ya, fechaEnvio: ya,
      estado: 'enviada', mensaje: `Recibimos tu pago #${pago.idPago} por $${valor.toLocaleString('es-CO')} de la reserva #${idReserva}.`,
    }, conn);
    return pago;
  });
}

export async function validarPagoAdmin(datos) {
  if (datos.metodo && !METODOS_CON_REFERENCIA.includes(datos.metodo)) datos.referenciaTransaccion = null;
  return datos;
}
