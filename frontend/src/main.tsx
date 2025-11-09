import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Temporarily disable StrictMode to debug double-mounting issue
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);
