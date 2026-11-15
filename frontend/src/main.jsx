import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './estilos.css';
import App from './App.jsx';
import { ProveedorSesion } from './auth.jsx';
import { ProveedorUI } from './components/comunes.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorSesion>
        <ProveedorUI>
          <App />
        </ProveedorUI>
      </ProveedorSesion>
    </BrowserRouter>
  </StrictMode>,
);
