// Rutas de la API REST. Los controladores son delgados: validan el rol y llaman al servicio o al DAO.
import { Router } from 'express';
import { crudRouter } from './crud.js';
import { verificarToken, tokenOpcional, requiereRol, ROLES } from '../middleware/auth.js';
import { ErrorNegocio, noEncontrado } from '../middleware/errores.js';
import * as Auth from '../services/AuthServicio.js';
import * as Reservas from '../services/ReservaServicio.js';
import * as Resenas from '../services/ResenaServicio.js';
import { ReporteDAO } from '../dao/ReporteDAO.js';
import MunicipioDAO from '../dao/MunicipioDAO.js';
import TipoPrestadorDAO from '../dao/TipoPrestadorDAO.js';
import PrestadorDAO from '../dao/PrestadorDAO.js';
import ClienteDAO from '../dao/ClienteDAO.js';
import PlanDAO from '../dao/PlanDAO.js';
import ReservaDAO from '../dao/ReservaDAO.js';
import PagoDAO from '../dao/PagoDAO.js';
import NotificacionDAO from '../dao/NotificacionDAO.js';
import RolDAO from '../dao/RolDAO.js';
import UsuarioSistemaDAO from '../dao/UsuarioSistemaDAO.js';
import TipoDestinoDAO from '../dao/TipoDestinoDAO.js';
import DestinoDAO from '../dao/DestinoDAO.js';
import CriterioDAO from '../dao/CriterioDAO.js';
import ResenaDAO from '../dao/ResenaDAO.js';
import VotoDAO from '../dao/VotoDAO.js';
import ReporteResenaDAO from '../dao/ReporteResenaDAO.js';
import { enTransaccion } from '../config/db.js';
import { ahora } from '../util/fechas.js';

const { ADMIN, ENCARGADO, OPERADOR, CLIENTE } = ROLES;
const api = Router();
const admin = [verificarToken, requiereRol(ADMIN)];
const cliente = [verificarToken, requiereRol(CLIENTE)];

// ------------------------------------------------------------------ Autenticación y perfil (RF-01, RF-02, RF-03)
api.post('/auth/login', async (req, res) => {
  const { tipo, usuario, contrasena } = req.body;
  res.json(tipo === 'cliente' ? await Auth.loginCliente(usuario, contrasena) : await Auth.loginInterno(usuario, contrasena));
});
api.post('/auth/registro', async (req, res) => res.status(201).json(await Auth.registrar(req.body)));
api.get('/auth/yo', verificarToken, (req, res) => res.json(req.usuario));

api.get('/perfil', ...cliente, async (req, res) => {
  res.json({ cliente: await ClienteDAO.buscarPorId(req.usuario.idCliente), perfil: await ClienteDAO.buscarPerfil(req.usuario.idCliente) });
});
api.put('/perfil', ...cliente, async (req, res) => {
  const { cliente: datosCliente = {}, perfil = {} } = req.body;
  Auth.validarCliente(datosCliente);
  if (perfil.contrasena) {
    if (perfil.contrasena.length < 8) throw new ErrorNegocio(400, 'La contraseña debe tener al menos 8 caracteres.');
    perfil.contrasenaCifrada = await Auth.hashContrasena(perfil.contrasena);
  }
  const { correo, tipoDocumento, numeroDocumento, ...editables } = datosCliente;   // la identidad no se cambia aquí
  await enTransaccion(async (conn) => {
    await ClienteDAO.actualizar(req.usuario.idCliente, editables, conn);
    await ClienteDAO.actualizarPerfil(req.usuario.idCliente, perfil, conn);
  });
  res.json({ cliente: await ClienteDAO.buscarPorId(req.usuario.idCliente), perfil: await ClienteDAO.buscarPerfil(req.usuario.idCliente) });
});

// ------------------------------------------------------------------ Núcleo común (RF-06)
api.use('/municipios', crudRouter(MunicipioDAO, { lecturaPublica: true }));
api.use('/tipos-prestador', crudRouter(TipoPrestadorDAO, { lecturaPublica: true }));

