import makeUuid from 'uuid';
import {
  convertGenericUnit,
  decodePropertyKey,
  encodePropertyKey,
  listElementLayers,
  listLayerFieldOptions,
  listSegmentFieldOptions,
} from 'chem-generic-ui';
import UserStore from 'src/stores/alt/stores/UserStore';

export {
  convertGenericUnit,
  decodePropertyKey,
  listElementLayers,
  listLayerFieldOptions,
};

export const METADATA_FIELDS = ['notes', 'analyses', 'group'];

export const ANALYSES_FIELD = '__analyses__';

export const METADATA_LABELS = {
  notes: 'Notes',
  analyses: 'Analyses',
  group: 'Group',
};

export const layerAnalysesPropertyKey = (layerKey) => encodePropertyKey(layerKey, ANALYSES_FIELD);

export const isAnalysesPropertyKey = (key) => {
  const decoded = decodePropertyKey(key);
  return !!decoded && decoded.fieldKey === ANALYSES_FIELD;
};

export const analysesLayerKeyOf = (key) => {
  const decoded = decodePropertyKey(key);
  return decoded && decoded.fieldKey === ANALYSES_FIELD ? decoded.layerKey : null;
};

export const listSegmentKlasses = (element) => {
  if (!element || !element.type) return [];
  const all = (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
  return all
    .filter((k) => k.element_klass && k.element_klass.name === element.type)
    .filter((k) => k.is_active || (element.segments || []).some((s) => s.segment_klass_id === k.id))
    .map((k) => ({
      klassId: k.id,
      label: k.label || k.desc || `Segment ${k.id}`,
      fieldOptions: listSegmentFieldOptions(k),
    }));
};

const createEmptyRow = (name) => {
  const id = makeUuid();
  return {
    uuid: id,
    name: name || 'Variation',
    properties: {},
    metadata: { notes: '', analyses: [], group: '' },
    segments: {},
  };
};

export const normaliseVariations = (raw) => {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    // legacy defensive: coerce array -> hash
    return raw.reduce((acc, row) => {
      const id = row.uuid || makeUuid();
      acc[id] = { ...row, uuid: id };
      return acc;
    }, {});
  }
  return raw;
};

export const sortedRows = (variations) => Object.values(variations || {})
  .filter(Boolean)
  .sort((a, b) => {
    if (!a.uuid) return 1;
    if (!b.uuid) return -1;
    return a.uuid.localeCompare(b.uuid);
  });

export const upsertRow = (variations, row) => ({
  ...variations,
  [row.uuid]: row,
});

export const removeRow = (variations, uuid) => {
  const next = { ...variations };
  delete next[uuid];
  return next;
};

export const setPropertyValue = (row, propertyKey, value) => ({
  ...row,
  properties: {
    ...(row.properties || {}),
    [propertyKey]: { value, unit: row.properties?.[propertyKey]?.unit || '' },
  },
});

export const setMetadataField = (row, field, value) => ({
  ...row,
  metadata: { ...(row.metadata || {}), [field]: value },
});

export const duplicateRow = (row, nameSuffix = ' (copy)') => ({
  ...row,
  uuid: makeUuid(),
  name: `${row.name || 'Variation'}${nameSuffix}`,
  properties: { ...(row.properties || {}) },
  segments: JSON.parse(JSON.stringify(row.segments || {})),
  metadata: { notes: '', analyses: [], group: (row.metadata && row.metadata.group) || '' },
});

export const sanitizeGroupEntry = (value) => (value || '')
  .replace(/[^a-zA-Z0-9_\-.,\s]/g, '')
  .slice(0, 64);

const parseGroupTuple = (raw) => {
  const m = String(raw || '').trim().match(/^(\d+)\.(\d+)$/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10)];
};

const collectGroupTuples = (rows) => (rows || [])
  .map((r) => parseGroupTuple(r && r.metadata && r.metadata.group))
  .filter(Boolean);

export const nextGroupSequential = (rows) => {
  const tuples = collectGroupTuples(rows);
  if (tuples.length === 0) return '1.1';
  const maxMajor = Math.max(...tuples.map((t) => t[0]));
  const maxMinor = Math.max(
    ...tuples.filter((t) => t[0] === maxMajor).map((t) => t[1]),
  );
  return `${maxMajor}.${maxMinor + 1}`;
};

export const nextGroupRepetition = (rows) => {
  const tuples = collectGroupTuples(rows);
  if (tuples.length === 0) return '1.1';
  const maxMajor = Math.max(...tuples.map((t) => t[0]));
  return `${maxMajor + 1}.1`;
};

