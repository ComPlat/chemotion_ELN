/* eslint-disable react/display-name */
import React, {
  useState, useEffect, useMemo, useRef, useCallback
} from 'react';
import Select from 'react-select';
import { AgGridReact } from 'ag-grid-react';
import {
  Button, ButtonGroup, Modal, Form, OverlayTrigger, Tooltip, Table
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import { cloneDeep, isEqual } from 'lodash';
import {
  getVariationsRowName, convertUnit, getUserFacingUnit, getCurrentEntry,
  getUserFacingEntryName, convertGenericUnit, PLACEHOLDER_CELL_TEXT, parseGenericEntryName, sanitizeGroupEntry,
  groupNameAssembler
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import {
  getReferenceMaterial, getCatalystMaterial, getFeedstockMaterial, getMolFromGram, getGramFromMol,
  computeEquivalent, computePercentYield, computePercentYieldGas, getVolumeFromGram, getGramFromVolume
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import { parseNumericString } from 'src/utilities/MathUtils';
import {
  calculateGasMoles, calculateTON, calculateFeedstockMoles, calculateFeedstockVolume, calculateGasVolume
} from 'src/utilities/UnitsConversion';

function MaterialEntry({ children, entry, isMain }) {
  // TODO: Determine width dynamically based on length of `entry` string.
  function getEntryWidth() {
    switch (entry) {
      case 'temperature':
      case 'concentration':
      case 'turnoverNumber':
      case 'turnoverFrequency':
        return 140;
      default:
        return parseGenericEntryName(entry) ? 250 : 110;
    }
  }
  return (
    <li
      className={`list-group-item rounded-0 overflow-hidden ${isMain ? 'bg-info-subtle' : ''}`}
      style={{ width: `${getEntryWidth()}px` }}
    >
      {children}
    </li>
  );
}

MaterialEntry.propTypes = {
  children: PropTypes.node.isRequired,
  entry: PropTypes.string.isRequired,
  isMain: PropTypes.bool.isRequired
};

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
  const referenceMaterial = getReferenceMaterial(row);
  if (!referenceMaterial) {
    return {
      ...cellData,
      equivalent: { ...cellData.equivalent, value: equivalent },
    };
  }

  const referenceMol = getMolFromGram(referenceMaterial.mass.value, referenceMaterial);
  const mass = getGramFromMol(referenceMol * equivalent, cellData);
  const amount = getMolFromGram(mass, cellData);
  const volume = getVolumeFromGram(mass, cellData);

  return {
    ...cellData,
    mass: { ...cellData.mass, value: mass },
    amount: { ...cellData.amount, value: amount },
    volume: { ...cellData.volume, value: volume },
    equivalent: { ...cellData.equivalent, value: equivalent },
  };
}

function PropertyParser({
  oldValue: cellData, newValue, colDef
}) {
  const currentEntry = getCurrentEntry(colDef.entryDefs);
  const { displayUnit } = colDef.entryDefs[currentEntry];
  let value = parseNumericString(newValue);
  if (currentEntry !== 'temperature' && value < 0) {
    value = 0;
  }
  value = convertUnit(value, displayUnit, cellData.unit);
  const updatedCellData = { ...cellData, value };

  return updatedCellData;
}

function convertGenericValueToDisplayUnit(entryData, entryDef) {
  const { displayUnit } = entryDef;
  const { quantity, value, unit } = entryData;
  const valueInDisplayUnit = convertGenericUnit(value, unit, displayUnit, quantity);

  return parseFloat(Number(valueInDisplayUnit).toPrecision(4));
}

function SegmentParser({ oldValue: cellData, newValue, colDef }) {
  const currentEntry = getCurrentEntry(colDef.entryDefs);
  const entryData = cellData[currentEntry];
  const updatedEntryData = { ...entryData, value: newValue };

  switch (entryData.type) {
    case 'system-defined': {
      const { quantity, unit } = entryData;
      const { displayUnit } = colDef.entryDefs[currentEntry];
      updatedEntryData.value = convertGenericUnit(
        parseNumericString(newValue),
        displayUnit,
        unit,
        quantity
      );
      break;
    }
    case 'integer':
      updatedEntryData.value = Number.isInteger(Number(newValue)) ? newValue : null;
      break;
    case 'select':
    case 'text':
    default:
      break;
  }

  return { ...cellData, [currentEntry]: updatedEntryData };
}

function SegmentFormatter({ value: cellData, colDef }) {
  const { entryDefs } = colDef;
  const currentEntry = getCurrentEntry(entryDefs);
  const entryData = cellData[currentEntry];
  const { value, type } = entryData;
  const formattedValue = value ?? PLACEHOLDER_CELL_TEXT;

  switch (type) {
    case 'system-defined': {
      return convertGenericValueToDisplayUnit(entryData, entryDefs[currentEntry]) ?? PLACEHOLDER_CELL_TEXT;
    }
    case 'select':
    case 'text':
    case 'integer':
    default: return formattedValue;
  }
}

function SegmentRenderer({
  value: cellData, colDef,
}) {
  const { entryDefs } = colDef;
  return (
    <ol className="list-group list-group-horizontal w-100">
      {Object.entries(entryDefs).map(([entry, entryDef]) => {
        const entryData = cellData[entry];
        if (!(entryData && typeof entryData === 'object' && 'value' in entryData && entryDef.isSelected)) {
          return null;
        }
        return (
          <MaterialEntry key={entry} entry={entry} isMain={entryDef.isMain}>
            {entryData.type === 'system-defined' ? convertGenericValueToDisplayUnit(entryData, entryDef)
              : entryData.value ?? PLACEHOLDER_CELL_TEXT}
          </MaterialEntry>
        );
      })}
    </ol>
  );
}

SegmentRenderer.propTypes = {
  value: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number.isRequired,
    unit: PropTypes.string.isRequired,
  })).isRequired,
  colDef: PropTypes.shape({
    entryDefs: PropTypes.objectOf(
      PropTypes.shape({
        isMain: PropTypes.bool.isRequired,
        isSelected: PropTypes.bool.isRequired,
        displayUnit: PropTypes.string.isRequired
      })
    ).isRequired
  }).isRequired
};

