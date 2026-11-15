// Fábrica de rutas REST para el CRUD de una tabla: GET /, GET /:id, POST /, PUT /:id, DELETE /:id.
import { Router } from 'express';
import { verificarToken, tokenOpcional, requiereRol, ROLES } from '../middleware/auth.js';
import { noEncontrado } from '../middleware/errores.js';

/**
 * @param {object} dao        DAO de la tabla
 * @param {object} opciones   { lecturaPublica, rolesEscritura, antesDeGuardar(datos, req, id), listar(req), alEliminar(id) }
 */
export function crudRouter(dao, opciones = {}) {
  const {
    lecturaPublica = false,
    rolesEscritura = [ROLES.ADMIN],
    rolesLectura = [ROLES.ADMIN, ROLES.OPERADOR],
    antesDeGuardar = (d) => d,
    listar = () => dao.listarTodos(),
    alEliminar,
  } = opciones;
  const r = Router();
  const lectura = lecturaPublica ? [tokenOpcional] : [verificarToken, requiereRol(...rolesLectura)];
  const escritura = [verificarToken, requiereRol(...rolesEscritura)];

  r.get('/', ...lectura, async (req, res) => res.json(await listar(req)));

  r.get('/:id', ...lectura, async (req, res) => {
    const fila = await dao.buscarPorId(req.params.id);
    if (!fila) throw noEncontrado();
    res.json(fila);
  });

  r.post('/', ...escritura, async (req, res) => {
    const datos = await antesDeGuardar({ ...req.body }, req, null);
    res.status(201).json(await dao.crear(datos));
  });

  r.put('/:id', ...escritura, async (req, res) => {
    if (!(await dao.buscarPorId(req.params.id))) throw noEncontrado();
    const datos = await antesDeGuardar({ ...req.body }, req, req.params.id);
    res.json(await dao.actualizar(req.params.id, datos));
  });

  r.delete('/:id', ...escritura, async (req, res) => {
    if (alEliminar) return res.json(await alEliminar(req.params.id, req));
    if (!(await dao.eliminar(req.params.id))) throw noEncontrado();
    res.json({ eliminado: true });
  });

  return r;
}