api.get('/prestadores/:id/planes', tokenOpcional, async (req, res) => res.json(await PlanDAO.listarPorPrestador(req.params.id)));
api.patch('/prestadores/:id/estado', ...admin, async (req, res) => res.json(await PrestadorDAO.cambiarEstado(req.params.id, req.body.estado)));
api.use('/prestadores', crudRouter(PrestadorDAO, {
  lecturaPublica: true,
  listar: (req) => PrestadorDAO.buscar(req.query),
  // Un prestador con reseñas no se elimina: pasa a retirado (RN-24)
  alEliminar: async (id) => {
    if (await PrestadorDAO.contarResenas(id)) {
      throw new ErrorNegocio(409, 'El prestador tiene reseñas y no se puede eliminar (RN-24); márquelo como retirado.');
    }
    if (!(await PrestadorDAO.eliminar(id))) throw noEncontrado();
    return { eliminado: true };
  },
}));

api.use('/planes', crudRouter(PlanDAO, { lecturaPublica: true }));

// PerfilCliente (entidad débil): el administrador crea la cuenta a un cliente registrado en mostrador
api.get('/clientes/:id/perfil', ...admin, async (req, res) => res.json(await ClienteDAO.buscarPerfil(req.params.id)));
api.post('/clientes/:id/perfil', ...admin, async (req, res) => {
  if (!(await ClienteDAO.buscarPorId(req.params.id))) throw noEncontrado('El cliente');
  if (await ClienteDAO.buscarPerfil(req.params.id)) throw new ErrorNegocio(409, 'El cliente ya tiene cuenta.');
  if (!req.body.contrasena || req.body.contrasena.length < 8) throw new ErrorNegocio(400, 'La contraseña debe tener al menos 8 caracteres.');
  res.status(201).json(await ClienteDAO.crearPerfil(req.params.id, await Auth.hashContrasena(req.body.contrasena), req.body));
});
api.put('/clientes/:id/perfil', ...admin, async (req, res) => {
  if (!(await ClienteDAO.buscarPerfil(req.params.id))) throw noEncontrado('La cuenta');
  const datos = { ...req.body };
  if (datos.contrasena) {
    if (datos.contrasena.length < 8) throw new ErrorNegocio(400, 'La contraseña debe tener al menos 8 caracteres.');
    datos.contrasenaCifrada = await Auth.hashContrasena(datos.contrasena);
  }
  res.json(await ClienteDAO.actualizarPerfil(req.params.id, datos));
});
api.delete('/clientes/:id/perfil', ...admin, async (req, res) => {
  if (!(await ClienteDAO.eliminarPerfil(req.params.id))) throw noEncontrado('La cuenta');
  res.json({ eliminado: true });
});
api.use('/clientes', crudRouter(ClienteDAO, {
  antesDeGuardar: (d) => { Auth.validarCliente(d); return d; },
}));

api.use('/roles', crudRouter(RolDAO));

api.use('/usuarios', crudRouter(UsuarioSistemaDAO, {
  antesDeGuardar: async (d, _req, id) => {
    const rol = await RolDAO.buscarPorId(d.idRol);
    if (!rol) throw new ErrorNegocio(400, 'Seleccione un rol válido.');
    // idPrestador tiene valor solo si el rol es encargado de prestador
    if (rol.nombre === 'encargado de prestador' && !d.idPrestador) throw new ErrorNegocio(400, 'El encargado debe tener un prestador.');
    if (rol.nombre !== 'encargado de prestador') d.idPrestador = null;
    if (d.contrasena) d.contrasenaCifrada = await Auth.hashContrasena(d.contrasena);
    else if (!id) throw new ErrorNegocio(400, 'Escriba la contraseña del usuario.');
    return d;
  },
}));

