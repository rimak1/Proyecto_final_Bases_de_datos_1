-- =====================================================================
-- QuindíoStay — Dominio 10: Reseñas y recomendaciones turísticas
-- Proyecto Final — Bases de Datos I — Grupo 02D
-- Script 03: consultas de los 10 reportes (3 simples, 4 intermedios, 3 avanzados)
-- Orden de ejecución: 3. Todos cuentan solo las reseñas visibles (RN-20).
-- Los filtros se escriben como variables de sesión; NULL significa "sin filtro".
-- En la aplicación (backend/src/dao/ReporteDAO.js) son parámetros (?).
-- =====================================================================
SET NAMES utf8mb4;
USE quindiostay;

-- ---------------------------------------------------------------------
-- R1 (simple) — Reportes de reseñas pendientes de moderación
-- ¿Qué denuncias de reseñas siguen sin resolver y cuántos días llevan esperando?
-- Filtro: motivo
-- ---------------------------------------------------------------------
SET @motivo = NULL;            -- 'ofensiva' | 'falsa' | 'spam' | 'no corresponde'
SELECT rr.idReporte,
       rr.idResena,
       rr.motivo,
       rr.fechaReporte,
       DATEDIFF(CURDATE(), rr.fechaReporte) AS diasEspera
FROM ReporteResena rr
WHERE rr.estado = 'pendiente'
  AND (@motivo IS NULL OR rr.motivo = @motivo)
ORDER BY rr.fechaReporte, rr.idReporte;

