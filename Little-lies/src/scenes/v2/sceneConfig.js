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
//   }
//
// Cette layout a été composée dans l'éditeur live (?editor=1) puis
// sauvegardée ici. Pour la modifier : ouvre l'éditeur, bouge tes éléments,
// puis "Sauvegarder en fichier" → tu remplaces ce fichier par le résultat.

export const DEFAULT_SCENE_CONFIG = {
  meta: {
    name: 'Village V2 — KayKit Medieval',
    pack: 'KayKit Medieval Hexagon Pack 1.0 (CC0 — Kay Lousberg)',
    version: 2,
  },
  ambient: {
    groundColor: '#2d2525',
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
    { id: 'church_main',  modelId: 'church',     position: [0, 0, -2.99],          rotation: [0, 6.34, 0],   scale: 1 },
    { id: 'tavern_e',     modelId: 'tavern',     position: [3.06, 0.18, 0.29],     rotation: [0, -1.5708, 0], scale: 1 },
    { id: 'market_w',     modelId: 'market',     position: [-3.33, 0, -1.76],      rotation: [0, 0.97, 0],   scale: 1 },
    { id: 'well_center',  modelId: 'well',       position: [-3.54, 0, 0],          rotation: [0, 0, 0],      scale: 0.85 },
    { id: 'blacksmith_e', modelId: 'blacksmith', position: [1.21, 0, 3.23],        rotation: [0, -2.67, 0],  scale: 1.5 },
    { id: 'windmill_far', modelId: 'windmill',   position: [-2.33, 0, 2.96],       rotation: [0, -3.85, 0],  scale: 1.4 },

    // --- Maisons ---
    { id: 'home_ne_a',  modelId: 'home_a', position: [2.99, 0, -1.55],         rotation: [0, -0.83, 0], scale: 1 },
    { id: 'home_nw_b',  modelId: 'home_b', position: [-1.75, 0, -2.76],        rotation: [0, 0.38, 0],  scale: 1 },
    { id: 'home_se_a',  modelId: 'home_a', position: [-0.67, 0, 3.81],         rotation: [0, -2.81, 0], scale: 1 },
    { id: 'home_sw_b',  modelId: 'home_b', position: [-3.22, 0, 1.39],         rotation: [0, 8.16, 0],  scale: 1 },
    { id: 'home_a_1',   modelId: 'home_a', position: [1.65, 0.01, -2.67],      rotation: [0, -0.25, 0], scale: 1 },

    // --- Forêt / nature ---
    { id: 'wood_e',          modelId: 'trees_large', position: [5.43, 0, 2.90],   rotation: [0, 1.4, 0], scale: 1 },
    { id: 'wood_w',          modelId: 'trees_large', position: [-4.12, 0, -4.07], rotation: [0, 2.5, 0], scale: 1.5 },
    { id: 'trees_large_1',   modelId: 'trees_large', position: [-1.67, 0, -5.04], rotation: [0, 2.5, 0], scale: 1.35 },
    { id: 'trees_large_2',   modelId: 'trees_large', position: [-5.48, 0, -2.07], rotation: [0, 2.5, 0], scale: 1 },
    { id: 'trees_large_3',   modelId: 'trees_large', position: [-5.61, 0, 0.15],  rotation: [0, 2.5, 0], scale: 1 },
    { id: 'trees_large_4',   modelId: 'trees_large', position: [2.34, 0, -4.59],  rotation: [0, 2.5, 0], scale: 1 },

    // --- Rochers / collines (backdrop) ---
    { id: 'rock_ne', modelId: 'rock_b', position: [4, 0, -5],         rotation: [0, 0.7, 0], scale: 1 },
    { id: 'rock_sw', modelId: 'rock_d', position: [-4, 0, 0.70],      rotation: [0, 1.6, 0], scale: 1 },
    { id: 'hill_n',  modelId: 'hill_b', position: [0.50, 0.06, -4.82], rotation: [0, 0, 0],   scale: 1 },
    { id: 'hill_s',  modelId: 'hill_b', position: [1.45, 0, 8.35],     rotation: [0, 1.5, 0], scale: 2.65 },
  ],
};
