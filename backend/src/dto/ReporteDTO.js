// DTO de los reportes: objetos simples con solo los datos que muestra la pantalla.
const num = (x) => (x === null || x === undefined ? null : Number(x));

export const ReportePendienteDTO = (f) => ({
  idReporte: f.idReporte, idResena: f.idResena, motivo: f.motivo, fechaReporte: f.fechaReporte, diasEspera: num(f.diasEspera),
});
export const DistribucionCalificacionDTO = (f) => ({
  calificacion: f.calificacion, cantidadResenas: num(f.cantidadResenas), porcentaje: num(f.porcentaje),
});
export const ResenasMesDTO = (f) => ({
  mes: f.mes, cantidadResenas: num(f.cantidadResenas), calificacionPromedio: num(f.calificacionPromedio),
});
export const PrestadorCalificadoDTO = (f) => ({
  municipio: f.municipio, prestador: f.prestador, tipo: f.tipo,
  cantidadResenas: num(f.cantidadResenas), calificacionPromedio: num(f.calificacionPromedio),
});
export const DestinoCalificadoDTO = (f) => ({
  municipio: f.municipio, destino: f.destino, tipo: f.tipo,
  cantidadResenas: num(f.cantidadResenas), calificacionPromedio: num(f.calificacionPromedio),
});
export const CriterioCalificadoDTO = (f) => ({
  tipo: f.tipo, criterio: f.criterio, promedio: num(f.promedio),
  cantidadCalificaciones: num(f.cantidadCalificaciones), porcentajeBajo: num(f.porcentajeBajo),
});
export const DestinoTemporadaDTO = (f) => ({
  temporada: f.temporada, destino: f.destino, municipio: f.municipio,
  cantidadResenas: num(f.cantidadResenas), calificacionPromedio: num(f.calificacionPromedio),
});
export const ResenaReportadaDTO = (f) => ({
  idResena: f.idResena, objetoResenado: f.objetoResenado, autor: f.autor, totalReportes: num(f.totalReportes),
  aceptados: num(f.aceptados), pendientes: num(f.pendientes), estadoResena: f.estadoResena,
});
export const PrestadorBajoPromedioDTO = (f) => ({
  prestador: f.prestador, tipo: f.tipo, municipio: f.municipio,
  promedioPrestador: num(f.promedioPrestador), promedioTipo: num(f.promedioTipo), diferencia: num(f.diferencia),
});
export const PrestadorSinRespuestaDTO = (f) => ({
  prestador: f.prestador, municipio: f.municipio, resenasSinResponder: num(f.resenasSinResponder),
  fechaMasAntigua: f.fechaMasAntigua, diasSinRespuesta: num(f.diasSinRespuesta),
});
