// Descripción de las pantallas CRUD genéricas. Los campos siguen el diccionario de datos:
// obligatorios = NOT NULL, listas = CHECK ... IN (...), selects = claves foráneas.
import { createElement as h } from 'react';
import { Link } from 'react-router-dom';
import { fecha, pesos } from '../../api.js';
import { Estrellas, Insignia, Nota } from '../../components/comunes.jsx';
import CuentaCliente from '../../components/CuentaCliente.jsx';

const insignia = (v) => h(Insignia, { valor: v });
const TEL = { patron: '[0-9]{10}', max: 10, ayuda: '10 dígitos', nota: 'Diez dígitos, sin espacios.' };
const OPC_MUNICIPIO = { ruta: '/municipios', valor: 'codDane', texto: (m) => m.nombre };
const OPC_TIPO_PRESTADOR = { ruta: '/tipos-prestador', valor: 'idTipoPrestador', texto: (t) => t.nombre };
const OPC_PRESTADOR = { ruta: '/prestadores', valor: 'idPrestador', texto: (p) => p.nombreComercial };

export const CONFIG_CRUD = {
  municipios: {
    titulo: 'Municipios', singular: 'municipio', ruta: '/municipios', id: 'codDane',
    descripcion: 'Los 12 municipios del Quindío (código DANE 63xxx).',
    columnas: [{ campo: 'codDane', titulo: 'Código DANE' }, { campo: 'nombre', titulo: 'Nombre' }],
    campos: [
      { campo: 'codDane', etiqueta: 'Código DANE', requerido: true, patron: '63[0-9]{3}', max: 5, soloCrear: true, nota: '5 dígitos que empiezan por 63.' },
      { campo: 'nombre', etiqueta: 'Nombre', requerido: true, tipo: 'select',
        opciones: ['Armenia', 'Buenavista', 'Calarcá', 'Circasia', 'Córdoba', 'Filandia', 'Génova', 'La Tebaida', 'Montenegro', 'Pijao', 'Quimbaya', 'Salento'] },
    ],
    describir: (f) => f.nombre,
  },
  'tipos-prestador': {
    titulo: 'Tipos de prestador', singular: 'tipo de prestador', ruta: '/tipos-prestador', id: 'idTipoPrestador',
    descripcion: 'Clasificación de los prestadores; define qué criterios se califican.',
    columnas: [{ num: true, campo: 'idTipoPrestador', titulo: 'ID' }, { campo: 'nombre', titulo: 'Nombre' }],
    campos: [{ campo: 'nombre', etiqueta: 'Nombre', requerido: true, tipo: 'select',
      opciones: ['alojamiento', 'agencia de viajes', 'transporte', 'gastronomía', 'guianza', 'alquiler de vehículos', 'atracción'] }],
    describir: (f) => f.nombre,
  },
  prestadores: {
    titulo: 'Prestadores', singular: 'prestador', ruta: '/prestadores', id: 'idPrestador',
    descripcion: 'Un prestador con reseñas no se elimina: se marca como retirado (RN-24).',
    columnas: [
      { num: true, campo: 'idPrestador', titulo: 'ID' },
      { campo: 'nombreComercial', titulo: 'Nombre comercial', formato: (v, f) => h(Link, { to: `/prestador/${f.idPrestador}` }, v) },
      { campo: 'tipo', titulo: 'Tipo' }, { campo: 'municipio', titulo: 'Municipio' }, { nowrap: true, campo: 'nit', titulo: 'NIT' },
      { nowrap: true, campo: 'rnt', titulo: 'RNT' }, { nowrap: true, campo: 'telefono', titulo: 'Teléfono' },
      { campo: 'calificacionPromedio', titulo: 'Calificación', formato: (v, f) => (v ? h(Nota, { valor: v, cantidad: f.cantidadResenas }) : h('span', { className: 'text-muted' }, 'Sin reseñas')) },
      { campo: 'estado', titulo: 'Estado', formato: insignia },
    ],
    campos: [
      { campo: 'nombreComercial', grupo: 'Identificación', etiqueta: 'Nombre comercial', requerido: true, max: 120, ancho: 'col-12' },
      { campo: 'nit', grupo: 'Identificación', etiqueta: 'NIT', requerido: true, max: 20 },
      { campo: 'rnt', grupo: 'Identificación', etiqueta: 'RNT (Registro Nacional de Turismo)', requerido: true, max: 20 },
      { campo: 'direccion', grupo: 'Contacto', etiqueta: 'Dirección', requerido: true, max: 150, ancho: 'col-12' },
      { campo: 'telefono', grupo: 'Contacto', etiqueta: 'Teléfono', requerido: true, ...TEL },
      { campo: 'correo', grupo: 'Contacto', etiqueta: 'Correo', requerido: true, tipo: 'email', max: 100 },
      { campo: 'codDane', grupo: 'Clasificación', etiqueta: 'Municipio', requerido: true, tipo: 'select', opciones: OPC_MUNICIPIO },
      { campo: 'idTipoPrestador', grupo: 'Clasificación', etiqueta: 'Tipo de prestador', requerido: true, tipo: 'select', opciones: OPC_TIPO_PRESTADOR },
      { campo: 'estado', grupo: 'Clasificación', etiqueta: 'Estado', requerido: true, tipo: 'select', opciones: ['activo', 'suspendido', 'retirado'], porDefecto: 'activo' },
    ],
    describir: (f) => f.nombreComercial,
  },
  planes: {
    titulo: 'Planes', singular: 'plan', ruta: '/planes', id: 'idPlan',
    descripcion: 'El prestador de un plan no cambia después de creado.',
    columnas: [
      { num: true, campo: 'idPlan', titulo: 'ID' }, { campo: 'prestador', titulo: 'Prestador' }, { campo: 'nombre', titulo: 'Plan' },
      { campo: 'tipo', titulo: 'Tipo' }, { num: true, campo: 'precio', titulo: 'Precio', formato: pesos },
      { campo: 'fechaInicioVigencia', titulo: 'Vigencia', formato: (v, f) => `${fecha(v)} – ${fecha(f.fechaFinVigencia)}` },
      { campo: 'estado', titulo: 'Estado', formato: insignia },
    ],
    campos: [
      { campo: 'idPrestador', grupo: 'Plan', etiqueta: 'Prestador', requerido: true, tipo: 'select', opciones: OPC_PRESTADOR, soloCrear: true, ancho: 'col-12' },
      { campo: 'nombre', grupo: 'Plan', etiqueta: 'Nombre', requerido: true, max: 80 },
      { campo: 'tipo', grupo: 'Plan', etiqueta: 'Tipo', requerido: true, tipo: 'select', opciones: ['básico', 'estándar', 'premium', 'todo incluido'] },
      { campo: 'descripcion', grupo: 'Plan', etiqueta: 'Descripción', requerido: true, tipo: 'textarea', max: 500, ancho: 'col-12' },
      { campo: 'precio', grupo: 'Precio y vigencia', etiqueta: 'Precio (COP)', requerido: true, tipo: 'number', min: 1, paso: 1000 },
      { campo: 'estado', grupo: 'Precio y vigencia', etiqueta: 'Estado', requerido: true, tipo: 'select', opciones: ['activo', 'inactivo'], porDefecto: 'activo' },
      { campo: 'fechaInicioVigencia', grupo: 'Precio y vigencia', etiqueta: 'Inicio de vigencia', requerido: true, tipo: 'date' },
      { campo: 'fechaFinVigencia', grupo: 'Precio y vigencia', etiqueta: 'Fin de vigencia', requerido: true, tipo: 'date', nota: 'Mayor o igual que el inicio.' },
    ],
    describir: (f) => f.nombre,
  },
  clientes: {
    titulo: 'Clientes', singular: 'cliente', ruta: '/clientes', id: 'idCliente',
    descripcion: 'Un cliente con reservas o reseñas no se elimina (RESTRICT).',
    columnas: [
      { num: true, campo: 'idCliente', titulo: 'ID' }, { campo: 'nombres', titulo: 'Nombre', formato: (v, f) => `${v} ${f.apellidos}` },
      { campo: 'tipoDocumento', titulo: 'Documento', formato: (v, f) => `${v} ${f.numeroDocumento}` },
      { campo: 'correo', titulo: 'Correo' }, { nowrap: true, campo: 'telefono', titulo: 'Teléfono' }, { campo: 'ciudadOrigen', titulo: 'Origen' },
      { campo: 'tieneCuenta', titulo: 'Cuenta', formato: (v) => (Number(v) ? 'Sí' : 'Mostrador') },
    ],
    campos: [
      { campo: 'nombres', grupo: 'Datos personales', etiqueta: 'Nombres', requerido: true, max: 60 },
      { campo: 'apellidos', grupo: 'Datos personales', etiqueta: 'Apellidos', requerido: true, max: 60 },
      { campo: 'tipoDocumento', grupo: 'Documento', etiqueta: 'Tipo de documento', requerido: true, tipo: 'select',
        opciones: ['cédula de ciudadanía', 'cédula de extranjería', 'pasaporte', 'tarjeta de identidad'] },
      { campo: 'numeroDocumento', grupo: 'Documento', etiqueta: 'Número de documento', requerido: true, max: 20 },
      { campo: 'correo', grupo: 'Contacto', etiqueta: 'Correo', requerido: true, tipo: 'email', max: 100 },
      { campo: 'telefono', grupo: 'Contacto', etiqueta: 'Teléfono', requerido: true, ...TEL },
      { campo: 'fechaNacimiento', grupo: 'Datos personales', etiqueta: 'Fecha de nacimiento', requerido: true, tipo: 'date' },
      { campo: 'ciudadOrigen', grupo: 'Datos personales', etiqueta: 'Ciudad de origen', requerido: true, max: 60 },
    ],
    describir: (f) => `${f.nombres} ${f.apellidos}`,
    acciones: (f, cargar, setError, setAviso) => h(CuentaCliente, { cliente: f, onError: setError, onCambio: (m) => { setAviso(m); cargar(); } }),
  },
  pagos: {
    titulo: 'Pagos', singular: 'pago', ruta: '/pagos', id: 'idPago', roles: ['admin', 'operador'],
    descripcion: 'La referencia es obligatoria para tarjetas y PSE y vacía en transferencia y efectivo.',
    columnas: [
      { num: true, campo: 'idPago', titulo: 'ID' }, { campo: 'idReserva', titulo: 'Reserva', formato: (v) => `#${v}` },
      { campo: 'cliente', titulo: 'Cliente' }, { campo: 'fecha', titulo: 'Fecha', formato: fecha },
      { num: true, campo: 'monto', titulo: 'Monto', formato: pesos }, { campo: 'metodo', titulo: 'Método' },
      { campo: 'referenciaTransaccion', titulo: 'Referencia' }, { campo: 'estado', titulo: 'Estado', formato: insignia },
    ],
    campos: [
      { campo: 'idReserva', grupo: 'Reserva', etiqueta: 'Reserva', requerido: true, tipo: 'select', ancho: 'col-12',
        opciones: { ruta: '/reservas', valor: 'idReserva', texto: (r) => `#${r.idReserva} · ${r.cliente} · ${r.prestador} · ${pesos(r.valorTotal)}` } },
      { campo: 'fecha', grupo: 'Pago', etiqueta: 'Fecha', requerido: true, tipo: 'date' },
      { campo: 'monto', grupo: 'Pago', etiqueta: 'Monto (COP)', requerido: true, tipo: 'number', min: 1 },
      { campo: 'metodo', grupo: 'Pago', etiqueta: 'Método', requerido: true, tipo: 'select', opciones: ['tarjeta de crédito', 'tarjeta débito', 'PSE', 'transferencia', 'efectivo'] },
      { campo: 'estado', grupo: 'Pago', etiqueta: 'Estado', requerido: true, tipo: 'select', opciones: ['exitoso', 'fallido', 'pendiente', 'reembolsado'], porDefecto: 'pendiente' },
      { campo: 'referenciaTransaccion', grupo: 'Pago', etiqueta: 'Referencia de la transacción', max: 40, ancho: 'col-12' },
    ],
    describir: (f) => `pago #${f.idPago}`,
  },
  roles: {
    titulo: 'Roles', singular: 'rol', ruta: '/roles', id: 'idRol',
    columnas: [{ num: true, campo: 'idRol', titulo: 'ID' }, { campo: 'nombre', titulo: 'Nombre' }],
    campos: [{ campo: 'nombre', etiqueta: 'Nombre', requerido: true, tipo: 'select', opciones: ['administrador de la plataforma', 'encargado de prestador', 'operador'] }],
    describir: (f) => f.nombre,
  },
  usuarios: {
    titulo: 'Usuarios del sistema', singular: 'usuario', ruta: '/usuarios', id: 'idUsuario',
    descripcion: 'El encargado de prestador queda ligado a su prestador; los demás roles no tienen prestador.',
    columnas: [
      { num: true, campo: 'idUsuario', titulo: 'ID' }, { campo: 'nombreUsuario', titulo: 'Usuario' }, { campo: 'rol', titulo: 'Rol' },
      { campo: 'prestador', titulo: 'Prestador', formato: (v) => v ?? '—' }, { campo: 'estado', titulo: 'Estado', formato: insignia },
    ],
    campos: [
      { campo: 'nombreUsuario', grupo: 'Acceso', etiqueta: 'Nombre de usuario', requerido: true, max: 40 },
      { campo: 'contrasena', grupo: 'Acceso', etiqueta: 'Contraseña', tipo: 'password', requerido: true, nota: 'Al editar, déjela vacía para conservar la actual.' },
      { campo: 'idRol', grupo: 'Rol', etiqueta: 'Rol', requerido: true, tipo: 'select', opciones: { ruta: '/roles', valor: 'idRol', texto: (r) => r.nombre } },
      { campo: 'idPrestador', grupo: 'Rol', etiqueta: 'Prestador (solo encargados)', tipo: 'select', opciones: OPC_PRESTADOR },
      { campo: 'estado', grupo: 'Acceso', etiqueta: 'Estado', requerido: true, tipo: 'select', opciones: ['activo', 'bloqueado'], porDefecto: 'activo' },
    ],
    describir: (f) => f.nombreUsuario,
  },
  'tipos-destino': {
    titulo: 'Tipos de destino', singular: 'tipo de destino', ruta: '/tipos-destino', id: 'idTipoDestino',
    columnas: [{ num: true, campo: 'idTipoDestino', titulo: 'ID' }, { campo: 'nombre', titulo: 'Nombre' }],
    campos: [{ campo: 'nombre', etiqueta: 'Nombre', requerido: true, tipo: 'select', opciones: ['natural', 'cultural', 'mirador', 'pueblo patrimonio', 'parque temático'] }],
    describir: (f) => f.nombre,
  },
};

export const estrellas = (v) => h(Estrellas, { valor: v });
