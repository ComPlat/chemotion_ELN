import { set, cloneDeep } from 'lodash';
import { convertTemperature, convertDuration } from 'src/models/Reaction';
import { metPreConv as convertAmount } from 'src/utilities/metricPrefix';
import {
  updateVariationsRowOnReferenceMaterialChange,
  updateVariationsRowOnCatalystMaterialChange,
  getMaterialData, getMaterialColumnGroupChild, computeDerivedQuantitiesVariationsRow
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import {
  AnalysesCellRenderer, AnalysesCellEditor, getAnalysesOverlay, AnalysisOverlay
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsAnalyses';
import {
  PropertyFormatter, PropertyParser,
  MaterialFormatter, MaterialParser,
  SegmentFormatter, SegmentParser, SegmentRenderer, SegmentSelectEditor,
  EquivalentParser, GasParser, FeedstockParser,
  NoteCellRenderer, NoteCellEditor, MenuHeader, RowToolsCellRenderer, ToolHeader
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsComponents';
import UserStore from 'src/stores/alt/stores/UserStore';
import { getGenSI } from 'chem-generic-ui';

const PLACEHOLDER_CELL_TEXT = '_';
const REACTION_VARIATIONS_TAB_KEY = 'reactionVariationsTab';
const temperatureUnits = ['°C', 'K', '°F'];
const durationUnits = ['Second(s)', 'Minute(s)', 'Hour(s)', 'Day(s)', 'Week(s)'];
const massUnits = ['g', 'mg', 'μg'];
const volumeUnits = ['l', 'ml', 'μl'];
const amountUnits = ['mol', 'mmol'];
const concentrationUnits = ['ppm'];
const materialTypes = {
  startingMaterials: { label: 'Starting materials', reactionAttributeName: 'starting_materials' },
  reactants: { label: 'Reactants', reactionAttributeName: 'reactants' },
  products: { label: 'Products', reactionAttributeName: 'products' },
  solvents: { label: 'Solvents', reactionAttributeName: 'solvents' }
};
const cellDataTypes = {
  property: {
    extendsDataType: 'object',
    baseDataType: 'object',
    valueFormatter: PropertyFormatter,
    valueParser: PropertyParser,
  },
  material: {
    extendsDataType: 'object',
    baseDataType: 'object',
    valueFormatter: MaterialFormatter,
    valueParser: MaterialParser,
  },
  equivalent: {
    extendsDataType: 'object',
    baseDataType: 'object',
    valueFormatter: (params) => parseFloat(Number(params.value.equivalent.value).toPrecision(4)),
    valueParser: EquivalentParser,
  },
  yield: {
    extendsDataType: 'object',
    baseDataType: 'object',
    valueFormatter: (params) => parseFloat(Number(params.value.yield.value).toPrecision(4)),
  },
  gas: {
    extendsDataType: 'object',
    baseDataType: 'object',
    valueFormatter: MaterialFormatter,
    valueParser: GasParser,
  },
  feedstock: {
    extendsDataType: 'object',
    baseDataType: 'object',
    valueFormatter: MaterialFormatter,
    valueParser: FeedstockParser,
  },
  segment: {
    extendsDataType: 'object',
    baseDataType: 'object',
    valueFormatter: SegmentFormatter,
    valueParser: SegmentParser,
  },
};

function convertUnit(value, fromUnit, toUnit) {
  if (temperatureUnits.includes(fromUnit) && temperatureUnits.includes(toUnit)) {
    const convertedValue = convertTemperature(value, fromUnit, toUnit);
    if (toUnit === 'K' && convertedValue < 0) {
      return 0;
    }
    if (toUnit === '°C' && convertedValue < -273.15) {
      return -273.15;
    }
    if (toUnit === '°F' && convertedValue < -459.67) {
      return -459.67;
    }
    return convertedValue;
  }
  if (durationUnits.includes(fromUnit) && durationUnits.includes(toUnit)) {
    return convertDuration(value, fromUnit, toUnit);
  }
  if (massUnits.includes(fromUnit) && massUnits.includes(toUnit)) {
    const amountUnitPrefixes = { g: 'n', mg: 'm', μg: 'u' };
    return convertAmount(value, amountUnitPrefixes[fromUnit], amountUnitPrefixes[toUnit]);
  }
  if (volumeUnits.includes(fromUnit) && volumeUnits.includes(toUnit)) {
    const amountUnitPrefixes = { l: 'n', ml: 'm', μl: 'u' };
    return convertAmount(value, amountUnitPrefixes[fromUnit], amountUnitPrefixes[toUnit]);
  }
  if (amountUnits.includes(fromUnit) && amountUnits.includes(toUnit)) {
    const amountUnitPrefixes = { mol: 'n', mmol: 'm' };
    return convertAmount(value, amountUnitPrefixes[fromUnit], amountUnitPrefixes[toUnit]);
  }

  return value;
}

const convertGenericUnit = (value, fromUnit, toUnit, genericQuantity) => {
  const unitConfigs = getGenSI(genericQuantity);
  if (!unitConfigs || unitConfigs.length === 0) return null;

  const fromUnitConfig = unitConfigs.find((config) => config.key === fromUnit);
  const toUnitConfig = unitConfigs.find((config) => config.key === toUnit);
  if (!fromUnitConfig || !toUnitConfig) return null;

  return value * ((toUnitConfig.nm ?? 1) / (fromUnitConfig.nm ?? 1));
};

function getStandardUnits(entry) {
  switch (entry) {
    case 'volume':
      return volumeUnits;
    case 'mass':
      return massUnits;
    case 'amount':
      return amountUnits;
    case 'temperature':
      return temperatureUnits;
    case 'duration':
      return durationUnits;
    case 'concentration':
      return concentrationUnits;
    default:
      return [null];
  }
}

function getGenericStandardUnits(genericQuantity) {
  const unitConfigs = getGenSI(genericQuantity);
  if (!unitConfigs || unitConfigs.length === 0) return [null];
  return unitConfigs.map((config) => config.key);
}

function getUserFacingUnit(unit) {
  switch (unit) {
    case 'Second(s)':
      return 's';
    case 'Minute(s)':
      return 'm';
    case 'Hour(s)':
      return 'h';
    case 'Day(s)':
      return 'd';
    case 'Week(s)':
      return 'w';
    default:
      return unit;
  }
}

function getInternalUnit(unit) {
  switch (unit) {
    case 's':
      return 'Second(s)';
    case 'm':
      return 'Minute(s)';
    case 'h':
      return 'Hour(s)';
    case 'd':
      return 'Day(s)';
    case 'w':
      return 'Week(s)';
    default:
      return unit;
  }
}

function getStandardValue(entry, material) {
  switch (entry) {
    case 'volume':
      return material.amount_l ?? null;
    case 'mass':
      return material.amount_g ?? null;
    case 'amount':
      return material.amount_mol ?? null;
    case 'equivalent':
      return (material.reference ?? false) ? 1 : 0;
    case 'temperature': {
      const { value = null, unit = null } = material.gas_phase_data?.temperature ?? {};
      return convertUnit(value, unit, getStandardUnits('temperature')[0]);
    }
    case 'duration': {
      const { value = null, unit = null } = material.gas_phase_data?.time ?? {};
      return convertUnit(value, getInternalUnit(unit), getStandardUnits('duration')[0]);
    }
    case 'concentration':
      return material.gas_phase_data?.part_per_million ?? null;
    case 'turnoverNumber':
      return material.gas_phase_data?.turnover_number ?? null;
    case 'turnoverFrequency':
      return material.gas_phase_data?.turnover_frequency?.value ?? null;
    default:
      return null;
  }
}

function parseGenericEntryName(entry) {
  const genericEntryMatch = entry.match(/(?:layer<([^>]*)>)?(?:field<([^>]*)>)?/);
  if ((genericEntryMatch[1] || genericEntryMatch[2])) {
    return { layer: genericEntryMatch[1], field: genericEntryMatch[2] };
  }
  return null;
}

function getCellDataType(entry, gasType = 'off') {
  if (parseGenericEntryName(entry)) {
    return 'segment';
  }
  switch (entry) {
    case 'temperature':
    case 'duration':
      return gasType === 'off' ? 'property' : 'gas';
    case 'equivalent':
      return gasType === 'feedstock' ? 'feedstock' : 'equivalent';
    case 'mass':
    case 'volume':
    case 'amount':
      switch (gasType) {
        case 'feedstock':
          return 'feedstock';
        case 'gas':
          return 'gas';
        default:
          return 'material';
      }
    case 'concentration':
    case 'turnoverNumber':
    case 'turnoverFrequency':
      return 'gas';
    case 'yield':
      return 'yield';
    default:
      return null;
  }
}

function getEntryDefs(entries) {
  return entries.reduce((defs, entry) => {
    defs[entry] = {
      isMain: entry === entries[0],
      isSelected: entry === entries[0],
      displayUnit: getStandardUnits(entry)[0],
      units: getStandardUnits(entry),
    };
    return defs;
  }, {});
}

function getGenericEntryDefs(segment) {
  return Object.entries(segment).reduce((defs, [entryKey, entry]) => {
    defs[entryKey] = {
      isMain: entryKey === Object.keys(segment)[0],
      isSelected: entryKey === Object.keys(segment)[0],
      displayUnit: entry.value_system || null,
      units: entry.type === 'system-defined' ? getGenericStandardUnits(entry.option_layers) : [null],
    };
    return defs;
  }, {});
}

function getCurrentEntry(entryDefs) {
  return Object.keys(entryDefs).find((key) => entryDefs[key].isMain) || null;
}

function getUserFacingEntryName(entry) {
  const genericEntryMatch = parseGenericEntryName(entry);
  if (genericEntryMatch) {
    return `layer: ${genericEntryMatch.layer}, field: ${genericEntryMatch.field}`;
  }

  return entry.split(/(?=[A-Z])/).join(' ').toLowerCase(); // E.g., 'turnoverNumber' -> 'turnover number'
}

function getVariationsRowName(reactionLabel, variationsRowId) {
  return `${reactionLabel}-${variationsRowId}`;
}

function getSequentialId(variations) {
  const ids = variations.map((row) => (row.id));
  return (ids.length === 0) ? 1 : Math.max(...ids) + 1;
}

function getPropertyData(propertyType, durationValue, durationUnit, temperatureValue, temperatureUnit) {
  switch (propertyType) {
    case 'temperature':
      return {
        value: convertUnit(temperatureValue, temperatureUnit, getStandardUnits('temperature')[0]),
        unit: getStandardUnits('temperature')[0]
      };
    case 'duration':
      return {
        value: convertUnit(durationValue, durationUnit, getStandardUnits('duration')[0]),
        unit: getStandardUnits('duration')[0],
      };
    default:
      return { value: null, unit: null };
  }
}

function getMetaData(metadataType) {
  switch (metadataType) {
    case 'analyses':
      return [];
    case 'notes':
      return '';
    default:
      return null;
  }
}

function getSegmentData(segment) {
  return Object.fromEntries(
    Object.entries(segment).map(([layerField, layerFieldData]) => [
      layerField,
      {
        type: layerFieldData.type,
        label: layerFieldData.label,
        ...(layerFieldData.options && { options: layerFieldData.options.map((option) => option.label) }),
        value: layerFieldData.options ? layerFieldData.options[0].label : null,
        unit: layerFieldData.value_system || null,
        quantity: layerFieldData.option_layers || null,
      }
    ])
  );
}

function createVariationsRow({
  materials,
  segments,
  selectedColumns,
  variations,
  reactionHasPolymers = false,
  durationValue = null,
  durationUnit = 'None',
  temperatureValue = null,
  temperatureUnit = 'None',
  gasMode = false,
  vesselVolume = null
}) {
  const row = {
    id: getSequentialId(variations),
    properties: Object.fromEntries(
      selectedColumns.properties.map((propertyType) => [propertyType, getPropertyData(
        propertyType,
        durationValue,
        durationUnit,
        temperatureValue,
        temperatureUnit
      )])
    ),
    metadata: Object.fromEntries(
      selectedColumns.metadata.map((metadataType) => [metadataType, getMetaData(metadataType)])
    ),
    segments: Object.fromEntries(
      selectedColumns.segments.map((segmentLabel) => [segmentLabel, getSegmentData(segments[segmentLabel])])
    ),
  };
  Object.keys(materialTypes).forEach((materialType) => {
    row[materialType] = {};
    selectedColumns[materialType].forEach((materialID) => {
      const material = materials[materialType].find((m) => m.id.toString() === materialID.toString());
      row[materialType][materialID] = getMaterialData(material, materialType, gasMode, vesselVolume);
    });
  });

  // Compute dependent values that aren't supplied by initial data.
  return computeDerivedQuantitiesVariationsRow(row, reactionHasPolymers, gasMode);
}

function copyVariationsRow(row, variations) {
  const copiedRow = cloneDeep(row);
  copiedRow.id = getSequentialId(variations);
  copiedRow.uuid = undefined; // UUID is generated server-side.
  if (Object.hasOwn(copiedRow.metadata, 'notes')) {
    copiedRow.metadata.notes = getMetaData('notes');
  }
  if (Object.hasOwn(copiedRow.metadata, 'analyses')) {
    copiedRow.metadata.analyses = getMetaData('analyses');
  }

  return copiedRow;
}

function updateVariationsRow(row, field, value, reactionHasPolymers) {
  /*
  Some attributes of a material need to be updated in response to changes in other attributes:

  attribute         | needs to be updated in response to change in
  ------------------|---------------------------------------------
  volume            | equivalent^, mass^, amount^, concentration^, temperature^
  mass              | amount^, equivalent^, concentration^, temperature^, volume^
  amount            | mass^, equivalent^, concentration^, temperature^, volume^
  equivalent        | mass^, amount^, volume^, reference material's mass~, reference material's amount~, reference material's volume~
  yield             | mass^, amount^x, concentration^, temperature^, volume^, reference material's mass~, reference material's amount~, reference material's volume~
  turnoverNumber    | concentration^, temperature^, catalyst material's amount~
  turnoverFrequency | concentration^, temperature^, duration^, turnoverNumber^, catalyst material's amount~

  ^: handled in cell parsers (changes within single material)
  ~: handled here (row-wide changes across materials)
  ^x: not permitted according to business logic
  */
  let updatedRow = cloneDeep(row);
  set(updatedRow, field, value);
  if (value.aux?.isReference) {
    updatedRow = updateVariationsRowOnReferenceMaterialChange(updatedRow, reactionHasPolymers);
  }
  if (value.aux?.gasType === 'catalyst') {
    updatedRow = updateVariationsRowOnCatalystMaterialChange(updatedRow);
  }

  return updatedRow;
}

function addMissingColumnsToVariations({
  materials,
  segments,
  selectedColumns,
  variations,
  reactionHasPolymers = false,
  durationValue = null,
  durationUnit = 'None',
  temperatureValue = null,
  temperatureUnit = 'None',
  gasMode = false,
  vesselVolume = null
}) {
  const updatedVariations = cloneDeep(variations);
  updatedVariations.forEach((row) => {
    Object.entries(selectedColumns).forEach(([columnGroupID, columnGroupChildIDs]) => {
      columnGroupChildIDs.forEach((childID) => {
        if (row[columnGroupID][childID]) { return; }

        if (Object.keys(materialTypes).includes(columnGroupID)) {
          const material = materials[columnGroupID].find((m) => m.id.toString() === childID.toString());
          row[columnGroupID][childID] = getMaterialData(
            material,
            columnGroupID,
            gasMode,
            vesselVolume
          );
        }
        if (columnGroupID === 'properties') {
          row.properties[childID] = getPropertyData(
            childID,
            durationValue,
            durationUnit,
            temperatureValue,
            temperatureUnit
          );
        }
        if (columnGroupID === 'metadata') {
          row.metadata[childID] = getMetaData(childID);
        }
        if (columnGroupID === 'segments') {
          row[columnGroupID][childID] = getSegmentData(segments[childID]);
        }
      });
    });
    return computeDerivedQuantitiesVariationsRow(row, reactionHasPolymers, gasMode);
  });

  return updatedVariations;
}

function removeObsoleteColumnsFromVariations(variations, selectedColumns) {
  const updatedVariations = cloneDeep(variations);
  updatedVariations.forEach((row) => {
    Object.entries(selectedColumns).forEach(([columnGroupID, columnGroupChildIDs]) => {
      row[columnGroupID] = Object.fromEntries(
        Object.entries(row[columnGroupID]).filter(([key, value]) => columnGroupChildIDs.includes(key))
      );
    });
  });

  return updatedVariations;
}

function getPropertyColumnGroupChild(propertyType, gasMode, externalEntryDefs = undefined) {
  switch (propertyType) {
    case 'temperature':
      return {
        field: 'properties.temperature',
        cellDataType: getCellDataType('temperature'),
        entryDefs: externalEntryDefs || getEntryDefs(['temperature']),
        headerComponent: MenuHeader,
        headerComponentParams: {
          names: ['T'],
        }
      };
    case 'duration':
      return {
        field: 'properties.duration',
        cellDataType: getCellDataType('duration'),
        editable: !gasMode,
        entryDefs: externalEntryDefs || getEntryDefs(['duration']),
        headerComponent: MenuHeader,
        headerComponentParams: {
          names: ['t'],
        }
      };
    default:
      return {};
  }
}

function getMetadataColumnGroupChild(metadataType) {
  switch (metadataType) {
    case 'notes':
      return {
        headerName: 'Notes',
        field: 'metadata.notes',
        cellRenderer: NoteCellRenderer,
        sortable: false,
        cellDataType: 'text',
        cellEditor: NoteCellEditor,
      };
    case 'analyses':
      return {
        headerName: 'Analyses',
        field: 'metadata.analyses',
        tooltipValueGetter: getAnalysesOverlay,
        tooltipComponent: AnalysisOverlay,
        cellRenderer: AnalysesCellRenderer,
        cellEditor: AnalysesCellEditor,
        cellDataType: false,
        sortable: false,
      };
    default:
      return {};
  }
}

function getSegmentEditor({ colDef: { entryDefs }, value: cellData }) {
  const currentEntry = getCurrentEntry(entryDefs);
  switch (cellData[currentEntry].type) {
    case 'select':
      return { component: SegmentSelectEditor };
    case 'integer':
    case 'text':
    case 'system-defined':
    default:
      return { component: 'agTextCellEditor' };
  }
}

function getSegmentColumnGroupChild(segmentLabel, segment, externalEntryDefs = undefined) {
  return {
    field: `segments.${segmentLabel}`,
    headerComponent: MenuHeader,
    headerComponentParams: {
      names: [segmentLabel],
    },
    entryDefs: externalEntryDefs || getGenericEntryDefs(segment),
    cellDataType: 'segment',
    cellRenderer: SegmentRenderer,
    cellEditorSelector: (params) => getSegmentEditor(params),
  };
}

function addMissingColumnDefinitions(columnDefinitions, selectedColumns, materials, segments, gasMode) {
  const updatedColumnDefinitions = cloneDeep(columnDefinitions);

  Object.entries(selectedColumns).forEach(([columnGroupID, columnGroupChildIDs]) => {
    const columnGroup = updatedColumnDefinitions.find(
      (currentColumnGroup) => currentColumnGroup.groupId === columnGroupID
    );
    columnGroupChildIDs.forEach((childID) => {
      if (columnGroup.children.some((child) => child.field === `${columnGroupID}.${childID}`)) {
        return;
      }

      if (Object.keys(materialTypes).includes(columnGroupID)) {
        const material = materials[columnGroupID].find((m) => m.id.toString() === childID.toString());
        columnGroup.children.push(getMaterialColumnGroupChild(material, columnGroupID, gasMode));
      }
      if (columnGroupID === 'properties') {
        columnGroup.children.push(getPropertyColumnGroupChild(childID, gasMode));
      }
      if (columnGroupID === 'metadata') {
        columnGroup.children.push(getMetadataColumnGroupChild(childID));
      }
      if (columnGroupID === 'segments') {
        columnGroup.children.push(getSegmentColumnGroupChild(childID, segments[childID]));
      }
    });
  });

  return updatedColumnDefinitions;
}

function removeObsoleteColumnDefinitions(columnDefinitions, selectedColumns) {
  const updatedColumnDefinitions = cloneDeep(columnDefinitions);

  Object.entries(selectedColumns).forEach(([columnGroupID, columnGroupChildIDs]) => {
    const columnGroup = updatedColumnDefinitions.find(
      (currentColumnGroup) => currentColumnGroup.groupId === columnGroupID
    );

    columnGroup.children = columnGroup.children.filter((child) => {
      const childID = child.field.split('.').splice(1).join('.'); // Ensure that IDs that contain "." are handled correctly.
      return columnGroupChildIDs.includes(childID);
    });
  });

  return updatedColumnDefinitions;
}

function updateColumnDefinitions(columnDefinitions, field, property, newValue) {
  const updatedColumnDefinitions = cloneDeep(columnDefinitions);

  updatedColumnDefinitions.forEach((columnDefinition) => {
    if (columnDefinition.groupId) {
      // Column group.
      if (columnDefinition.groupId === field) {
        columnDefinition[property] = newValue;
      } else {
        columnDefinition.children.forEach((child) => {
          if (child.field === field) {
            child[property] = newValue;
          }
        });
      }
    } else if (columnDefinition.field === field) {
      // Single column.
      columnDefinition[property] = newValue;
    }
  });

  return updatedColumnDefinitions;
}

function getColumnDefinitions(selectedColumns, materials, segments, gasMode, externalEntryDefs = {}) {
  return [
    {
      headerComponent: ToolHeader,
      cellRenderer: RowToolsCellRenderer,
      lockPosition: 'left',
      sortable: false,
      maxWidth: 100,
      cellDataType: false,
      rowDrag: true,

    },
    {
      headerName: 'Metadata',
      groupId: 'metadata',
      marryChildren: true,
      children: selectedColumns.metadata.map((entry) => getMetadataColumnGroupChild(entry))
    },
    {
      headerName: 'Properties',
      groupId: 'properties',
      marryChildren: true,
      children: selectedColumns.properties.map(
        (entry) => getPropertyColumnGroupChild(entry, gasMode, externalEntryDefs[`properties.${entry}`])
      )
    },
    {
      headerName: 'Generic Segments',
      groupId: 'segments',
      children: selectedColumns.segments.map(
        (entry) => getSegmentColumnGroupChild(entry, segments[entry], externalEntryDefs[`segments.${entry}`])
      )
    }
  ].concat(
    Object.entries(materialTypes).map(([materialType, { label }]) => ({
      headerName: label,
      groupId: materialType,
      marryChildren: true,
      autoHeaderHeight: true,
      wrapHeaderText: true,
      children: selectedColumns[materialType].map(
        (materialID) => getMaterialColumnGroupChild(
          materials[materialType].find((material) => material.id.toString() === materialID),
          materialType,
          gasMode,
          externalEntryDefs[`${materialType}.${materialID}`]
        )
      )
    }))
  );
}

function getVariationsColumns(variations) {
  const variationsRow = variations[0];
  const materialColumns = Object.entries(materialTypes).reduce((materialsByType, [materialType]) => {
    materialsByType[materialType] = Object.keys(variationsRow ? variationsRow[materialType] : []);
    return materialsByType;
  }, {});
  const propertyColumns = Object.keys(variationsRow ? variationsRow.properties : {});
  const metadataColumns = Object.keys(variationsRow ? variationsRow.metadata : {});
  const segmentColumns = Object.keys(variationsRow ? variationsRow.segments : {});

  return {
    ...materialColumns, properties: propertyColumns, metadata: metadataColumns, segments: segmentColumns
  };
}

function getGridStateId(reactionId) {
  const { currentUser } = UserStore.getState();
  return `user${currentUser.id}-reaction${reactionId}-reactionVariationsGridState`;
}

function getEntryDefinitionsId(reactionId) {
  const { currentUser } = UserStore.getState();
  return `user${currentUser.id}-reaction${reactionId}-reactionVariationsEntryDefinitions`;
}

function getInitialGridState(reactionId) {
  return JSON.parse(localStorage.getItem(getGridStateId(reactionId))) || {};
}

function getInitialEntryDefinitions(reactionId) {
  return JSON.parse(localStorage.getItem(getEntryDefinitionsId(reactionId))) || {};
}

const persistTableLayout = (reactionId, event, columnDefinitions) => {
  const { state: gridState } = event;
  localStorage.setItem(getGridStateId(reactionId), JSON.stringify(gridState));

  const entryDefs = {};
  function extractEntryDefs(items) {
    items.forEach((item) => {
      if (item.field) {
        entryDefs[item.field] = item.entryDefs || {};
      }
      if (item.children && Array.isArray(item.children)) {
        extractEntryDefs(item.children);
      }
    });
  }
  extractEntryDefs(columnDefinitions);

  localStorage.setItem(getEntryDefinitionsId(reactionId), JSON.stringify(entryDefs));
};

function formatReactionSegments(segments) {
  return segments.reduce((acc, segment) => {
    const segmentLabel = segment.label;
    const layers = segment.properties_release?.layers ?? {};

    Object.values(layers).forEach((layer) => {
      const layerKey = layer.key;

      (layer.fields ?? [])
        .filter((field) => ['integer', 'system-defined', 'select', 'text'].includes(field.type))
        .forEach((field) => {
          const entryKey = `layer<${layerKey}>field<${field.field}>`;
          acc[segmentLabel] ??= {};
          acc[segmentLabel][entryKey] ??= {};
          acc[segmentLabel][entryKey] = field;

          if (field.type === 'select') {
            acc[segmentLabel][entryKey].options = segment.properties_release?.select_options?.[
              field.option_layers
            ]?.options ?? [];
          }
        });
    });

    return acc;
  }, {});
}

async function getReactionSegments(reaction) {
  try {
    const segments = UserStore.getState().segmentKlasses || [];
    const segmentLabels = new Set(
      segments
        .filter((s) => s.element_klass.name === 'reaction' && s.is_active)
        .map((s) => s.label)
    ); // Segments that can be added to a reaction.
    const selectedSegmentLabels = new Set(
      (reaction?.segments ?? []).map((s) => s.klass_label)
    ); // Segment that are currently added to the reaction.
    // We want the segments that are currently added to the reaction to occur in the selection first,
    // followed by the segments that could be added to a reaction, but aren't currently added to the reaction.
    const orderedSegmentLabels = [
      ...selectedSegmentLabels,
      ...[...segmentLabels].filter((label) => !selectedSegmentLabels.has(label))
    ];
    const orderedSegments = orderedSegmentLabels.map(
      (label) => segments.find((segment) => segment.label === label)
    ).filter(Boolean);

    return formatReactionSegments(orderedSegments);
  } catch (error) {
    console.error('Error fetching segments:', error);
    return {};
  }
}

export {
  massUnits,
  volumeUnits,
  amountUnits,
  temperatureUnits,
  durationUnits,
  concentrationUnits,
  getStandardUnits,
  convertUnit,
  convertGenericUnit,
  materialTypes,
  cellDataTypes,
  getVariationsRowName,
  getVariationsColumns,
  createVariationsRow,
  copyVariationsRow,
  updateVariationsRow,
  updateColumnDefinitions,
  getColumnDefinitions,
  getCellDataType,
  getUserFacingUnit,
  getStandardValue,
  addMissingColumnsToVariations,
  removeObsoleteColumnsFromVariations,
  addMissingColumnDefinitions,
  removeObsoleteColumnDefinitions,
  getMetadataColumnGroupChild,
  getPropertyColumnGroupChild,
  PLACEHOLDER_CELL_TEXT,
  REACTION_VARIATIONS_TAB_KEY,
  getInitialGridState,
  getInitialEntryDefinitions,
  persistTableLayout,
  getEntryDefs,
  getCurrentEntry,
  getUserFacingEntryName,
  getReactionSegments,
  parseGenericEntryName,
  getSegmentData,
  formatReactionSegments
};