const rowOrderStorageKey = (userId, elementId) => (
  `user${userId || 'anon'}-element${elementId}-genericElementVariationsRowOrder`
);

export const persistRowOrder = (userId, elementId, uuidOrder) => {
  try {
    window.localStorage.setItem(
      rowOrderStorageKey(userId, elementId),
      JSON.stringify(uuidOrder),
    );
  } catch (_e) { /* noop */ }
};

export const readPersistedRowOrder = (userId, elementId) => {
  try {
    const raw = window.localStorage.getItem(rowOrderStorageKey(userId, elementId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (_e) { return null; }
};

export const applyRowOrder = (variations, uuidOrder) => {
  const remaining = { ...(variations || {}) };
  const ordered = [];
  (uuidOrder || []).forEach((uuid) => {
    if (remaining[uuid]) {
      ordered.push(remaining[uuid]);
      delete remaining[uuid];
    }
  });
  Object.values(remaining).forEach((row) => ordered.push(row));
  return ordered;
};

export const listElementAnalyses = (element) => {
  const root = element && element.container;
  if (!root || !root.children) return [];
  const result = [];
  const walk = (c) => {
    if (!c || c.is_deleted) return;
    if (c.container_type === 'analysis') {
      const kind = (c.extended_metadata && c.extended_metadata.kind) || '';
      result.push({
        id: c.id,
        name: c.name || kind || `Analysis ${c.id}`,
        kind,
      });
    }
    (c.children || []).forEach(walk);
  };
  (root.children || []).forEach(walk);
  return result;
};

export const seedRowFromElement = (element, selectedPropertyKeys, name) => {
  const row = createEmptyRow(name);
  const layers = (element && element.properties && element.properties.layers) || {};
  (selectedPropertyKeys || []).forEach((key) => {
    const decoded = decodePropertyKey(key);
    if (!decoded) return;
    const layer = layers[decoded.layerKey];
    if (!layer) return;
    const field = (layer.fields || []).find((f) => f.field === decoded.fieldKey);
    if (!field || field.value === undefined || field.value === null) return;
    row.properties[key] = {
      value: field.value,
      unit: field.value_system || field.unit || '',
    };
  });
  return row;
};

export const rowHasDataForPropertyKey = (row, propertyKey) => {
  const cell = row && row.properties && row.properties[propertyKey];
  if (!cell) return false;
  if (Array.isArray(cell.value)) return cell.value.length > 0;
  return cell.value !== undefined && cell.value !== null && cell.value !== '';
};

export const rowHasDataForSegmentField = (row, segmentKlassId, fieldKey) => {
  const snap = row && row.segments && row.segments[segmentKlassId];
  if (!snap) return false;
  const v = snap[fieldKey];
  return v !== undefined && v !== null && v !== '';
};

export const rowHasDataForSegment = (row, segmentKlassId) => {
  const snap = row && row.segments && row.segments[segmentKlassId];
  if (!snap) return false;
  return Object.values(snap).some((v) => v !== undefined && v !== null && v !== '');
};

export const rowHasDataForMetadata = (row, field) => {
  const v = row && row.metadata && row.metadata[field];
  if (Array.isArray(v)) return v.length > 0;
  return v !== undefined && v !== null && v !== '';
};

// ---- column identity helpers -------------------------------------------

export const propertyColKey = (propertyKey) => `prop:${propertyKey}`;
export const segmentColKey = (segmentKlassId, fieldKey) => `seg:${segmentKlassId}:${fieldKey}`;

// ---- column units / layout persistence ---------------------------------

const unitStorageKey = (userId, elementId) => (
  `user${userId || 'anon'}-element${elementId}-genericElementVariationsColumnUnits`
);

const layoutStorageKey = (userId, elementId) => (
  `user${userId || 'anon'}-element${elementId}-genericElementVariationsLayout`
);

export const readPersistedColumnUnits = (userId, elementId) => {
  try {
    const raw = window.localStorage.getItem(unitStorageKey(userId, elementId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_e) { return {}; }
};

export const persistColumnUnits = (userId, elementId, units) => {
  try {
    window.localStorage.setItem(unitStorageKey(userId, elementId), JSON.stringify(units));
  } catch (_e) { /* noop */ }
};

export const readPersistedLayout = (userId, elementId) => {
  try {
    const raw = window.localStorage.getItem(layoutStorageKey(userId, elementId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_e) { return null; }
};

export const persistLayout = (userId, elementId, layout) => {
  try {
    window.localStorage.setItem(layoutStorageKey(userId, elementId), JSON.stringify(layout));
  } catch (_e) { /* noop */ }
};
