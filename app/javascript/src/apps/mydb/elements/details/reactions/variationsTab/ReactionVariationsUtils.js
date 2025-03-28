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
  NoteCellRenderer, NoteCellEditor, MenuHeader, RowToolsCellRenderer
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsComponents';

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
      return gasType === 'feedstock' ? 'feedstock' : 'material';
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

function createVariationsRow({
  materials,
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
  copiedRow.metadata.notes = getMetaData('notes');
  copiedRow.metadata.analyses = getMetaData('analyses');

  return copiedRow;
}

function updateVariationsRow(row, field, value, reactionHasPolymers) {
  /*
  Some attributes of a material need to be updated in response to changes in other attributes:

  attribute         | needs to be updated in response to change in
  ------------------|---------------------------------------------
  equivalent        | mass^, amount^, reference material's mass~, reference material's amount~
  mass              | amount^, equivalent^, concentration^, temperature^
  amount            | mass^, equivalent^, concentration^, temperature^
  yield             | mass^, amount^x, concentration^, temperature^, reference material's mass~, reference material's amount~
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

function getPropertyColumnGroupChild(propertyType, gasMode) {
  switch (propertyType) {
    case 'temperature':
      return {
        field: 'properties.temperature',
        cellDataType: getCellDataType('temperature'),
        entryDefs: {
          currentEntry: 'temperature',
          displayUnit: getStandardUnits('temperature')[0],
          availableEntries: ['temperature']
        },
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
        entryDefs: {
          currentEntry: 'duration',
          displayUnit: getStandardUnits('duration')[0],
          availableEntries: ['duration']
        },
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

function addMissingColumnDefinitions(columnDefinitions, selectedColumns, materials, gasMode) {
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

function getColumnDefinitions(selectedColumns, materials, gasMode) {
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
      children: selectedColumns.metadata.map((entry) => getMetadataColumnGroupChild(entry))
    },
    {
      headerName: 'Properties',
      groupId: 'properties',
      marryChildren: true,
      children: selectedColumns.properties.map((entry) => getPropertyColumnGroupChild(entry, gasMode))
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
          gasMode
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

  return { ...materialColumns, properties: propertyColumns, metadata: metadataColumns };
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
  materialTypes,
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
  REACTION_VARIATIONS_TAB_KEY
};
