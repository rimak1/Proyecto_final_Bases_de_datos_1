// ReporteDAO: consultas de solo lectura de los 10 reportes. Cada una devuelve una lista de DTO
// con solo las columnas que muestra la pantalla. Las consultas son las de database/03_Reportes_Grupo02D.sql
// con los filtros como parámetros (?). Un filtro vacío (NULL) no filtra.
import { pool } from '../config/db.js';
import * as DTO from '../dto/ReporteDTO.js';

const v = (x) => (x === undefined || x === '' || x === null ? null : x);
const n = (x, def) => (x === undefined || x === '' || x === null ? def : Number(x));

async function consultar(sql, params, mapa) {
  const [filas] = await pool.query(sql, params);
  return filas.map(mapa);
}

export const ReporteDAO = {
  // R1 — Reportes de reseñas pendientes de moderación
  r1: ({ motivo }) => consultar(
    `SELECT rr.idReporte, rr.idResena, rr.motivo, rr.fechaReporte, DATEDIFF(CURDATE(), rr.fechaReporte) AS diasEspera
     FROM ReporteResena rr
     WHERE rr.estado = 'pendiente' AND (? IS NULL OR rr.motivo = ?)
     ORDER BY rr.fechaReporte, rr.idReporte`,
    [v(motivo), v(motivo)], DTO.ReportePendienteDTO),

  // R2 — Distribución de la calificación general
  r2: ({ desde, hasta }) => consultar(
    `SELECT r.calificacionGeneral AS calificacion, COUNT(*) AS cantidadResenas,
            ROUND(100 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS porcentaje
     FROM Resena r
     WHERE r.estado = 'visible' AND (? IS NULL OR r.fecha >= ?) AND (? IS NULL OR r.fecha <= ?)
     GROUP BY r.calificacionGeneral ORDER BY r.calificacionGeneral`,
    [v(desde), v(desde), v(hasta), v(hasta)], DTO.DistribucionCalificacionDTO),

  // R3 — Reseñas publicadas por mes
  r3: ({ anio }) => consultar(
    `SELECT DATE_FORMAT(r.fecha, '%Y-%m') AS mes, COUNT(*) AS cantidadResenas,
            ROUND(AVG(r.calificacionGeneral), 2) AS calificacionPromedio
     FROM Resena r
     WHERE r.estado = 'visible' AND (? IS NULL OR YEAR(r.fecha) = ?)
     GROUP BY DATE_FORMAT(r.fecha, '%Y-%m') ORDER BY mes`,
    [v(anio), v(anio)], DTO.ResenasMesDTO),

  // R4 — Prestadores mejor calificados por municipio
  r4: ({ codDane, idTipoPrestador, minResenas, desde, hasta }) => consultar(
    `SELECT m.nombre AS municipio, p.nombreComercial AS prestador, tp.nombre AS tipo,
            COUNT(*) AS cantidadResenas, ROUND(AVG(r.calificacionGeneral), 2) AS calificacionPromedio
     FROM Resena r
     JOIN Prestador p ON p.idPrestador = r.idPrestador
     JOIN Municipio m ON m.codDane = p.codDane
     JOIN TipoPrestador tp ON tp.idTipoPrestador = p.idTipoPrestador
     WHERE r.estado = 'visible' AND r.idPrestador IS NOT NULL
       AND (? IS NULL OR p.codDane = ?) AND (? IS NULL OR p.idTipoPrestador = ?)
       AND (? IS NULL OR r.fecha >= ?) AND (? IS NULL OR r.fecha <= ?)
     GROUP BY m.nombre, p.idPrestador, p.nombreComercial, tp.nombre
     HAVING COUNT(*) >= ?
     ORDER BY m.nombre, calificacionPromedio DESC, cantidadResenas DESC`,
    [v(codDane), v(codDane), v(idTipoPrestador), v(idTipoPrestador), v(desde), v(desde), v(hasta), v(hasta), n(minResenas, 1)],
    DTO.PrestadorCalificadoDTO),

  // R5 — Destinos mejor calificados por municipio
  r5: ({ codDane, idTipoDestino, minResenas }) => consultar(
    `SELECT m.nombre AS municipio, d.nombre AS destino, td.nombre AS tipo,
            COUNT(*) AS cantidadResenas, ROUND(AVG(r.calificacionGeneral), 2) AS calificacionPromedio
     FROM Resena r
     JOIN Destino d ON d.idDestino = r.idDestino
     JOIN Municipio m ON m.codDane = d.codDane
     JOIN TipoDestino td ON td.idTipoDestino = d.idTipoDestino
     WHERE r.estado = 'visible' AND r.idDestino IS NOT NULL
       AND (? IS NULL OR d.codDane = ?) AND (? IS NULL OR d.idTipoDestino = ?)
     GROUP BY m.nombre, d.idDestino, d.nombre, td.nombre
     HAVING COUNT(*) >= ?
     ORDER BY m.nombre, calificacionPromedio DESC, cantidadResenas DESC`,
    [v(codDane), v(codDane), v(idTipoDestino), v(idTipoDestino), n(minResenas, 1)], DTO.DestinoCalificadoDTO),

  // R6 — Criterios peor calificados por tipo de prestador
  r6: ({ idTipoPrestador, desde, hasta, minCalificaciones }) => consultar(
    `SELECT tp.nombre AS tipo, c.nombre AS criterio, ROUND(AVG(cc.puntaje), 2) AS promedio,
            COUNT(*) AS cantidadCalificaciones, ROUND(100 * SUM(cc.puntaje <= 2) / COUNT(*), 2) AS porcentajeBajo
     FROM CalificacionCriterio cc
     JOIN Criterio c ON c.idCriterio = cc.idCriterio
     JOIN Resena r ON r.idResena = cc.idResena
     JOIN Prestador p ON p.idPrestador = r.idPrestador
     JOIN TipoPrestador tp ON tp.idTipoPrestador = p.idTipoPrestador
     WHERE r.estado = 'visible' AND (? IS NULL OR p.idTipoPrestador = ?)
       AND (? IS NULL OR r.fecha >= ?) AND (? IS NULL OR r.fecha <= ?)
     GROUP BY tp.nombre, c.idCriterio, c.nombre
     HAVING COUNT(*) >= ?
     ORDER BY promedio ASC, porcentajeBajo DESC`,
    [v(idTipoPrestador), v(idTipoPrestador), v(desde), v(desde), v(hasta), v(hasta), n(minCalificaciones, 1)],
    DTO.CriterioCalificadoDTO),

  // R7 — Destinos más reseñados por temporada
  r7: ({ anio, codDane }) => consultar(
    `SELECT CASE WHEN MONTH(r.fecha) IN (12, 1, 6, 7) THEN 'alta' ELSE 'baja' END AS temporada,
            d.nombre AS destino, m.nombre AS municipio, COUNT(*) AS cantidadResenas,
            ROUND(AVG(r.calificacionGeneral), 2) AS calificacionPromedio
     FROM Resena r
     JOIN Destino d ON d.idDestino = r.idDestino
     JOIN Municipio m ON m.codDane = d.codDane
     WHERE r.estado = 'visible' AND (? IS NULL OR YEAR(r.fecha) = ?) AND (? IS NULL OR d.codDane = ?)
     GROUP BY temporada, d.idDestino, d.nombre, m.nombre
     ORDER BY temporada, cantidadResenas DESC, destino`,
    [v(anio), v(anio), v(codDane), v(codDane)], DTO.DestinoTemporadaDTO),

  // R8 — Reseñas con más reportes (subconsulta en HAVING)
  r8: ({ desde, hasta, motivo }) => consultar(
    `SELECT r.idResena, COALESCE(p.nombreComercial, d.nombre) AS objetoResenado,
            CONCAT(c.nombres, ' ', c.apellidos) AS autor, COUNT(*) AS totalReportes,
            SUM(rr.estado = 'aceptado') AS aceptados, SUM(rr.estado = 'pendiente') AS pendientes, r.estado AS estadoResena
     FROM ReporteResena rr
     JOIN Resena r ON r.idResena = rr.idResena
     JOIN Cliente c ON c.idCliente = r.idCliente
     LEFT JOIN Prestador p ON p.idPrestador = r.idPrestador
     LEFT JOIN Destino d ON d.idDestino = r.idDestino
     WHERE (? IS NULL OR rr.fechaReporte >= ?) AND (? IS NULL OR rr.fechaReporte <= ?) AND (? IS NULL OR rr.motivo = ?)
     GROUP BY r.idResena, objetoResenado, autor, r.estado
     HAVING COUNT(*) > (
       SELECT AVG(t.cantidad) FROM (
         SELECT COUNT(*) AS cantidad FROM ReporteResena rr2
         WHERE (? IS NULL OR rr2.fechaReporte >= ?) AND (? IS NULL OR rr2.fechaReporte <= ?) AND (? IS NULL OR rr2.motivo = ?)
         GROUP BY rr2.idResena) AS t)
     ORDER BY totalReportes DESC, r.idResena`,
    [v(desde), v(desde), v(hasta), v(hasta), v(motivo), v(motivo), v(desde), v(desde), v(hasta), v(hasta), v(motivo), v(motivo)],
    DTO.ResenaReportadaDTO),

  // R9 — Prestadores por debajo del promedio de su tipo (subconsulta correlacionada en HAVING)
  r9: ({ idTipoPrestador, codDane }) => consultar(
    `SELECT p.nombreComercial AS prestador, tp.nombre AS tipo, m.nombre AS municipio,
            ROUND(AVG(r.calificacionGeneral), 2) AS promedioPrestador,
            ROUND((SELECT AVG(r2.calificacionGeneral) FROM Resena r2 JOIN Prestador p2 ON p2.idPrestador = r2.idPrestador
                   WHERE r2.estado = 'visible' AND p2.idTipoPrestador = p.idTipoPrestador), 2) AS promedioTipo,
            ROUND(AVG(r.calificacionGeneral) -
                  (SELECT AVG(r2.calificacionGeneral) FROM Resena r2 JOIN Prestador p2 ON p2.idPrestador = r2.idPrestador
                   WHERE r2.estado = 'visible' AND p2.idTipoPrestador = p.idTipoPrestador), 2) AS diferencia
     FROM Resena r
     JOIN Prestador p ON p.idPrestador = r.idPrestador
     JOIN TipoPrestador tp ON tp.idTipoPrestador = p.idTipoPrestador
     JOIN Municipio m ON m.codDane = p.codDane
     WHERE r.estado = 'visible' AND (? IS NULL OR p.idTipoPrestador = ?) AND (? IS NULL OR p.codDane = ?)
     GROUP BY p.idPrestador, p.nombreComercial, tp.nombre, m.nombre, p.idTipoPrestador
     HAVING AVG(r.calificacionGeneral) < (
       SELECT AVG(r2.calificacionGeneral) FROM Resena r2 JOIN Prestador p2 ON p2.idPrestador = r2.idPrestador
       WHERE r2.estado = 'visible' AND p2.idTipoPrestador = p.idTipoPrestador)
     ORDER BY diferencia ASC`,
    [v(idTipoPrestador), v(idTipoPrestador), v(codDane), v(codDane)], DTO.PrestadorBajoPromedioDTO),

  // R10 — Prestadores con reseñas sin responder (NOT EXISTS)
  r10: ({ codDane, minDias }) => consultar(
    `SELECT p.nombreComercial AS prestador, m.nombre AS municipio, COUNT(*) AS resenasSinResponder,
            MIN(r.fecha) AS fechaMasAntigua, DATEDIFF(CURDATE(), MIN(r.fecha)) AS diasSinRespuesta
     FROM Resena r
     JOIN Prestador p ON p.idPrestador = r.idPrestador
     JOIN Municipio m ON m.codDane = p.codDane
     WHERE r.estado = 'visible'
       AND NOT EXISTS (SELECT 1 FROM Respuesta rp WHERE rp.idResena = r.idResena)
       AND (? IS NULL OR p.codDane = ?)
     GROUP BY p.idPrestador, p.nombreComercial, m.nombre
     HAVING DATEDIFF(CURDATE(), MIN(r.fecha)) >= ?
     ORDER BY diasSinRespuesta DESC`,
    [v(codDane), v(codDane), n(minDias, 0)], DTO.PrestadorSinRespuestaDTO),
};