function SegmentSelectEditor({
  value: cellData, colDef, onValueChange, stopEditing
}) {
  const currentEntry = getCurrentEntry(colDef.entryDefs);
  const entryData = cellData?.[currentEntry];

  if (!entryData) return null;

  const { value: selected, options = [] } = entryData;

  const optionElements = useMemo(
    () => options.map((option) => <option key={option} value={option} selected={option === selected}>{option}</option>),
    [options, selected]
  );

  useEffect(() => stopEditing, [stopEditing]);

  const handleChange = (event) => {
    const updatedEntryData = { ...entryData, value: event.target.value };
    onValueChange({ ...cellData, [currentEntry]: updatedEntryData });
  };

  return (
    <select
      className="form-select w-100 h-100"
      value={selected}
      onChange={handleChange}
    >
      {optionElements}
    </select>
  );
}

SegmentSelectEditor.propTypes = {
  value: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number.isRequired,
    unit: PropTypes.string.isRequired,
  })).isRequired,
  colDef: PropTypes.shape({
    entryDefs: PropTypes.objectOf(
      PropTypes.shape({
        isMain: PropTypes.bool.isRequired,
        isSelected: PropTypes.bool.isRequired,
        displayUnit: PropTypes.string.isRequired
      })
    ).isRequired
  }).isRequired,
  onValueChange: PropTypes.func.isRequired,
  stopEditing: PropTypes.func.isRequired,
};

function convertValueToDisplayUnit(value, unit, displayUnit) {
  const valueInDisplayUnit = convertUnit(Number(value), unit, displayUnit);

  return parseFloat(Number(valueInDisplayUnit).toPrecision(4));
}

function PropertyFormatter({ value: cellData, colDef }) {
  const currentEntry = getCurrentEntry(colDef.entryDefs);
  const { displayUnit } = colDef.entryDefs[currentEntry];

  return convertValueToDisplayUnit(cellData.value, cellData.unit, displayUnit);
}

function MaterialFormatter({ value: cellData, colDef }) {
  const currentEntry = getCurrentEntry(colDef.entryDefs);
  const { displayUnit } = colDef.entryDefs[currentEntry];

  return convertValueToDisplayUnit(cellData[currentEntry].value, cellData[currentEntry].unit, displayUnit);
}

function GroupCellEditor({
  value, onValueChange, stopEditing, onKeyDown
}) {
  const [currentValue, setCurrentValue] = useState(() => {
    const group = value?.group ?? 1;
    const subgroup = value?.subgroup ?? 1;
    return `${group}.${subgroup}`;
  });

  const inputRef = useRef(null);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    });
  }, []);

  useEffect(() => {
    // Focus on mount
    focusInput();
  }, [focusInput]);

  const commitValue = () => {
    const parts = currentValue.split('.');

    const groupStr = parts[0] || '';
    const subGroupStr = parts[1] || '';

    let group = parseInt(groupStr, 10);
    let subgroup = parseInt(subGroupStr, 10);

    if (Number.isNaN(group) || group <= 0) {
      group = 1;
    }

    if (Number.isNaN(subgroup) || subgroup <= 0) {
      subgroup = 1;
    }

    onValueChange({ group, subgroup });
    stopEditing();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitValue();
    } else if (e.key === 'Escape') {
      stopEditing();
    }
    if (onKeyDown) onKeyDown(e);
  };

  return (
    <input
      className="reaction-variation-input"
      ref={inputRef}
      type="text"
      value={currentValue}
      onChange={(e) => setCurrentValue(sanitizeGroupEntry(e.target.value))}
      onBlurCapture={commitValue}
      onKeyDownCapture={handleKeyDown}
    />
  );
}

