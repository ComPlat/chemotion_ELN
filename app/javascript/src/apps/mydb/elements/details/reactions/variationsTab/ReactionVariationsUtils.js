import { set, cloneDeep } from 'lodash';
import { convertTemperature, convertDuration } from 'src/models/Reaction';
import { metPreConv as convertAmount } from 'src/utilities/metricPrefix';
import {
  updateVariationsRowOnReferenceMaterialChange,
  updateVariationsRowOnCatalystMaterialChange,
  getMaterialData, getMaterialColumnGroupChild, computeDerivedQuantitiesVariationsRow,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import {
  AnalysesCellRenderer, AnalysesCellEditor, getAnalysesOverlay, AnalysisOverlay,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsAnalyses';
import {
  PropertyFormatter, PropertyParser,
  MaterialFormatter, MaterialParser,
  SegmentFormatter, SegmentParser,
  EquivalentParser, GasParser, FeedstockParser,
  NoteCellRenderer, NoteCellEditor, RowToolsCellRenderer
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsComponents';
import {
  MenuHeader, SectionMenuHeader
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsTableHeader';
import UserStore from 'src/stores/alt/stores/UserStore';
import GenericSgsFetcher from 'src/fetchers/GenericSgsFetcher';

const REACTION_VARIATIONS_TAB_KEY = 'reactionVariationsTab';
const temperatureUnits = ['°C', 'K', '°F'];
const durationUnits = ['Second(s)', 'Minute(s)', 'Hour(s)', 'Day(s)', 'Week(s)'];
const massUnits = ['g', 'mg', 'μg'];
const volumeUnits = ['l', 'ml', 'μl'];
const amountUnits = ['mol', 'mmol'];
const concentrationUnits = ['ppm'];
const materialTypes = {
  startingMaterials: {
    label: 'Starting materials',
    reactionAttributeName: 'starting_materials',
  },
  reactants: {
    label: 'Reactants',
    reactionAttributeName: 'reactants',
  },
  products: {
    label: 'Products',
    reactionAttributeName: 'products',
  },
  solvents: {
    label: 'Solvents',
    reactionAttributeName: 'solvents',
  },
};
const cellDataTypes = {
  property: {
    extendsDataType: 'object',
    baseDataType: 'object',
    valueFormatter: PropertyFormatter,
    valueParser: PropertyParser,
  },
  segmentData: {
    extendsDataType: 'object',
    baseDataType: 'object',
    valueFormatter: SegmentFormatter,
    valueParser: SegmentParser,
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
};

let segmentsForVariations = null;

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
    const amountUnitPrefixes = {
      g: 'n',
      mg: 'm',
      μg: 'u',
    };
    return convertAmount(value, amountUnitPrefixes[fromUnit], amountUnitPrefixes[toUnit]);
  }
  if (volumeUnits.includes(fromUnit) && volumeUnits.includes(toUnit)) {
    const amountUnitPrefixes = {
      l: 'n',
      ml: 'm',
      μl: 'u',
    };
    return convertAmount(value, amountUnitPrefixes[fromUnit], amountUnitPrefixes[toUnit]);
  }
  if (amountUnits.includes(fromUnit) && amountUnits.includes(toUnit)) {
    const amountUnitPrefixes = {
      mol: 'n',
      mmol: 'm',
    };
    return convertAmount(value, amountUnitPrefixes[fromUnit], amountUnitPrefixes[toUnit]);
  }

  return value;
}

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
      const {
        value = null,
        unit = null,
      } = material.gas_phase_data?.temperature ?? {};
      return convertUnit(value, unit, getStandardUnits('temperature')[0]);
    }
    case 'duration': {
      const {
        value = null,
        unit = null,
      } = material.gas_phase_data?.time ?? {};
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

function getCellDataType(entry, gasType = 'off') {
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
      displayUnit: getStandardUnits(entry)[0]
    };
    return defs;
  }, {});
}

function getCurrentEntry(entryDefs) {
  return Object.keys(entryDefs).find((key) => entryDefs[key].isMain) || null;
}

function getUserFacingEntryName(entry) {
  // E.g., 'turnoverNumber' -> 'turnover number'
  return entry.split(/(?=[A-Z])/).join(' ').toLowerCase();
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
        unit: getStandardUnits('temperature')[0],
      };
    case 'duration':
      return {
        value: convertUnit(durationValue, durationUnit, getStandardUnits('duration')[0]),
        unit: getStandardUnits('duration')[0],
      };
    default:
      return {
        value: null,
        unit: null,
      };
  }
}

