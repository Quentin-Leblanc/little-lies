import React, { useState, useMemo, useCallback, useEffect } from 'react';
import SceneV2 from './SceneV2';
import { DEFAULT_SCENE_CONFIG } from './sceneConfig';
import { MODEL_LIBRARY, CATEGORIES, MODEL_BY_ID } from './modelLibrary';

// LocalStorage key — on auto-save la layout courante pour ne rien perdre
// si on F5 pendant qu'on bouge des éléments. Reset via "Reset" qui efface
// la clé et recharge DEFAULT_SCENE_CONFIG.
const LS_KEY = 'amongliars_scene_v2_draft_v1';

const loadDraft = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
};

const saveDraft = (cfg) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); } catch { /* quota */ }
};

const cloneConfig = (cfg) => JSON.parse(JSON.stringify(cfg));

const newId = (modelId, existing) => {
  let i = 1;
  while (existing.has(`${modelId}_${i}`)) i++;
  return `${modelId}_${i}`;
};

// ============================================================
//  SceneEditor — page complète : Canvas à gauche, panel à droite.
// ============================================================
export default function SceneEditor() {
  const initial = useMemo(() => loadDraft() || cloneConfig(DEFAULT_SCENE_CONFIG), []);
  const [config, setConfig] = useState(initial);
  const [selectedId, setSelectedId] = useState(null);
  const [transformMode, setTransformMode] = useState('translate');
  const [showGrid, setShowGrid] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [filter, setFilter] = useState('all');
  // suspend l'auto-save pendant un drag pour ne pas écrire à 60Hz
  const [draggingTransform, setDraggingTransform] = useState(false);

  useEffect(() => {
    if (!draggingTransform) saveDraft(config);
  }, [config, draggingTransform]);

  const selected = selectedId ? config.elements.find((e) => e.id === selectedId) : null;

  // ---- Mutations ----
  const updateElement = useCallback((id, patch) => {
    setConfig((cfg) => ({
      ...cfg,
      elements: cfg.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  }, []);

  const onTransform = useCallback((id, t) => {
    // TransformControls renvoie scale en [sx, sy, sz] ; on garde le format
    // tableau si non-uniforme, sinon on retombe sur un nombre pour la
    // lisibilité du JSON exporté.
    const [sx, sy, sz] = t.scale;
    const isUniform = Math.abs(sx - sy) < 1e-3 && Math.abs(sx - sz) < 1e-3;
    updateElement(id, {
      position: t.position,
      rotation: t.rotation,
      scale: isUniform ? sx : [sx, sy, sz],
    });
  }, [updateElement]);

  const addElement = useCallback((modelId) => {
    setConfig((cfg) => {
      const ids = new Set(cfg.elements.map((e) => e.id));
      const id = newId(modelId, ids);
      const next = {
        id,
        modelId,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: 1.2,
      };
      return { ...cfg, elements: [...cfg.elements, next] };
    });
    setSelectedId((cur) => cur);
  }, []);

  const deleteElement = useCallback((id) => {
    setConfig((cfg) => ({ ...cfg, elements: cfg.elements.filter((e) => e.id !== id) }));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const duplicateElement = useCallback((id) => {
    setConfig((cfg) => {
      const src = cfg.elements.find((e) => e.id === id);
      if (!src) return cfg;
      const ids = new Set(cfg.elements.map((e) => e.id));
      const newKey = newId(src.modelId, ids);
      const copy = {
        ...src,
        id: newKey,
        position: [src.position[0] + 2, src.position[1], src.position[2] + 2],
      };
      return { ...cfg, elements: [...cfg.elements, copy] };
    });
  }, []);

  const resetScene = useCallback(() => {
    if (!window.confirm('Réinitialiser la scène ? Le brouillon local sera effacé.')) return;
    try { localStorage.removeItem(LS_KEY); } catch { /* */ }
    setConfig(cloneConfig(DEFAULT_SCENE_CONFIG));
    setSelectedId(null);
  }, []);

  const exportJSON = useCallback(() => {
    const json = JSON.stringify(config, null, 2);
    navigator.clipboard?.writeText(json);
    // affichage console pour copier-coller via DevTools si clipboard refuse
    // eslint-disable-next-line no-console
    console.log('[SceneV2 export]\n' + json);
    window.alert('Layout copiée dans le presse-papiers (et console).');
  }, [config]);

  const importJSON = useCallback(() => {
    const raw = window.prompt('Colle ici un export JSON SceneV2 :');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.elements || !Array.isArray(parsed.elements)) throw new Error('Pas de tableau elements');
      setConfig(parsed);
      setSelectedId(null);
    } catch (e) {
      window.alert('JSON invalide: ' + e.message);
    }
  }, []);

  // ---- Filtre liste éléments ----
  const filtered = useMemo(() => {
    if (filter === 'all') return config.elements;
    return config.elements.filter((e) => MODEL_BY_ID[e.modelId]?.category === filter);
  }, [config.elements, filter]);

  return (
    <div style={styles.root}>
      {/* ---- 3D Canvas ---- */}
      <div style={styles.canvasWrap}>
        <SceneV2
          config={config}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onTransform={onTransform}
          onTransformStart={() => setDraggingTransform(true)}
          onTransformEnd={() => setDraggingTransform(false)}
          transformMode={transformMode}
          showGrid={showGrid}
          showStats={showStats}
        />
        {/* HUD top-left */}
        <div style={styles.hudTop}>
          <strong style={{ color: '#ffd54a' }}>SceneV2</strong>
          <span style={{ opacity: 0.7, marginLeft: 8 }}>{config.elements.length} objets</span>
        </div>
        {/* Toolbar bottom-center */}
        <div style={styles.toolbar}>
          <ModeBtn active={transformMode === 'translate'} onClick={() => setTransformMode('translate')} title="Déplacer (G)">⇄</ModeBtn>
          <ModeBtn active={transformMode === 'rotate'}    onClick={() => setTransformMode('rotate')}    title="Rotation (R)">⟳</ModeBtn>
          <ModeBtn active={transformMode === 'scale'}     onClick={() => setTransformMode('scale')}     title="Échelle (S)">⤢</ModeBtn>
          <span style={styles.toolbarSep} />
          <ModeBtn active={showGrid}  onClick={() => setShowGrid((v) => !v)}  title="Grille">⊞</ModeBtn>
          <ModeBtn active={showStats} onClick={() => setShowStats((v) => !v)} title="FPS">FPS</ModeBtn>
        </div>
      </div>

      {/* ---- Side panel ---- */}
      <aside style={styles.panel}>
        <Section title="Layout">
          <div style={styles.row}>
            <button style={styles.btn} onClick={exportJSON}>Exporter JSON</button>
            <button style={styles.btn} onClick={importJSON}>Importer JSON</button>
          </div>
          <div style={styles.row}>
            <button style={styles.btnDanger} onClick={resetScene}>Reset</button>
            <span style={{ ...styles.muted, marginLeft: 'auto' }}>Auto-save local</span>
          </div>
        </Section>

        <Section title="Ambiance">
          <FieldColor label="Ciel" value={config.ambient.skyColor} onChange={(v) => setConfig((c) => ({ ...c, ambient: { ...c.ambient, skyColor: v } }))} />
          <FieldColor label="Sol"  value={config.ambient.groundColor} onChange={(v) => setConfig((c) => ({ ...c, ambient: { ...c.ambient, groundColor: v } }))} />
          <FieldColor label="Brume" value={config.ambient.fogColor}   onChange={(v) => setConfig((c) => ({ ...c, ambient: { ...c.ambient, fogColor: v } }))} />
          <FieldNumber label="Brume début" value={config.ambient.fogNear} step={1} onChange={(v) => setConfig((c) => ({ ...c, ambient: { ...c.ambient, fogNear: v } }))} />
          <FieldNumber label="Brume fin"   value={config.ambient.fogFar}  step={1} onChange={(v) => setConfig((c) => ({ ...c, ambient: { ...c.ambient, fogFar: v } }))} />
          <FieldNumber label="Soleil intensité" value={config.ambient.sunIntensity} step={0.1} onChange={(v) => setConfig((c) => ({ ...c, ambient: { ...c.ambient, sunIntensity: v } }))} />
        </Section>

        <Section title="Éléments">
          <div style={styles.row}>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} style={styles.select}>
              <option value="all">Toutes catégories</option>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div style={styles.elementList}>
            {filtered.map((e) => {
              const m = MODEL_BY_ID[e.modelId];
              const active = selectedId === e.id;
              return (
                <div
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  style={{ ...styles.elementRow, ...(active ? styles.elementRowActive : {}) }}
                >
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#ffd54a' }}>{m?.label || '?'}</span>
                    <span style={styles.muted}> · {e.id}</span>
                  </span>
                  <button style={styles.iconBtn} title="Dupliquer" onClick={(ev) => { ev.stopPropagation(); duplicateElement(e.id); }}>⎘</button>
                  <button style={styles.iconBtn} title="Supprimer" onClick={(ev) => { ev.stopPropagation(); deleteElement(e.id); }}>×</button>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Ajouter un objet">
          <div style={styles.libraryGrid}>
            {MODEL_LIBRARY.map((m) => (
              <button key={m.id} style={styles.libBtn} onClick={() => addElement(m.id)} title={m.path}>
                <div style={{ fontSize: 11, color: '#bbb' }}>{m.category}</div>
                <div style={{ fontWeight: 600 }}>{m.label}</div>
              </button>
            ))}
          </div>
        </Section>

        {selected && (
          <Section title={`Sélection : ${selected.id}`}>
            <FieldVec3
              label="Position"
              value={selected.position}
              step={0.1}
              onChange={(v) => updateElement(selected.id, { position: v })}
            />
            <FieldVec3
              label="Rotation (rad)"
              value={selected.rotation}
              step={0.05}
              onChange={(v) => updateElement(selected.id, { rotation: v })}
            />
            <FieldNumber
              label="Échelle uniforme"
              value={typeof selected.scale === 'number' ? selected.scale : selected.scale[0]}
              step={0.05}
              onChange={(v) => updateElement(selected.id, { scale: v })}
            />
            <div style={styles.row}>
              <button style={styles.btn} onClick={() => duplicateElement(selected.id)}>Dupliquer</button>
              <button style={styles.btnDanger} onClick={() => deleteElement(selected.id)}>Supprimer</button>
            </div>
          </Section>
        )}

        <Section title="Aide">
          <p style={styles.muted}>
            • Clique un objet dans la 3D ou la liste pour le sélectionner.<br />
            • Les boutons ⇄ ⟳ ⤢ basculent entre déplacer / tourner / scaler.<br />
            • Boutons "Ajouter un objet" en bas → drop à l'origine, à toi de le placer.<br />
            • Exporter JSON copie la layout dans le presse-papiers — tu peux me la coller en chat et je modifie le code de la scène.
          </p>
        </Section>
      </aside>
    </div>
  );
}

// ============================================================
//  Sub-components
// ============================================================
function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

function ModeBtn({ active, children, ...rest }) {
  return (
    <button {...rest} style={{ ...styles.modeBtn, ...(active ? styles.modeBtnActive : {}) }}>
      {children}
    </button>
  );
}

function FieldColor({ label, value, onChange }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={styles.colorInput} />
      <code style={styles.muted}>{value}</code>
    </div>
  );
}

function FieldNumber({ label, value, step = 0.1, onChange }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <input
        type="number"
        value={Number(value).toFixed(step >= 1 ? 0 : 2)}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={styles.numberInput}
      />
    </div>
  );
}

function FieldVec3({ label, value, step = 0.1, onChange }) {
  const set = (i, v) => {
    const next = [...value];
    next[i] = v;
    onChange(next);
  };
  return (
    <div style={styles.fieldVec}>
      <label style={styles.label}>{label}</label>
      <div style={styles.vecRow}>
        {['x', 'y', 'z'].map((axis, i) => (
          <div key={axis} style={styles.vecCell}>
            <span style={styles.vecAxis}>{axis}</span>
            <input
              type="number"
              step={step}
              value={Number(value[i]).toFixed(2)}
              onChange={(e) => set(i, parseFloat(e.target.value))}
              style={styles.vecInput}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
//  Styles
// ============================================================
const PANEL_BG = '#161823';
const PANEL_BORDER = '#2a2d3d';
const ACCENT = '#ffd54a';

const styles = {
  root: {
    position: 'fixed',
    top: 0, left: 0,
    width: '100vw', height: '100vh',
    display: 'flex',
    background: '#0d0e15',
    color: '#e8e8ee',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    fontSize: 13,
  },
  canvasWrap: { flex: 1, position: 'relative', minWidth: 0, height: '100%' },
  hudTop: {
    position: 'absolute', top: 12, left: 14,
    background: 'rgba(15,17,25,0.85)', padding: '6px 12px', borderRadius: 8,
    border: `1px solid ${PANEL_BORDER}`,
  },
  toolbar: {
    position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
    display: 'flex', gap: 6, padding: '6px 8px',
    background: 'rgba(15,17,25,0.92)',
    border: `1px solid ${PANEL_BORDER}`, borderRadius: 10,
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
  },
  toolbarSep: { width: 1, background: PANEL_BORDER, margin: '0 4px' },
  modeBtn: {
    minWidth: 32, height: 32, padding: '0 8px',
    background: 'transparent', color: '#cfd0d8',
    border: '1px solid transparent', borderRadius: 6,
    cursor: 'pointer', fontSize: 16,
  },
  modeBtnActive: { background: '#22253a', color: ACCENT, borderColor: ACCENT },
  panel: {
    width: 360, flexShrink: 0,
    background: PANEL_BG,
    borderLeft: `1px solid ${PANEL_BORDER}`,
    overflowY: 'auto',
    padding: 12,
  },
  section: {
    marginBottom: 16, paddingBottom: 12,
    borderBottom: `1px solid ${PANEL_BORDER}`,
  },
  sectionTitle: { color: ACCENT, fontWeight: 700, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  row: { display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 },
  field: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  fieldVec: { marginBottom: 8 },
  label: { width: 100, color: '#bdbfcb', fontSize: 12 },
  colorInput: { width: 36, height: 24, border: 'none', background: 'transparent', cursor: 'pointer' },
  numberInput: {
    flex: 1, padding: '4px 6px', background: '#0d0e15',
    border: `1px solid ${PANEL_BORDER}`, color: '#e8e8ee', borderRadius: 4, fontFamily: 'inherit',
  },
  select: {
    flex: 1, padding: '4px 6px', background: '#0d0e15',
    border: `1px solid ${PANEL_BORDER}`, color: '#e8e8ee', borderRadius: 4,
  },
  vecRow: { display: 'flex', gap: 4 },
  vecCell: { flex: 1, display: 'flex', alignItems: 'center', gap: 4 },
  vecAxis: { color: '#888', fontSize: 11, width: 12 },
  vecInput: {
    flex: 1, padding: '3px 5px', background: '#0d0e15',
    border: `1px solid ${PANEL_BORDER}`, color: '#e8e8ee', borderRadius: 4, fontFamily: 'inherit',
    width: 0, // critical for flex-shrink
    minWidth: 0,
  },
  btn: {
    padding: '6px 10px', background: '#22253a', color: '#e8e8ee',
    border: `1px solid ${PANEL_BORDER}`, borderRadius: 6, cursor: 'pointer', fontSize: 12,
  },
  btnDanger: {
    padding: '6px 10px', background: '#3a1f1f', color: '#f0a8a8',
    border: '1px solid #5a2a2a', borderRadius: 6, cursor: 'pointer', fontSize: 12,
  },
  iconBtn: {
    width: 24, height: 24, padding: 0, background: 'transparent', color: '#888',
    border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14,
  },
  elementList: {
    maxHeight: 220, overflowY: 'auto',
    border: `1px solid ${PANEL_BORDER}`, borderRadius: 6,
  },
  elementRow: {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '5px 8px', borderBottom: `1px solid ${PANEL_BORDER}`,
    cursor: 'pointer', fontSize: 12,
  },
  elementRowActive: { background: '#22253a' },
  libraryGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
    maxHeight: 240, overflowY: 'auto', paddingRight: 4,
  },
  libBtn: {
    padding: '6px 8px', background: '#1d2032', color: '#e8e8ee',
    border: `1px solid ${PANEL_BORDER}`, borderRadius: 6, cursor: 'pointer',
    textAlign: 'left', fontSize: 12,
  },
  muted: { color: '#888', fontSize: 11 },
};
