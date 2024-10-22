/* eslint-disable react/display-name */
import React, { useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  Button, ButtonGroup, Modal, Form, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import {
  getVariationsRowName, convertUnit
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import {
  updateNonReferenceMaterialOnMassChange,
  getReferenceMaterial, getMolFromGram, getGramFromMol
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import { parseNumericString } from 'src/utilities/MathUtils';

function RowToolsCellRenderer({
  data: variationsRow, context
}) {
  const { reactionShortLabel, copyRow, removeRow } = context;
  return (
    <div>
      <ButtonGroup>
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip>{getVariationsRowName(reactionShortLabel, variationsRow.id)}</Tooltip>}
        >
          <Button size="xsm" variant="secondary">{variationsRow.id}</Button>
        </OverlayTrigger>
        <Button size="xsm" variant="success" onClick={() => copyRow(variationsRow)}>
          <i className="fa fa-clone" />
        </Button>
        <Button size="xsm" variant="danger" onClick={() => removeRow(variationsRow)}>
          <i className="fa fa-trash-o" />
        </Button>
      </ButtonGroup>
    </div>
  );
}

RowToolsCellRenderer.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.number.isRequired,
  }).isRequired,
  context: PropTypes.shape({
    reactionShortLabel: PropTypes.string.isRequired,
    copyRow: PropTypes.func.isRequired,
    removeRow: PropTypes.func.isRequired,
  }).isRequired,
};

function EquivalentFormatter({ value: cellData }) {
  const { equivalent } = cellData.aux;

  return `${Number(equivalent).toPrecision(4)}`;
}

function EquivalentParser({ data: variationsRow, oldValue: cellData, newValue }) {
  let equivalent = parseNumericString(newValue);
  if (equivalent < 0) {
    equivalent = 0;
  }
  // Adapt mass to updated equivalent.
  const referenceMaterial = getReferenceMaterial(variationsRow);
  const referenceMol = getMolFromGram(referenceMaterial.mass.value, referenceMaterial);
  const mass = getGramFromMol(referenceMol * equivalent, cellData);

  // Adapt amount to updated equivalent.
  const amount = getMolFromGram(mass, cellData);

  return {
    ...cellData,
    mass: { ...cellData.mass, value: mass },
    amount: { ...cellData.amount, value: amount },
    aux: { ...cellData.aux, equivalent }
  };
}

function PropertyFormatter({ value: cellData, colDef }) {
  const { displayUnit } = colDef.entryDefs;
  const valueInDisplayUnit = convertUnit(Number(cellData.value), cellData.unit, displayUnit);

  return `${Number(valueInDisplayUnit).toPrecision(4)}`;
}

function PropertyParser({
  oldValue: cellData, newValue, colDef
}) {
  const { currentEntry, displayUnit } = colDef.entryDefs;
  let value = parseNumericString(newValue);
  if (currentEntry !== 'temperature' && value < 0) {
    value = 0;
  }
  value = convertUnit(value, displayUnit, cellData.unit);
  const updatedCellData = { ...cellData, value };

  return updatedCellData;
}

function MaterialFormatter({ value: cellData, colDef }) {
  const { currentEntry, displayUnit } = colDef.entryDefs;
  const valueInDisplayUnit = convertUnit(
    Number(cellData[currentEntry].value),
    cellData[currentEntry].unit,
    displayUnit
  );

  return `${Number(valueInDisplayUnit).toPrecision(4)}`;
}

function MaterialParser({
  data: variationsRow, oldValue: cellData, newValue, colDef, context
}) {
  const { field } = colDef;
  const { currentEntry, displayUnit } = colDef.entryDefs;
  const columnGroup = field.split('.')[0];
  let value = convertUnit(parseNumericString(newValue), displayUnit, cellData[currentEntry].unit);
  if (value < 0) {
    value = 0;
  }
  let updatedCellData = { ...cellData, [currentEntry]: { ...cellData[currentEntry], value } };

  if (currentEntry === 'mass') {
    // Adapt amount to updated mass.
    const amount = getMolFromGram(value, updatedCellData);
    updatedCellData = { ...updatedCellData, amount: { ...updatedCellData.amount, value: amount } };
  }
  if (currentEntry === 'amount') {
    // Adapt mass to updated amount.
    const mass = getGramFromMol(value, updatedCellData);
    updatedCellData = { ...updatedCellData, mass: { ...updatedCellData.mass, value: mass } };
  }
  // See comment in ReactionVariationsUtils.updateVariationsRow() regarding reactive updates.
  if (updatedCellData.aux.isReference) {
    return updatedCellData;
  }
  return updateNonReferenceMaterialOnMassChange(
    variationsRow,
    updatedCellData,
    columnGroup,
    context.reactionHasPolymers
  );
}

function NoteCellRenderer(props) {
  return (
    <OverlayTrigger
      placement="right"
      overlay={
        <Tooltip id={"note-tooltip-" + props.data.id}>
          double click to edit
        </Tooltip>
      }
    >
      <span>{props.value ? props.value : '_'}</span>
    </OverlayTrigger>
  );
}

