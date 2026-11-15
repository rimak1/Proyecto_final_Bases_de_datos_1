// Historial de notificaciones del cliente: directas (promociones) y de sus reservas (RF-04, RN-26).
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Cargando, Insignia, Titulo } from '../../components/comunes.jsx';
import { Icono } from '../../components/Iconos.jsx';

const ICONO = { 'recordatorio de reserva': 'reloj', 'confirmación de reserva': 'check', 'confirmación de pago': 'tarjeta', 'cambio de estado': 'actualizar', promoción: 'regalo' };

export default function Notificaciones() {
  const [lista, setLista] = useState(null);
  const cargar = useCallback(() => api('/mis/notificaciones').then(setLista), []);
  useEffect(() => { cargar(); }, [cargar]);
  const leer = async (n) => { await api(`/mis/notificaciones/${n.idNotificacion}/leida`, { method: 'POST' }); cargar(); };

  return (
    <div>
      <Titulo sub="Los recordatorios se programan con los días de anticipación de su perfil.">Notificaciones</Titulo>
      {!lista ? <Cargando /> : (
        <div className="list-group">
          {lista.map((n) => (
            <div key={n.idNotificacion} className={`list-group-item d-flex gap-3 ${n.estado === 'enviada' ? 'fw-semibold' : ''}`}>
              <div className="icono-notificacion"><Icono nombre={ICONO[n.tipo]} tam={20} /></div>
              <div className="flex-grow-1">
                <div>{n.mensaje}</div>
                <div className="small text-muted fw-normal">{n.tipo} · {n.canal} · programada {n.fechaProgramada.slice(0, 16)}{n.idReserva ? ` · reserva #${n.idReserva}` : ''}</div>
              </div>
              <div className="text-end"><Insignia valor={n.estado} />
                {n.estado === 'enviada' && <div><button className="btn btn-link btn-sm p-0" onClick={() => leer(n)}>Marcar leída</button></div>}
              </div>
            </div>
          ))}
          {!lista.length && <p className="text-muted">No tiene notificaciones.</p>}
        </div>
      )}
    </div>
  );
}
