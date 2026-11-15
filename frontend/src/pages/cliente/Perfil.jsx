// Administrar el perfil: idioma, canal preferido, anticipación de recordatorios y promociones (RF-03).
import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { Alerta, Cargando, Titulo } from '../../components/comunes.jsx';

export default function Perfil() {
  const [datos, setDatos] = useState(null);
  const [contrasena, setContrasena] = useState('');
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { api('/perfil').then(setDatos).catch((e) => setError(e.message)); }, []);
  if (!datos) return <><Alerta mensaje={error} /><Cargando /></>;
  const c = datos.cliente;
  const p = datos.perfil ?? {};
  const setC = (k, v) => setDatos({ ...datos, cliente: { ...c, [k]: v } });
  const setP = (k, v) => setDatos({ ...datos, perfil: { ...p, [k]: v } });

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const r = await api('/perfil', { method: 'PUT', body: { cliente: c, perfil: { ...p, ...(contrasena ? { contrasena } : {}) } } });
      setDatos(r);
      setContrasena('');
      setAviso('Perfil actualizado.');
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <Titulo sub={`${c.tipoDocumento} ${c.numeroDocumento} · ${c.correo}`}>Mi perfil</Titulo>
      <Alerta mensaje={aviso} tipo="success" onCerrar={() => setAviso('')} />
      <Alerta mensaje={error} onCerrar={() => setError('')} />
      <form onSubmit={guardar} className="card"><div className="card-body">
        <h6>Datos personales</h6>
        <div className="row g-3 mb-4">
          <div className="col-md-6"><label className="form-label small" htmlFor="n">Nombres</label><input id="n" className="form-control" required maxLength={60} value={c.nombres} onChange={(e) => setC('nombres', e.target.value)} /></div>
          <div className="col-md-6"><label className="form-label small" htmlFor="a">Apellidos</label><input id="a" className="form-control" required maxLength={60} value={c.apellidos} onChange={(e) => setC('apellidos', e.target.value)} /></div>
          <div className="col-md-4"><label className="form-label small" htmlFor="t">Teléfono</label><input id="t" className="form-control" required pattern="[0-9]{10}" value={c.telefono} onChange={(e) => setC('telefono', e.target.value)} /></div>
          <div className="col-md-4"><label className="form-label small" htmlFor="f">Fecha de nacimiento</label><input id="f" type="date" className="form-control" required value={c.fechaNacimiento} onChange={(e) => setC('fechaNacimiento', e.target.value)} /></div>
          <div className="col-md-4"><label className="form-label small" htmlFor="o">Ciudad de origen</label><input id="o" className="form-control" required value={c.ciudadOrigen} onChange={(e) => setC('ciudadOrigen', e.target.value)} /></div>
        </div>
        <h6>Preferencias</h6>
        <div className="row g-3">
          <div className="col-md-3"><label className="form-label small" htmlFor="i">Idioma</label>
            <select id="i" className="form-select" value={p.idioma} onChange={(e) => setP('idioma', e.target.value)}><option>español</option><option>inglés</option></select></div>
          <div className="col-md-3"><label className="form-label small" htmlFor="cp">Canal preferido</label>
            <select id="cp" className="form-select" value={p.canalPreferido} onChange={(e) => setP('canalPreferido', e.target.value)}><option>correo</option><option>SMS</option><option>WhatsApp</option></select></div>
          <div className="col-md-3"><label className="form-label small" htmlFor="d">Recordar con</label>
            <select id="d" className="form-select" value={p.diasAnticipacion} onChange={(e) => setP('diasAnticipacion', Number(e.target.value))}>
              <option value={1}>1 día de anticipación</option><option value={3}>3 días de anticipación</option><option value={7}>7 días de anticipación</option></select></div>
          <div className="col-md-3"><label className="form-label small" htmlFor="pr">Promociones</label>
            <select id="pr" className="form-select" value={p.aceptaPromociones} onChange={(e) => setP('aceptaPromociones', e.target.value)}><option value="S">Acepto recibirlas</option><option value="N">No deseo recibirlas</option></select></div>
          <div className="col-md-6"><label className="form-label small" htmlFor="pw">Nueva contraseña (opcional)</label>
            <input id="pw" type="password" className="form-control" minLength={8} value={contrasena} onChange={(e) => setContrasena(e.target.value)} autoComplete="new-password" /></div>
        </div>
        <div className="text-end mt-4"><button className="btn btn-primary">Guardar</button></div>
      </div></form>
    </div>
  );
}
