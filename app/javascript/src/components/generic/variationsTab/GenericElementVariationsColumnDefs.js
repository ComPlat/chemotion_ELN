import {
  METADATA_LABELS,
  layerAnalysesPropertyKey,
  propertyColKey,
  segmentColKey,
} from 'src/components/generic/variationsTab/GenericElementVariationsUtils';
import {
  ActionsCellRenderer,
  AnalysesCellRenderer,
  LayerAnalysesCellRenderer,
  MetadataHeader,
  NotesCellRenderer,
  PropertyHeader,
  SegmentGroupHeader,
  SegmentLeafHeader,
  SegmentPlaceholderRenderer,
  multiSelectColumnAttrs,
  selectColumnAttrs,
} from 'src/components/generic/variationsTab/GenericElementVariationsGridComponents';

// Builds the ag-grid columnDefs array for GenericElementVariations. Pure: all
// state and callbacks are passed in via `deps` so the grid layout stays free of
// component internals.
const buildColumnDefs = (deps) => {
  const {
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
  } = deps;

  const defs = [];

  defs.push({
    headerName: '',
    colId: '__actions',
    pinned: 'left',
    width: widthFor('__actions', 56),
    minWidth: 56,
    editable: false,
    sortable: false,
    resizable: false,
    suppressMovable: true,
    valueGetter: () => null,
    cellRenderer: ActionsCellRenderer,
    cellRendererParams: {
      onDuplicate: onDuplicateRow,
      onDelete: onRequestDeleteRow,
    },
  });

  defs.push({
    headerName: 'Variation',
    colId: '__variation',
    pinned: 'left',
    width: widthFor('__variation', 160),
    minWidth: 120,
    editable: true,
    rowDrag: true,
    suppressMovable: true,
    valueGetter: (p) => (p.data ? p.data.name : ''),
  });

  const buildPropertiesGroup = () => {
    if (selectedPropertyKeys.length === 0 && selectedAnalysisLayers.length === 0) return null;
    const propsByLayer = {};
    const layerOrder = [];
    const layerLabels = {};
    const ensureLayer = (layerKey, label) => {
      if (!(layerKey in propsByLayer)) {
        propsByLayer[layerKey] = [];
        layerOrder.push(layerKey);
        layerLabels[layerKey] = label || layerKey;
      }
    };
    selectedPropertyKeys.forEach((k) => {
      const opt = propertyColumnLookup[k];
      const layerKey = opt?.layerKey || '__nolayer';
      ensureLayer(layerKey, opt?.layerLabel);
      propsByLayer[layerKey].push(k);
    });
    selectedAnalysisLayers.forEach((layerKey) => {
      ensureLayer(layerKey, analysisLayerLookup[layerKey]?.layerLabel);
    });
    const propertyGroups = layerOrder.map((layerKey) => {
      const leaves = propsByLayer[layerKey].map((k) => {
        const opt = propertyColumnLookup[k];
        const unitsInfo = opt?.units;
        let selectAttrs = null;
        if (opt?.fieldType === 'select') {
          selectAttrs = selectColumnAttrs(opt?.selectOptions);
        } else if (opt?.fieldType === 'select-multi') {
          selectAttrs = multiSelectColumnAttrs(opt?.selectOptions, opt?.fieldLabel);
        }
        return {
          headerName: opt?.fieldLabel || opt?.fieldKey || k,
          colId: `prop:${k}`,
          editable: true,
          width: widthFor(`prop:${k}`, 120),
          minWidth: 90,
          valueGetter: (p) => (p.data && p.data.properties && p.data.properties[k] && p.data.properties[k].value) ?? '',
          headerComponent: PropertyHeader,
          headerComponentParams: {
            fieldLabel: opt?.fieldLabel || opt?.fieldKey || k,
            propertyKey: k,
            unitsInfo,
            currentUnit: getCurrentUnit(propertyColKey(k), unitsInfo),
            onToggleUnit: toggleUnitForPropertyCol,
          },
          ...(selectAttrs || {}),
        };
      });
      if (selectedAnalysisLayers.includes(layerKey)) {
        const analysesKey = layerAnalysesPropertyKey(layerKey);
        leaves.push({
          headerName: 'Link Analyses',
          colId: `prop:${analysesKey}`,
          editable: false,
          width: widthFor(`prop:${analysesKey}`, 200),
          minWidth: 160,
          valueGetter: (p) => {
            const cell = p.data && p.data.properties && p.data.properties[analysesKey];
            return Array.isArray(cell?.value) ? cell.value : [];
          },
          headerComponent: PropertyHeader,
          headerComponentParams: {
            fieldLabel: 'Link Analyses',
            propertyKey: analysesKey,
            unitsInfo: null,
            currentUnit: '',
            onToggleUnit: () => {},
          },
          cellRenderer: LayerAnalysesCellRenderer,
          cellRendererParams: {
            analyses,
            propertyKey: analysesKey,
            onEdit: (uuid, key, ids) => setLayerAnalysesEditing({ uuid, propertyKey: key, ids }),
          },
        });
      }
      return {
        headerName: layerLabels[layerKey],
        groupId: `lyr:${layerKey}`,
        marryChildren: true,
        headerGroupComponent: SegmentGroupHeader,
        headerGroupComponentParams: { displayName: layerLabels[layerKey] },
        children: leaves,
      };
    });
    return {
      headerName: 'Properties',
      groupId: 'properties',
      marryChildren: true,
      headerGroupComponent: SegmentGroupHeader,
      headerGroupComponentParams: { displayName: 'Properties' },
      children: propertyGroups,
    };
  };

  const buildMetadataGroup = () => {
    if (selectedMetadataKeys.length === 0) return null;
    const metadataLeaves = selectedMetadataKeys.map((field) => {
      const baseParams = {
        headerName: METADATA_LABELS[field] || field,
        colId: `meta:${field}`,
        headerComponent: MetadataHeader,
        headerComponentParams: { displayName: METADATA_LABELS[field] || field, field },
      };
      if (field === 'notes') {
        return {
          ...baseParams,
          editable: false,
          width: widthFor(`meta:${field}`, 200),
          minWidth: 160,
          cellRenderer: NotesCellRenderer,
          cellRendererParams: {
            onEdit: (uuid, value) => setNotesEditing({ uuid, value }),
          },
        };
      }
      if (field === 'analyses') {
        return {
          ...baseParams,
          editable: false,
          width: widthFor(`meta:${field}`, 200),
          minWidth: 160,
          cellRenderer: AnalysesCellRenderer,
          cellRendererParams: {
            analyses,
            onEdit: (uuid, ids) => setAnalysesEditing({ uuid, ids }),
          },
        };
      }
      return {
        ...baseParams,
        editable: true,
        width: widthFor(`meta:${field}`, 120),
        minWidth: 90,
        valueGetter: (p) => (p.data && p.data.metadata && p.data.metadata[field]) ?? '',
      };
    });
    return {
      headerName: 'Metadata',
      groupId: 'metadata',
      marryChildren: true,
      headerGroupComponent: SegmentGroupHeader,
      headerGroupComponentParams: { displayName: 'Metadata' },
      children: metadataLeaves,
    };
  };

  const buildSegmentsGroup = () => {
    if (selectedSegmentIds.length === 0) return null;
    const segChildren = [];
    selectedSegmentIds.forEach((id) => {
      const seg = segmentOptions.find((s) => s.klassId === id);
      const fieldKeys = selectedSegmentFields[id] || [];
      const segGroupLabel = seg?.label || `Segment ${id}`;
      const children = [];
      if (fieldKeys.length === 0) {
        children.push({
          headerName: '(no fields selected)',
          colId: `seg:${id}:__placeholder`,
          editable: false,
          width: widthFor(`seg:${id}:__placeholder`, 180),
          minWidth: 140,
          cellRenderer: SegmentPlaceholderRenderer,
          cellRendererParams: { segmentKlassId: id, onSnapshot: onSnapshotSegment },
        });
      } else {
        fieldKeys.forEach((fk) => {
          const opt = seg?.fieldOptions?.find((o) => o.fieldKey === fk);
          const unitsInfo = opt?.units;
          let selectAttrs = null;
          if (opt?.fieldType === 'select') {
            selectAttrs = selectColumnAttrs(opt?.selectOptions);
          } else if (opt?.fieldType === 'select-multi') {
            selectAttrs = multiSelectColumnAttrs(opt?.selectOptions, opt?.fieldLabel);
          }
          children.push({
            headerName: opt?.fieldLabel || fk,
            colId: `seg:${id}:${fk}`,
            editable: true,
            width: widthFor(`seg:${id}:${fk}`, 120),
            minWidth: 90,
            valueGetter: (p) => (p.data && p.data.segments && p.data.segments[id] && p.data.segments[id][fk]) ?? '',
            headerComponent: SegmentLeafHeader,
            headerComponentParams: {
              layerLabel: opt?.layerLabel || opt?.layerKey || '',
              fieldLabel: opt?.fieldLabel || fk,
              segmentKlassId: id,
              fieldKey: fk,
              unitsInfo,
              currentUnit: getCurrentUnit(segmentColKey(id, fk), unitsInfo),
              onToggleUnit: toggleUnitForSegmentCol,
            },
            ...(selectAttrs || {}),
          });
        });
      }
      segChildren.push({
        headerName: segGroupLabel,
        groupId: `seg:${id}`,
        marryChildren: true,
        headerGroupComponent: SegmentGroupHeader,
        headerGroupComponentParams: { displayName: segGroupLabel },
        children,
      });
    });
    return {
      headerName: 'Segments',
      groupId: 'segments',
      marryChildren: true,
      headerGroupComponent: SegmentGroupHeader,
      headerGroupComponentParams: { displayName: 'Segments' },
      children: segChildren,
    };
  };

  const builders = {
    properties: buildPropertiesGroup,
    metadata: buildMetadataGroup,
    segments: buildSegmentsGroup,
  };
  const order = (groupOrder && groupOrder.length > 0)
    ? groupOrder
    : ['properties', 'metadata', 'segments'];
  ['properties', 'metadata', 'segments'].forEach((g) => {
    if (!order.includes(g)) order.push(g);
  });
  order.forEach((g) => {
    const def = builders[g] && builders[g]();
    if (def) defs.push(def);
  });

  return defs;
};

export default buildColumnDefs;
