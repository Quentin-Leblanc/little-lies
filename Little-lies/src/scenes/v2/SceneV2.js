import React, { Suspense, useMemo, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, useGLTF, TransformControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { MODEL_BY_ID } from './modelLibrary';

// Petit error boundary R3F-friendly : si KayModel plante (GLTF malformé,
// texture HS, etc.), on affiche un cube rose-vif à la place pour que la
// scène continue de tourner et qu'on voie tout de suite quel élément
// pose problème.
class ModelBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.warn('[KayModel error]', this.props.path, error?.message || error);
  }
  render() {
    if (this.state.error) {
      return (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ff36a0" />
        </mesh>
      );
    }
    return this.props.children;
  }
}

// ----- KayKit GLTF renderer -----
// Les GLTFs KayKit sont déjà unwrap-ed sur l'atlas hexagons_medieval.png.
// On utilise SkeletonUtils.clone pour gérer correctement les éventuels
// skeletons (les bâtiments n'en ont pas, mais c'est plus safe que .clone()
// brut). On ne touche pas aux matériaux : KayKit livre déjà du matte
// PBR-friendly via l'atlas hexagons_medieval.png.
const KayModelInner = React.memo(function KayModelInner({ path, scale }) {
  const { scene } = useGLTF(path);
  // SkeletonUtils.clone gère bien les SkinnedMesh + ne partage pas les
  // refs Object3D entre instances : critique car deux SceneElements
  // peuvent référencer le même path (ex: deux maisons "home_a") et le
  // même Object3D ne peut avoir qu'un seul parent.
  const cloned = useMemo(() => {
    if (!scene) return null;
    const c = SkeletonUtils.clone(scene);
    return c;
  }, [scene]);
  if (!cloned) return null;
  const sc = typeof scale === 'number' ? [scale, scale, scale] : scale;
  return <primitive object={cloned} scale={sc} dispose={null} />;
});

const KayModel = React.memo(function KayModel({ path, scale }) {
  return (
    <ModelBoundary path={path}>
      <Suspense fallback={null}>
        <KayModelInner path={path} scale={scale} />
      </Suspense>
    </ModelBoundary>
  );
});

// Préchargement opportuniste des modèles utilisés pour éviter les pops
// quand l'éditeur ajoute un élément.
export function preloadAllModels() {
  Object.values(MODEL_BY_ID).forEach((m) => {
    try { useGLTF.preload(m.path); } catch { /* ignore */ }
  });
}

// ----- Selectable wrapper -----
// Chaque élément est rendu dans un <group> sélectionnable (raycast-friendly).
// L'éditeur attache un TransformControls à l'objet selectionné via la ref.
function SceneElement({ element, selected, onSelect, registerRef }) {
  const groupRef = useRef();
  const model = MODEL_BY_ID[element.modelId];

  useEffect(() => {
    if (groupRef.current) registerRef(element.id, groupRef.current);
    return () => registerRef(element.id, null);
  }, [element.id, registerRef]);

  if (!model) {
    // Fallback : cube rouge si l'id de modèle n'existe pas, pour signaler
    // visuellement la config invalide au lieu de crash.
    return (
      <mesh
        ref={groupRef}
        position={element.position}
        rotation={element.rotation}
        onClick={(e) => { e.stopPropagation(); onSelect(element.id); }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={selected ? '#ffd54a' : '#c0392b'} />
      </mesh>
    );
  }

  return (
    <group
      ref={groupRef}
      position={element.position}
      rotation={element.rotation}
      onClick={(e) => { e.stopPropagation(); onSelect(element.id); }}
    >
      <KayModel path={model.path} scale={element.scale ?? 1} />
      {selected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.5, 32]} />
          <meshBasicMaterial color="#ffd54a" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ----- TransformControls bridging -----
// Quand un élément est sélectionné, on attache TransformControls à sa ref
// puis on remonte les changements via onTransformChange.
function SelectionTransform({ targetRef, mode, onTransformChange, onTransformStart, onTransformEnd }) {
  const tcRef = useRef();
  const { camera, gl } = useThree();
  if (!targetRef) return null;
  return (
    <TransformControls
      ref={tcRef}
      object={targetRef}
      mode={mode}
      camera={camera}
      domElement={gl.domElement}
      onMouseDown={onTransformStart}
      onMouseUp={onTransformEnd}
      onObjectChange={() => {
        if (!targetRef) return;
        onTransformChange({
          position: [targetRef.position.x, targetRef.position.y, targetRef.position.z],
          rotation: [targetRef.rotation.x, targetRef.rotation.y, targetRef.rotation.z],
          scale: [targetRef.scale.x, targetRef.scale.y, targetRef.scale.z],
        });
      }}
    />
  );
}

// ----- Ground plane -----
function Ground({ color, size }) {
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[size, size, 1, 1]} />
      <meshStandardMaterial color={color} roughness={1} metalness={0} />
    </mesh>
  );
}

// ----- Public Scene -----
//   config           : { meta, ambient, elements }
//   selectedId       : string | null
//   onSelect         : (id) => void
//   onTransform      : (id, { position, rotation, scale }) => void
//   transformMode    : 'translate' | 'rotate' | 'scale'
//   showGrid         : bool
//   showStats        : bool (FPS meter)
//   onCanvasMissed   : () => void  — clic dans le vide, déselectionne
export default function SceneV2({
  config,
  selectedId,
  onSelect,
  onTransform,
  onTransformStart,
  onTransformEnd,
  transformMode = 'translate',
  showGrid = true,
  showStats = false,
}) {
  const { ambient, elements } = config;
  const refs = useRef({});

  const registerRef = (id, obj) => { refs.current[id] = obj; };
  const selectedRef = selectedId ? refs.current[selectedId] : null;

  return (
    <Canvas
      // shadows désactivées par défaut — on coûte cher en GPU sur des
      // scènes avec ~20 GLTFs et aucun bénéfice visuel sans tweak. Si on
      // veut les ombres plus tard on pourra rajouter un toggle dans la
      // toolbar.
      camera={{ position: [22, 18, 22], fov: 45 }}
      style={{ background: ambient.skyColor || '#6b8caf', width: '100%', height: '100%' }}
      resize={{ debounce: 0 }}
    >
      <fog attach="fog" args={[ambient.fogColor, ambient.fogNear, ambient.fogFar]} />
      <ambientLight intensity={ambient.ambientIntensity ?? 0.7} />
      <directionalLight
        position={ambient.sunPosition}
        intensity={ambient.sunIntensity ?? 1.4}
      />
      <Sky distance={450000} sunPosition={ambient.sunPosition} inclination={0.5} azimuth={0.25} />

      {showGrid && (
        <Grid
          position={[0, 0.001, 0]}
          args={[ambient.groundSize, ambient.groundSize]}
          cellSize={1}
          sectionSize={5}
          sectionColor="#666"
          cellColor="#aaa"
          fadeDistance={60}
          infiniteGrid={false}
        />
      )}

      <Ground color={ambient.groundColor} size={ambient.groundSize} />

      <group onPointerMissed={() => onSelect(null)}>
        {elements.map((el) => (
          <SceneElement
            key={el.id}
            element={el}
            selected={selectedId === el.id}
            onSelect={onSelect}
            registerRef={registerRef}
          />
        ))}
      </group>

      {selectedRef && (
        <SelectionTransform
          targetRef={selectedRef}
          mode={transformMode}
          onTransformChange={(t) => onTransform(selectedId, t)}
          onTransformStart={onTransformStart}
          onTransformEnd={onTransformEnd}
        />
      )}

      <OrbitControls makeDefault enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.05} />
    </Canvas>
  );
}
