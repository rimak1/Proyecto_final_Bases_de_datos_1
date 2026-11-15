// Errores de negocio y traducción de los errores de restricción de MySQL a mensajes claros.

export class ErrorNegocio extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

export const noEncontrado = (que = 'El registro') => new ErrorNegocio(404, `${que} no existe.`);

const NOMBRES_CHECK = {
  ck_resena_objeto: 'La reseña debe ser de un prestador (con reserva) o de un destino (sin reserva), nunca de los dos (RN-05).',
  ck_resena_calificacion: 'La calificación general debe estar entre 1 y 5 (RN-06).',
  ck_calificacion_puntaje: 'El puntaje de cada criterio debe estar entre 1 y 5 (RN-08).',
  ck_pago_referencia: 'La referencia es obligatoria para tarjetas y PSE, y vacía para transferencia y efectivo.',
  ck_reserva_fechas: 'La fecha de creación no puede ser posterior a la fecha del servicio.',
  ck_plan_vigencia: 'La fecha final de vigencia debe ser mayor o igual que la inicial.',
  ck_municipio_coddane: 'El código DANE debe tener 5 dígitos y empezar por 63.',
};

export function manejadorErrores(err, req, res, _next) {
  if (err instanceof ErrorNegocio) return res.status(err.status).json({ mensaje: err.message });
  if (err.type === 'entity.too.large') return res.status(413).json({ mensaje: 'Los archivos enviados son demasiado grandes.' });

  switch (err.code) {
    case 'ER_DUP_ENTRY': {
      const clave = /for key '([^']+)'/.exec(err.sqlMessage)?.[1] ?? '';
      const mensajes = {
        'Resena.uk_resena_reserva': 'Esa reserva ya respalda otra reseña (RN-04).',
        'Voto.uk_voto_cliente_resena': 'Ya votaste esta reseña (RN-15).',
        'ReporteResena.uk_reporte_resena_cliente': 'Ya reportaste esta reseña (RN-19).',
        'Respuesta.uk_respuesta_resena': 'Esta reseña ya tiene respuesta (RN-13).',
        'Cliente.uk_cliente_correo': 'Ya existe un cliente con ese correo.',
        'Cliente.uk_cliente_documento': 'Ya existe un cliente con ese documento.',
      };
      return res.status(409).json({ mensaje: mensajes[clave] ?? `Ya existe un registro con ese valor (clave única ${clave}).` });
    }
    case 'ER_ROW_IS_REFERENCED_2':
    case 'ER_ROW_IS_REFERENCED':
      return res.status(409).json({
        mensaje: 'No se puede eliminar: tiene registros relacionados (la clave foránea es RESTRICT).', referenciado: true,
      });
    case 'ER_NO_REFERENCED_ROW_2':
    case 'ER_NO_REFERENCED_ROW':
      return res.status(400).json({ mensaje: 'Uno de los datos relacionados (clave foránea) no existe.' });
    case 'ER_CHECK_CONSTRAINT_VIOLATED': {
      const nombre = /constraint '([^']+)'/i.exec(err.sqlMessage)?.[1];
      return res.status(400).json({ mensaje: NOMBRES_CHECK[nombre] ?? `El valor no cumple la restricción ${nombre}.` });
    }
    case 'ER_BAD_NULL_ERROR':
      return res.status(400).json({ mensaje: `Falta un dato obligatorio: ${/Column '([^']+)'/.exec(err.sqlMessage)?.[1] ?? ''}.` });
    case 'ER_SIGNAL_EXCEPTION':
      return res.status(400).json({ mensaje: err.sqlMessage });
    case 'ER_TRUNCATED_WRONG_VALUE':
    case 'ER_WRONG_VALUE':
    case 'ER_DATA_TOO_LONG':
    case 'WARN_DATA_TRUNCATED':
    case 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD':
      return res.status(400).json({ mensaje: `Dato inválido: ${err.sqlMessage}` });
    default:
      console.error(err);
      return res.status(500).json({ mensaje: 'Error interno del servidor.' });
  }
}
