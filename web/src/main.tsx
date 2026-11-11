import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initializeLanguage } from './i18n';
import './style.css';
import './app-layout.css';
import './game-screen.css';
initializeLanguage();
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