-- ---------------------------------------------------------------------
-- R2 (simple) — Distribución de la calificación general  [gráfico: barras verticales]
-- ¿Cuántas reseñas visibles hay con cada calificación de 1 a 5 y qué porcentaje representa cada una?
-- Filtro: rango de fechas
-- ---------------------------------------------------------------------
SET @desde = '2025-01-01', @hasta = '2026-12-31';
SELECT r.calificacionGeneral AS calificacion,
       COUNT(*) AS cantidadResenas,
       ROUND(100 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS porcentaje
FROM Resena r
WHERE r.estado = 'visible'
  AND (@desde IS NULL OR r.fecha >= @desde)
  AND (@hasta IS NULL OR r.fecha <= @hasta)
GROUP BY r.calificacionGeneral
ORDER BY r.calificacionGeneral;

-- ---------------------------------------------------------------------
-- R3 (simple) — Reseñas publicadas por mes
-- ¿Cómo cambia mes a mes la cantidad de reseñas publicadas y su calificación promedio?
-- Filtro: año
-- ---------------------------------------------------------------------
SET @anio = 2026;
SELECT DATE_FORMAT(r.fecha, '%Y-%m') AS mes,
       COUNT(*) AS cantidadResenas,
       ROUND(AVG(r.calificacionGeneral), 2) AS calificacionPromedio
FROM Resena r
WHERE r.estado = 'visible'
  AND (@anio IS NULL OR YEAR(r.fecha) = @anio)
GROUP BY DATE_FORMAT(r.fecha, '%Y-%m')
ORDER BY mes;

-- ---------------------------------------------------------------------
-- R4 (intermedio) — Prestadores mejor calificados por municipio
-- ¿Cuáles son los prestadores con mejor calificación promedio en cada municipio,
-- contando solo los que tienen suficientes reseñas?
-- Filtros: municipio, tipo de prestador, mínimo de reseñas, rango de fechas
-- ---------------------------------------------------------------------
SET @codDane = NULL, @idTipoPrestador = NULL, @minResenas = 2, @desde = NULL, @hasta = NULL;
SELECT m.nombre AS municipio,
       p.nombreComercial AS prestador,
       tp.nombre AS tipo,
       COUNT(*) AS cantidadResenas,
       ROUND(AVG(r.calificacionGeneral), 2) AS calificacionPromedio
FROM Resena r
JOIN Prestador p      ON p.idPrestador = r.idPrestador
JOIN Municipio m      ON m.codDane = p.codDane
JOIN TipoPrestador tp ON tp.idTipoPrestador = p.idTipoPrestador
WHERE r.estado = 'visible'
  AND r.idPrestador IS NOT NULL
  AND (@codDane IS NULL OR p.codDane = @codDane)
  AND (@idTipoPrestador IS NULL OR p.idTipoPrestador = @idTipoPrestador)
  AND (@desde IS NULL OR r.fecha >= @desde)
  AND (@hasta IS NULL OR r.fecha <= @hasta)
GROUP BY m.nombre, p.idPrestador, p.nombreComercial, tp.nombre
HAVING COUNT(*) >= @minResenas
ORDER BY m.nombre, calificacionPromedio DESC, cantidadResenas DESC;

-- ---------------------------------------------------------------------
-- R5 (intermedio) — Destinos mejor calificados por municipio
-- ¿Cuáles son los destinos turísticos mejor calificados en cada municipio?
-- Filtros: municipio, tipo de destino, mínimo de reseñas
-- ---------------------------------------------------------------------
SET @codDane = NULL, @idTipoDestino = NULL, @minResenas = 2;
SELECT m.nombre AS municipio,
       d.nombre AS destino,
       td.nombre AS tipo,
       COUNT(*) AS cantidadResenas,
       ROUND(AVG(r.calificacionGeneral), 2) AS calificacionPromedio
FROM Resena r
JOIN Destino d      ON d.idDestino = r.idDestino
JOIN Municipio m    ON m.codDane = d.codDane
JOIN TipoDestino td ON td.idTipoDestino = d.idTipoDestino
WHERE r.estado = 'visible'
  AND r.idDestino IS NOT NULL
  AND (@codDane IS NULL OR d.codDane = @codDane)
  AND (@idTipoDestino IS NULL OR d.idTipoDestino = @idTipoDestino)
GROUP BY m.nombre, d.idDestino, d.nombre, td.nombre
HAVING COUNT(*) >= @minResenas
ORDER BY m.nombre, calificacionPromedio DESC, cantidadResenas DESC;

-- ---------------------------------------------------------------------
-- R6 (intermedio) — Criterios peor calificados por tipo de prestador  [gráfico: barras horizontales]
-- ¿En qué aspectos les va peor a los prestadores de cada tipo?
-- Filtros: tipo de prestador, rango de fechas, mínimo de calificaciones
-- ---------------------------------------------------------------------
SET @idTipoPrestador = NULL, @desde = NULL, @hasta = NULL, @minCalificaciones = 3;
SELECT tp.nombre AS tipo,
       c.nombre AS criterio,
       ROUND(AVG(cc.puntaje), 2) AS promedio,
       COUNT(*) AS cantidadCalificaciones,
       ROUND(100 * SUM(cc.puntaje <= 2) / COUNT(*), 2) AS porcentajeBajo
FROM CalificacionCriterio cc
JOIN Criterio c       ON c.idCriterio = cc.idCriterio
JOIN Resena r         ON r.idResena = cc.idResena
JOIN Prestador p      ON p.idPrestador = r.idPrestador
JOIN TipoPrestador tp ON tp.idTipoPrestador = p.idTipoPrestador
WHERE r.estado = 'visible'
  AND (@idTipoPrestador IS NULL OR p.idTipoPrestador = @idTipoPrestador)
  AND (@desde IS NULL OR r.fecha >= @desde)
  AND (@hasta IS NULL OR r.fecha <= @hasta)
GROUP BY tp.nombre, c.idCriterio, c.nombre
HAVING COUNT(*) >= @minCalificaciones
ORDER BY promedio ASC, porcentajeBajo DESC;

-- ---------------------------------------------------------------------
-- R7 (intermedio) — Destinos más reseñados por temporada  [gráfico: barras agrupadas]
-- ¿Qué destinos reciben más reseñas en temporada alta y cuáles en temporada baja?
-- Temporada alta: diciembre, enero, junio y julio; baja: resto del año.
-- Filtros: año, municipio
-- ---------------------------------------------------------------------
SET @anio = NULL, @codDane = NULL;
SELECT CASE WHEN MONTH(r.fecha) IN (12, 1, 6, 7) THEN 'alta' ELSE 'baja' END AS temporada,
       d.nombre AS destino,
       m.nombre AS municipio,
       COUNT(*) AS cantidadResenas,
       ROUND(AVG(r.calificacionGeneral), 2) AS calificacionPromedio
FROM Resena r
JOIN Destino d   ON d.idDestino = r.idDestino
JOIN Municipio m ON m.codDane = d.codDane
WHERE r.estado = 'visible'
  AND (@anio IS NULL OR YEAR(r.fecha) = @anio)
  AND (@codDane IS NULL OR d.codDane = @codDane)
GROUP BY temporada, d.idDestino, d.nombre, m.nombre
ORDER BY temporada, cantidadResenas DESC, destino;

-- ---------------------------------------------------------------------
-- R8 (avanzado) — Reseñas con más reportes
-- ¿Qué reseñas acumulan más denuncias que el promedio de las reseñas reportadas
-- y en qué estado quedaron?  (subconsulta en HAVING)
-- Filtros: rango de fechas del reporte, motivo
-- ---------------------------------------------------------------------
SET @desde = NULL, @hasta = NULL, @motivo = NULL;
SELECT r.idResena,
       COALESCE(p.nombreComercial, d.nombre) AS objetoResenado,
       CONCAT(c.nombres, ' ', c.apellidos) AS autor,
       COUNT(*) AS totalReportes,
       SUM(rr.estado = 'aceptado') AS aceptados,
       SUM(rr.estado = 'pendiente') AS pendientes,
       r.estado AS estadoResena
FROM ReporteResena rr
JOIN Resena r         ON r.idResena = rr.idResena
JOIN Cliente c        ON c.idCliente = r.idCliente
LEFT JOIN Prestador p ON p.idPrestador = r.idPrestador
LEFT JOIN Destino d   ON d.idDestino = r.idDestino
WHERE (@desde IS NULL OR rr.fechaReporte >= @desde)
  AND (@hasta IS NULL OR rr.fechaReporte <= @hasta)
  AND (@motivo IS NULL OR rr.motivo = @motivo)
GROUP BY r.idResena, objetoResenado, autor, r.estado
HAVING COUNT(*) > (
         SELECT AVG(t.cantidad)
         FROM (SELECT COUNT(*) AS cantidad
               FROM ReporteResena rr2
               WHERE (@desde IS NULL OR rr2.fechaReporte >= @desde)
                 AND (@hasta IS NULL OR rr2.fechaReporte <= @hasta)
                 AND (@motivo IS NULL OR rr2.motivo = @motivo)
               GROUP BY rr2.idResena) AS t)
ORDER BY totalReportes DESC, r.idResena;

-- ---------------------------------------------------------------------
-- R9 (avanzado) — Prestadores por debajo del promedio de su tipo
-- ¿Qué prestadores tienen una calificación promedio menor que la de los prestadores
-- de su mismo tipo?  (subconsulta correlacionada en HAVING)
-- Filtros: tipo de prestador, municipio
-- ---------------------------------------------------------------------
SET @idTipoPrestador = NULL, @codDane = NULL;
SELECT p.nombreComercial AS prestador,
       tp.nombre AS tipo,
       m.nombre AS municipio,
       ROUND(AVG(r.calificacionGeneral), 2) AS promedioPrestador,
       ROUND((SELECT AVG(r2.calificacionGeneral)
              FROM Resena r2 JOIN Prestador p2 ON p2.idPrestador = r2.idPrestador
              WHERE r2.estado = 'visible' AND p2.idTipoPrestador = p.idTipoPrestador), 2) AS promedioTipo,
       ROUND(AVG(r.calificacionGeneral) -
             (SELECT AVG(r2.calificacionGeneral)
              FROM Resena r2 JOIN Prestador p2 ON p2.idPrestador = r2.idPrestador
              WHERE r2.estado = 'visible' AND p2.idTipoPrestador = p.idTipoPrestador), 2) AS diferencia
FROM Resena r
JOIN Prestador p      ON p.idPrestador = r.idPrestador
JOIN TipoPrestador tp ON tp.idTipoPrestador = p.idTipoPrestador
JOIN Municipio m      ON m.codDane = p.codDane
WHERE r.estado = 'visible'
  AND (@idTipoPrestador IS NULL OR p.idTipoPrestador = @idTipoPrestador)
  AND (@codDane IS NULL OR p.codDane = @codDane)
GROUP BY p.idPrestador, p.nombreComercial, tp.nombre, m.nombre, p.idTipoPrestador
HAVING AVG(r.calificacionGeneral) < (
         SELECT AVG(r2.calificacionGeneral)
         FROM Resena r2
         JOIN Prestador p2 ON p2.idPrestador = r2.idPrestador
         WHERE r2.estado = 'visible'
           AND p2.idTipoPrestador = p.idTipoPrestador)
ORDER BY diferencia ASC;

-- ---------------------------------------------------------------------
-- R10 (avanzado) — Prestadores con reseñas sin responder
-- ¿Qué prestadores tienen reseñas visibles sin respuesta y desde hace cuántos días está la más antigua?
-- (NOT EXISTS)  Filtros: municipio, días mínimos sin respuesta
-- ---------------------------------------------------------------------
SET @codDane = NULL, @minDias = 0;
SELECT p.nombreComercial AS prestador,
       m.nombre AS municipio,
       COUNT(*) AS resenasSinResponder,
       MIN(r.fecha) AS fechaMasAntigua,
       DATEDIFF(CURDATE(), MIN(r.fecha)) AS diasSinRespuesta
FROM Resena r
JOIN Prestador p ON p.idPrestador = r.idPrestador
JOIN Municipio m ON m.codDane = p.codDane
WHERE r.estado = 'visible'
  AND NOT EXISTS (SELECT 1 FROM Respuesta rp WHERE rp.idResena = r.idResena)
  AND (@codDane IS NULL OR p.codDane = @codDane)
GROUP BY p.idPrestador, p.nombreComercial, m.nombre
HAVING DATEDIFF(CURDATE(), MIN(r.fecha)) >= @minDias
ORDER BY diasSinRespuesta DESC;