function getSegmentData(type, value) {
  if (type === 'select') {
    return value;
  }
  return {
    value,
  };
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

function createVariationsRow({
  materials,
  selectedColumns,
  variations,
  segments,
  reactionHasPolymers = false,
  durationValue = null,
  durationUnit = 'None',
  temperatureValue = null,
  temperatureUnit = 'None',
  gasMode = false,
  vesselVolume = null,
}) {
  const row = {
    id: getSequentialId(variations),
    properties: Object.fromEntries(
      selectedColumns.properties.map((propertyType) => [propertyType, getPropertyData(
        propertyType,
        durationValue,
        durationUnit,
        temperatureValue,
        temperatureUnit,
      )]),
    ),
    metadata: Object.fromEntries(
      selectedColumns.metadata.map((metadataType) => [metadataType, getMetaData(metadataType)]),
    ),
    segmentData: Object.fromEntries(
      selectedColumns.segmentData.map((metadataType) => {
        const {
          type,
          value,
        } = segments.find((x) => x.key === metadataType).field;
        return [metadataType, getSegmentData(type, value)];
      }),
    ),
  };
  Object.keys(materialTypes)
    .forEach((materialType) => {
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
  copiedRow.metadata.notes = getMetaData('notes');
  copiedRow.metadata.analyses = getMetaData('analyses');

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
  selectedColumns,
  variations,
  segments,
  reactionHasPolymers = false,
  durationValue = null,
  durationUnit = 'None',
  temperatureValue = null,
  temperatureUnit = 'None',
  gasMode = false,
  vesselVolume = null,
}) {
  return cloneDeep(variations)
    .map((row) => {
      const newRow = { ...row };

      Object.entries(selectedColumns)
        .forEach(([columnGroupID, columnGroupChildIDs]) => {
          columnGroupChildIDs.forEach((childID) => {
            if (newRow[columnGroupID]?.[childID]) {
              return;
            }

            if (Object.keys(materialTypes)
              .includes(columnGroupID)) {
              const material = materials[columnGroupID].find(
                (m) => m.id.toString() === childID.toString(),
              );
              newRow[columnGroupID] = {
                ...newRow[columnGroupID],
                [childID]: getMaterialData(material, columnGroupID, gasMode, vesselVolume),
              };
            }

            if (columnGroupID === 'properties') {
              newRow.properties = {
                ...newRow.properties,
                [childID]: getPropertyData(
                  childID,
                  durationValue,
                  durationUnit,
                  temperatureValue,
                  temperatureUnit,
                ),
              };
            }

            if (columnGroupID === 'segmentData') {
              const {
                type,
                value,
              } = segments.find((x) => x.key === childID).field;
              newRow.segmentData = {
                ...newRow.segmentData,
                [childID]: getSegmentData(type, value),
              };
            }

            if (columnGroupID === 'metadata') {
              newRow.metadata = {
                ...newRow.metadata,
                [childID]: getMetaData(childID),
              };
            }
          });
        });

      return computeDerivedQuantitiesVariationsRow(
        newRow,
        reactionHasPolymers,
        gasMode,
      );
    });
}

function removeObsoleteColumnsFromVariations(variations, selectedColumns) {
  return cloneDeep(variations)
    .map((row) => {
      const newRow = { ...row };

      Object.entries(selectedColumns)
        .forEach(([columnGroupID, columnGroupChildIDs]) => {
          newRow[columnGroupID] = Object.fromEntries(
            Object.entries(newRow[columnGroupID] || {})
              .filter(([key]) => columnGroupChildIDs.includes(key)),
          );
        });

      return newRow;
    });
}

function getSegmentColumnGroupChild(propertyType) {
  if (!segmentsForVariations) {
    return {};
  }

  const segFieldDef = segmentsForVariations.find((item) => item.key === propertyType);

  const { field, layer } = segFieldDef;
  const defaultDef = {
    field: `segmentData.${propertyType}`,
    cellDataType: 'segmentData',
    headerComponent: SectionMenuHeader,
    entryDefs: {
      displayUnit: field.value_system
    },
    headerComponentParams: {
      names: [field.label]
    },
    cellEditorParams: {
      options: segFieldDef.options,
      fieldType: field.type,
      genericField: field,
      genericLayer: layer
    },
  };
  if (segFieldDef.field.type === 'select') {
    return {
      ...defaultDef,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        ...defaultDef.cellEditorParams,
        values: segFieldDef.options[0]?.map((x) => x.label) ?? [],
      },
    };
  }
  return defaultDef;
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
        },
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
        },
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

function addMissingColumnDefinitions(columnDefinitions, selectedColumns, materials, gasMode, gridRef) {
  const updatedColumnDefinitions = cloneDeep(columnDefinitions);

  Object.entries(selectedColumns)
    .forEach(([columnGroupID, columnGroupChildIDs]) => {
      const columnGroup = updatedColumnDefinitions.find(
        (currentColumnGroup) => currentColumnGroup.groupId === columnGroupID,
      );
      columnGroupChildIDs.forEach((childID) => {
        if (columnGroup.children.some((child) => child.field === `${columnGroupID}.${childID}`)) {
          return;
        }

        if (Object.keys(materialTypes)
          .includes(columnGroupID)) {
          const material = materials[columnGroupID].find((m) => m.id.toString() === childID.toString());
          columnGroup.children.push(getMaterialColumnGroupChild(material, columnGroupID, gasMode));
        }
        if (columnGroupID === 'properties') {
          columnGroup.children.push(getPropertyColumnGroupChild(childID, gasMode));
        }
        if (columnGroupID === 'metadata') {
          columnGroup.children.push(getMetadataColumnGroupChild(childID));
        }
        if (columnGroupID === 'segmentData') {
          columnGroup.children.push(getSegmentColumnGroupChild(childID, gridRef));
        }
      });
    });

  return updatedColumnDefinitions;
}

