import { useGLTF } from '@react-three/drei';
import {
  MESHY_COTTAGE, MESHY_MANOR, MESHY_TREE, MESHY_BOARD,
  MESHY_SKULL, MESHY_RING, MESHY_LANTERN, MESHY_RUNIC, MESHY_PODIUM,
  MESHY_BLOOD, MESHY_OBELISK, MESHY_FIRE,
} from './constants';

// Side-effect-only module: importing it triggers all GLB preloads once.
// Keeps preload calls out of constants.js (pure data) and deduplicates
// them vs scattering preload() calls across components.
useGLTF.preload('/models/kaykit/rock_single_A.gltf');
useGLTF.preload(MESHY_COTTAGE);
useGLTF.preload(MESHY_MANOR);
useGLTF.preload(MESHY_TREE);
useGLTF.preload(MESHY_BOARD);
useGLTF.preload(MESHY_SKULL);
useGLTF.preload(MESHY_RING);
useGLTF.preload(MESHY_LANTERN);
useGLTF.preload(MESHY_RUNIC);
useGLTF.preload(MESHY_PODIUM);
useGLTF.preload(MESHY_BLOOD);
useGLTF.preload(MESHY_OBELISK);
useGLTF.preload(MESHY_FIRE);