function NoteCellEditor({
  data: variationsRow,
  value,
  onValueChange,
  stopEditing,
  context
}) {
  const [note, setNote] = useState(value);
  const { reactionShortLabel } = context;

  const onClose = () => {
    stopEditing();
  };

  const onSave = () => {
    onValueChange(note);
    stopEditing();
  };

  const cellContent = (
    <Modal show onHide={onClose}>
      <Modal.Header closeButton>
        {`Edit note for ${getVariationsRowName(reactionShortLabel, variationsRow.id)}`}
      </Modal.Header>
      <Modal.Body>
        <Form.Control
          as="textarea"
          placeholder="Start typing your note..."
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onSave}>Save</Button>
      </Modal.Footer>
    </Modal>
  );

  return cellContent;
}

NoteCellEditor.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.number.isRequired,
  }).isRequired,
  value: PropTypes.string.isRequired,
  onValueChange: PropTypes.func.isRequired,
  stopEditing: PropTypes.func.isRequired,
  context: PropTypes.shape({
    reactionShortLabel: PropTypes.string.isRequired,
  }).isRequired,
};

function MaterialOverlay({
  value: cellData, colDef
}) {
  const { aux = null } = cellData;
  const { currentEntry, displayUnit } = colDef.entryDefs;

  return (
    <div className="tooltip show">
      <div className="tooltip-inner text-start">
        {currentEntry !== 'equivalent' && (
          <div>
            {`${Number(convertUnit(cellData[currentEntry].value, cellData[currentEntry].unit, displayUnit)).toPrecision(4)} ${displayUnit}`}
          </div>
        )}
        {aux?.isReference && (
          <div>Reference</div>
        )}
        {aux?.equivalent !== null && (
          <div>{`Equivalent: ${Number(aux.equivalent).toPrecision(4)}`}</div>
        )}
        {aux?.coefficient !== null && (
          <div>{`Coefficient: ${Number(aux.coefficient).toPrecision(4)}`}</div>
        )}
        {aux?.yield !== null && (
          <div>{`Yield: ${Number(aux.yield).toPrecision(4)}%`}</div>
        )}
        {aux?.molecularWeight !== null && (
          <div>{`Molar mass: ${Number(aux.molecularWeight).toPrecision(2)} g/mol`}</div>
        )}
      </div>
    </div>
  );
}

MaterialOverlay.propTypes = {
  value: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number.isRequired,
    unit: PropTypes.string.isRequired,
  })).isRequired,
  colDef: PropTypes.shape({
    entryDefs: PropTypes.shape({
      currentEntry: PropTypes.number.isRequired,
      displayUnit: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};

function MenuHeader({
  column, context, setSort, names
}) {
  const { field, entryDefs } = column.colDef;
  const { setColumnDefinitions } = context;
  const [ascendingSort, setAscendingSort] = useState('inactive');
  const [descendingSort, setDescendingSort] = useState('inactive');
  const [noSort, setNoSort] = useState('inactive');
  const [name, setName] = useState(names[0]);
  const { currentEntry, displayUnit, availableEntriesWithUnits } = entryDefs;
  const [entry, setEntry] = useState(currentEntry);
  const [unit, setUnit] = useState(displayUnit);
  const [units, setUnits] = useState(availableEntriesWithUnits[currentEntry]);

  const onSortChanged = () => {
    setAscendingSort(column.isSortAscending() ? 'sort_active' : 'inactive');
    setDescendingSort(column.isSortDescending() ? 'sort_active' : 'inactive');
    setNoSort(
      !column.isSortAscending() && !column.isSortDescending()
        ? 'sort_active'
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
    setColumnDefinitions(
      {
        type: 'update_entry_defs',
        field,
        entryDefs: { currentEntry: entry, displayUnit: newUnit, availableEntriesWithUnits }
      }
    );
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
    const entryKeys = Object.keys(availableEntriesWithUnits);
    const newEntry = entryKeys[(entryKeys.indexOf(entry) + 1) % entryKeys.length];
    const newUnits = availableEntriesWithUnits[newEntry];
    const newUnit = newUnits[0];

    setEntry(newEntry);
    setUnits(newUnits);
    setUnit(newUnit);
    setColumnDefinitions(
      {
        type: 'update_entry_defs',
        field,
        entryDefs: { currentEntry: newEntry, displayUnit: newUnit, availableEntriesWithUnits }
      }
    );
  };

  const entrySelection = (
    <Button
      className="entrySelection"
      bsStyle="default"
      bsSize="xsmall"
      style={{ display: ['temperature', 'duration'].includes(entry) ? 'none' : 'inline' }}
      disabled={Object.keys(availableEntriesWithUnits).length === 1}
      onClick={onEntryChanged}
    >
      {entry}
    </Button>
  );

  const sortMenu = (
    <div className="sortHeader" style={{ display: 'flex', alignItems: 'center', opacity: 0.5 }}>
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
      <span
        className="header-title"
        onClick={() => setName(names[(names.indexOf(name) + 1) % names.length])}
      >
        {name}
      </span>
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
  names: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export {
  RowToolsCellRenderer,
  EquivalentFormatter,
  EquivalentParser,
  PropertyFormatter,
  PropertyParser,
  MaterialFormatter,
  MaterialParser,
  NoteCellRenderer,
  NoteCellEditor,
  MaterialOverlay,
  MenuHeader,
};