GroupCellEditor.propTypes = {
  value: PropTypes.shape({
    group: PropTypes.number,
    subgroup: PropTypes.number,
  }).isRequired,
  onValueChange: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func.isRequired,
  stopEditing: PropTypes.bool.isRequired,
};

function GroupCellRenderer({ value: cellData }) {
  return groupNameAssembler(cellData);
}

GroupCellRenderer.propTypes = {
  value: PropTypes.shape({
    cellData: PropTypes.shape({
      group: PropTypes.number,
      subgroup: PropTypes.number
    })
  }).isRequired,
};

function MaterialRenderer({ value: cellData, colDef }) {
  const { entryDefs } = colDef;
  return (
    <ol className="list-group list-group-horizontal w-100">
      {Object.entries(entryDefs).map(([entry, entryDef]) => {
        const entryData = cellData[entry];
        return (
          entryData
          && typeof entryData === 'object'
          && 'value' in entryData
          && entryDef.isSelected ? (
            <MaterialEntry key={entry} entry={entry} isMain={entryDef.isMain}>
              {convertValueToDisplayUnit(entryData.value, entryData.unit, entryDef.displayUnit)}
            </MaterialEntry>
            ) : null
        );
      })}
    </ol>
  );
}

MaterialRenderer.propTypes = {
  value: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number.isRequired,
    unit: PropTypes.string.isRequired,
  })).isRequired,
  colDef: PropTypes.shape({
    entryDefs: PropTypes.objectOf(
      PropTypes.shape({
        isMain: PropTypes.bool.isRequired,
        isSelected: PropTypes.bool.isRequired,
        displayUnit: PropTypes.string.isRequired
      })
    ).isRequired
  }).isRequired
};

function MaterialParser({
  data: row, oldValue: cellData, newValue, colDef, context
}) {
  const currentEntry = getCurrentEntry(colDef.entryDefs);
  const { displayUnit } = colDef.entryDefs[currentEntry];
  let value = convertUnit(parseNumericString(newValue), displayUnit, cellData[currentEntry].unit);
  if (value < 0) {
    value = 0;
  }
  let updatedCellData = { ...cellData, [currentEntry]: { ...cellData[currentEntry], value } };

  switch (currentEntry) {
    case 'mass': {
      const amount = getMolFromGram(value, updatedCellData);
      const volume = getVolumeFromGram(value, updatedCellData);
      updatedCellData = {
        ...updatedCellData,
        amount: { ...updatedCellData.amount, value: amount },
        volume: { ...updatedCellData.volume, value: volume }
      };
      break;
    }
    case 'amount': {
      const mass = getGramFromMol(value, updatedCellData);
      const volume = getVolumeFromGram(mass, updatedCellData);
      updatedCellData = {
        ...updatedCellData,
        mass: { ...updatedCellData.mass, value: mass },
        volume: { ...updatedCellData.volume, value: volume }
      };
      break;
    }
    case 'volume': {
      const mass = getGramFromVolume(value, updatedCellData);
      const amount = getMolFromGram(mass, updatedCellData);
      updatedCellData = {
        ...updatedCellData,
        mass: { ...updatedCellData.mass, value: mass },
        amount: { ...updatedCellData.amount, value: amount }
      };
      break;
    }
    default:
      break;
  }
  if (updatedCellData.aux.isReference) {
    return updatedCellData;
  }

  const referenceMaterial = getReferenceMaterial(row);
  if (!referenceMaterial) {
    return updatedCellData;
  }

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
  const currentEntry = getCurrentEntry(colDef.entryDefs);
  const { displayUnit } = colDef.entryDefs[currentEntry];
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
      const volume = calculateGasVolume(
        amount,
        { part_per_million: concentration, temperature: { value: temperatureInKelvin, unit: 'K' } }
      );

      const catalyst = getCatalystMaterial(row);
      const catalystAmount = catalyst?.amount.value ?? 0;
      const turnoverNumber = calculateTON(amount, catalystAmount);

      const percentYield = computePercentYieldGas(amount, getFeedstockMaterial(row), vesselVolume);

      updatedCellData = {
        ...updatedCellData,
        mass: { ...updatedCellData.mass, value: mass },
        amount: { ...updatedCellData.amount, value: amount },
        volume: { ...updatedCellData.volume, value: volume },
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
  const currentEntry = getCurrentEntry(colDef.entryDefs);
  const { displayUnit } = colDef.entryDefs[currentEntry];
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
  if (!referenceMaterial) {
    return updatedCellData;
  }

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
      <span>{props.value || PLACEHOLDER_CELL_TEXT}</span>
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
              {`${getUserFacingEntryName(key)}: ${entry.value}${entry.unit ? ` ${entry.unit}` : ''}`}
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
    entryDefs: PropTypes.objectOf(
      PropTypes.shape({
        isMain: PropTypes.bool.isRequired,
        isSelected: PropTypes.bool.isRequired,
        displayUnit: PropTypes.string.isRequired
      })
    )
    ,
  }).isRequired,
};

