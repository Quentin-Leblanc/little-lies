// Catalogue des assets KayKit Medieval Hexagon Pack (CC0 — Kay Lousberg)
// utilisés par la SceneV2. La scène se compose à partir de ces clés
// (sceneConfig.js liste des { modelId, position, rotation, scale }).
//
// Les chemins pointent vers /public/models/kaykit/<sous-dossier>/<file>.gltf.
// Chaque sous-dossier contient sa copie de hexagons_medieval.png pour que
// les GLTF résolvent leur texture relative.

const BASE = '/models/kaykit';

const def = (id, label, category, file, defaults = {}) => ({
  id,
  label,
  category,
  path: `${BASE}/${file}`,
  // valeurs par défaut quand on drop l'élément dans la scène
  defaultScale: 1,
  defaultY: 0,
  ...defaults,
});

// Catégories: building, prop, nature, fence, ground.
export const MODEL_LIBRARY = [
  // ---------------- BUILDINGS (rouge — variante du pack) ----------------
  // home_a / home_b / tavern sont à la racine de /models/kaykit/ (assets
  // déjà présents dans le repo avant cette branche).
  def('home_a', 'Maison A', 'building', 'building_home_A_red.gltf'),
  def('home_b', 'Maison B', 'building', 'building_home_B_red.gltf'),
  def('tavern', 'Taverne', 'building', 'building_tavern_red.gltf'),
  def('church', 'Église', 'building', 'buildings_red/building_church_red.gltf'),
  def('castle', 'Château', 'building', 'buildings_red/building_castle_red.gltf'),
  def('blacksmith', 'Forgeron', 'building', 'buildings_red/building_blacksmith_red.gltf'),
  def('windmill', 'Moulin à vent', 'building', 'buildings_red/building_windmill_red.gltf'),
  def('watermill', 'Moulin à eau', 'building', 'buildings_red/building_watermill_red.gltf'),
  def('market', 'Marché', 'building', 'buildings_red/building_market_red.gltf'),
  def('barracks', 'Caserne', 'building', 'buildings_red/building_barracks_red.gltf'),
  def('tower', 'Tour', 'building', 'buildings_red/building_tower_A_red.gltf'),
  def('well', 'Puits', 'building', 'buildings_red/building_well_red.gltf'),

  // ---------------- NEUTRAL (ponts, scène, ruine) ----------------
  def('bridge_a', 'Pont en pierre', 'building', 'buildings_neutral/building_bridge_A.gltf'),
  def('bridge_b', 'Pont en bois', 'building', 'buildings_neutral/building_bridge_B.gltf'),
  def('destroyed', 'Ruine brûlée', 'building', 'buildings_neutral/building_destroyed.gltf'),
  def('grain', 'Champ de blé', 'building', 'buildings_neutral/building_grain.gltf'),
  def('stage', 'Estrade / scène', 'building', 'buildings_neutral/building_stage_A.gltf'),

  // ---------------- FENCES ----------------
  def('fence_stone', 'Mur de pierre', 'fence', 'buildings_neutral/fence_stone_straight.gltf'),
  def('fence_stone_gate', 'Mur de pierre + portail', 'fence', 'buildings_neutral/fence_stone_straight_gate.gltf'),
  def('fence_wood', 'Palissade en bois', 'fence', 'buildings_neutral/fence_wood_straight.gltf'),
  def('fence_wood_gate', 'Palissade + portail', 'fence', 'buildings_neutral/fence_wood_straight_gate.gltf'),

  // ---------------- NATURE ----------------
  def('tree_a', 'Arbre A', 'nature', 'nature/tree_single_A.gltf'),
  def('tree_a_cut', 'Souche', 'nature', 'nature/tree_single_A_cut.gltf'),
  def('tree_b', 'Arbre B', 'nature', 'nature/tree_single_B.gltf'),
  def('trees_small', 'Bosquet petit', 'nature', 'nature/trees_A_small.gltf'),
  def('trees_medium', 'Bosquet moyen', 'nature', 'nature/trees_A_medium.gltf'),
  def('trees_large', 'Bosquet grand', 'nature', 'nature/trees_A_large.gltf'),
  def('trees_b_small', 'Pins petits', 'nature', 'nature/trees_B_small.gltf'),
  def('trees_b_medium', 'Pins moyens', 'nature', 'nature/trees_B_medium.gltf'),
  def('trees_b_large', 'Pins grands', 'nature', 'nature/trees_B_large.gltf'),
  def('rock_a', 'Rocher A', 'nature', 'nature/rock_single_A.gltf'),
  def('rock_b', 'Rocher B', 'nature', 'nature/rock_single_B.gltf'),
  def('rock_c', 'Rocher C', 'nature', 'nature/rock_single_C.gltf'),
  def('rock_d', 'Rocher D', 'nature', 'nature/rock_single_D.gltf'),
  def('rock_e', 'Rocher E', 'nature', 'nature/rock_single_E.gltf'),
  def('hill_a', 'Colline A', 'nature', 'nature/hill_single_A.gltf'),
  def('hill_b', 'Colline B', 'nature', 'nature/hill_single_B.gltf'),
  def('hill_c', 'Colline C', 'nature', 'nature/hill_single_C.gltf'),
  def('mountain_a', 'Montagne A', 'nature', 'nature/mountain_A.gltf'),
  def('mountain_grass', 'Montagne herbeuse', 'nature', 'nature/mountain_A_grass_trees.gltf'),
];

export const MODEL_BY_ID = MODEL_LIBRARY.reduce((acc, m) => {
  acc[m.id] = m;
  return acc;
}, {});

export const CATEGORIES = [
  { id: 'building', label: 'Bâtiments' },
  { id: 'fence', label: 'Clôtures' },
  { id: 'nature', label: 'Nature' },
  { id: 'prop', label: 'Décor' },
];