// Reservas: CRUD del administrador; la creación pasa por el servicio (precio congelado y notificaciones)
api.post('/reservas', ...admin, async (req, res) => res.status(201).json(await Reservas.crearReserva(req.body)));
api.patch('/reservas/:id/estado', verificarToken, requiereRol(ADMIN, OPERADOR), async (req, res) => {
  res.json(await Reservas.cambiarEstado(req.params.id, req.body.estado));
});
api.use('/reservas', crudRouter(ReservaDAO, {
  antesDeGuardar: async (d, _req, id) => {
    const actual = await ReservaDAO.buscarPorId(id);
    if (d.estado && d.estado !== actual.estado) throw new ErrorNegocio(400, 'Use "Cambiar estado" para cambiar el estado de la reserva.');
    const { idCliente, idPlan, ...resto } = d;   // cliente y plan no cambian (la reseña depende de ellos)
    return resto;
  },
  alEliminar: async (id) => {
    const r = await ReservaDAO.buscarPorId(id);
    if (!r) throw noEncontrado('La reserva');
    if (r.estado === 'cancelada') throw new ErrorNegocio(409, 'Una reserva cancelada no se borra: queda como historial.');
    if (r.estado === 'completada') throw new ErrorNegocio(409, 'Una reserva completada no se borra: es historial del cliente y del prestador.');
    await ReservaDAO.eliminar(id);   // pagos y reseña la protegen con RESTRICT
    return { eliminado: true };
  },
}));

api.use('/pagos', crudRouter(PagoDAO, { antesDeGuardar: Reservas.validarPagoAdmin }));

// Notificaciones (RF-04)
api.post('/notificaciones/promocion', ...admin, async (req, res) => {
  const { mensaje, fechaProgramada } = req.body;
  if (!mensaje?.trim()) throw new ErrorNegocio(400, 'Escriba el mensaje de la promoción.');
  const destinatarios = await ClienteDAO.listarQueAceptanPromociones();   // solo clientes que aceptan promociones
  await enTransaccion(async (conn) => {
    for (const d of destinatarios) {
      await NotificacionDAO.crear({
        tipo: 'promoción', canal: d.canalPreferido, mensaje: mensaje.trim(), fechaProgramada: fechaProgramada || ahora(),
        estado: 'pendiente', idCliente: d.idCliente,
      }, conn);
    }
  });
  res.status(201).json({ creadas: destinatarios.length });
});
api.post('/notificaciones/procesar', verificarToken, requiereRol(ADMIN, OPERADOR), async (_req, res) => {
  const pendientes = await NotificacionDAO.listarPendientes();
  for (const n of pendientes) await NotificacionDAO.marcarEnviada(n.idNotificacion);   // envío simulado
  res.json({ enviadas: pendientes.length });
});
const fechaHora = (v) => (v ? String(v).replace('T', ' ').slice(0, 19) : null);
api.use('/notificaciones', crudRouter(NotificacionDAO, {
  rolesEscritura: [ADMIN, OPERADOR],
  antesDeGuardar: async (d) => {
    d.idCliente = d.idCliente || null;
    d.idReserva = d.idReserva || null;
    if ((d.idCliente === null) === (d.idReserva === null)) {
      throw new ErrorNegocio(400, 'La notificación va dirigida a un cliente o a una reserva, exactamente uno de los dos (RN-26).');
    }
    if (d.tipo === 'promoción') {
      if (!d.idCliente) throw new ErrorNegocio(400, 'Una promoción se dirige al cliente, no a una reserva.');
      const perfil = await ClienteDAO.buscarPerfil(d.idCliente);
      if (perfil?.aceptaPromociones !== 'S') throw new ErrorNegocio(400, 'Las promociones solo se envían a clientes que las aceptaron.');
    }
    d.fechaProgramada = fechaHora(d.fechaProgramada);
    d.fechaEnvio = fechaHora(d.fechaEnvio);
    if (d.fechaEnvio && d.fechaEnvio < d.fechaProgramada) throw new ErrorNegocio(400, 'No puede haberse enviado antes de la fecha programada.');
    if (d.estado === 'pendiente') d.fechaEnvio = null;
    return d;
  },
}));

