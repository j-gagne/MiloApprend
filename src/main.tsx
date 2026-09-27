import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';
import { contentService } from './content/service';

// Avertissements structurés réutilisables par un futur espace Parent, sans écran bloquant.
for (const issue of contentService.validate()) {
  console.warn(`[contenu:${issue.severity}:${issue.code}] ${issue.path} : ${issue.message}`);
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
