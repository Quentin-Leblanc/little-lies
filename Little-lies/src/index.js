import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './trad/i18n'; // Initialize i18n (cheap, safe to load always)
import './index.scss';

// Dev-only route: ?editor=1 ouvre l'éditeur de scène V2 (sandbox de la
// nouvelle scène 3D). Court-circuite PlayroomKit / Auth / GameEngine —
// l'éditeur n'a besoin d'aucun état multijoueur, c'est juste R3F + DOM.
//
// On utilise React.lazy pour charger App / Auth / Engine UNIQUEMENT en
// mode jeu : ça évite que PlayroomKit s'installe (listeners + websocket)
// pendant qu'on bosse sur la scène 3D dans l'éditeur.
const isSceneEditorRoute = (() => {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('editor') === '1' || window.location.pathname.startsWith('/scene-editor');
  } catch { return false; }
})();

const SceneEditor = isSceneEditorRoute
  ? React.lazy(() => import('./scenes/v2/SceneEditor'))
  : null;

const GameApp = !isSceneEditorRoute
  ? React.lazy(() => import('./bootGameApp'))
  : null;

const root = createRoot(document.getElementById('root'));
const fallback = (
  <div style={{ color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, sans-serif' }}>
    Loading...
  </div>
);
root.render(
  <Suspense fallback={fallback}>
    {isSceneEditorRoute ? <SceneEditor /> : <GameApp />}
  </Suspense>
);