// ------------------------------------------------------------------ Módulo de reseñas: catálogos (RF-07, RF-08)
api.use('/tipos-destino', crudRouter(TipoDestinoDAO, { lecturaPublica: true }));

api.patch('/destinos/:id/estado', ...admin, async (req, res) => res.json(await DestinoDAO.cambiarEstado(req.params.id, req.body.estado)));
api.use('/destinos', crudRouter(DestinoDAO, {
  lecturaPublica: true,
  listar: (req) => DestinoDAO.buscar(req.query),
  // Resena.idDestino es RESTRICT: un destino con reseñas se marca como inactivo (RN-24)
  alEliminar: async (id) => {
    const n = await DestinoDAO.contarResenas(id);
    if (n) throw Object.assign(new ErrorNegocio(409, `El destino tiene ${n} reseñas y no se puede eliminar (RN-24); puede marcarlo como inactivo.`), { n });
    if (!(await DestinoDAO.eliminar(id))) throw noEncontrado();
    return { eliminado: true };
  },
}));

api.get('/criterios/tipo/:idTipoPrestador', tokenOpcional, async (req, res) => res.json(await CriterioDAO.listarPorTipo(req.params.idTipoPrestador)));
api.put('/criterios/:id/tipos', ...admin, async (req, res) => {
  const nuevos = new Set((req.body.idsTipos ?? []).map(Number));
  if (!nuevos.size) throw new ErrorNegocio(400, 'Un criterio aplica al menos a un tipo de prestador (APLICA 1,N).');
  const actual = (await CriterioDAO.listarTodos()).find((c) => c.idCriterio === Number(req.params.id));
  if (!actual) throw noEncontrado('El criterio');
  await enTransaccion(async (conn) => {
    for (const t of actual.idsTipos) if (!nuevos.has(t)) await CriterioDAO.quitarDeTipo(actual.idCriterio, t, conn);
    for (const t of nuevos) await CriterioDAO.asignarATipo(actual.idCriterio, t, conn);
  });
  res.json((await CriterioDAO.listarTodos()).find((c) => c.idCriterio === actual.idCriterio));
});
api.use('/criterios', crudRouter(CriterioDAO, { lecturaPublica: true }));

