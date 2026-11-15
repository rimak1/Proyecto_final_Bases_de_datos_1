// Mis reseñas: consultar, modificar y eliminar las reseñas propias (RF-13).
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../api.js';
import { Alerta, Cargando, Modal, Titulo } from '../../components/comunes.jsx';
import ResenaCard from '../../components/ResenaCard.jsx';
import { FormularioResena } from './PublicarResena.jsx';

export default function MisResenas() {
  const { state } = useLocation();
  const [lista, setLista] = useState(null);
  const [editar, setEditar] = useState(null);
  const [borrar, setBorrar] = useState(null);
  const [aviso, setAviso] = useState(state?.aviso ?? '');
  const [error, setError] = useState('');
  const cargar = useCallback(() => api('/mis/resenas').then(setLista).catch((e) => setError(e.message)), []);
  useEffect(() => { cargar(); }, [cargar]);

  const eliminar = async () => {
    try { await api(`/resenas/${borrar.idResena}`, { method: 'DELETE' }); setAviso('Reseña eliminada.'); setBorrar(null); cargar(); } catch (e) { setError(e.message); setBorrar(null); }
  };

  return (
    <div>
      <Titulo acciones={<Link className="btn btn-primary" to="/publicar">+ Publicar reseña</Link>}>Mis reseñas</Titulo>
      <Alerta mensaje={aviso} tipo="success" onCerrar={() => setAviso('')} />
      <Alerta mensaje={error} onCerrar={() => setError('')} />
      {!lista ? <Cargando /> : lista.map((r) => (
        <ResenaCard key={r.idResena} r={r} mostrarObjeto acciones={(
          <>
            {r.estado === 'visible' && <button className="btn btn-sm btn-outline-primary" onClick={() => setEditar(r)}>Editar</button>}
            <button className="btn btn-sm btn-outline-danger" onClick={() => setBorrar(r)}>Eliminar</button>
          </>
        )} />
      ))}
      {lista && !lista.length && <p className="text-muted">Aún no ha publicado reseñas.</p>}
      {editar && (
        <Modal titulo="Modificar reseña" onCerrar={() => setEditar(null)}>
          <FormularioResena inicial={editar} onGuardado={() => { setEditar(null); setAviso('Reseña actualizada.'); cargar(); }} />
        </Modal>
      )}
      {borrar && (
        <Modal titulo="Eliminar reseña" onCerrar={() => setBorrar(null)}
          pie={<><button className="btn btn-outline-secondary" onClick={() => setBorrar(null)}>Cancelar</button><button className="btn btn-danger" onClick={eliminar}>Eliminar</button></>}>
          Se eliminará «{borrar.titulo}» con sus puntajes, fotos, respuesta, votos y reportes (CASCADE).
          {borrar.idReserva && ' La reserva quedará libre para escribir una nueva reseña.'}
        </Modal>
      )}
    </div>
  );
}
