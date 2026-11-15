// Inicio de sesión (RF-01). El tipo de usuario decide si se valida contra Cliente/PerfilCliente o UsuarioSistema.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { inicioPorRol, useSesion } from '../auth.jsx';
import { Alerta } from '../components/comunes.jsx';

export default function Login() {
  const { entrar } = useSesion();
  const navegar = useNavigate();
  const [tipo, setTipo] = useState('cliente');
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const u = await entrar(tipo, usuario.trim(), contrasena);
      navegar(inicioPorRol(u.rol));
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login-fondo d-flex align-items-center justify-content-center p-3">
      <div className="card" style={{ maxWidth: 420, width: '100%' }}>
        <div className="card-body p-4">
          <div className="mb-3 pb-3 border-bottom">
            <div className="login-marca">QuindíoStay</div>
            <div className="text-muted small">Reseñas y recomendaciones turísticas</div>
          </div>
          <h5 className="mb-3">Iniciar sesión</h5>
          <Alerta mensaje={error} />
          <form onSubmit={enviar}>
            <label className="form-label small fw-semibold" htmlFor="tipo">Tipo de usuario</label>
            <div className="btn-group w-100 mb-3" role="group" id="tipo">
              <button type="button" className={`btn ${tipo === 'cliente' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setTipo('cliente')}>Cliente</button>
              <button type="button" className={`btn ${tipo === 'interno' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setTipo('interno')}>Usuario interno</button>
            </div>
            <label className="form-label small fw-semibold" htmlFor="usuario">{tipo === 'cliente' ? 'Correo electrónico' : 'Nombre de usuario'}</label>
            <input id="usuario" className="form-control mb-3" type={tipo === 'cliente' ? 'email' : 'text'} required autoComplete="username"
              value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder={tipo === 'cliente' ? 'nombre@correo.com' : 'admin'} />
            <label className="form-label small fw-semibold" htmlFor="contrasena">Contraseña</label>
            <input id="contrasena" className="form-control mb-4" type="password" required autoComplete="current-password"
              value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
            <button className="btn btn-primary w-100" disabled={enviando}>{enviando ? 'Validando…' : 'Ingresar'}</button>
          </form>
          <div className="small mt-3">
            {tipo === 'cliente' && <div className="mb-1">¿No tiene cuenta? <Link to="/registro" className="fw-semibold">Regístrese como cliente</Link></div>}
            <Link to="/">Explorar sin iniciar sesión</Link>
          </div>
          <p className="small text-muted mt-3 mb-0">Las contraseñas se validan contra la base de datos. Los usuarios internos (administrador, encargado de prestador) ven el menú según su rol.</p>
        </div>
      </div>
    </div>
  );
}