// ------------------------------------------------------------------ Reseñas (RF-09 a RF-18)
api.get('/resenas', tokenOpcional, async (req, res) => {
  const { idPrestador, idDestino, estado, tipo } = req.query;
  const esAdmin = req.usuario?.rol === ADMIN;
  if (!idPrestador && !idDestino && !esAdmin) throw new ErrorNegocio(400, 'Indique el prestador o el destino.');
  const lista = await ResenaDAO.listar({ idPrestador, idDestino, tipo, estado: esAdmin ? estado : 'visible' });
  const resumen = idPrestador || idDestino ? await ResenaDAO.promedio({ idPrestador, idDestino }) : null;
  let mios = {};
  if (req.usuario?.rol === CLIENTE) {
    const votos = await VotoDAO.listarPorCliente(req.usuario.idCliente);
    const reportes = await ReporteResenaDAO.listarPorCliente(req.usuario.idCliente);
    mios = { votos: Object.fromEntries(votos.map((v) => [v.idResena, v.tipoVoto])), reportados: reportes.map((r) => r.idResena) };
  }
  res.json({ resumen, resenas: lista, ...mios });
});
api.get('/resenas/:id', tokenOpcional, async (req, res) => {
  const r = await ResenaDAO.buscarDetalle(req.params.id);
  if (!r || (r.estado !== 'visible' && req.usuario?.rol !== ADMIN && req.usuario?.idCliente !== r.idCliente)) throw noEncontrado('La reseña');
  res.json(r);
});
api.post('/resenas', ...cliente, async (req, res) => res.status(201).json(await Resenas.crear(req.usuario.idCliente, req.body)));
api.put('/resenas/:id', ...cliente, async (req, res) => res.json(await Resenas.actualizar(Number(req.params.id), req.usuario.idCliente, req.body)));
api.delete('/resenas/:id', verificarToken, requiereRol(CLIENTE, ADMIN), async (req, res) => {
  if (req.usuario.rol === ADMIN) {
    if (!(await ResenaDAO.eliminar(req.params.id))) throw noEncontrado('La reseña');
  } else {
    await Resenas.eliminar(Number(req.params.id), req.usuario.idCliente);
  }
  res.json({ eliminado: true });
});
api.patch('/resenas/:id/estado', ...admin, async (req, res) => {
  if (!['visible', 'oculta'].includes(req.body.estado)) throw new ErrorNegocio(400, 'Estado inválido.');
  await ResenaDAO.cambiarEstado(req.params.id, req.body.estado);
  res.json(await ResenaDAO.buscarDetalle(req.params.id));
});
api.post('/resenas/:id/votos', ...cliente, async (req, res) => {
  res.status(201).json(await Resenas.votar(Number(req.params.id), req.usuario.idCliente, req.body.tipoVoto));
});
api.delete('/resenas/:id/votos', ...cliente, async (req, res) => {
  const v = await VotoDAO.buscarPorClienteYResena(req.usuario.idCliente, Number(req.params.id));
  if (!v) throw noEncontrado('El voto');
  await VotoDAO.eliminar(v.idVoto);
  res.json({ eliminado: true });
});
api.delete('/resenas/:id/reportes', ...cliente, async (req, res) => {
  const propio = (await ReporteResenaDAO.listarPorCliente(req.usuario.idCliente)).find((r) => r.idResena === Number(req.params.id));
  if (!propio) throw noEncontrado('El reporte');
  if (propio.estado !== 'pendiente') throw new ErrorNegocio(400, 'Solo se retira un reporte que sigue pendiente.');
  await ReporteResenaDAO.eliminarDeCliente(req.usuario.idCliente, Number(req.params.id));
  res.json({ eliminado: true });
});
api.post('/resenas/:id/reportes', ...cliente, async (req, res) => {
  res.status(201).json(await Resenas.reportar(Number(req.params.id), req.usuario.idCliente, req.body.motivo));
});
api.put('/resenas/:id/respuesta', verificarToken, requiereRol(ENCARGADO), async (req, res) => {
  res.json(await Resenas.editarRespuesta(Number(req.params.id), req.usuario, req.body.texto));
});
api.delete('/resenas/:id/respuesta', verificarToken, requiereRol(ENCARGADO, ADMIN), async (req, res) => {
  await Resenas.eliminarRespuesta(Number(req.params.id), req.usuario);
  res.json({ eliminado: true });
});
api.post('/resenas/:id/respuesta', verificarToken, requiereRol(ENCARGADO), async (req, res) => {
  res.status(201).json(await Resenas.responder(Number(req.params.id), req.usuario, req.body.texto));
});

