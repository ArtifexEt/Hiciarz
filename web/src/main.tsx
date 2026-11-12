import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initializeLanguage, setLanguage } from './i18n';
import { parseEntryLanguage } from './navigation';
import { redirectLegacyBingo } from './bingo-link';
import './style.css';
import './app-layout.css';
import './game-screen.css';
if (!redirectLegacyBingo()) {
  initializeLanguage();
  const entryLanguage = parseEntryLanguage(location.href);
  if (entryLanguage) setLanguage(entryLanguage);
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
