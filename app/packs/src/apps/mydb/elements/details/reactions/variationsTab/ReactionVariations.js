/* eslint-disable react/display-name */
import { AgGridReact } from 'ag-grid-react';
import React, {
  useRef, useState, useEffect, useMemo, useCallback
} from 'react';
import {
  Button, ButtonGroup, OverlayTrigger, Tooltip, Badge
} from 'react-bootstrap';
import {
  set, cloneDeep, isEqual
} from 'lodash';
import PropTypes from 'prop-types';
import Reaction from 'src/models/Reaction';
import {
  createVariationsRow, temperatureUnits, durationUnits, convertUnit, materialTypes,
  getSequentialId, removeObsoleteMaterialsFromVariations, addMissingMaterialsToVariations,
  getReferenceMaterial, getMolFromGram, getGramFromMol, computeEquivalent, computePercentYield,
  updateYields, updateEquivalents, getReactionMaterials, getMaterialHeaderNames
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

function MenuHeader({
  column, context, setSort, units, names, entries
}) {
  const { field } = column.colDef;
  const [ascendingSort, setAscendingSort] = useState('inactive');
  const [descendingSort, setDescendingSort] = useState('inactive');
  const [noSort, setNoSort] = useState('inactive');
  const [unit, setUnit] = useState(units[0]);
  const [name, setName] = useState(names[0]);
  const [entry, setEntry] = useState(entries[0]);

  const onSortChanged = () => {
    setAscendingSort(column.isSortAscending() ? 'active' : 'inactive');
    setDescendingSort(column.isSortDescending() ? 'active' : 'inactive');
    setNoSort(
      !column.isSortAscending() && !column.isSortDescending()
        ? 'active'
        : 'inactive'
    );
  };

  useEffect(() => {
    column.addEventListener('sortChanged', onSortChanged);
    onSortChanged();
  }, []);

  const onSortRequested = (order, event) => {
    setSort(order, event.shiftKey);
  };

  const onUnitChanged = () => {
    const newUnit = units[(units.indexOf(unit) + 1) % units.length];
    setUnit(newUnit);
    context.updateColumnDefinitions(field, '_variationsUnit', newUnit);
  };

  const unitSelection = (
    <Button
      className="unitSelection"
      bsStyle="success"
      bsSize="xsmall"
      style={{ display: entry === 'equivalent' ? 'none' : 'inline' }}
      onClick={onUnitChanged}
    >
      {unit}
    </Button>
  );

  const onEntryChanged = () => {
    const newEntry = entries[(entries.indexOf(entry) + 1) % entries.length];
    setEntry(newEntry);
    context.updateColumnDefinitions(field, 'cellDataType', newEntry === 'mass' ? 'valueUnit' : newEntry);
  };

  const entrySelection = (
    <Button
      className="entrySelection"
      bsStyle="default"
      bsSize="xsmall"
      style={{ display: entry === null ? 'none' : 'inline' }}
      disabled={entries.length === 1}
      onClick={onEntryChanged}
    >
      {entry}
    </Button>
  );

  const sortMenu = (
    <div style={{ display: 'flex', alignItems: 'center', opacity: 0.5 }}>
      <div
        onClick={(event) => onSortRequested('asc', event)}
        onTouchEnd={(event) => onSortRequested('asc', event)}
        className={`customSortDownLabel ${ascendingSort}`}
      >
        <i className="fa fa-chevron-up fa-fw" />
      </div>
      <div
        onClick={(event) => onSortRequested('desc', event)}
        onTouchEnd={(event) => onSortRequested('desc', event)}
        className={`customSortUpLabel ${descendingSort}`}
      >
        <i className="fa fa-chevron-down fa-fw" />
      </div>
      <div
        onClick={(event) => onSortRequested('', event)}
        onTouchEnd={(event) => onSortRequested('', event)}
        className={`customSortRemoveLabel ${noSort}`}
      >
        <i className="fa fa-times fa-fw" />
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid' }}>
      <b onClick={() => setName(names[(names.indexOf(name) + 1) % names.length])}>{name}</b>
      <div>
        {entrySelection}
        {' '}
        {unitSelection}
      </div>
      {sortMenu}
    </div>
  );
}

MenuHeader.propTypes = {
  column: PropTypes.instanceOf(AgGridReact.column).isRequired,
  context: PropTypes.instanceOf(AgGridReact.context).isRequired,
  setSort: PropTypes.func.isRequired,
  units: PropTypes.arrayOf(PropTypes.string).isRequired,
  names: PropTypes.arrayOf(PropTypes.string).isRequired,
  entries: PropTypes.arrayOf(PropTypes.string).isRequired,
};

function MaterialOverlay({
  value: cellData, colDef
}) {
  const { aux = null, value, unit: standardUnit } = cellData;
  const { _variationsUnit: displayUnit } = colDef;

  return (
    <div
      className="custom-tooltip"
      style={{
        padding: '3px 8px',
        color: '#fff',
        backgroundColor: '#000',
        borderRadius: '4px',
      }}
    >
      <p>
        <span>
          {Number(convertUnit(value, standardUnit, displayUnit)).toPrecision(4)}
          {' '}
          [
          {displayUnit}
          ]
        </span>
      </p>
      {aux?.isReference ? (
        <p>
          <span>Reference</span>
        </p>
      ) : null}

      {aux?.equivalent !== null && (
      <p>
        <span>
          Equivalent:
        </span>
        {' '}
        {Number(aux.equivalent).toPrecision(4)}
      </p>
      )}

      {aux?.coefficient !== null && (
      <p>
        <span>
          Coefficient:
        </span>
        {' '}
        {Number(aux.coefficient).toPrecision(4)}
      </p>
      )}

      {aux?.yield !== null && (
      <p>
        <span>
          Yield:
        </span>
        {' '}
        {Number(aux.yield).toPrecision(4)}
        %
      </p>
      )}

      {aux?.molecularWeight !== null && (
        <p>
          <span>
            Molar mass:
          </span>
          {' '}
          {Number(aux.molecularWeight).toPrecision(2)}
          {' '}
          g/mol
        </p>
      )}
    </div>
  );
}

MaterialOverlay.propTypes = {
  value: PropTypes.instanceOf(AgGridReact.value).isRequired,
  colDef: PropTypes.instanceOf(AgGridReact.colDef).isRequired,
};

function RowToolsCellRenderer({
  data: variationsRow, reactionShortLabel, context
}) {
  return (
    <div>
      <Badge>{`${reactionShortLabel}-${variationsRow.id}`}</Badge>
      {' '}
      <ButtonGroup>
        <Button bsSize="xsmall" bsStyle="success" onClick={() => context.copyRow(variationsRow)}>
          <i className="fa fa-clone" />
        </Button>
        <Button bsSize="xsmall" bsStyle="danger" onClick={() => context.removeRow(variationsRow)}>
          <i className="fa fa-trash-o" />
        </Button>
      </ButtonGroup>
    </div>
  );
}

RowToolsCellRenderer.propTypes = {
  data: PropTypes.instanceOf(AgGridReact.data).isRequired,
  reactionShortLabel: PropTypes.string.isRequired,
  context: PropTypes.instanceOf(AgGridReact.context).isRequired,
};

function ValueUnitFormatter({ value: cellData, colDef }) {
  const { _variationsUnit: displayUnit } = colDef;
  const value = convertUnit(Number(cellData.value), cellData.unit, displayUnit);

  return `${Number(value).toPrecision(4)}`;
}

function ValueUnitParser({
  data: variationsRow, oldValue: cellData, newValue, colDef, context
}) {
  const { field, _variationsUnit: displayUnit } = colDef;
  const standardUnit = cellData.unit;
  const columnGroup = field.split('.')[0];
  const column = field.split('.').splice(1).join('.');
  const referenceMaterial = getReferenceMaterial(variationsRow);
  let value = Number(newValue);
  if (column !== 'temperature' && value < 0) {
    value = 0;
  }
  value = convertUnit(value, displayUnit, standardUnit);
  const updatedCellData = { ...cellData, value };

  if (!Object.keys(materialTypes).includes(columnGroup)) {
    return updatedCellData;
  }

  // Adapt equivalent to updated mass.
  // Non-reference materials require an adaptation of their own equivalent only.
  const equivalent = (!updatedCellData.aux.isReference && ['startingMaterials', 'reactants'].includes(columnGroup))
    ? computeEquivalent(updatedCellData, referenceMaterial) : updatedCellData.aux.equivalent;
  // Reference materials don't require adaptation of their own equivalent.
  // However, they require adaptations of other materials' equivalents, i.e., cells that aren't currently edited.
  // Those updates are handled in `ReactionVariations.updateRow()`.

  // Adapt yield to updated mass.
  const percentYield = (columnGroup === 'products')
    ? computePercentYield(updatedCellData, referenceMaterial, context.reactionHasPolymers) : updatedCellData.aux.yield;

  const updatedAux = { ...updatedCellData.aux, equivalent, yield: percentYield };

  return {
    ...updatedCellData, aux: updatedAux
  };
}

function EquivalentFormatter({ value: cellData }) {
  const { equivalent } = cellData.aux;

  return `${Number(equivalent).toPrecision(4)}`;
}

function EquivalentParser({ data: variationsRow, oldValue: cellData, newValue }) {
  let equivalent = Number(newValue);
  if (equivalent < 0) {
    equivalent = 0;
  }
  // Adapt mass to updated equivalent.
  const referenceMaterial = getReferenceMaterial(variationsRow);
  const referenceMol = getMolFromGram(
    convertUnit(referenceMaterial.value, referenceMaterial.unit, 'g'),
    referenceMaterial
  );
  const value = Number(convertUnit(getGramFromMol(referenceMol * equivalent, cellData), 'g', cellData.unit));

  return { ...cellData, value, aux: { ...cellData.aux, equivalent } };
}

function reactionMaterialsChanged(reactionVariations, reaction) {
  const reactionMaterialIDs = Object.entries(materialTypes).reduce((
    materialIDsByType,
    [materialType, { reactionAttributeName }]
  ) => {
    materialIDsByType[materialType] = reaction[reactionAttributeName].map(
      (material) => material.id
    ).map(String).sort(); // Sort to ensure consistency and unambiguous comparison.
    return materialIDsByType;
  }, {});

  const reactionVariationsMaterialIDs = Object.keys(materialTypes).reduce((
    materialsByType,
    materialType
  ) => {
    // Sort to ensure consistency and unambiguous comparison.
    materialsByType[materialType] = Object.keys(reactionVariations[0][materialType]).sort();
    return materialsByType;
  }, {});

  return !isEqual(reactionVariationsMaterialIDs, reactionMaterialIDs);
}

function getMaterialColumnGroupChild(material, materialType) {
  let entries = [null];
  if (materialType === 'solvents') {
    entries = ['volume'];
  }
  if (materialType === 'products') {
    entries = ['mass'];
  }
  if (['startingMaterials', 'reactants'].includes(materialType)) {
    entries = ['mass'];
    if (!material.reference ?? false) {
      entries.push('equivalent');
    }
  }
  return {
    field: `${materialType}.${material.id}`, // Must be unique.
    tooltipField: `${materialType}.${material.id}`,
    tooltipComponent: MaterialOverlay,
    _variationsUnit: materialTypes[materialType].units[0],
    headerComponentParams: {
      units: materialTypes[materialType].units,
      names: getMaterialHeaderNames(material),
      entries
    },
  };
}

function editColumnDefinitions(columnDefinitions, column, property, newValue) {
  const updatedColumnDefinitions = cloneDeep(columnDefinitions);
  updatedColumnDefinitions.forEach((columnDefinition) => {
    if (!columnDefinition.groupId) {
      return;
    }
    columnDefinition.children.forEach((child) => {
      if (child.field === column) {
        child[property] = newValue;
      }
    });
  });

  return updatedColumnDefinitions;
}

function updateColumnDefinitionsMaterials(columnDefinitions, currentMaterials) {
  const updatedColumnDefinitions = cloneDeep(columnDefinitions);

  Object.keys(materialTypes).forEach((materialType) => {
    const currentMaterialsOfType = currentMaterials[materialType]; // Array of material objects.
    const currentMaterialsOfTypeIDs = currentMaterials[materialType].map((material) => material.id.toString());
    const materialColumnGroup = updatedColumnDefinitions.find((columnGroup) => columnGroup.groupId === materialType);

    // Remove obsolete materials.
    materialColumnGroup.children = materialColumnGroup.children.filter((child) => {
      const childID = child.field.split('.').splice(1).join('.'); // Ensure that IDs that contain "." are handled correctly.
      return currentMaterialsOfTypeIDs.includes(childID);
    });
    // Add missing materials.
    currentMaterialsOfType.forEach((material) => {
      if (!materialColumnGroup.children.some((child) => child.field === `${materialType}.${material.id}`)) {
        materialColumnGroup.children.push(getMaterialColumnGroupChild(material, materialType));
      }
    });
  });

  return updatedColumnDefinitions;
}

export default function ReactionVariations({ reaction, onEditVariations }) {
  const gridRef = useRef(null);
  const [reactionVariations, setReactionVariations] = useState(reaction.variations);
  const [columnDefinitions, setColumnDefinitions] = useState([
    {
      field: null,
      cellRenderer: RowToolsCellRenderer,
      cellRendererParams: { reactionShortLabel: reaction.short_label },
      lockPosition: 'left',
      editable: false,
      sortable: false,
      minWidth: 140,
      cellDataType: 'object',
      headerComponent: null,
    },

    {
      headerName: 'Properties',
      groupId: 'properties',
      marryChildren: true,
      children: [
        {
          field: 'properties.temperature',
          _variationsUnit: temperatureUnits[0],
          headerComponentParams: {
            units: temperatureUnits,
            names: ['Temperature'],
            entries: [null]
          }
        },
        {
          field: 'properties.duration',
          _variationsUnit: durationUnits[0],
          headerComponentParams: {
            units: durationUnits,
            names: ['Duration'],
            entries: [null]
          }
        },
      ]
    },
  ].concat(
    Object.entries(materialTypes).map(([materialType, { label, reactionAttributeName }]) => ({
      headerName: label,
      groupId: materialType,
      marryChildren: true,
      children: reaction[reactionAttributeName].map((material) => getMaterialColumnGroupChild(material, materialType))
    }))
  ));

  const dataTypeDefinitions = useMemo(() => ({
    valueUnit: {
      extendsDataType: 'object',
      baseDataType: 'object',
      valueFormatter: ValueUnitFormatter,
      valueParser: ValueUnitParser,
    },
    equivalent: {
      extendsDataType: 'object',
      baseDataType: 'object',
      valueFormatter: EquivalentFormatter,
      valueParser: EquivalentParser,
    }
  }), []);

  const defaultColumnDefinitions = useMemo(() => ({
    editable: true,
    sortable: true,
    resizable: false,
    minWidth: 120,
    maxWidth: 200,
    wrapHeaderText: true,
    autoHeaderHeight: true,
    cellDataType: 'valueUnit',
    headerComponent: MenuHeader,
  }), []);

  useEffect(() => {
    // Push changes to parent component. Treat parent component as external system,
    // since it's not obvious when and how state is mutated in the parent component.
    onEditVariations(reactionVariations);
  }, [reactionVariations]);

  if ((reactionVariations.length > 0) && reactionMaterialsChanged(reactionVariations, reaction)) {
    // Pull changes from parent component. Keep set of materials up-to-date.
    // Materials could have been added or removed in the scheme tab (of the reaction detail modal).
    // These changes need to be reflected in the variations.
    const currentMaterials = getReactionMaterials(reaction);

    const updatedColumnDefinitions = updateColumnDefinitionsMaterials(columnDefinitions, currentMaterials);
    setColumnDefinitions(updatedColumnDefinitions);

    let updatedReactionVariations = removeObsoleteMaterialsFromVariations(reactionVariations, currentMaterials);
    updatedReactionVariations = addMissingMaterialsToVariations(updatedReactionVariations, currentMaterials);
    setReactionVariations(updatedReactionVariations);
  }

  const addRow = useCallback(() => {
    setReactionVariations(
      [...reactionVariations, createVariationsRow(reaction, getSequentialId(reactionVariations))]
    );
  }, [reaction, reactionVariations]);

  const copyRow = useCallback((data) => {
    const copiedRow = cloneDeep(data);
    copiedRow.id = getSequentialId(reactionVariations);
    setReactionVariations(
      [...reactionVariations, copiedRow]
    );
  }, [reactionVariations]);

  const removeRow = useCallback((data) => {
    setReactionVariations(reactionVariations.filter((row) => row.id !== data.id));
  }, [reactionVariations]);

  const updateRow = useCallback(({ data: oldRow, colDef, newValue }) => {
    // Some properties of a material need to be updated in response to changes in other properties:

    // property   | needs to be updated in response to
    // -----------|----------------------------------
    // equivalent | own mass changes*, reference material's mass changes+
    // mass       | own equivalent changes*
    // yield      | own mass changes*, reference material's mass changes+

    // *: handled in corresponding cell parsers (local, cell-internal changes)
    // +: handled here (non-local, row-wide changes)
    const { field } = colDef;
    let updatedRow = { ...oldRow };
    set(updatedRow, field, newValue);
    // TODO: Only run the following two updates if `newValue` pertains to the mass of the reference material.
    // It's not incorrect to run those updates for other changes as well, just wasteful.
    updatedRow = updateEquivalents(updatedRow);
    updatedRow = updateYields(updatedRow, reaction.hasPolymers());
    setReactionVariations(
      reactionVariations.map((row) => (row.id === oldRow.id ? updatedRow : row))
    );
  }, [reactionVariations]);

  const updateColumnDefinitions = useCallback((column, property, newValue) => {
    setColumnDefinitions(editColumnDefinitions(columnDefinitions, column, property, newValue));
  }, [columnDefinitions]);

  return (
    <div>
      <OverlayTrigger
        placement="bottom"
        overlay={(
          <Tooltip>
            Add row with current data from &quot;Scheme&quot; tab.
            <br />
            Changes in &quot;Scheme&quot; tab are not applied to
            {' '}
            <i>existing</i>
            {' '}
            rows.
          </Tooltip>
  )}
      >
        {/* Wrapping button in span necessary in order for OverlayTrigger to work */}
        <span>
          <Button bsSize="xsmall" bsStyle="success" onClick={addRow}>
            <i className="fa fa-plus" />
          </Button>
        </span>
      </OverlayTrigger>
      <div style={{ height: '50vh' }} className="ag-theme-alpine">
        <AgGridReact
          ref={gridRef}
          rowData={reactionVariations}
          rowDragEntireRow
          rowDragManaged
          columnDefs={columnDefinitions}
          suppressPropertyNamesCheck
          defaultColDef={defaultColumnDefinitions}
          dataTypeDefinitions={dataTypeDefinitions}
          tooltipShowDelay={0}
          domLayout="autoHeight"
          context={{
            copyRow,
            removeRow,
            updateColumnDefinitions,
            reactionHasPolymers: reaction.hasPolymers()
          }}
        // IMPORTANT: In conjunction with `onCellEditRequest`,
        // `readOnlyEdit` ensures that all edits of `reaction.variations` go through `updateRow`,
        // rather than the grid mutating `reaction.variations` directly on user edits.
        // I.e., we take explicit control of state manipulation.
          readOnlyEdit
          onCellEditRequest={updateRow}
          onVirtualColumnsChanged={() => gridRef.current.api.autoSizeAllColumns(false)}
          onColumnHeaderClicked={() => gridRef.current.api.autoSizeAllColumns(false)}
        />
      </div>
    </div>
  );
}

ReactionVariations.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  onEditVariations: PropTypes.func.isRequired,
};