function removeObsoleteColumnDefinitions(columnDefinitions, selectedColumns) {
  const updatedColumnDefinitions = cloneDeep(columnDefinitions);

  Object.entries(selectedColumns)
    .forEach(([columnGroupID, columnGroupChildIDs]) => {
      const columnGroup = updatedColumnDefinitions.find(
        (currentColumnGroup) => currentColumnGroup.groupId === columnGroupID,
      );

      columnGroup.children = columnGroup.children.filter((child) => {
        const childID = child.field.split('.')
          .splice(1)
          .join('.'); // Ensure that IDs that contain "." are handled correctly.
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

function getColumnDefinitions(selectedColumns, materials, gasMode, externalEntryDefs = {}) {
  return [
    {
      headerName: 'Tools',
      field: 'tools',
      cellRenderer: RowToolsCellRenderer,
      lockPosition: 'left',
      sortable: false,
      maxWidth: 100,
      cellDataType: false,
    },
    {
      headerName: 'Metadata',
      groupId: 'metadata',
      marryChildren: true,
      children: selectedColumns.metadata.map((entry) => getMetadataColumnGroupChild(entry)),
    },
    {
      headerName: 'Properties',
      groupId: 'properties',
      marryChildren: true,
      children: selectedColumns.properties.map(
        (entry) => getPropertyColumnGroupChild(entry, gasMode, externalEntryDefs[`properties.${entry}`])
      ),
    },
    {
      headerName: 'Segments',
      groupId: 'segmentData',
      marryChildren: true,
      children: selectedColumns.segmentData.map((entry) => getSegmentColumnGroupChild(entry)),
    },
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
  const materialColumns = Object.entries(materialTypes)
    .reduce((materialsByType, [materialType]) => ({
      ...materialsByType,
      [materialType]: Object.keys(variationsRow ? variationsRow[materialType] : [])
    }), {});
  const propertyColumns = Object.keys(variationsRow ? variationsRow.properties : {});
  const metadataColumns = Object.keys(variationsRow ? variationsRow.metadata : {});
  const segmentDataColumns = Object.keys(variationsRow ? variationsRow.segmentData ?? {} : {});

  return {
    ...materialColumns,
    properties: propertyColumns,
    metadata: metadataColumns,
    segmentData: segmentDataColumns,
  };
}

const processSegmentsForVariations = (segments, reaction) => {
  const result = [];
  segments.forEach((seg) => {
    const key = seg.label;
    const inRea = reaction.segments.find((x) => x.klass_label === seg.label);
    const layers = inRea ? inRea.properties.layers ?? [] : seg.properties_release.layers ?? [];

    Object.values(layers)
      .forEach((layer) => {
        layer.fields.forEach((field) => {
          if (['integer', 'system-defined', 'select', 'text'].includes(field.type)) {
            const options = [];
            if (field.type === 'select') {
              options.push(seg.properties_release.select_options[field.option_layers].options ?? []);
            }
            result.push({
              key: `${key}___${layer.key}___${field.field}`,
              label: `${layer.label}: ${field.label}`,
              group: key,
              layer,
              field,
              options,
            });
          }
        });
      });
  });
  return result;
};

const getSegmentsForVariations = (reaction) => {
  // Fetch the segment data, preprocess it and strip irrelevant information.
  // The data is loaded only once when the component mounts, using the 'soft reload'
  // argument from the 'GenericSegmentFetcher.listSegmentKlass' method.

  const fetchData = async () => {
    try {
      const res = await GenericSgsFetcher.listSegmentKlass({ is_active: true }, true);
      const reactionsSegments = res.klass.filter((k) => k.element_klass.name === 'reaction' && k.is_active);
      segmentsForVariations = processSegmentsForVariations(reactionsSegments, reaction);
    } catch (error) {
      console.error('Error fetching segments:', error);
    }
    return segmentsForVariations;
  };

  return fetchData();
};

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

export {
  massUnits,
  volumeUnits,
  amountUnits,
  temperatureUnits,
  durationUnits,
  concentrationUnits,
  getStandardUnits,
  convertUnit,
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
  getSegmentsForVariations,
  removeObsoleteColumnDefinitions,
  getMetadataColumnGroupChild,
  getPropertyColumnGroupChild,
  REACTION_VARIATIONS_TAB_KEY,
  getInitialGridState,
  getInitialEntryDefinitions,
  persistTableLayout,
  getEntryDefs,
  getCurrentEntry,
  getUserFacingEntryName
};
