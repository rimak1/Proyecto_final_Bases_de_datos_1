// DAO de Resena con sus dependientes CalificacionCriterio y Foto.
// crear() guarda la reseña, sus puntajes y sus fotos en una sola transacción (la abre el servicio).
// Para listar se usan 3 consultas en total (reseñas, puntajes y fotos), nunca una por reseña (sin N+1).
import { BaseDAO } from './BaseDAO.js';

const SELECT_RESENA = `
  SELECT r.*, CONCAT(c.nombres, ' ', LEFT(c.apellidos, 1), '.') AS autor,
         p.nombreComercial AS prestador, p.idTipoPrestador, d.nombre AS destino,
         COALESCE(p.nombreComercial, d.nombre) AS objetoResenado,
         rp.idRespuesta, rp.texto AS respuesta, rp.fecha AS fechaRespuesta,
         (SELECT COUNT(*) FROM Voto v WHERE v.idResena = r.idResena AND v.tipoVoto = 'útil') AS votosUtiles,
         (SELECT COUNT(*) FROM Voto v WHERE v.idResena = r.idResena AND v.tipoVoto = 'no útil') AS votosNoUtiles,
         (SELECT COUNT(*) FROM ReporteResena rr WHERE rr.idResena = r.idResena) AS totalReportes
  FROM Resena r
  JOIN Cliente c ON c.idCliente = r.idCliente
  LEFT JOIN Prestador p ON p.idPrestador = r.idPrestador
  LEFT JOIN Destino d ON d.idDestino = r.idDestino
  LEFT JOIN Respuesta rp ON rp.idResena = r.idResena`;

class ResenaDAO extends BaseDAO {
  constructor() {
    super('Resena', 'idResena',
      ['calificacionGeneral', 'titulo', 'comentario', 'fecha', 'estado', 'idCliente', 'idPrestador', 'idDestino', 'idReserva'],
      { orden: 'fecha DESC' });
  }

  async crear(resena, calificaciones = [], fotos = [], conn) {
    const nueva = await super.crear(resena, conn);
    await this.guardarCalificaciones(nueva.idResena, calificaciones, conn);
    await this.agregarFotos(nueva.idResena, fotos, conn);
    return nueva;
  }

  async guardarCalificaciones(idResena, calificaciones, conn) {
    await this.db(conn).execute('DELETE FROM CalificacionCriterio WHERE idResena = ?', [idResena]);
    for (const c of calificaciones) {
      await this.db(conn).execute(
        'INSERT INTO CalificacionCriterio (idResena, idCriterio, puntaje) VALUES (?, ?, ?)', [idResena, c.idCriterio, c.puntaje]);
    }
  }

  async agregarFotos(idResena, rutas, conn) {
    if (!rutas.length) return;
    const [[{ maximo }]] = await this.db(conn).execute(
      'SELECT COALESCE(MAX(numeroFoto), 0) AS maximo FROM Foto WHERE idResena = ?', [idResena]);
    let n = maximo;
    for (const ruta of rutas) {
      n += 1;
      await this.db(conn).execute('INSERT INTO Foto (idResena, numeroFoto, rutaArchivo) VALUES (?, ?, ?)', [idResena, n, ruta]);
    }
  }

  async eliminarFoto(idResena, numeroFoto, conn) {
    await this.db(conn).execute('DELETE FROM Foto WHERE idResena = ? AND numeroFoto = ?', [idResena, numeroFoto]);
  }

  /** Lista reseñas con filtros y les agrega sus puntajes por criterio y sus fotos. */
  async listar({ idPrestador, idDestino, idCliente, estado, idResena, tipo } = {}, conn) {
    const cond = [];
    const params = [];
    if (idResena) { cond.push('r.idResena = ?'); params.push(idResena); }
    if (idPrestador) { cond.push('r.idPrestador = ?'); params.push(idPrestador); }
    if (idDestino) { cond.push('r.idDestino = ?'); params.push(idDestino); }
    if (idCliente) { cond.push('r.idCliente = ?'); params.push(idCliente); }
    if (estado) { cond.push('r.estado = ?'); params.push(estado); }
    if (tipo === 'prestador') cond.push('r.idPrestador IS NOT NULL');
    if (tipo === 'destino') cond.push('r.idDestino IS NOT NULL');
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const [resenas] = await this.db(conn).execute(`${SELECT_RESENA} ${where} ORDER BY r.fecha DESC, r.idResena DESC`, params);
    if (!resenas.length) return resenas;

    const ids = resenas.map((r) => r.idResena);
    const marcas = ids.map(() => '?').join(',');
    const [puntajes] = await this.db(conn).execute(
      `SELECT cc.idResena, cc.idCriterio, c.nombre, cc.puntaje FROM CalificacionCriterio cc
       JOIN Criterio c ON c.idCriterio = cc.idCriterio WHERE cc.idResena IN (${marcas}) ORDER BY c.nombre`, ids);
    const [fotos] = await this.db(conn).execute(
      `SELECT idResena, numeroFoto, rutaArchivo FROM Foto WHERE idResena IN (${marcas}) ORDER BY numeroFoto`, ids);
    const porId = new Map(resenas.map((r) => [r.idResena, { ...r, criterios: [], fotos: [] }]));
    for (const p of puntajes) porId.get(p.idResena).criterios.push(p);
    for (const f of fotos) porId.get(f.idResena).fotos.push(f);
    return [...porId.values()];
  }

  async buscarDetalle(idResena, conn) {
    const [r] = await this.listar({ idResena }, conn);
    return r ?? null;
  }

  async listarPorPrestador(idPrestador, conn) { return this.listar({ idPrestador, estado: 'visible' }, conn); }
  async listarPorDestino(idDestino, conn) { return this.listar({ idDestino, estado: 'visible' }, conn); }
  async listarPorCliente(idCliente, conn) { return this.listar({ idCliente }, conn); }

  async cambiarEstado(idResena, estado, conn) {
    await this.db(conn).execute('UPDATE Resena SET estado = ? WHERE idResena = ?', [estado, idResena]);
  }

  /** Calificación promedio (RN-21) de un prestador o destino, solo reseñas visibles. */
  async promedio({ idPrestador, idDestino }, conn) {
    const [[f]] = await this.db(conn).execute(
      `SELECT COUNT(*) AS cantidadResenas, ROUND(AVG(calificacionGeneral), 2) AS calificacionPromedio
       FROM Resena WHERE estado = 'visible' AND (idPrestador = ? OR idDestino = ?)`,
      [idPrestador ?? null, idDestino ?? null]);
    return f;
  }
}

export default new ResenaDAO();
