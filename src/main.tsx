import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { TOOLS } from './tools';
import { normalizePath } from './content';
import { initAds } from './lib/ads';
import './index.css';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

async function boot() {
  if (root.hasChildNodes()) {
    // Prerendered page: load the tool's chunk first so hydration doesn't suspend.
    const tool = TOOLS.find((t) => t.path === normalizePath(location.pathname));
    if (tool) await tool.load();
    hydrateRoot(root, app);
  } else {
    createRoot(root).render(app);
  }
  initAds();
}
void boot();
