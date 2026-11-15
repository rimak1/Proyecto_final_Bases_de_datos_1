-- =====================================================================
-- QuindíoStay — Dominio 10: Reseñas y recomendaciones turísticas
-- Proyecto Final — Bases de Datos I — Grupo 02D — Universidad del Quindío
-- Script 01: creación de la base, tablas, llaves, restricciones e índices
-- Motor: MySQL 8.4 LTS · InnoDB · utf8mb4
-- Orden de ejecución: 1 (luego 02_DML_Grupo02D.sql)
-- =====================================================================

SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS quindiostay
  DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_0900_ai_ci;
USE quindiostay;

-- Se borran en orden inverso a las dependencias para poder re-ejecutar el script
DROP TABLE IF EXISTS ReporteResena, Voto, Respuesta, Foto, CalificacionCriterio, Resena,
  CriterioTipoPrestador, Criterio, Destino, TipoDestino, UsuarioSistema, Rol,
  Notificacion, Pago, Reserva, Plan, PerfilCliente, Cliente, Prestador, TipoPrestador, Municipio;

-- ---------------------------------------------------------------------
-- NÚCLEO COMÚN
-- ---------------------------------------------------------------------

-- 1. Municipio: uno de los 12 municipios del Quindío
CREATE TABLE Municipio (
  codDane CHAR(5)     NOT NULL,
  nombre  VARCHAR(40) NOT NULL,
  CONSTRAINT pk_municipio PRIMARY KEY (codDane),
  CONSTRAINT uk_municipio_nombre UNIQUE (nombre),
  CONSTRAINT ck_municipio_coddane CHECK (REGEXP_LIKE(codDane, '^63[0-9]{3}$')),
  CONSTRAINT ck_municipio_nombre CHECK (nombre IN ('Armenia','Buenavista','Calarcá','Circasia',
    'Córdoba','Filandia','Génova','La Tebaida','Montenegro','Pijao','Quimbaya','Salento'))
) ENGINE=InnoDB;

-- 2. TipoPrestador: define qué criterios se califican en las reseñas
CREATE TABLE TipoPrestador (
  idTipoPrestador INT         NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(40) NOT NULL,
  CONSTRAINT pk_tipoprestador PRIMARY KEY (idTipoPrestador),
  CONSTRAINT uk_tipoprestador_nombre UNIQUE (nombre),
  CONSTRAINT ck_tipoprestador_nombre CHECK (nombre IN ('alojamiento','agencia de viajes','transporte',
    'gastronomía','guianza','alquiler de vehículos','atracción'))
) ENGINE=InnoDB;