function MaterialEntrySelection({ entryDefs, onChange }) {
  const [showModal, setShowModal] = useState(false);

  const handleEntrySelection = (item) => {
    const updated = { ...entryDefs };
    const wasMain = updated[item].isMain;
    const wasSelected = updated[item].isSelected;
    const selectedCount = Object.values(updated).filter((entry) => entry.isSelected).length;

    // Prevent deselection if this is the last selected item
    if (wasSelected && selectedCount <= 1) {
      return;
    }

    // Toggle the selection state
    updated[item] = {
      ...updated[item],
      isSelected: !wasSelected,
      isMain: wasSelected ? false : wasMain // Clear isMain if deselecting
    };

    // If we're deselecting the current main entry, find a new main entry
    if (wasMain && wasSelected) {
      const firstAvailable = Object.keys(updated).find(
        (key) => key !== item && updated[key].isSelected
      );
      if (firstAvailable) {
        updated[firstAvailable].isMain = true;
      }
    }

    onChange(updated);
  };

  const handleUnitChange = (item, unit) => {
    const updated = {
      ...entryDefs,
      [item]: {
        ...entryDefs[item],
        displayUnit: unit
      }
    };

    onChange(updated);
  };

  const handleMainEntryChange = (item) => {
    const updated = { ...entryDefs };

    Object.keys(updated).forEach((key) => {
      // Clear previous main entry
      if (updated[key].isMain) {
        updated[key].isMain = false;
      }
    });

    // Set new main entry
    updated[item].isMain = true;

    onChange(updated);
  };

  return (
    <div className="w-100">
      <div className="d-inline-block">
        <Button className="w-100" onClick={() => setShowModal(true)}>
          Entries
        </Button>
        <ol className="list-group list-group-horizontal w-100">
          {Object.entries(entryDefs).map(([entry, entryDef]) => (!entryDef.isSelected ? null : (
            <MaterialEntry key={entry} entry={entry} isMain={entryDef.isMain}>
              {getUserFacingEntryName(entry)}
              {' '}
              {entryDef.displayUnit === null ? '' : `(${getUserFacingUnit(entryDef.displayUnit)})` }
            </MaterialEntry>

          )))}
        </ol>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Select entries</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table striped bordered hover className="table-layout-fixed">
            <thead>
              <tr>
                <th>Selected</th>
                <th>Entry</th>
                <th>Unit</th>
                <th>Main entry (editable, sortable)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(entryDefs).map(([entry, entryDef]) => {
                const { units } = entryDef;
                return (
                  <tr key={entry}>
                    <td className="text-center">
                      <Form.Check
                        type="checkbox"
                        checked={entryDef.isSelected || false}
                        onChange={() => handleEntrySelection(entry)}
                      />
                    </td>
                    <td>{getUserFacingEntryName(entry)}</td>
                    <td>
                      {units.length > 1 ? (
                        <Form.Select
                          size="sm"
                          value={entryDef.displayUnit || ''}
                          onChange={(e) => handleUnitChange(entry, e.target.value)}
                        >
                          {units.map((unit) => (
                            <option key={unit} value={unit}>{getUserFacingUnit(unit)}</option>
                          ))}
                        </Form.Select>
                      ) : getUserFacingUnit(units[0])}
                    </td>
                    <td className="text-center">
                      <Form.Check
                        type="radio"
                        name="default"
                        checked={entryDef.isMain || false}
                        onChange={() => handleMainEntryChange(entry)}
                        disabled={!entryDef.isSelected}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

MaterialEntrySelection.propTypes = {
  entryDefs: PropTypes.objectOf(
    PropTypes.shape({
      isMain: PropTypes.bool.isRequired,
      isSelected: PropTypes.bool.isRequired,
      displayUnit: PropTypes.string.isRequired,
    })
  ).isRequired,
  onChange: PropTypes.func.isRequired,
};

function ToolHeader() {
  return (
    <span>Tools</span>
  );
}

function SortControl({ column, setSort }) {
  const [ascendingSort, setAscendingSort] = useState('inactive');
  const [descendingSort, setDescendingSort] = useState('inactive');
  const [noSort, setNoSort] = useState('inactive');

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

    return () => column.removeEventListener('sortChanged', onSortChanged);
  }, []);

  const onSortRequested = (order, event) => {
    setSort(order, event.shiftKey);
  };

  return (
    <div>
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
}

function MenuHeader({
  column, context, setSort, names, gasType = 'off'
}) {
  const { setColumnDefinitions } = context;
  const [name, setName] = useState(names[0]);
  const { field, entryDefs } = column.colDef;

  const onEntryDefChange = (updatedEntryDefs) => {
    setColumnDefinitions(
      {
        type: 'update_entry_defs',
        field,
        entryDefs: updatedEntryDefs,
        gasType
      }
    );
  };

  return (
    <div className="d-grid gap-1">
      <span
        className="ag-header-cell-text"
        onClick={() => setName(names[(names.indexOf(name) + 1) % names.length])}
      >
        {`${name} ${gasType !== 'off' ? `(${gasType})` : ''}`}
      </span>
      <SortControl column={column} setSort={setSort} />
      <MaterialEntrySelection entryDefs={entryDefs} onChange={onEntryDefChange} />
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

function GroupHeader({ column, setSort }) {
  return (
    <div className="d-grid gap-1">
      <span
        className="ag-header-cell-text"
      >
        Group
      </span>
      <SortControl column={column} setSort={setSort} />
    </div>
  );
}

GroupHeader.propTypes = {
  column: PropTypes.instanceOf(AgGridReact.column).isRequired,
  setSort: PropTypes.func.isRequired,
};

function ColumnSelection({ selectedColumns, availableColumns, onApply }) {
  const [showModal, setShowModal] = useState(false);
  const [currentColumns, setCurrentColumns] = useState(selectedColumns);

  useEffect(() => {
    // Remove currently selected columns that are no longer available.
    const updatedCurrentColumns = cloneDeep(currentColumns);

    Object.entries(updatedCurrentColumns).forEach(([columnGroup, columnIDs]) => {
      const { [columnGroup]: availableColumnIDsToLabels } = availableColumns;
      const availableColumnIDs = Object.keys(availableColumnIDsToLabels || {});
      updatedCurrentColumns[columnGroup] = columnIDs.filter((columnID) => availableColumnIDs.includes(columnID));
    });
    if (!isEqual(updatedCurrentColumns, currentColumns)) {
      setCurrentColumns(updatedCurrentColumns);
    }
  }, [availableColumns]);

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
          {Object.entries(availableColumns).map(([columnGroup, columnIDsToLabels]) => (
            <div key={columnGroup}>
              <h5>{toUpperCase(splitCamelCase(columnGroup))}</h5>
              <Select
                isMulti
                options={Object.entries(columnIDsToLabels).map(([id, label]) => ({ value: id, label }))}
                value={currentColumns[columnGroup]?.map((id) => ({ value: id, label: columnIDsToLabels[id] })) || []}
                onChange={handleSelectChange(columnGroup)}
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

function RemoveVariationsModal({ onRemoveAll }) {
  const [showModal, setShowModal] = useState(false);

  const handleClose = () => setShowModal(false);
  const handleShow = () => setShowModal(true);
  const handleConfirm = () => {
    onRemoveAll();
    handleClose();
  };

  return (
    <>
      <Button size="sm" variant="danger" onClick={handleShow} className="mb-2">
        <i className="fa fa-trash me-1" />
        {' '}
        Remove all variations
      </Button>

      <Modal show={showModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Removal</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to remove all variations?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Keep variations
          </Button>
          <Button variant="danger" onClick={handleConfirm}>
            Remove variations
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
  MaterialRenderer,
  MaterialFormatter,
  MaterialParser,
  GasParser,
  FeedstockParser,
  NoteCellRenderer,
  NoteCellEditor,
  MaterialOverlay,
  MenuHeader,
  ToolHeader,
  ColumnSelection,
  SegmentFormatter,
  SegmentParser,
  SegmentRenderer,
  SegmentSelectEditor,
  RemoveVariationsModal,
  GroupCellEditor,
  GroupCellRenderer,
  GroupHeader,
};
