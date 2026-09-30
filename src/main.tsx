import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { HatchingPreview } from './components/HatchingPreview';
import { LionRevealPreview } from './components/LionRevealPreview';
import { MonkeyRevealPreview } from './components/MonkeyRevealPreview';
import { EnvironmentRevealPreview } from './components/EnvironmentRevealPreview';
import './styles.css';
import { loadBaseProgram } from './content/remote-program';
import { createContentService } from './content/service';
import { createContentRepository } from './content/repository';

const root = ReactDOM.createRoot(document.getElementById('root')!);
const hatchingPreview = new URLSearchParams(window.location.search).get('preview') === 'hatching';
if (hatchingPreview) root.render(<React.StrictMode><HatchingPreview /></React.StrictMode>);
else if (new URLSearchParams(window.location.search).get('preview') === 'lion-reveal') root.render(<React.StrictMode><LionRevealPreview /></React.StrictMode>);
else if (new URLSearchParams(window.location.search).get('preview') === 'monkey-reveal') root.render(<React.StrictMode><MonkeyRevealPreview /></React.StrictMode>);
else if (new URLSearchParams(window.location.search).get('preview') === 'unicorn-reveal') root.render(<React.StrictMode><EnvironmentRevealPreview characterId="unicorn" /></React.StrictMode>);
else if (new URLSearchParams(window.location.search).get('preview') === 'rabbit-reveal') root.render(<React.StrictMode><EnvironmentRevealPreview characterId="rabbit" /></React.StrictMode>);
else if (new URLSearchParams(window.location.search).get('preview') === 'tiger-reveal') root.render(<React.StrictMode><EnvironmentRevealPreview characterId="tiger" /></React.StrictMode>);
else {
  root.render(<main className="home-screen"><p role="status">Un petit instant…</p></main>);
  void loadBaseProgram().then(baseProgram => {
    for (const issue of createContentService(createContentRepository(baseProgram)).validate()) {
      console.warn(`[contenu:${issue.severity}:${issue.code}] ${issue.path} : ${issue.message}`);
    }
    root.render(<React.StrictMode><App baseProgram={baseProgram} /></React.StrictMode>);
  });
}