// Cliente: lo suyo
api.get('/mis/reservas', ...cliente, async (req, res) => res.json(await ReservaDAO.listarPorCliente(req.usuario.idCliente)));
api.post('/mis/reservas', ...cliente, async (req, res) => {
  const { idPlan, fechaServicio, cantidad, canal } = req.body;
  res.status(201).json(await Reservas.crearReserva({ idCliente: req.usuario.idCliente, idPlan, fechaServicio, cantidad, canal: canal ?? 'web' }));
});
api.post('/mis/reservas/:id/cancelar', ...cliente, async (req, res) => {
  const r = await ReservaDAO.buscarPorId(req.params.id);
  if (!r || r.idCliente !== req.usuario.idCliente) throw noEncontrado('La reserva');
  res.json(await Reservas.cambiarEstado(r.idReserva, 'cancelada'));
});
api.post('/mis/reservas/:id/pagos', ...cliente, async (req, res) => {
  res.status(201).json(await Reservas.pagar(Number(req.params.id), req.body, req.usuario.idCliente));
});
api.get('/mis/reservas-resenables', ...cliente, async (req, res) => res.json(await Resenas.reservasResenables(req.usuario.idCliente)));
api.get('/mis/resenas', ...cliente, async (req, res) => res.json(await ResenaDAO.listarPorCliente(req.usuario.idCliente)));
api.get('/mis/notificaciones', ...cliente, async (req, res) => res.json(await NotificacionDAO.listarPorCliente(req.usuario.idCliente)));
api.post('/mis/notificaciones/:id/leida', ...cliente, async (req, res) => {
  const propias = await NotificacionDAO.listarPorCliente(req.usuario.idCliente);
  if (!propias.some((n) => n.idNotificacion === Number(req.params.id))) throw noEncontrado('La notificación');
  await NotificacionDAO.marcarLeida(req.params.id);
  res.json({ ok: true });
});

// Encargado de prestador: reseñas recibidas (RF-14)
api.get('/encargado/resenas', verificarToken, requiereRol(ENCARGADO), async (req, res) => {
  res.json({
    prestador: await PrestadorDAO.buscarPorId(req.usuario.idPrestador),
    resumen: await ResenaDAO.promedio({ idPrestador: req.usuario.idPrestador }),
    resenas: await ResenaDAO.listarPorPrestador(req.usuario.idPrestador),
  });
});

// Moderación (RF-17)
api.get('/moderacion/reportes', ...admin, async (req, res) => res.json(await ReporteResenaDAO.listar({ estado: req.query.estado || null })));
api.delete('/moderacion/reportes/:id', ...admin, async (req, res) => {
  if (!(await ReporteResenaDAO.eliminar(req.params.id))) throw noEncontrado('El reporte');
  res.json({ eliminado: true });
});
api.put('/moderacion/reportes/:id', ...admin, async (req, res) => {
  res.json(await Resenas.resolverReporte(Number(req.params.id), req.usuario.id, req.body.estado));
});

// ------------------------------------------------------------------ Documentos (RF-20)
api.get('/documentos/reserva/:id', verificarToken, async (req, res) => {
  const r = await ReservaDAO.buscarDetalle(req.params.id);
  if (!r) throw noEncontrado('La reserva');
  const u = req.usuario;
  if (u.rol === CLIENTE && r.idCliente !== u.idCliente) throw noEncontrado('La reserva');
  if (u.rol === ENCARGADO && r.idPrestador !== u.idPrestador) throw noEncontrado('La reserva');
  res.json({ reserva: r, pagos: await PagoDAO.listarPorReserva(r.idReserva) });
});

// ------------------------------------------------------------------ Reportes (RF-19)
api.get('/reportes/:codigo', ...admin, async (req, res) => {
  const fn = ReporteDAO[req.params.codigo.toLowerCase()];
  if (!fn) throw noEncontrado('El reporte');
  res.json(await fn(req.query));
});

// Estadísticas del tablero del administrador
api.get('/tablero', ...admin, async (_req, res) => {
  const [pend, dist] = await Promise.all([ReporteDAO.r1({}), ReporteDAO.r2({})]);
  const prestadores = await PrestadorDAO.buscar();
  const destinos = await DestinoDAO.buscar();
  res.json({
    reportesPendientes: pend.length,
    totalResenas: dist.reduce((s, d) => s + d.cantidadResenas, 0),
    prestadores: prestadores.length,
    destinos: destinos.length,
    mejoresPrestadores: prestadores.filter((p) => p.cantidadResenas >= 3)
      .sort((a, b) => b.calificacionPromedio - a.calificacionPromedio).slice(0, 5),
    mejoresDestinos: destinos.filter((d) => d.cantidadResenas >= 3)
      .sort((a, b) => b.calificacionPromedio - a.calificacionPromedio).slice(0, 5),
  });
});

export default api;
