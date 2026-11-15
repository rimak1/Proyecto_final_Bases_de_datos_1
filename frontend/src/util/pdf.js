// Exportación a PDF con jsPDF y jspdf-autotable: reportes (RF-19) y plantillas de documentos (RF-20).
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { fecha, hoyISO, pesos } from '../api.js';

const VERDE = [47, 107, 58];

function encabezado(doc, titulo, subtitulo) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...VERDE);
  doc.rect(0, 0, w, 22, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('QuindíoStay', 14, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Plataforma de turismo y hotelería del Quindío', w - 14, 14, { align: 'right' });
  doc.setTextColor(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(titulo, 14, 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (subtitulo) doc.text(doc.splitTextToSize(subtitulo, w - 28), 14, 40);
}

function piePaginas(doc) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Generado el ${new Date().toLocaleString('es-CO')} · Página ${i} de ${n}`, doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 8, { align: 'center' });
  }
}

/** Reporte: título, pregunta, filtros aplicados, gráfico (canvas opcional) y tabla. */
export function exportarReporte({ codigo, titulo, pregunta, filtros, columnas, filas, canvas }) {
  const doc = new jsPDF({ orientation: columnas.length > 5 ? 'landscape' : 'portrait' });
  encabezado(doc, `${codigo} — ${titulo}`, pregunta);
  let y = 50;
  doc.setFontSize(9);
  doc.text(`Filtros: ${filtros || 'ninguno'} · ${filas.length} filas`, 14, y - 2);
  if (canvas) {
    const w = doc.internal.pageSize.getWidth() - 28;
    const h = Math.min(90, (canvas.height / canvas.width) * w);
    doc.addImage(canvas.toDataURL('image/png', 1), 'PNG', 14, y + 2, w, h);
    y += h + 8;
  }
  autoTable(doc, {
    startY: y + 2,
    head: [columnas.map((c) => c.titulo)],
    body: filas.map((f) => columnas.map((c) => (c.texto ? c.texto(f[c.campo], f) : f[c.campo] ?? ''))),
    headStyles: { fillColor: VERDE },
    styles: { fontSize: 8.5 },
    alternateRowStyles: { fillColor: [247, 243, 236] },
  });
  piePaginas(doc);
  doc.save(`${codigo}_${titulo.replaceAll(' ', '_')}.pdf`);
}

function bloqueDatos(doc, y, pares) {
  autoTable(doc, {
    startY: y, theme: 'plain', styles: { fontSize: 9.5, cellPadding: 1.2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } }, body: pares,
  });
  return doc.lastAutoTable.finalY + 6;
}

const datosCliente = (r) => [['Cliente', r.cliente], ['Documento', `${r.tipoDocumento} ${r.numeroDocumento}`], ['Correo', r.correoCliente], ['Teléfono', r.telefonoCliente]];
const datosServicio = (r) => [['Prestador', `${r.prestador} (NIT ${r.nitPrestador}, RNT ${r.rntPrestador})`], ['Municipio', r.municipio],
  ['Plan', `${r.plan} (${r.tipoPlan})`], ['Fecha del servicio', fecha(r.fechaServicio)]];

/** Las cuatro plantillas del sistema a partir de Reserva, Pago y Cliente (RF-20). */
export function generarDocumento(tipo, { reserva: r, pagos }, pago) {
  const doc = new jsPDF();
  const exitosos = pagos.filter((p) => p.estado === 'exitoso');
  const pagado = exitosos.reduce((s, p) => s + Number(p.monto), 0);
  let y;
  let nombre = "documento.pdf";

  if (tipo === 'reserva') {
    encabezado(doc, `Comprobante de reserva N.º ${r.idReserva}`, `Fecha de creación: ${fecha(r.fechaCreacion)} · Canal: ${r.canal} · Estado: ${r.estado}`);
    y = bloqueDatos(doc, 48, [...datosCliente(r), ...datosServicio(r)]);
    y = bloqueDatos(doc, y, [['Valor total pactado', pesos(r.valorTotal)], ['Total pagado', pesos(pagado)], ['Saldo pendiente', pesos(r.valorTotal - pagado)]]);
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize('Presente este comprobante al prestador el día del servicio. El valor pactado no cambia aunque el precio del plan se modifique después de la reserva.', 180), 14, y);
    nombre = (`Comprobante_reserva_${r.idReserva}.pdf`);
  } else if (tipo === 'pago') {
    encabezado(doc, `Comprobante de pago N.º ${pago.idPago}`, `Reserva N.º ${r.idReserva} · ${r.prestador}`);
    y = bloqueDatos(doc, 48, [...datosCliente(r), ['Fecha del pago', fecha(pago.fecha)], ['Método', pago.metodo],
      ['Referencia de la transacción', pago.referenciaTransaccion ?? 'No aplica (transferencia o efectivo)'],
      ['Estado', pago.estado], ['Monto', pesos(pago.monto)]]);
    bloqueDatos(doc, y, [['Valor de la reserva', pesos(r.valorTotal)], ['Total pagado a la fecha', pesos(pagado)], ['Saldo', pesos(r.valorTotal - pagado)]]);
    nombre = (`Comprobante_pago_${pago.idPago}.pdf`);
  } else if (tipo === 'factura') {
    encabezado(doc, `Factura de venta N.º FV-${String(r.idReserva).padStart(6, '0')}`, `Emitida el ${fecha(hoyISO())} por ${r.prestador} · NIT ${r.nitPrestador}`);
    y = bloqueDatos(doc, 48, [['Facturado a', r.cliente], ['Documento', `${r.tipoDocumento} ${r.numeroDocumento}`], ['Correo', r.correoCliente],
      ['Dirección del prestador', `${r.direccionPrestador}, ${r.municipio}`]]);
    const base = Math.round(Number(r.valorTotal) / 1.19);
    autoTable(doc, {
      startY: y, headStyles: { fillColor: VERDE }, styles: { fontSize: 9.5 },
      head: [['Descripción', 'Cantidad', 'Valor unitario', 'Valor']],
      body: [[`${r.plan} — servicio del ${fecha(r.fechaServicio)}`, (Number(r.valorTotal) / Number(r.precioPlan)).toFixed(0), pesos(r.precioPlan), pesos(r.valorTotal)]],
      foot: [['', '', 'Base gravable', pesos(base)], ['', '', 'IVA (19 %)', pesos(r.valorTotal - base)], ['', '', 'Total', pesos(r.valorTotal)]],
      footStyles: { fillColor: [239, 233, 221], textColor: 30 },
    });
    y = doc.lastAutoTable.finalY + 6;
    autoTable(doc, {
      startY: y, headStyles: { fillColor: VERDE }, styles: { fontSize: 8.5 }, head: [['Pago', 'Fecha', 'Método', 'Referencia', 'Monto']],
      body: exitosos.map((p) => [p.idPago, fecha(p.fecha), p.metodo, p.referenciaTransaccion ?? '—', pesos(p.monto)]),
    });
    doc.setFontSize(8);
    doc.text('Documento de ejemplo generado por el sistema académico QuindíoStay; no es una factura electrónica válida ante la DIAN.', 14, doc.lastAutoTable.finalY + 8);
    nombre = (`Factura_FV-${r.idReserva}.pdf`);
  } else if (tipo === 'autorizacion') {
    encabezado(doc, 'Autorización de tratamiento de datos y de prestación del servicio', `Reserva N.º ${r.idReserva}`);
    doc.setFontSize(10);
    const texto = `Yo, ${r.cliente}, identificado(a) con ${r.tipoDocumento} N.º ${r.numeroDocumento}, autorizo a QuindíoStay y a ${r.prestador} `
      + `(NIT ${r.nitPrestador}) para tratar mis datos personales conforme a la Ley 1581 de 2012, con el fin de gestionar la reserva N.º ${r.idReserva} `
      + `del plan "${r.plan}" para el ${fecha(r.fechaServicio)} en ${r.municipio}, enviarme recordatorios y confirmaciones por el canal que elegí, `
      + 'y publicar mis reseñas con mi nombre abreviado. Declaro conocer las condiciones del plan, las políticas de cancelación del prestador '
      + 'y que puedo consultar, actualizar o suprimir mis datos en cualquier momento escribiendo a la plataforma.';
    doc.text(doc.splitTextToSize(texto, 180), 14, 50, { lineHeightFactor: 1.5 });
    doc.line(14, 130, 90, 130);
    doc.text('Firma del cliente', 14, 136);
    doc.line(120, 130, 196, 130);
    doc.text(`Fecha: ${fecha(hoyISO())}`, 120, 136);
    nombre = (`Autorizacion_reserva_${r.idReserva}.pdf`);
  }
  piePaginas(doc);
  doc.save(nombre);
}
