// SceneV2 — layout par défaut. C'est UNIQUEMENT de la donnée : aucune
// logique de jeu, aucun PlayroomKit. Le but est qu'on puisse modifier ce
// fichier au prompt ("déplace l'église", "ajoute 3 arbres au nord", etc.)
// et que la scène se mette à jour à chaud.
//
// Chaque entrée d'`elements` est une instance placée dans la scène :
//   {
//     id: 'church_main',     // unique — utilisé par l'éditeur
//     modelId: 'church',     // référence MODEL_LIBRARY (modelLibrary.js)
//     position: [x, y, z],
//     rotation: [rx, ry, rz], // radians
//     scale: number | [sx, sy, sz],
//     locked?: boolean,      // l'éditeur empêche de déplacer
//   }
//
// `groundColor` / `skyColor` / `fogDensity` etc. pilotent l'ambiance.
//
// Layout volontairement légère (≈18 objets) pour que la scène reste
// fluide même sans GPU. Tout est ajoutable depuis l'éditeur (panneau de
// droite → "Ajouter un objet").

export const DEFAULT_SCENE_CONFIG = {
  meta: {
    name: 'Village V2 — KayKit Medieval',
    pack: 'KayKit Medieval Hexagon Pack 1.0 (CC0 — Kay Lousberg)',
    version: 1,
  },
  ambient: {
    groundColor: '#3e5c3a',
    groundSize: 60,
    skyColor: '#6b8caf',
    fogColor: '#9aaec0',
    fogNear: 28,
    fogFar: 80,
    sunPosition: [40, 60, 20],
    sunIntensity: 1.4,
    ambientIntensity: 0.7,
  },
  elements: [
    // --- Cœur du village ---
    { id: 'church_main',  modelId: 'church',     position: [0, 0, -10], rotation: [0, Math.PI, 0],     scale: 2.0 },
    { id: 'tavern_e',     modelId: 'tavern',     position: [8, 0, -2],  rotation: [0, -Math.PI / 2, 0], scale: 1.6 },
    { id: 'market_w',     modelId: 'market',     position: [-9, 0, -2], rotation: [0, Math.PI / 2, 0],  scale: 1.6 },
    { id: 'well_center',  modelId: 'well',       position: [0, 0, 0],   rotation: [0, 0, 0],            scale: 1.4 },

    // --- Maisons (petite couronne) ---
    { id: 'home_ne_a', modelId: 'home_a', position: [6, 0, -7],  rotation: [0, -Math.PI * 0.6, 0], scale: 1.3 },
    { id: 'home_nw_b', modelId: 'home_b', position: [-6, 0, -7], rotation: [0, Math.PI * 0.6, 0],  scale: 1.3 },
    { id: 'home_se_a', modelId: 'home_a', position: [7, 0, 8],   rotation: [0, -Math.PI * 1.1, 0], scale: 1.2 },
    { id: 'home_sw_b', modelId: 'home_b', position: [-7, 0, 8],  rotation: [0, Math.PI * 1.1, 0],  scale: 1.2 },

    // --- Spécialistes ---
    { id: 'blacksmith_e', modelId: 'blacksmith', position: [13, 0, -6], rotation: [0, -Math.PI / 2, 0], scale: 1.4 },
    { id: 'windmill_far', modelId: 'windmill',   position: [-14, 0, 4], rotation: [0, Math.PI / 3, 0],  scale: 1.5 },

    // --- Forêt / nature (compacte) ---
    { id: 'wood_n', modelId: 'trees_b_large', position: [-2, 0, -18], rotation: [0, 0.3, 0], scale: 1.0 },
    { id: 'wood_e', modelId: 'trees_large',   position: [16, 0, 4],  rotation: [0, 1.4, 0], scale: 1.0 },
    { id: 'wood_w', modelId: 'trees_large',   position: [-16, 0, -8], rotation: [0, 2.5, 0], scale: 1.0 },
    { id: 'rock_ne', modelId: 'rock_b', position: [4, 0, -5], rotation: [0, 0.7, 0], scale: 1.0 },
    { id: 'rock_sw', modelId: 'rock_d', position: [-4, 0, 5], rotation: [0, 1.6, 0], scale: 1.0 },

    // --- Backdrop ---
    { id: 'hill_n', modelId: 'hill_b', position: [0, 0, -22], rotation: [0, 0, 0], scale: 1.4 },
    { id: 'hill_s', modelId: 'hill_b', position: [4, 0, 22],  rotation: [0, 1.5, 0], scale: 1.4 },
  ],
};
