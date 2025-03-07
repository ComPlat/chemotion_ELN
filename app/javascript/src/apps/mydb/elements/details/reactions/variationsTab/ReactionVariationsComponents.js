/* eslint-disable react/display-name */
import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { AgGridReact } from 'ag-grid-react';
import {
  Button, ButtonGroup, Modal, Form, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import {
  getVariationsRowName, convertUnit, getStandardUnits, getUserFacingUnit
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import {
  getReferenceMaterial, getCatalystMaterial, getFeedstockMaterial, getMolFromGram, getGramFromMol,
  computeEquivalent, computePercentYield, computePercentYieldGas
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import { parseNumericString } from 'src/utilities/MathUtils';
import {
  calculateGasMoles, calculateTON, calculateFeedstockMoles, calculateFeedstockVolume
} from 'src/utilities/UnitsConversion';

function RowToolsCellRenderer({
  data: row, context
}) {
  const { reactionShortLabel, copyRow, removeRow } = context;
  return (
    <div>
      <ButtonGroup>
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip>{getVariationsRowName(reactionShortLabel, row.id)}</Tooltip>}
        >
          <Button size="xsm" variant="secondary">{row.id}</Button>
        </OverlayTrigger>
        <Button size="xsm" variant="success" onClick={() => copyRow(row)}>
          <i className="fa fa-clone" />
        </Button>
        <Button size="xsm" variant="danger" onClick={() => removeRow(row)}>
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

function EquivalentParser({ data: row, oldValue: cellData, newValue }) {
  let equivalent = parseNumericString(newValue);
  if (equivalent < 0) {
    equivalent = 0;
  }
  // Adapt mass to updated equivalent.
  const referenceMaterial = getReferenceMaterial(row);
  const referenceMol = getMolFromGram(referenceMaterial.mass.value, referenceMaterial);
  const mass = getGramFromMol(referenceMol * equivalent, cellData);

  // Adapt amount to updated equivalent.
  const amount = getMolFromGram(mass, cellData);

  return {
    ...cellData,
    mass: { ...cellData.mass, value: mass },
    amount: { ...cellData.amount, value: amount },
    equivalent: { ...cellData.equivalent, value: equivalent }
  };
}

function PropertyFormatter({ value: cellData, colDef }) {
  const { displayUnit } = colDef.entryDefs;
  const valueInDisplayUnit = convertUnit(Number(cellData.value), cellData.unit, displayUnit);

  return parseFloat(Number(valueInDisplayUnit).toPrecision(4));
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

  return parseFloat(Number(valueInDisplayUnit).toPrecision(4));
}

function MaterialParser({
  data: row, oldValue: cellData, newValue, colDef, context
}) {
  const { currentEntry, displayUnit } = colDef.entryDefs;
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
  if (updatedCellData.aux.isReference) {
    return updatedCellData;
  }

  const referenceMaterial = getReferenceMaterial(row);

  // Adapt equivalent to updated mass.
  if ('equivalent' in updatedCellData) {
    const equivalent = computeEquivalent(updatedCellData, referenceMaterial);
    updatedCellData = { ...updatedCellData, equivalent: { ...updatedCellData.equivalent, value: equivalent } };
  }

  // Adapt yield to updated mass.
  if ('yield' in updatedCellData) {
    const percentYield = computePercentYield(updatedCellData, referenceMaterial, context.reactionHasPolymers);
    updatedCellData = { ...updatedCellData, yield: { ...updatedCellData.yield, value: percentYield } };
  }

  return updatedCellData;
}

function GasParser({
  data: row, oldValue: cellData, newValue, colDef
}) {
  const { currentEntry, displayUnit } = colDef.entryDefs;
  let value = convertUnit(parseNumericString(newValue), displayUnit, cellData[currentEntry].unit);
  if (currentEntry !== 'temperature' && value < 0) {
    value = 0;
  }
  let updatedCellData = { ...cellData, [currentEntry]: { ...cellData[currentEntry], value } };

  switch (currentEntry) {
    case 'concentration':
    case 'temperature': {
      const temperatureInKelvin = convertUnit(
        updatedCellData.temperature.value,
        updatedCellData.temperature.unit,
        'K'
      );

      const concentration = updatedCellData.concentration.value;
      const { vesselVolume } = updatedCellData.aux;
      const amount = calculateGasMoles(vesselVolume, concentration, temperatureInKelvin);
      const mass = getGramFromMol(amount, updatedCellData);

      const catalyst = getCatalystMaterial(row);
      const catalystAmount = catalyst?.amount.value ?? 0;
      const turnoverNumber = calculateTON(amount, catalystAmount);

      const percentYield = computePercentYieldGas(amount, getFeedstockMaterial(row), vesselVolume);

      updatedCellData = {
        ...updatedCellData,
        mass: { ...updatedCellData.mass, value: mass },
        amount: { ...updatedCellData.amount, value: amount },
        yield: { ...updatedCellData.yield, value: percentYield },
        turnoverNumber: { ...updatedCellData.turnoverNumber, value: turnoverNumber },
      };
      break;
    }
    default:
      break;
  }

  const durationInHours = convertUnit(
    updatedCellData.duration.value,
    updatedCellData.duration.unit,
    'Hour(s)'
  );
  const turnoverNumber = updatedCellData.turnoverNumber.value;
  const turnoverFrequency = turnoverNumber / (durationInHours || 1);

  return {
    ...updatedCellData,
    turnoverFrequency: { ...updatedCellData.turnoverFrequency, value: turnoverFrequency }
  };
}

function FeedstockParser({
  data: row, oldValue: cellData, newValue, colDef
}) {
  const { currentEntry, displayUnit } = colDef.entryDefs;
  let value = convertUnit(parseNumericString(newValue), displayUnit, cellData[currentEntry].unit);
  if (value < 0) {
    value = 0;
  }
  let updatedCellData = { ...cellData, [currentEntry]: { ...cellData[currentEntry], value } };

  switch (currentEntry) {
    case 'amount': {
      const amount = updatedCellData.amount.value;
      const mass = getGramFromMol(amount, updatedCellData);

      const purity = updatedCellData.aux.purity || 1;
      const volume = calculateFeedstockVolume(amount, purity);

      updatedCellData = {
        ...updatedCellData,
        mass: { ...updatedCellData.mass, value: mass },
        volume: { ...updatedCellData.volume, value: volume },
      };
      break;
    }
    case 'volume': {
      const volume = updatedCellData.volume.value;
      const purity = updatedCellData.aux.purity || 1;
      const amount = calculateFeedstockMoles(volume, purity);

      const mass = getGramFromMol(amount, updatedCellData);

      updatedCellData = {
        ...updatedCellData,
        mass: { ...updatedCellData.mass, value: mass },
        amount: { ...updatedCellData.amount, value: amount },
      };
      break;
    }
    case 'equivalent': {
      return updatedCellData;
    }
    default:
      break;
  }

  if (updatedCellData.aux.isReference) {
    return updatedCellData;
  }

  const referenceMaterial = getReferenceMaterial(row);
  const equivalent = computeEquivalent(updatedCellData, referenceMaterial);

  return { ...updatedCellData, equivalent: { ...updatedCellData.equivalent, value: equivalent } };
}

function NoteCellRenderer(props) {
  return (
    <OverlayTrigger
      placement="right"
      overlay={(
        <Tooltip id={`note-tooltip-${props.data.id}`}>
          double click to edit
        </Tooltip>
      )}
    >
      <span>{props.value ? props.value : '_'}</span>
    </OverlayTrigger>
  );
}

function NoteCellEditor({
  data: row,
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
        {`Edit note for ${getVariationsRowName(reactionShortLabel, row.id)}`}
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

function MaterialOverlay({ value: cellData }) {
  const { aux = null } = cellData;

  return (
    <div className="tooltip show">
      <div className="tooltip-inner text-start">
        {aux?.isReference && <div>Reference</div>}
        {aux?.coefficient !== null && (
        <div>
          Coefficient:
          {' '}
          {aux.coefficient.toPrecision(4)}
        </div>
        )}
        {aux?.molecularWeight !== null && (
        <div>
          Molar mass:
          {' '}
          {aux.molecularWeight.toPrecision(2)}
          {' '}
          g/mol
        </div>
        )}
        {Object.entries(cellData).map(
          ([key, entry]) => (entry && typeof entry === 'object' && 'value' in entry ? (
            <div key={key}>
              {`${key.charAt(0).toUpperCase() + key.slice(1)}: ${entry.value}${entry.unit ? ` ${entry.unit}` : ''}`}
            </div>
          ) : null)
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
  column, context, setSort, names, gasType = 'off'
}) {
  const { setColumnDefinitions } = context;
  const [ascendingSort, setAscendingSort] = useState('inactive');
  const [descendingSort, setDescendingSort] = useState('inactive');
  const [noSort, setNoSort] = useState('inactive');
  const [name, setName] = useState(names[0]);
  const { field, entryDefs } = column.colDef;
  const { currentEntry, displayUnit, availableEntries } = entryDefs;
  const units = getStandardUnits(currentEntry);
  const currentEntryTitle = currentEntry.split(/(?=[A-Z])/).join(' ').toLowerCase(); // e.g. 'turnoverNumber' -> 'turnover number'

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
    const newDisplayUnit = units[(units.indexOf(displayUnit) + 1) % units.length];

    setColumnDefinitions(
      {
        type: 'update_entry_defs',
        field,
        entryDefs: { currentEntry, displayUnit: newDisplayUnit, availableEntries },
        gasType
      }
    );
  };

  const unitSelection = (
    <Button
      className={`unitSelection ${displayUnit === null ? 'd-none' : 'd-inline'}`}
      variant="success"
      size="sm"
      disabled={units.length === 1}
      onClick={onUnitChanged}
    >
      {getUserFacingUnit(displayUnit)}
    </Button>
  );

  const onEntryChanged = () => {
    const newCurrentEntry = availableEntries[(availableEntries.indexOf(currentEntry) + 1) % availableEntries.length];
    const newUnit = getStandardUnits(newCurrentEntry)[0];

    setColumnDefinitions(
      {
        type: 'update_entry_defs',
        field,
        entryDefs: { currentEntry: newCurrentEntry, displayUnit: newUnit, availableEntries },
        gasType
      }
    );
  };

  const entrySelection = (
    <Button
      className="entrySelection"
      variant="light"
      size="sm"
      disabled={availableEntries.length === 1}
      onClick={onEntryChanged}
    >
      {currentEntryTitle}
    </Button>
  );

  const sortMenu = (
    <div className="sortHeader d-flex align-items-center">
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
    <div className="d-grid">
      <span
        className="header-title"
        onClick={() => setName(names[(names.indexOf(name) + 1) % names.length])}
      >
        {`${name} ${gasType !== 'off' ? `(${gasType})` : ''}`}
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
  gasType: PropTypes.string,
};

MenuHeader.defaultProps = {
  gasType: 'off',
};

function ColumnSelection(selectedColumns, availableColumns, onApply) {
  const [showModal, setShowModal] = useState(false);
  const [currentColumns, setCurrentColumns] = useState(selectedColumns);

  const handleApply = () => {
    onApply(currentColumns);
    setShowModal(false);
  };

  const handleSelectChange = (key) => (selectedOptions) => {
    const updatedCurrentColumns = { ...currentColumns };
    updatedCurrentColumns[key] = selectedOptions ? selectedOptions.map((option) => option.value) : [];
    setCurrentColumns(updatedCurrentColumns);
  };

  const splitCamelCase = (str) => str.replace(/([a-z])([A-Z])/g, '$1 $2');
  const toUpperCase = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <>
      <Button size="sm" variant="primary" onClick={() => setShowModal(true)} className="mb-2">
        Select Columns
      </Button>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Column Selection</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {Object.entries(availableColumns).map(([key, values]) => (
            <div key={key}>
              <h5>{toUpperCase(splitCamelCase(key))}</h5>
              <Select
                isMulti
                options={values.map((value) => ({ value, label: toUpperCase(value) }))}
                value={currentColumns[key]?.map((value) => ({ value, label: toUpperCase(value) })) || []}
                onChange={handleSelectChange(key)}
              />
            </div>
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleApply}>
            Apply
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export {
  RowToolsCellRenderer,
  EquivalentParser,
  PropertyFormatter,
  PropertyParser,
  MaterialFormatter,
  MaterialParser,
  GasParser,
  FeedstockParser,
  NoteCellRenderer,
  NoteCellEditor,
  MaterialOverlay,
  MenuHeader,
  ColumnSelection,
};
