import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App';
import './styles/global.css';

// Keep existing root URLs working alongside the branded demo path.
const demoPath = '/strategic-plan/demo';
const pathname = window.location.pathname;
const basename = pathname === demoPath || pathname.startsWith(`${demoPath}/`) ? demoPath : '/';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App/>
    </BrowserRouter>
  </StrictMode>
)
