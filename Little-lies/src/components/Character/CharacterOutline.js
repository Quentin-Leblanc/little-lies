import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────
// Hard silhouette outline for the skinned character models.
//
// Why this exists rather than drei's <Outlines>: drei attaches itself to
// its PARENT mesh's geometry (`parent.geometry`), so it has to be a JSX
// child of a <mesh>. Our characters are GLB scenes rendered through a
// single <primitive object={clone} />, so there is no per-mesh JSX to
// hang it on. The shader below is modelled on drei's — same inverted-hull
// technique, same three chunk includes — applied imperatively instead.
//
// Technique: duplicate each SkinnedMesh sharing its geometry AND its
// skeleton (so the outline animates for free), render back faces only,
// and push each vertex outward along its normal in CLIP space. Clip-space
// offset is what keeps the line a constant width on screen instead of
// ballooning on whatever is nearest the camera.
//
// This is the change that makes a figure readable against ANY background
// value. Rim lighting can't do it: a fresnel edge brightens the silhouette
// but still loses to a bright background. A dark line always wins.
// ─────────────────────────────────────────────────────────────────────

const OUTLINE_FLAG = '__isCharacterOutline';

const vertexShader = /* glsl */`
  #include <common>
  #include <skinning_pars_vertex>
  uniform float thickness;
  uniform vec2 size;
  void main() {
    #if defined (USE_SKINNING)
      #include <beginnormal_vertex>
      #include <skinbase_vertex>
      #include <skinnormal_vertex>
      #include <defaultnormal_vertex>
    #endif
    #include <begin_vertex>
    #include <skinning_vertex>
    #include <project_vertex>
    vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
    vec4 clipNormal = projectionMatrix * modelViewMatrix * vec4(normal, 0.0);
    vec2 offset = normalize(clipNormal.xy) * thickness / size * clipPosition.w * 2.0;
    clipPosition.xy += offset;
    gl_Position = clipPosition;
  }
`;

const fragmentShader = /* glsl */`
  uniform vec3 color;
  uniform float opacity;
  void main() {
    gl_FragColor = vec4(color, opacity);
  }
`;

// Outline colour is a very dark neutral rather than pure black: pure
// black reads as a hole punched in the scene at night, where the
// background is already near-black.
const OUTLINE_COLOR = '#14121c';

// In clip-space units — roughly 3px at 1080p. Thicker than this and the
// characters start looking like stickers; thinner and the line breaks up
// once the day-orbit camera pulls back to radius 13.
const OUTLINE_THICKNESS = 3.0;

const makeOutlineMaterial = (size) => new THREE.ShaderMaterial({
  uniforms: {
    color: { value: new THREE.Color(OUTLINE_COLOR) },
    opacity: { value: 1 },
    thickness: { value: OUTLINE_THICKNESS },
    size: { value: size.clone() },
  },
  vertexShader,
  fragmentShader,
  side: THREE.BackSide,
  // The hull sits behind the real mesh everywhere except the silhouette,
  // so it must take part in depth testing but never occlude the model.
  depthWrite: true,
  transparent: false,
});

// Walk `root` and give every SkinnedMesh / Mesh an outline sibling.
// Idempotent: re-running skips meshes that already carry one, and skips
// the outline meshes themselves.
export const attachOutlines = (root, drawingBufferSize) => {
  if (!root) return [];
  const created = [];
  const targets = [];
  root.traverse((child) => {
    if (!child.isMesh || child[OUTLINE_FLAG]) return;
    if (child.userData.__hasOutline) return;
    targets.push(child);
  });

  targets.forEach((child) => {
    const outline = child.isSkinnedMesh
      ? new THREE.SkinnedMesh(child.geometry, makeOutlineMaterial(drawingBufferSize))
      : new THREE.Mesh(child.geometry, makeOutlineMaterial(drawingBufferSize));

    if (child.isSkinnedMesh) {
      // Share the skeleton so the outline deforms with the animation
      // instead of standing in bind pose. bindMode/bindMatrix must be
      // copied too or the hull renders offset from the body.
      outline.bindMode = child.bindMode;
      outline.bindMatrix.copy(child.bindMatrix);
      outline.bindMatrixInverse.copy(child.bindMatrixInverse);
      outline.bind(child.skeleton, child.bindMatrix);
    }

    outline[OUTLINE_FLAG] = true;
    outline.castShadow = false;
    outline.receiveShadow = false;
    outline.frustumCulled = child.frustumCulled;
    outline.raycast = () => {};

    child.userData.__hasOutline = true;
    child.add(outline);
    created.push(outline);
  });

  return created;
};

// Fade the outline alongside the body during the walk-home transition —
// otherwise the characters dissolve and leave a floating dark shell.
export const setOutlineOpacity = (root, value) => {
  if (!root) return;
  root.traverse((child) => {
    if (!child[OUTLINE_FLAG]) return;
    const m = child.material;
    if (!m || !m.uniforms) return;
    m.uniforms.opacity.value = value;
    const shouldBlend = value < 1;
    if (m.transparent !== shouldBlend) {
      m.transparent = shouldBlend;
      m.depthWrite = !shouldBlend;
      m.needsUpdate = true;
    }
    child.visible = value > 0.01;
  });
};