-- 3. Prestador: uno de los dos objetos que se pueden reseñar
CREATE TABLE Prestador (
  idPrestador     INT          NOT NULL AUTO_INCREMENT,
  nombreComercial VARCHAR(120) NOT NULL,
  nit             VARCHAR(20)  NOT NULL,
  rnt             VARCHAR(20)  NOT NULL,
  direccion       VARCHAR(150) NOT NULL,
  telefono        CHAR(10)     NOT NULL,
  correo          VARCHAR(100) NOT NULL,
  estado          VARCHAR(12)  NOT NULL DEFAULT 'activo',
  codDane         CHAR(5)      NOT NULL,
  idTipoPrestador INT          NOT NULL,
  CONSTRAINT pk_prestador PRIMARY KEY (idPrestador),
  CONSTRAINT uk_prestador_nit UNIQUE (nit),
  CONSTRAINT uk_prestador_rnt UNIQUE (rnt),
  CONSTRAINT ck_prestador_telefono CHECK (REGEXP_LIKE(telefono, '^[0-9]{10}$')),
  CONSTRAINT ck_prestador_correo CHECK (REGEXP_LIKE(correo, '^[^@ ]+@[^@ ]+\\.[^@ ]+$')),
  CONSTRAINT ck_prestador_estado CHECK (estado IN ('activo','suspendido','retirado')),
  CONSTRAINT fk_prestador_municipio FOREIGN KEY (codDane) REFERENCES Municipio(codDane) ON DELETE RESTRICT,
  CONSTRAINT fk_prestador_tipo FOREIGN KEY (idTipoPrestador) REFERENCES TipoPrestador(idTipoPrestador) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 4. Cliente: autor de reseñas, votos y reportes (nombreCompleto = nombres + apellidos)
CREATE TABLE Cliente (
  idCliente       INT          NOT NULL AUTO_INCREMENT,
  nombres         VARCHAR(60)  NOT NULL,
  apellidos       VARCHAR(60)  NOT NULL,
  tipoDocumento   VARCHAR(25)  NOT NULL,
  numeroDocumento VARCHAR(20)  NOT NULL,
  correo          VARCHAR(100) NOT NULL,
  telefono        CHAR(10)     NOT NULL,
  fechaNacimiento DATE         NOT NULL,   -- < fecha actual: lo valida la aplicación
  ciudadOrigen    VARCHAR(60)  NOT NULL,
  CONSTRAINT pk_cliente PRIMARY KEY (idCliente),
  CONSTRAINT uk_cliente_documento UNIQUE (tipoDocumento, numeroDocumento),
  CONSTRAINT uk_cliente_correo UNIQUE (correo),
  CONSTRAINT ck_cliente_tipodoc CHECK (tipoDocumento IN ('cédula de ciudadanía','cédula de extranjería',
    'pasaporte','tarjeta de identidad')),
  CONSTRAINT ck_cliente_correo CHECK (REGEXP_LIKE(correo, '^[^@ ]+@[^@ ]+\\.[^@ ]+$')),
  CONSTRAINT ck_cliente_telefono CHECK (REGEXP_LIKE(telefono, '^[0-9]{10}$'))
) ENGINE=InnoDB;

-- 5. PerfilCliente: entidad débil 1:1 identificadora de Cliente
CREATE TABLE PerfilCliente (
  idCliente         INT          NOT NULL,
  contrasenaCifrada VARCHAR(255) NOT NULL,
  idioma            VARCHAR(10)  NOT NULL DEFAULT 'español',
  canalPreferido    VARCHAR(10)  NOT NULL DEFAULT 'correo',
  diasAnticipacion  TINYINT      NOT NULL DEFAULT 3,
  aceptaPromociones CHAR(1)      NOT NULL DEFAULT 'N',
  CONSTRAINT pk_perfilcliente PRIMARY KEY (idCliente),
  CONSTRAINT ck_perfil_idioma CHECK (idioma IN ('español','inglés')),
  CONSTRAINT ck_perfil_canal CHECK (canalPreferido IN ('correo','SMS','WhatsApp')),
  CONSTRAINT ck_perfil_dias CHECK (diasAnticipacion IN (1, 3, 7)),
  CONSTRAINT ck_perfil_promos CHECK (aceptaPromociones IN ('S','N')),
  CONSTRAINT fk_perfil_cliente FOREIGN KEY (idCliente) REFERENCES Cliente(idCliente) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Plan: variante del servicio que ofrece un prestador
CREATE TABLE Plan (
  idPlan              INT           NOT NULL AUTO_INCREMENT,
  nombre              VARCHAR(80)   NOT NULL,
  descripcion         VARCHAR(500)  NOT NULL,
  tipo                VARCHAR(15)   NOT NULL,
  precio              DECIMAL(12,2) NOT NULL,
  fechaInicioVigencia DATE          NOT NULL,
  fechaFinVigencia    DATE          NOT NULL,
  estado              VARCHAR(10)   NOT NULL DEFAULT 'activo',
  idPrestador         INT           NOT NULL,
  CONSTRAINT pk_plan PRIMARY KEY (idPlan),
  CONSTRAINT uk_plan_prestador_nombre UNIQUE (idPrestador, nombre),
  CONSTRAINT ck_plan_tipo CHECK (tipo IN ('básico','estándar','premium','todo incluido')),
  CONSTRAINT ck_plan_precio CHECK (precio > 0),
  CONSTRAINT ck_plan_vigencia CHECK (fechaFinVigencia >= fechaInicioVigencia),
  CONSTRAINT ck_plan_estado CHECK (estado IN ('activo','inactivo')),
  CONSTRAINT fk_plan_prestador FOREIGN KEY (idPrestador) REFERENCES Prestador(idPrestador) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 7. Reserva: si está completada habilita la reseña del prestador
CREATE TABLE Reserva (
  idReserva     INT           NOT NULL AUTO_INCREMENT,
  fechaCreacion DATE          NOT NULL DEFAULT (CURRENT_DATE),
  fechaServicio DATE          NOT NULL,
  estado        VARCHAR(12)   NOT NULL DEFAULT 'pendiente',
  valorTotal    DECIMAL(12,2) NOT NULL,   -- precio congelado: valor pactado al reservar
  canal         VARCHAR(25)   NOT NULL,
  idCliente     INT           NOT NULL,
  idPlan        INT           NOT NULL,
  CONSTRAINT pk_reserva PRIMARY KEY (idReserva),
  CONSTRAINT ck_reserva_fechas CHECK (fechaCreacion <= fechaServicio),
  CONSTRAINT ck_reserva_estado CHECK (estado IN ('pendiente','confirmada','cancelada','completada')),
  CONSTRAINT ck_reserva_valor CHECK (valorTotal > 0),
  CONSTRAINT ck_reserva_canal CHECK (canal IN ('web','aplicación móvil','teléfono','mostrador','agencia intermediaria')),
  CONSTRAINT fk_reserva_cliente FOREIGN KEY (idCliente) REFERENCES Cliente(idCliente) ON DELETE RESTRICT,
  CONSTRAINT fk_reserva_plan FOREIGN KEY (idPlan) REFERENCES Plan(idPlan) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 8. Pago: pago o abono de una reserva
CREATE TABLE Pago (
  idPago                INT           NOT NULL AUTO_INCREMENT,
  fecha                 DATE          NOT NULL DEFAULT (CURRENT_DATE),
  monto                 DECIMAL(12,2) NOT NULL,
  metodo                VARCHAR(20)   NOT NULL,
  estado                VARCHAR(12)   NOT NULL DEFAULT 'pendiente',
  referenciaTransaccion VARCHAR(40)   NULL,
  idReserva             INT           NOT NULL,
  CONSTRAINT pk_pago PRIMARY KEY (idPago),
  CONSTRAINT uk_pago_referencia UNIQUE (referenciaTransaccion),
  CONSTRAINT ck_pago_monto CHECK (monto > 0),
  CONSTRAINT ck_pago_metodo CHECK (metodo IN ('tarjeta de crédito','tarjeta débito','PSE','transferencia','efectivo')),
  CONSTRAINT ck_pago_estado CHECK (estado IN ('exitoso','fallido','pendiente','reembolsado')),
  -- La referencia es obligatoria para tarjetas y PSE y vacía en transferencia y efectivo
  CONSTRAINT ck_pago_referencia CHECK (
       (metodo IN ('tarjeta de crédito','tarjeta débito','PSE') AND referenciaTransaccion IS NOT NULL)
    OR (metodo IN ('transferencia','efectivo') AND referenciaTransaccion IS NULL)),
  CONSTRAINT fk_pago_reserva FOREIGN KEY (idReserva) REFERENCES Reserva(idReserva) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 9. Notificacion: va al cliente directamente (promoción) o a través de una reserva (RN-26)
CREATE TABLE Notificacion (
  idNotificacion  INT          NOT NULL AUTO_INCREMENT,
  tipo            VARCHAR(25)  NOT NULL,
  canal           VARCHAR(10)  NOT NULL,
  mensaje         VARCHAR(500) NOT NULL,
  fechaProgramada DATETIME     NOT NULL,
  fechaEnvio      DATETIME     NULL,
  estado          VARCHAR(10)  NOT NULL DEFAULT 'pendiente',
  idCliente       INT          NULL,
  idReserva       INT          NULL,
  CONSTRAINT pk_notificacion PRIMARY KEY (idNotificacion),
  CONSTRAINT ck_notif_tipo CHECK (tipo IN ('recordatorio de reserva','confirmación de reserva',
    'confirmación de pago','cambio de estado','promoción')),
  CONSTRAINT ck_notif_canal CHECK (canal IN ('correo','SMS','WhatsApp')),
  CONSTRAINT ck_notif_envio CHECK (fechaEnvio IS NULL OR fechaEnvio >= fechaProgramada),
  CONSTRAINT ck_notif_estado CHECK (estado IN ('pendiente','enviada','fallida','leída')),
  CONSTRAINT fk_notif_cliente FOREIGN KEY (idCliente) REFERENCES Cliente(idCliente) ON DELETE CASCADE,
  CONSTRAINT fk_notif_reserva FOREIGN KEY (idReserva) REFERENCES Reserva(idReserva) ON DELETE CASCADE
  -- RN-26 (exactamente uno de idCliente e idReserva) se verifica con los triggers de abajo:
  -- MySQL no permite un CHECK sobre columnas usadas por una FK con acción CASCADE (error 3823).
) ENGINE=InnoDB;

-- 10. Rol de los usuarios internos
CREATE TABLE Rol (
  idRol  INT         NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(40) NOT NULL,
  CONSTRAINT pk_rol PRIMARY KEY (idRol),
  CONSTRAINT uk_rol_nombre UNIQUE (nombre),
  CONSTRAINT ck_rol_nombre CHECK (nombre IN ('administrador de la plataforma','encargado de prestador','operador'))
) ENGINE=InnoDB;

-- 11. UsuarioSistema: encargado de prestador, administrador u operador
CREATE TABLE UsuarioSistema (
  idUsuario         INT          NOT NULL AUTO_INCREMENT,
  nombreUsuario     VARCHAR(40)  NOT NULL,
  contrasenaCifrada VARCHAR(255) NOT NULL,
  estado            VARCHAR(10)  NOT NULL DEFAULT 'activo',
  idRol             INT          NOT NULL,
  idPrestador       INT          NULL,      -- solo para encargados (lo valida UsuarioServicio)
  CONSTRAINT pk_usuariosistema PRIMARY KEY (idUsuario),
  CONSTRAINT uk_usuario_nombre UNIQUE (nombreUsuario),
  CONSTRAINT ck_usuario_estado CHECK (estado IN ('activo','bloqueado')),
  CONSTRAINT fk_usuario_rol FOREIGN KEY (idRol) REFERENCES Rol(idRol) ON DELETE RESTRICT,
  CONSTRAINT fk_usuario_prestador FOREIGN KEY (idPrestador) REFERENCES Prestador(idPrestador) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- MÓDULO PROPIO: RESEÑAS Y RECOMENDACIONES TURÍSTICAS
-- ---------------------------------------------------------------------

-- 12. TipoDestino
CREATE TABLE TipoDestino (
  idTipoDestino INT         NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(30) NOT NULL,
  CONSTRAINT pk_tipodestino PRIMARY KEY (idTipoDestino),
  CONSTRAINT uk_tipodestino_nombre UNIQUE (nombre),
  CONSTRAINT ck_tipodestino_nombre CHECK (nombre IN ('natural','cultural','mirador','pueblo patrimonio','parque temático'))
) ENGINE=InnoDB;

-- 13. Destino: lugar turístico que se reseña sin reserva
CREATE TABLE Destino (
  idDestino     INT           NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(100)  NOT NULL,
  descripcion   VARCHAR(1000) NOT NULL,
  estado        VARCHAR(10)   NOT NULL DEFAULT 'activo',
  codDane       CHAR(5)       NOT NULL,
  idTipoDestino INT           NOT NULL,
  CONSTRAINT pk_destino PRIMARY KEY (idDestino),
  CONSTRAINT uk_destino_nombre_municipio UNIQUE (nombre, codDane),
  CONSTRAINT ck_destino_estado CHECK (estado IN ('activo','inactivo')),
  CONSTRAINT fk_destino_municipio FOREIGN KEY (codDane) REFERENCES Municipio(codDane) ON DELETE RESTRICT,
  CONSTRAINT fk_destino_tipo FOREIGN KEY (idTipoDestino) REFERENCES TipoDestino(idTipoDestino) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 14. Criterio: aspecto calificado de 1 a 5 en la reseña de un prestador
CREATE TABLE Criterio (
  idCriterio INT         NOT NULL AUTO_INCREMENT,
  nombre     VARCHAR(40) NOT NULL,
  CONSTRAINT pk_criterio PRIMARY KEY (idCriterio),
  CONSTRAINT uk_criterio_nombre UNIQUE (nombre)
) ENGINE=InnoDB;

-- 15. CriterioTipoPrestador: tabla puente N:M (relación APLICA)
CREATE TABLE CriterioTipoPrestador (
  idCriterio      INT NOT NULL,
  idTipoPrestador INT NOT NULL,
  CONSTRAINT pk_criteriotipo PRIMARY KEY (idCriterio, idTipoPrestador),
  CONSTRAINT fk_criteriotipo_criterio FOREIGN KEY (idCriterio) REFERENCES Criterio(idCriterio) ON DELETE CASCADE,
  CONSTRAINT fk_criteriotipo_tipo FOREIGN KEY (idTipoPrestador) REFERENCES TipoPrestador(idTipoPrestador) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 16. Resena: de un prestador o de un destino, nunca de los dos (arco exclusivo, RN-05)
CREATE TABLE Resena (
  idResena            INT           NOT NULL AUTO_INCREMENT,
  calificacionGeneral TINYINT       NOT NULL,
  titulo              VARCHAR(100)  NOT NULL,
  comentario          VARCHAR(2000) NULL,
  fecha               DATE          NOT NULL DEFAULT (CURRENT_DATE),  -- <= fecha actual: la valida ResenaServicio
  estado              VARCHAR(8)    NOT NULL DEFAULT 'visible',
  idCliente           INT           NOT NULL,
  idPrestador         INT           NULL,
  idDestino           INT           NULL,
  idReserva           INT           NULL,
  CONSTRAINT pk_resena PRIMARY KEY (idResena),
  CONSTRAINT uk_resena_reserva UNIQUE (idReserva),                         -- RN-04
  CONSTRAINT ck_resena_calificacion CHECK (calificacionGeneral BETWEEN 1 AND 5), -- RN-06
  CONSTRAINT ck_resena_estado CHECK (estado IN ('visible','oculta')),
  -- RN-05 y RN-02: prestador con reserva, o destino sin reserva
  CONSTRAINT ck_resena_objeto CHECK (
       (idPrestador IS NOT NULL AND idDestino IS NULL AND idReserva IS NOT NULL)
    OR (idPrestador IS NULL AND idDestino IS NOT NULL AND idReserva IS NULL)),
  CONSTRAINT fk_resena_cliente FOREIGN KEY (idCliente) REFERENCES Cliente(idCliente) ON DELETE RESTRICT,
  CONSTRAINT fk_resena_prestador FOREIGN KEY (idPrestador) REFERENCES Prestador(idPrestador) ON DELETE RESTRICT,
  CONSTRAINT fk_resena_destino FOREIGN KEY (idDestino) REFERENCES Destino(idDestino) ON DELETE RESTRICT,
  CONSTRAINT fk_resena_reserva FOREIGN KEY (idReserva) REFERENCES Reserva(idReserva) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 17. CalificacionCriterio: entidad asociativa Resena–Criterio con su puntaje
CREATE TABLE CalificacionCriterio (
  idResena   INT     NOT NULL,
  idCriterio INT     NOT NULL,
  puntaje    TINYINT NOT NULL,
  CONSTRAINT pk_calificacioncriterio PRIMARY KEY (idResena, idCriterio),   -- RN-09
  CONSTRAINT ck_calificacion_puntaje CHECK (puntaje BETWEEN 1 AND 5),      -- RN-08
  CONSTRAINT fk_calif_resena FOREIGN KEY (idResena) REFERENCES Resena(idResena) ON DELETE CASCADE,
  CONSTRAINT fk_calif_criterio FOREIGN KEY (idCriterio) REFERENCES Criterio(idCriterio) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 18. Foto: entidad débil de Resena
CREATE TABLE Foto (
  idResena    INT          NOT NULL,
  numeroFoto  TINYINT      NOT NULL,
  rutaArchivo VARCHAR(255) NOT NULL,
  CONSTRAINT pk_foto PRIMARY KEY (idResena, numeroFoto),
  CONSTRAINT ck_foto_numero CHECK (numeroFoto >= 1),
  CONSTRAINT fk_foto_resena FOREIGN KEY (idResena) REFERENCES Resena(idResena) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 19. Respuesta: como máximo una por reseña (RN-13)
CREATE TABLE Respuesta (
  idRespuesta INT           NOT NULL AUTO_INCREMENT,
  texto       VARCHAR(1000) NOT NULL,
  fecha       DATE          NOT NULL DEFAULT (CURRENT_DATE),
  idResena    INT           NOT NULL,
  idEncargado INT           NOT NULL,
  CONSTRAINT pk_respuesta PRIMARY KEY (idRespuesta),
  CONSTRAINT uk_respuesta_resena UNIQUE (idResena),
  CONSTRAINT fk_respuesta_resena FOREIGN KEY (idResena) REFERENCES Resena(idResena) ON DELETE CASCADE,
  CONSTRAINT fk_respuesta_encargado FOREIGN KEY (idEncargado) REFERENCES UsuarioSistema(idUsuario) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 20. Voto de utilidad (RN-15)
CREATE TABLE Voto (
  idVoto    INT        NOT NULL AUTO_INCREMENT,
  tipoVoto  VARCHAR(7) NOT NULL,
  fecha     DATE       NOT NULL DEFAULT (CURRENT_DATE),
  idCliente INT        NOT NULL,
  idResena  INT        NOT NULL,
  CONSTRAINT pk_voto PRIMARY KEY (idVoto),
  CONSTRAINT uk_voto_cliente_resena UNIQUE (idCliente, idResena),
  CONSTRAINT ck_voto_tipo CHECK (tipoVoto IN ('útil','no útil')),
  CONSTRAINT fk_voto_cliente FOREIGN KEY (idCliente) REFERENCES Cliente(idCliente) ON DELETE CASCADE,
  CONSTRAINT fk_voto_resena FOREIGN KEY (idResena) REFERENCES Resena(idResena) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 21. ReporteResena: denuncia que un administrador acepta o rechaza
CREATE TABLE ReporteResena (
  idReporte       INT         NOT NULL AUTO_INCREMENT,
  motivo          VARCHAR(15) NOT NULL,
  estado          VARCHAR(10) NOT NULL DEFAULT 'pendiente',
  fechaReporte    DATE        NOT NULL DEFAULT (CURRENT_DATE),
  fechaResolucion DATE        NULL,
  idResena        INT         NOT NULL,
  idCliente       INT         NOT NULL,
  idAdministrador INT         NULL,
  CONSTRAINT pk_reporteresena PRIMARY KEY (idReporte),
  CONSTRAINT uk_reporte_resena_cliente UNIQUE (idResena, idCliente),
  CONSTRAINT ck_reporte_motivo CHECK (motivo IN ('ofensiva','falsa','spam','no corresponde')),   -- RN-17
  CONSTRAINT ck_reporte_estado CHECK (estado IN ('pendiente','aceptado','rechazado')),
  CONSTRAINT ck_reporte_fechas CHECK (fechaResolucion IS NULL OR fechaResolucion >= fechaReporte),
  CONSTRAINT fk_reporte_resena FOREIGN KEY (idResena) REFERENCES Resena(idResena) ON DELETE CASCADE,
  CONSTRAINT fk_reporte_cliente FOREIGN KEY (idCliente) REFERENCES Cliente(idCliente) ON DELETE RESTRICT,
  CONSTRAINT fk_reporte_admin FOREIGN KEY (idAdministrador) REFERENCES UsuarioSistema(idUsuario) ON DELETE SET NULL
  -- RN-25 (pendiente sin resolución ni administrador; resuelto con ambos) se verifica con triggers:
  -- idAdministrador tiene acción SET NULL y MySQL no admite un CHECK sobre esa columna (error 3823).
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TRIGGERS: reglas "de la fila" que MySQL no permite escribir como CHECK
-- ---------------------------------------------------------------------
DELIMITER //

-- RN-26: exactamente uno de idCliente e idReserva tiene valor
CREATE TRIGGER tr_notificacion_bi BEFORE INSERT ON Notificacion FOR EACH ROW
BEGIN
  IF (NEW.idCliente IS NULL) = (NEW.idReserva IS NULL) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'RN-26: la notificación lleva cliente o reserva, exactamente uno de los dos';
  END IF;
END//
CREATE TRIGGER tr_notificacion_bu BEFORE UPDATE ON Notificacion FOR EACH ROW
BEGIN
  IF (NEW.idCliente IS NULL) = (NEW.idReserva IS NULL) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'RN-26: la notificación lleva cliente o reserva, exactamente uno de los dos';
  END IF;
END//

-- RN-25: pendiente => sin fecha de resolución ni administrador; resuelto => ambos obligatorios
CREATE TRIGGER tr_reporte_bi BEFORE INSERT ON ReporteResena FOR EACH ROW
BEGIN
  IF (NEW.estado = 'pendiente' AND (NEW.fechaResolucion IS NOT NULL OR NEW.idAdministrador IS NOT NULL))
     OR (NEW.estado <> 'pendiente' AND (NEW.fechaResolucion IS NULL OR NEW.idAdministrador IS NULL)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'RN-25: un reporte pendiente no tiene resolución; uno resuelto tiene fecha y administrador';
  END IF;
END//
CREATE TRIGGER tr_reporte_bu BEFORE UPDATE ON ReporteResena FOR EACH ROW
BEGIN
  IF (NEW.estado = 'pendiente' AND (NEW.fechaResolucion IS NOT NULL OR NEW.idAdministrador IS NOT NULL))
     OR (NEW.estado <> 'pendiente' AND (NEW.fechaResolucion IS NULL OR NEW.idAdministrador IS NULL)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'RN-25: un reporte pendiente no tiene resolución; uno resuelto tiene fecha y administrador';
  END IF;
END//

DELIMITER ;

-- ---------------------------------------------------------------------
-- ÍNDICES ADICIONALES (sección 13.5 de la Entrega 2). Los de PK, UNIQUE y FK
-- los crea InnoDB automáticamente.
-- ---------------------------------------------------------------------
CREATE INDEX ix_resena_fecha           ON Resena (fecha);
CREATE INDEX ix_prestador_nombre       ON Prestador (nombreComercial);
CREATE INDEX ix_notificacion_pendiente ON Notificacion (estado, fechaProgramada);

-- ---------------------------------------------------------------------
-- VISTAS de apoyo: atributos derivados (no se guardan, RN-20, RN-21, RN-22)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_calificacion_prestador AS
SELECT p.idPrestador, p.nombreComercial,
       COUNT(r.idResena) AS cantidadResenas,
       ROUND(AVG(r.calificacionGeneral), 2) AS calificacionPromedio
FROM Prestador p
LEFT JOIN Resena r ON r.idPrestador = p.idPrestador AND r.estado = 'visible'
GROUP BY p.idPrestador, p.nombreComercial;

CREATE OR REPLACE VIEW vw_calificacion_destino AS
SELECT d.idDestino, d.nombre,
       COUNT(r.idResena) AS cantidadResenas,
       ROUND(AVG(r.calificacionGeneral), 2) AS calificacionPromedio
FROM Destino d
LEFT JOIN Resena r ON r.idDestino = d.idDestino AND r.estado = 'visible'
GROUP BY d.idDestino, d.nombre;

CREATE OR REPLACE VIEW vw_votos_utiles AS
SELECT r.idResena, COUNT(v.idVoto) AS totalVotosUtiles
FROM Resena r
LEFT JOIN Voto v ON v.idResena = r.idResena AND v.tipoVoto = 'útil'
GROUP BY r.idResena;
