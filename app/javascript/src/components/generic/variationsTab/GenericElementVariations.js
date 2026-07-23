/* eslint-disable react/forbid-prop-types */
import React, {
  forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState,
} from 'react';
import PropTypes from 'prop-types';
import {
  Alert, Button, ButtonGroup, Spinner,
} from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import UserStore from 'src/stores/alt/stores/UserStore';
import ElementVariationFetcher from 'src/fetchers/ElementVariationFetcher';
import {
  METADATA_FIELDS,
  METADATA_LABELS,
  analysesLayerKeyOf,
  applyRowOrder,
  convertGenericUnit,
  duplicateRow,
  layerAnalysesPropertyKey,
  listElementAnalyses,
  listElementLayers,
  listLayerFieldOptions,
  listSegmentKlasses,
  nextGroupRepetition,
  nextGroupSequential,
  normaliseVariations,
  persistColumnUnits,
  persistLayout,
  persistRowOrder,
  propertyColKey,
  readPersistedColumnUnits,
  readPersistedLayout,
  readPersistedRowOrder,
  removeRow,
  rowHasDataForMetadata,
  rowHasDataForPropertyKey,
  rowHasDataForSegment,
  rowHasDataForSegmentField,
  sanitizeGroupEntry,
  seedRowFromElement,
  segmentColKey,
  setMetadataField,
  setPropertyValue,
  sortedRows,
  upsertRow,
} from 'src/components/generic/variationsTab/GenericElementVariationsUtils';
import buildColumnDefs
  from 'src/components/generic/variationsTab/GenericElementVariationsColumnDefs';
import GenericElementVariationsColumnSelection
  from 'src/components/generic/variationsTab/GenericElementVariationsColumnSelection';
import {
  AnalysesEditorModal,
  DeleteRowModal,
  HideColumnWarningModal,
  NotesEditorModal,
  RemoveAllModal,
} from 'src/components/generic/variationsTab/GenericElementVariationsModals';

const snapshotSegment = (element, segmentKlassId) => {
  const segment = (element.segments || []).find((s) => s.segment_klass_id === segmentKlassId);
  if (!segment) return {};
  const fieldsByLayer = (segment.properties && segment.properties.layers) || {};
  const snapshot = {};
  Object.keys(fieldsByLayer).forEach((layerKey) => {
    (fieldsByLayer[layerKey].fields || []).forEach((f) => {
      if (f && f.field && typeof f.value !== 'undefined') {
        snapshot[f.field] = f.value;
      }
    });
  });
  return snapshot;
};

// ---- main component ----------------------------------------------------

const GenericElementVariations = forwardRef(({ genericEl, onDirty }, ref) => {
  const elementId = genericEl && genericEl.id;
  const isNew = genericEl && (genericEl.isNew || genericEl.is_new);
  const shortLabel = (genericEl && (genericEl.short_label || genericEl.name)) || 'Variation';
  const userId = (UserStore.getState() && UserStore.getState().currentUser
    && UserStore.getState().currentUser.id) || 'anon';

  const layerFieldOptions = useMemo(
    () => listLayerFieldOptions(genericEl && genericEl.element_klass),
    [genericEl && genericEl.element_klass],
  );
  const segmentOptions = useMemo(
    () => listSegmentKlasses(genericEl),
    [genericEl && genericEl.type, genericEl && genericEl.segments],
  );
  const analyses = useMemo(
    () => listElementAnalyses(genericEl),
    [genericEl && genericEl.container],
  );
  const elementLayers = useMemo(
    () => listElementLayers(genericEl && genericEl.element_klass),
    [genericEl && genericEl.element_klass],
  );
  const analysisLayerLookup = useMemo(() => {
    const map = {};
    elementLayers.forEach((l) => { map[l.layerKey] = l; });
    return map;
  }, [elementLayers]);

  const [variations, setVariations] = useState({});
  const [rowOrder, setRowOrder] = useState([]);
  const [selectedPropertyKeys, setSelectedPropertyKeys] = useState([]);
  const [selectedAnalysisLayers, setSelectedAnalysisLayers] = useState([]);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState([]);
  const [selectedSegmentFields, setSelectedSegmentFields] = useState({});
  const [selectedMetadataKeys, setSelectedMetadataKeys] = useState([...METADATA_FIELDS]);
  const [columnUnits, setColumnUnits] = useState({});
  const [columnWidths, setColumnWidths] = useState({});
  const [groupOrder, setGroupOrder] = useState(['properties', 'metadata', 'segments']);

  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showRemoveAll, setShowRemoveAll] = useState(false);
  const [rowPendingDelete, setRowPendingDelete] = useState(null);
  const [notesEditing, setNotesEditing] = useState(null);
  const [analysesEditing, setAnalysesEditing] = useState(null);
  const [layerAnalysesEditing, setLayerAnalysesEditing] = useState(null);
  const [hideColumnWarning, setHideColumnWarning] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(null);

  const gridRef = useRef(null);
  const variationsRef = useRef({});
  const orderedRowsRef = useRef([]);
  const dirtyRef = useRef(false);
  const layoutRef = useRef({});

  useEffect(() => {
    if (isNew || !elementId) return;
    setLoading(true);
    ElementVariationFetcher.fetchByElementId(elementId)
      .then((data) => {
        const rows = normaliseVariations(data && data.variations);
        setVariations(rows);
        const keysFromData = new Set();
        const analysisLayersFromData = new Set();
        const segsFromData = new Set();
        Object.values(rows).forEach((row) => {
          Object.keys(row.properties || {}).forEach((k) => {
            const analysisLayerKey = analysesLayerKeyOf(k);
            if (analysisLayerKey !== null) analysisLayersFromData.add(analysisLayerKey);
            else keysFromData.add(k);
          });
          Object.keys(row.segments || {}).forEach((sid) => {
            const nid = Number(sid);
            segsFromData.add(Number.isNaN(nid) ? sid : nid);
          });
        });
        const fieldMap = {};
        Object.values(rows).forEach((row) => {
          Object.entries(row.segments || {}).forEach(([sid, snapshot]) => {
            const key = Number.isNaN(Number(sid)) ? sid : Number(sid);
            const fks = Object.keys(snapshot || {});
            if (fks.length === 0) return;
            fieldMap[key] = Array.from(new Set([...(fieldMap[key] || []), ...fks]));
          });
        });

        const serverLayout = (data && data.layout && typeof data.layout === 'object'
          && Object.keys(data.layout).length > 0) ? data.layout : null;
        const layout = serverLayout || readPersistedLayout(userId, elementId) || {};
        if (Array.isArray(layout.selectedPropertyKeys)) {
          setSelectedPropertyKeys(layout.selectedPropertyKeys);
        } else if (keysFromData.size > 0) {
          setSelectedPropertyKeys([...keysFromData]);
        }
        if (Array.isArray(layout.selectedSegmentIds)) {
          setSelectedSegmentIds(layout.selectedSegmentIds);
        } else if (segsFromData.size > 0) {
          setSelectedSegmentIds([...segsFromData]);
        }
        if (layout.selectedSegmentFields && typeof layout.selectedSegmentFields === 'object') {
          setSelectedSegmentFields(layout.selectedSegmentFields);
        } else if (Object.keys(fieldMap).length > 0) {
          setSelectedSegmentFields(fieldMap);
        }
        if (Array.isArray(layout.selectedMetadataKeys)) {
          setSelectedMetadataKeys(layout.selectedMetadataKeys);
        }
        if (Array.isArray(layout.selectedAnalysisLayers)) {
          setSelectedAnalysisLayers(layout.selectedAnalysisLayers);
        } else if (analysisLayersFromData.size > 0) {
          setSelectedAnalysisLayers([...analysisLayersFromData]);
        }

        const serverRowOrder = serverLayout && Array.isArray(serverLayout.rowOrder)
          ? serverLayout.rowOrder
          : null;
        const persistedRowOrder = serverRowOrder
          || (Array.isArray(layout.rowOrder) ? layout.rowOrder : null)
          || readPersistedRowOrder(userId, elementId)
          || [];
        setRowOrder(persistedRowOrder);

        const serverUnits = serverLayout && serverLayout.columnUnits
          && typeof serverLayout.columnUnits === 'object' ? serverLayout.columnUnits : null;
        const persistedUnits = serverUnits
          || (layout.columnUnits && typeof layout.columnUnits === 'object' ? layout.columnUnits : null)
          || readPersistedColumnUnits(userId, elementId);
        const inferred = {};
        Object.values(rows).forEach((row) => {
          Object.entries(row.properties || {}).forEach(([k, cell]) => {
            if (cell && cell.unit && !inferred[propertyColKey(k)]) {
              inferred[propertyColKey(k)] = cell.unit;
            }
          });
        });
        setColumnUnits({ ...inferred, ...persistedUnits });

        const widths = (layout.columnWidths && typeof layout.columnWidths === 'object')
          ? layout.columnWidths : {};
        setColumnWidths(widths);

        if (Array.isArray(layout.groupOrder) && layout.groupOrder.length > 0) {
          const known = new Set(['properties', 'metadata', 'segments']);
          const cleaned = [...layout.groupOrder.filter((g) => known.has(g))];
          ['properties', 'metadata', 'segments'].forEach((g) => {
            if (!cleaned.includes(g)) cleaned.push(g);
          });
          setGroupOrder(cleaned);
        }
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [elementId, isNew, userId]);

  const markDirty = () => {
    const wasDirty = dirtyRef.current;
    dirtyRef.current = true;
    setDirty(true);
    if (!wasDirty && typeof onDirty === 'function') onDirty();
  };

  const getCurrentUnit = useCallback((colKey, unitsInfo) => {
    if (columnUnits[colKey]) return columnUnits[colKey];
    if (unitsInfo && unitsInfo.defaultUnit) return unitsInfo.defaultUnit;
    if (unitsInfo && unitsInfo.units && unitsInfo.units[0]) return unitsInfo.units[0];
    return '';
  }, [columnUnits]);

  const saveLayout = useCallback((partial) => {
    persistLayout(userId, elementId, {
      selectedPropertyKeys: partial.selectedPropertyKeys ?? selectedPropertyKeys,
      selectedSegmentIds: partial.selectedSegmentIds ?? selectedSegmentIds,
      selectedSegmentFields: partial.selectedSegmentFields ?? selectedSegmentFields,
      selectedMetadataKeys: partial.selectedMetadataKeys ?? selectedMetadataKeys,
      selectedAnalysisLayers: partial.selectedAnalysisLayers ?? selectedAnalysisLayers,
    });
  }, [userId, elementId, selectedPropertyKeys, selectedSegmentIds, selectedSegmentFields,
    selectedMetadataKeys, selectedAnalysisLayers]);

  // --- column toggle (via "Select columns" modal) ---

  const togglePropertyKey = (key) => {
    if (selectedPropertyKeys.includes(key)) {
      const propertyOpt = layerFieldOptions.find((o) => o.key === key);
      const hasData = Object.values(variations).some((r) => rowHasDataForPropertyKey(r, key));
      if (hasData) {
        setHideColumnWarning({
          label: propertyOpt?.label || key,
          onConfirm: () => {
            setSelectedPropertyKeys((prev) => {
              const next = prev.filter((k) => k !== key);
              saveLayout({ selectedPropertyKeys: next });
              return next;
            });
            setVariations((prev) => {
              const next = { ...prev };
              Object.keys(next).forEach((uuid) => {
                const props = { ...(next[uuid].properties || {}) };
                delete props[key];
                next[uuid] = { ...next[uuid], properties: props };
              });
              return next;
            });
            markDirty();
            setHideColumnWarning(null);
          },
        });
        return;
      }
      setSelectedPropertyKeys((prev) => {
        const next = prev.filter((k) => k !== key);
        saveLayout({ selectedPropertyKeys: next });
        return next;
      });
      markDirty();
    } else {
      setSelectedPropertyKeys((prev) => {
        const next = [...prev, key];
        saveLayout({ selectedPropertyKeys: next });
        return next;
      });
      markDirty();
    }
  };

  const toggleSegmentId = (id) => {
    if (selectedSegmentIds.includes(id)) {
      const segOpt = segmentOptions.find((s) => s.klassId === id);
      const hasData = Object.values(variations).some((r) => rowHasDataForSegment(r, id));
      if (hasData) {
        setHideColumnWarning({
          label: segOpt?.label || `Segment ${id}`,
          onConfirm: () => {
            setSelectedSegmentIds((prev) => {
              const next = prev.filter((k) => k !== id);
              saveLayout({ selectedSegmentIds: next });
              return next;
            });
            setSelectedSegmentFields((prev) => {
              const next = { ...prev };
              delete next[id];
              saveLayout({ selectedSegmentFields: next });
              return next;
            });
            setVariations((prev) => {
              const next = { ...prev };
              Object.keys(next).forEach((uuid) => {
                const segs = { ...(next[uuid].segments || {}) };
                delete segs[id];
                next[uuid] = { ...next[uuid], segments: segs };
              });
              return next;
            });
            markDirty();
            setHideColumnWarning(null);
          },
        });
        return;
      }
      setSelectedSegmentIds((prev) => {
        const next = prev.filter((k) => k !== id);
        saveLayout({ selectedSegmentIds: next });
        return next;
      });
      setSelectedSegmentFields((prev) => {
        const next = { ...prev };
        delete next[id];
        saveLayout({ selectedSegmentFields: next });
        return next;
      });
      markDirty();
    } else {
      setSelectedSegmentIds((prev) => {
        const next = [...prev, id];
        saveLayout({ selectedSegmentIds: next });
        return next;
      });
      markDirty();
    }
  };

  const toggleSegmentFieldKey = (segmentKlassId, fieldKey) => {
    const isSelected = (selectedSegmentFields[segmentKlassId] || []).includes(fieldKey);
    if (isSelected) {
      const hasData = Object.values(variations)
        .some((r) => rowHasDataForSegmentField(r, segmentKlassId, fieldKey));
      const segOpt = segmentOptions.find((s) => s.klassId === segmentKlassId);
      const fieldOpt = segOpt?.fieldOptions?.find((f) => f.fieldKey === fieldKey);
      if (hasData) {
        setHideColumnWarning({
          label: `${segOpt?.label || segmentKlassId} · ${fieldOpt?.label || fieldKey}`,
          onConfirm: () => {
            setSelectedSegmentFields((prev) => {
              const next = {
                ...prev,
                [segmentKlassId]: (prev[segmentKlassId] || []).filter((k) => k !== fieldKey),
              };
              saveLayout({ selectedSegmentFields: next });
              return next;
            });
            setVariations((prev) => {
              const next = { ...prev };
              Object.keys(next).forEach((uuid) => {
                const snap = { ...(next[uuid].segments?.[segmentKlassId] || {}) };
                delete snap[fieldKey];
                next[uuid] = {
                  ...next[uuid],
                  segments: { ...(next[uuid].segments || {}), [segmentKlassId]: snap },
                };
              });
              return next;
            });
            markDirty();
            setHideColumnWarning(null);
          },
        });
        return;
      }
    }
    setSelectedSegmentFields((prev) => {
      const current = prev[segmentKlassId] || [];
      const nextForKlass = current.includes(fieldKey)
        ? current.filter((k) => k !== fieldKey)
        : [...current, fieldKey];
      const next = { ...prev, [segmentKlassId]: nextForKlass };
      saveLayout({ selectedSegmentFields: next });
      return next;
    });
    markDirty();
  };

  const toggleMetadataKey = (field) => {
    if (selectedMetadataKeys.includes(field)) {
      const hasData = Object.values(variations).some((r) => rowHasDataForMetadata(r, field));
      if (hasData) {
        setHideColumnWarning({
          label: METADATA_LABELS[field] || field,
          onConfirm: () => {
            setSelectedMetadataKeys((prev) => {
              const next = prev.filter((k) => k !== field);
              saveLayout({ selectedMetadataKeys: next });
              return next;
            });
            setVariations((prev) => {
              const next = { ...prev };
              Object.keys(next).forEach((uuid) => {
                const meta = { ...(next[uuid].metadata || {}) };
                if (field === 'analyses') meta.analyses = [];
                else meta[field] = '';
                next[uuid] = { ...next[uuid], metadata: meta };
              });
              return next;
            });
            markDirty();
            setHideColumnWarning(null);
          },
        });
        return;
      }
      setSelectedMetadataKeys((prev) => {
        const next = prev.filter((k) => k !== field);
        saveLayout({ selectedMetadataKeys: next });
        return next;
      });
      markDirty();
    } else {
      setSelectedMetadataKeys((prev) => {
        const next = [...prev, field];
        saveLayout({ selectedMetadataKeys: next });
        return next;
      });
      markDirty();
    }
  };

  const toggleAnalysisLayer = (layerKey) => {
    const key = layerAnalysesPropertyKey(layerKey);
    if (selectedAnalysisLayers.includes(layerKey)) {
      const hasData = Object.values(variations).some((r) => rowHasDataForPropertyKey(r, key));
      const layerLabel = analysisLayerLookup[layerKey]?.layerLabel || layerKey;
      if (hasData) {
        setHideColumnWarning({
          label: `${layerLabel} · Link Analyses`,
          onConfirm: () => {
            setSelectedAnalysisLayers((prev) => {
              const next = prev.filter((k) => k !== layerKey);
              saveLayout({ selectedAnalysisLayers: next });
              return next;
            });
            setVariations((prev) => {
              const next = { ...prev };
              Object.keys(next).forEach((uuid) => {
                const props = { ...(next[uuid].properties || {}) };
                delete props[key];
                next[uuid] = { ...next[uuid], properties: props };
              });
              return next;
            });
            markDirty();
            setHideColumnWarning(null);
          },
        });
        return;
      }
      setSelectedAnalysisLayers((prev) => {
        const next = prev.filter((k) => k !== layerKey);
        saveLayout({ selectedAnalysisLayers: next });
        return next;
      });
      markDirty();
    } else {
      setSelectedAnalysisLayers((prev) => {
        const next = [...prev, layerKey];
        saveLayout({ selectedAnalysisLayers: next });
        return next;
      });
      markDirty();
    }
  };

  // --- column reorder (driven by ag-grid drag) ---

  const onColumnMoved = (event) => {
    if (event && event.source && event.source !== 'uiColumnDragged' && event.source !== 'uiColumnMoved') {
      return;
    }
    const colState = event.api.getColumnState();
    const nextPropertyKeys = [];
    const nextAnalysisLayers = [];
    const nextMetadataKeys = [];
    const nextSegmentIds = [];
    const nextSegmentFields = {};
    const nextGroupOrder = [];
    const seenGroups = new Set();
    const recordGroup = (g) => {
      if (!seenGroups.has(g)) {
        seenGroups.add(g);
        nextGroupOrder.push(g);
      }
    };

    colState.forEach((col) => {
      const colId = col.colId || '';
      if (colId.startsWith('prop:')) {
        const propKey = colId.slice('prop:'.length);
        const analysisLayerKey = analysesLayerKeyOf(propKey);
        if (analysisLayerKey !== null) nextAnalysisLayers.push(analysisLayerKey);
        else nextPropertyKeys.push(propKey);
        recordGroup('properties');
      } else if (colId.startsWith('meta:')) {
        nextMetadataKeys.push(colId.slice('meta:'.length));
        recordGroup('metadata');
      } else if (colId.startsWith('seg:')) {
        const parts = colId.split(':');
        const idStr = parts[1];
        const fieldKey = parts[2];
        const id = Number.isNaN(Number(idStr)) ? idStr : Number(idStr);
        if (!(id in nextSegmentFields)) {
          nextSegmentFields[id] = [];
          nextSegmentIds.push(id);
        }
        if (fieldKey && fieldKey !== '__placeholder') {
          nextSegmentFields[id].push(fieldKey);
        }
        recordGroup('segments');
      }
    });
    ['properties', 'metadata', 'segments'].forEach((g) => {
      if (!seenGroups.has(g)) nextGroupOrder.push(g);
    });

    setSelectedPropertyKeys(nextPropertyKeys);
    setSelectedAnalysisLayers(nextAnalysisLayers);
    setSelectedMetadataKeys(nextMetadataKeys);
    setSelectedSegmentIds(nextSegmentIds);
    setSelectedSegmentFields((prev) => ({ ...prev, ...nextSegmentFields }));
    setGroupOrder(nextGroupOrder);
    saveLayout({
      selectedPropertyKeys: nextPropertyKeys,
      selectedAnalysisLayers: nextAnalysisLayers,
      selectedMetadataKeys: nextMetadataKeys,
      selectedSegmentIds: nextSegmentIds,
      selectedSegmentFields: { ...selectedSegmentFields, ...nextSegmentFields },
    });
    markDirty();
  };

  // --- unit toggles ---

  const cycleColumnUnit = (colKey, unitsInfo, applyConversion) => {
    if (!unitsInfo || !unitsInfo.units || unitsInfo.units.length < 2) return;
    const current = getCurrentUnit(colKey, unitsInfo);
    const idx = unitsInfo.units.indexOf(current);
    const nextUnit = unitsInfo.units[(idx + 1) % unitsInfo.units.length];

    setVariations((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((uuid) => {
        next[uuid] = applyConversion(next[uuid], current, nextUnit, unitsInfo.quantity);
      });
      return next;
    });

    setColumnUnits((prev) => {
      const next = { ...prev, [colKey]: nextUnit };
      persistColumnUnits(userId, elementId, next);
      return next;
    });
    markDirty();
  };

  const toggleUnitForPropertyCol = (propertyKey, unitsInfo) => {
    cycleColumnUnit(
      propertyColKey(propertyKey),
      unitsInfo,
      (row, fromUnit, toUnit, quantity) => {
        const cell = (row.properties || {})[propertyKey];
        if (!cell) return row;
        const convertedValue = convertGenericUnit(cell.value, fromUnit, toUnit, quantity);
        return {
          ...row,
          properties: {
            ...row.properties,
            [propertyKey]: { ...cell, value: convertedValue, unit: toUnit },
          },
        };
      },
    );
  };

  const toggleUnitForSegmentCol = (segmentKlassId, fieldKey, unitsInfo) => {
    cycleColumnUnit(
      segmentColKey(segmentKlassId, fieldKey),
      unitsInfo,
      (row, fromUnit, toUnit, quantity) => {
        const snap = { ...((row.segments || {})[segmentKlassId] || {}) };
        if (!(fieldKey in snap)) return row;
        snap[fieldKey] = convertGenericUnit(snap[fieldKey], fromUnit, toUnit, quantity);
        return {
          ...row,
          segments: { ...(row.segments || {}), [segmentKlassId]: snap },
        };
      },
    );
  };

  // --- rows ---

  const propertyColumnLookup = useMemo(() => {
    const map = {};
    layerFieldOptions.forEach((opt) => { map[opt.key] = opt; });
    return map;
  }, [layerFieldOptions]);

  const orderedRows = useMemo(() => (
    rowOrder.length > 0
      ? applyRowOrder(variations, rowOrder)
      : sortedRows(variations)
  ), [variations, rowOrder]);

  variationsRef.current = variations;
  orderedRowsRef.current = orderedRows;
  dirtyRef.current = dirty;
  layoutRef.current = {
    selectedPropertyKeys,
    selectedAnalysisLayers,
    selectedSegmentIds,
    selectedSegmentFields,
    selectedMetadataKeys,
    columnUnits,
    columnWidths,
    groupOrder,
    rowOrder,
  };

  const appendRow = (groupValue) => {
    const row = seedRowFromElement(
      genericEl,
      selectedPropertyKeys,
      `${shortLabel}-v${Object.keys(variations).length + 1}`,
    );
    row.metadata = { ...(row.metadata || {}), group: groupValue };
    selectedPropertyKeys.forEach((k) => {
      const opt = propertyColumnLookup[k];
      const unitsInfo = opt?.units;
      if (!unitsInfo) return;
      const colUnit = getCurrentUnit(propertyColKey(k), unitsInfo);
      const cell = row.properties[k];
      if (!cell) return;
      const converted = convertGenericUnit(cell.value, cell.unit || unitsInfo.defaultUnit, colUnit, unitsInfo.quantity);
      row.properties[k] = { ...cell, value: converted, unit: colUnit };
    });
    setVariations((prev) => upsertRow(prev, row));
    setRowOrder((prev) => {
      const next = prev.length > 0 ? [...prev, row.uuid] : [...orderedRows.map((r) => r.uuid), row.uuid];
      persistRowOrder(userId, elementId, next);
      return next;
    });
    markDirty();
  };

  const onAddRow = () => appendRow(nextGroupSequential(orderedRows));

  const onAddRepetition = () => appendRow(nextGroupRepetition(orderedRows));

  const onDuplicateRow = (uuid) => {
    const row = variationsRef.current[uuid];
    if (!row) return;
    const copy = duplicateRow(row);
    setVariations((prev) => upsertRow(prev, copy));
    setRowOrder((prev) => {
      const base = prev.length > 0 ? prev : orderedRowsRef.current.map((r) => r.uuid);
      const idx = base.indexOf(uuid);
      const next = [...base];
      next.splice(idx + 1, 0, copy.uuid);
      persistRowOrder(userId, elementId, next);
      return next;
    });
    markDirty();
  };

  const onRequestDeleteRow = (uuid) => {
    const row = variationsRef.current[uuid];
    if (!row) return;
    setRowPendingDelete({ uuid, name: row.name || 'Variation' });
  };

  const onConfirmDeleteRow = () => {
    if (!rowPendingDelete) return;
    const { uuid } = rowPendingDelete;
    setVariations((prev) => removeRow(prev, uuid));
    setRowOrder((prev) => {
      const next = prev.filter((u) => u !== uuid);
      persistRowOrder(userId, elementId, next);
      return next;
    });
    setRowPendingDelete(null);
    markDirty();
  };

  const onRemoveAll = () => {
    setVariations({});
    setRowOrder([]);
    persistRowOrder(userId, elementId, []);
    setShowRemoveAll(false);
    markDirty();
  };

  // --- cell edit ---

  const applyEdit = (uuid, colId, newValue) => {
    if (colId === '__variation') {
      setVariations((prev) => {
        const row = prev[uuid];
        if (!row) return prev;
        return upsertRow(prev, { ...row, name: newValue });
      });
      markDirty();
      return;
    }
    if (colId.startsWith('prop:')) {
      const propertyKey = colId.slice('prop:'.length);
      const opt = propertyColumnLookup[propertyKey];
      const unitsInfo = opt?.units;
      const unit = unitsInfo ? getCurrentUnit(propertyColKey(propertyKey), unitsInfo) : '';
      setVariations((prev) => {
        const row = prev[uuid];
        if (!row) return prev;
        const next = setPropertyValue(row, propertyKey, newValue);
        if (unit) {
          next.properties[propertyKey] = { ...next.properties[propertyKey], unit };
        }
        return upsertRow(prev, next);
      });
      markDirty();
      return;
    }
    if (colId.startsWith('seg:')) {
      const [, idStr, fieldKey] = colId.split(':');
      const segmentKlassId = Number.isNaN(Number(idStr)) ? idStr : Number(idStr);
      if (!fieldKey || fieldKey === '__placeholder') return;
      setVariations((prev) => {
        const row = prev[uuid];
        if (!row) return prev;
        const nextSegments = {
          ...(row.segments || {}),
          [segmentKlassId]: { ...(row.segments?.[segmentKlassId] || {}), [fieldKey]: newValue },
        };
        return upsertRow(prev, { ...row, segments: nextSegments });
      });
      markDirty();
      return;
    }
    if (colId.startsWith('meta:')) {
      const field = colId.slice('meta:'.length);
      setVariations((prev) => {
        const row = prev[uuid];
        if (!row) return prev;
        const value = field === 'group' ? sanitizeGroupEntry(newValue) : newValue;
        return upsertRow(prev, setMetadataField(row, field, value));
      });
      markDirty();
    }
  };

  const onSnapshotSegment = (uuid, segmentKlassId) => {
    setVariations((prev) => {
      const row = prev[uuid];
      if (!row) return prev;
      const snapshot = snapshotSegment(genericEl, segmentKlassId);
      const nextSegments = {
        ...(row.segments || {}),
        [segmentKlassId]: { ...(row.segments?.[segmentKlassId] || {}), ...snapshot },
      };
      return upsertRow(prev, { ...row, segments: nextSegments });
    });
    markDirty();
  };

  // --- column resize (ag-grid) ---

  const onColumnResized = (event) => {
    if (!event || !event.finished) return;
    if (event.source && event.source !== 'uiColumnResized' && event.source !== 'uiColumnDragged') return;
    const colState = event.api.getColumnState();
    const widths = {};
    colState.forEach((c) => {
      if (c.colId && typeof c.width === 'number') widths[c.colId] = c.width;
    });
    setColumnWidths(widths);
    markDirty();
  };

  // --- row drag (ag-grid) ---

  const onRowDragEnd = (event) => {
    const newOrder = [];
    event.api.forEachNode((node) => {
      if (node && node.data && node.data.uuid) newOrder.push(node.data.uuid);
    });
    setRowOrder(newOrder);
    persistRowOrder(userId, elementId, newOrder);
    markDirty();
  };

  // --- save ---

  const persistVariations = useCallback(() => {
    if (!elementId) return Promise.resolve(null);
    setSaving(true);
    setError(null);
    return ElementVariationFetcher.update(elementId, variationsRef.current, layoutRef.current)
      .then((data) => {
        if (data && data.variations) {
          setVariations(normaliseVariations(data.variations));
        }
        dirtyRef.current = false;
        setDirty(false);
        return data;
      })
      .catch((err) => { setError(String(err)); return null; })
      .finally(() => setSaving(false));
  }, [elementId]);

  useImperativeHandle(ref, () => ({
    flushIfDirty: () => {
      if (!dirtyRef.current || !elementId) return Promise.resolve(null);
      return persistVariations();
    },
  }), [elementId, persistVariations]);

  // --- column defs ---

  const widthFor = (colId, defaultWidth) => columnWidths[colId] || defaultWidth;

  const columnDefs = useMemo(() => buildColumnDefs({
    widthFor,
    getCurrentUnit,
    groupOrder,
    analyses,
    selectedPropertyKeys,
    selectedAnalysisLayers,
    selectedMetadataKeys,
    selectedSegmentIds,
    selectedSegmentFields,
    propertyColumnLookup,
    analysisLayerLookup,
    segmentOptions,
    toggleUnitForPropertyCol,
    toggleUnitForSegmentCol,
    onDuplicateRow,
    onRequestDeleteRow,
    onSnapshotSegment,
    setLayerAnalysesEditing,
    setNotesEditing,
    setAnalysesEditing,
  }), [
    selectedPropertyKeys, selectedAnalysisLayers, selectedSegmentIds, selectedSegmentFields,
    selectedMetadataKeys, propertyColumnLookup, analysisLayerLookup, segmentOptions, analyses,
    columnUnits, columnWidths, groupOrder, getCurrentUnit,
  ]);

  if (isNew) {
    return (
      <Alert variant="info">
        Save the element before adding variations.
      </Alert>
    );
  }

  return (
    <div className="generic-element-variations">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <ButtonGroup>
          <Button size="sm" variant="primary" onClick={onAddRow}>
            <i className="fa fa-plus" aria-hidden="true" /> Add row
          </Button>
          <Button size="sm" variant="primary" onClick={onAddRepetition}>
            <i className="fa fa-plus" aria-hidden="true" /> Add repetition
          </Button>
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => setShowColumnModal(true)}
          >
            <i className="fa fa-columns" aria-hidden="true" /> Select columns
          </Button>
          <Button
            size="sm"
            variant="outline-danger"
            onClick={() => setShowRemoveAll(true)}
            disabled={orderedRows.length === 0}
          >
            <i className="fa fa-trash-o" aria-hidden="true" /> Remove all
          </Button>
        </ButtonGroup>
        {saving && (
          <div className="d-flex align-items-center text-muted">
            <Spinner animation="border" size="sm" className="me-2" />
            <small>Saving variations…</small>
          </div>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="text-center p-4"><Spinner animation="border" /></div>
      ) : (
        <div className="ag-theme-alpine generic-element-variations-grid" style={{ width: '100%' }}>
          <AgGridReact
            ref={gridRef}
            rowData={orderedRows}
            columnDefs={columnDefs}
            getRowId={(p) => p.data.uuid}
            defaultColDef={{
              editable: true,
              sortable: false,
              resizable: true,
              suppressHeaderMenuButton: true,
            }}
            defaultColGroupDef={{ resizable: true }}
            domLayout="autoHeight"
            groupHeaderHeight={36}
            headerHeight={56}
            rowHeight={48}
            rowDragManaged
            onRowDragEnd={onRowDragEnd}
            onColumnMoved={onColumnMoved}
            onColumnResized={onColumnResized}
            readOnlyEdit
            onCellEditRequest={(e) => applyEdit(e.data.uuid, e.colDef.colId, e.newValue)}
            suppressDragLeaveHidesColumns
            maintainColumnOrder
            noRowsOverlayComponent={() => (
              <div className="text-muted">No variations yet. Click &quot;Add row&quot; to get started.</div>
            )}
          />
        </div>
      )}

      <GenericElementVariationsColumnSelection
        show={showColumnModal}
        onHide={() => setShowColumnModal(false)}
        elementName={genericEl?.element_klass?.label}
        layerFieldOptions={layerFieldOptions}
        layerOptions={elementLayers}
        selectedPropertyKeys={selectedPropertyKeys}
        onTogglePropertyKey={togglePropertyKey}
        selectedAnalysisLayers={selectedAnalysisLayers}
        onToggleAnalysisLayer={toggleAnalysisLayer}
        selectedMetadataKeys={selectedMetadataKeys}
        onToggleMetadataKey={toggleMetadataKey}
        segmentOptions={segmentOptions}
        selectedSegmentIds={selectedSegmentIds}
        onToggleSegmentId={toggleSegmentId}
        selectedSegmentFields={selectedSegmentFields}
        onToggleSegmentFieldKey={toggleSegmentFieldKey}
      />

      <RemoveAllModal
        show={showRemoveAll}
        onConfirm={onRemoveAll}
        onCancel={() => setShowRemoveAll(false)}
      />

      <DeleteRowModal
        show={!!rowPendingDelete}
        rowName={rowPendingDelete ? rowPendingDelete.name : ''}
        onConfirm={onConfirmDeleteRow}
        onCancel={() => setRowPendingDelete(null)}
      />

      <NotesEditorModal
        show={!!notesEditing}
        value={notesEditing ? notesEditing.value : ''}
        onSave={(text) => {
          if (notesEditing) {
            setVariations((prev) => {
              const row = prev[notesEditing.uuid];
              if (!row) return prev;
              return upsertRow(prev, setMetadataField(row, 'notes', text));
            });
            markDirty();
          }
          setNotesEditing(null);
        }}
        onCancel={() => setNotesEditing(null)}
      />

      <AnalysesEditorModal
        show={!!analysesEditing}
        analyses={analyses}
        selectedIds={analysesEditing ? analysesEditing.ids : []}
        onSave={(ids) => {
          if (analysesEditing) {
            setVariations((prev) => {
              const row = prev[analysesEditing.uuid];
              if (!row) return prev;
              return upsertRow(prev, setMetadataField(row, 'analyses', ids));
            });
            markDirty();
          }
          setAnalysesEditing(null);
        }}
        onCancel={() => setAnalysesEditing(null)}
      />

      <AnalysesEditorModal
        show={!!layerAnalysesEditing}
        analyses={analyses}
        selectedIds={layerAnalysesEditing ? layerAnalysesEditing.ids : []}
        onSave={(ids) => {
          if (layerAnalysesEditing) {
            const { uuid, propertyKey } = layerAnalysesEditing;
            setVariations((prev) => {
              const row = prev[uuid];
              if (!row) return prev;
              return upsertRow(prev, setPropertyValue(row, propertyKey, ids));
            });
            markDirty();
          }
          setLayerAnalysesEditing(null);
        }}
        onCancel={() => setLayerAnalysesEditing(null)}
      />

      <HideColumnWarningModal
        show={!!hideColumnWarning}
        columnLabel={hideColumnWarning ? hideColumnWarning.label : ''}
        onConfirm={() => (hideColumnWarning ? hideColumnWarning.onConfirm() : setHideColumnWarning(null))}
        onCancel={() => setHideColumnWarning(null)}
      />
    </div>
  );
});

GenericElementVariations.displayName = 'GenericElementVariations';

GenericElementVariations.propTypes = {
  genericEl: PropTypes.object.isRequired,
  onDirty: PropTypes.func,
};

GenericElementVariations.defaultProps = {
  onDirty: null,
};

export default GenericElementVariations;
