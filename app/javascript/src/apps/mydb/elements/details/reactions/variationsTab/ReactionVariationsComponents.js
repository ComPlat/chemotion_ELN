/* eslint-disable react/display-name */
import React, {
  useState, useEffect, useMemo, useRef, useCallback
} from 'react';
import Select from 'react-select';
import {
  Button, ButtonGroup, Form, OverlayTrigger, Tooltip, Table
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import { cloneDeep, isEqual } from 'lodash';
import AppModal from 'src/components/common/AppModal';
import {
  getVariationsRowName, convertUnit,
  getUserFacingEntryName, convertGenericUnit, PLACEHOLDER_CELL_TEXT, sanitizeGroupEntry, DISPLAY_PRECISION,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import {
  getReferenceMaterial, getCatalystMaterial, getFeedstockMaterial, getMolFromGram, getGramFromMol,
  computeEquivalent, computePercentYield, computePercentYieldGas, getVolumeFromGram, getGramFromVolume
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import { parseNumericString } from 'src/utilities/MathUtils';
import {
  calculateGasMoles, calculateTON, calculateFeedstockMoles, calculateFeedstockVolume, calculateGasVolume
} from 'src/utilities/UnitsConversion';

function RowToolsCellRenderer({
  data: row, context
}) {
  const { reactionShortLabel, copyRow, removeRow } = context;
  return (
    <div>
      <ButtonGroup>
        <Button size="xsm" variant="secondary">{getVariationsRowName(reactionShortLabel, row.id)}</Button>
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
  const { displayUnit, entry } = colDef;
  let value = parseNumericString(newValue);
  if (entry !== 'temperature' && value < 0) {
    value = 0;
  }
  value = convertUnit(value, displayUnit, cellData.unit);
  const updatedCellData = { ...cellData, value };

  return updatedCellData;
}

function convertGenericValueToDisplayUnit(entryData, displayUnit) {
  const { quantity, value, unit } = entryData;
  const valueInDisplayUnit = convertGenericUnit(value, unit, displayUnit, quantity);

  return parseFloat(Number(valueInDisplayUnit).toPrecision(DISPLAY_PRECISION));
}

function SegmentParser({ oldValue: cellData, newValue, colDef }) {
  const { entry, displayUnit } = colDef;
  const entryData = cellData[entry];
  const updatedEntryData = { ...entryData, value: newValue };

  switch (entryData.type) {
    case 'system-defined': {
      const { quantity, unit } = entryData;
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

  return { ...cellData, [entry]: updatedEntryData };
}

function SegmentFormatter({ value: cellData, colDef }) {
  const { displayUnit, entry } = colDef;
  const entryData = cellData[entry];
  const { value, type } = entryData;
  const formattedValue = value ?? PLACEHOLDER_CELL_TEXT;

  switch (type) {
    case 'system-defined': {
      return convertGenericValueToDisplayUnit(entryData, displayUnit) ?? PLACEHOLDER_CELL_TEXT;
    }
    case 'select':
    case 'text':
    case 'integer':
    default: return formattedValue;
  }
}

function SegmentSelectEditor({
  value: cellData, colDef, onValueChange, stopEditing
}) {
  const { entry } = colDef;
  const entryData = cellData?.[entry];

  if (!entryData) return null;

  const { value: selected, options = [] } = entryData;

  const optionElements = useMemo(
    () => options.map((option) => <option key={option} value={option} selected={option === selected}>{option}</option>),
    [options, selected]
  );

  useEffect(() => stopEditing, [stopEditing]);

  const handleChange = (event) => {
    const updatedEntryData = { ...entryData, value: event.target.value };
    onValueChange({ ...cellData, [entry]: updatedEntryData });
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
    entry: PropTypes.string
  }).isRequired,
  onValueChange: PropTypes.func.isRequired,
  stopEditing: PropTypes.func.isRequired,
};

function convertValueToDisplayUnit(value, unit, displayUnit) {
  const valueInDisplayUnit = convertUnit(Number(value), unit, displayUnit);

  return parseFloat(Number(valueInDisplayUnit).toPrecision(DISPLAY_PRECISION));
}

function PropertyFormatter({ value: cellData, colDef: { displayUnit } }) {
  return convertValueToDisplayUnit(cellData.value, cellData.unit, displayUnit);
}

function MaterialFormatter({ value: cellData, colDef }) {
  const { displayUnit, entry } = colDef;

  return convertValueToDisplayUnit(cellData[entry].value, cellData[entry].unit, displayUnit);
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
  return `${cellData.group}.${cellData.subgroup}`;
}

GroupCellRenderer.propTypes = {
  value: PropTypes.shape({
    cellData: PropTypes.shape({
      group: PropTypes.number,
      subgroup: PropTypes.number
    })
  }).isRequired,
};

function MaterialParser({
  data: row, oldValue: cellData, newValue, colDef, context
}) {
  const { displayUnit, entry } = colDef;
  let value = convertUnit(parseNumericString(newValue), displayUnit, cellData[entry].unit);
  if (value < 0) {
    value = 0;
  }
  let updatedCellData = { ...cellData, [entry]: { ...cellData[entry], value } };

  switch (entry) {
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
  const { displayUnit, entry } = colDef;
  let value = convertUnit(parseNumericString(newValue), displayUnit, cellData[entry].unit);
  if (entry !== 'temperature' && value < 0) {
    value = 0;
  }
  let updatedCellData = { ...cellData, [entry]: { ...cellData[entry], value } };

  switch (entry) {
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
  const { displayUnit, entry } = colDef;
  let value = convertUnit(parseNumericString(newValue), displayUnit, cellData[entry].unit);
  if (value < 0) {
    value = 0;
  }
  let updatedCellData = { ...cellData, [entry]: { ...cellData[entry], value } };

  switch (entry) {
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
  const { data: { id }, value } = props;
  return (
    <OverlayTrigger
      placement="right"
      overlay={(
        <Tooltip id={`note-tooltip-${id}`}>
          double click to edit
        </Tooltip>
      )}
    >
      <span>{value || PLACEHOLDER_CELL_TEXT}</span>
    </OverlayTrigger>
  );
}

NoteCellRenderer.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.number.isRequired,
  }).isRequired,
  value: PropTypes.string,
};

NoteCellRenderer.defaultProps = {
  value: '',
};

function NoteCellEditor({
  data: row,
  value,
  onValueChange,
  stopEditing,
  context
}) {
  const [note, setNote] = useState(value);
  const { reactionShortLabel } = context;
  const textareaRef = useRef(null);

  const onClose = () => {
    stopEditing();
  };

  const onSave = () => {
    onValueChange(note);
    stopEditing();
  };

  const cellContent = (
    <AppModal
      show
      onHide={onClose}
      title={`Edit note for ${getVariationsRowName(reactionShortLabel, row.id)}`}
      primaryActionLabel="Save"
      onPrimaryAction={onSave}
      onEntered={() => textareaRef.current?.focus()}
    >
      <Form.Control
        as="textarea"
        ref={textareaRef}
        placeholder="Start typing your note..."
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
    </AppModal>
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
        {aux?.isReference && <div>reference</div>}
        {aux?.coefficient !== null && (
        <div>
          coefficient:
          {' '}
          {aux.coefficient.toPrecision(DISPLAY_PRECISION)}
        </div>
        )}
        {aux?.molecularWeight !== null && (
        <div>
          molar mass:
          {' '}
          {aux.molecularWeight.toPrecision(DISPLAY_PRECISION)}
          {' '}
          g/mol
        </div>
        )}
        {Object.entries(cellData).map(
          ([key, entry]) => (entry && typeof entry === 'object' && 'value' in entry && entry.value !== null ? (
            <div key={key}>
              {(() => {
                const displayValue = typeof entry.value === 'number'
                  ? parseFloat(entry.value.toPrecision(DISPLAY_PRECISION))
                  : entry.value;
                const unit = entry.unit ? ` ${entry.unit}` : '';
                return `${getUserFacingEntryName(key)}: ${displayValue}${unit}`;
              })()}
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
};

function EntrySelectionHeader({
  columnGroup, names, gasType, context, displayName
}) {
  const { parent, groupId } = columnGroup;
  const { setColumnDefinitions } = context;

  const [showModal, setShowModal] = useState(false);
  const [entryColDefs, setEntryColDefs] = useState([]);

  const setAttribute = (attribute, update) => {
    setColumnDefinitions({
      type: 'set_group_col_def_attribute',
      groupId: parent.groupId,
      subGroupId: groupId,
      attribute,
      update,
    });
  };

  const handleApply = () => {
    setAttribute('children', entryColDefs);
    setShowModal(false);
  };

  const handleClose = () => {
    setShowModal(false);
  };

  const handleEntrySelection = (entry) => {
    setEntryColDefs((prevEntryColDefs) => {
      const newColDefs = [...prevEntryColDefs];
      const entryIndex = newColDefs.findIndex((e) => e.entry === entry);

      if (entryIndex === -1) return prevEntryColDefs;

      const entryColDef = newColDefs[entryIndex];
      const isSelected = !entryColDef.hide;
      const nSelected = newColDefs.filter((e) => e.hide === false).length;

      // Prevent deselection if this is the only selected entry
      if (isSelected && nSelected === 1) {
        return prevEntryColDefs;
      }

      newColDefs[entryIndex] = { ...entryColDef, hide: !entryColDef.hide };
      return newColDefs;
    });
  };

  const handleNameChange = (name) => {
    setAttribute('headerName', name);
  };

  return (
    <div>
      <div className="d-flex align-items-center w-100">
        <button
          type="button"
          className="ag-header-group-cell-label btn btn-link p-0 text-start text-decoration-none"
          onClick={() => handleNameChange(names[(names.indexOf(displayName) + 1) % names.length] ?? displayName)}
        >
          {`${displayName} ${gasType && gasType !== 'off' ? `(${gasType})` : ''}`}
        </button>
        <Button
          variant="link"
          className="p-0 ms-1 lh-1"
          onClick={() => { setEntryColDefs(columnGroup.getColGroupDef().children); setShowModal(true); }}
        >
          <i className="fa fa-pencil" />
        </Button>
      </div>
      <AppModal
        show={showModal}
        onHide={handleClose}
        title={`Select entries for ${displayName}`}
        size="lg"
        primaryActionLabel="Apply"
        onPrimaryAction={handleApply}
      >
        <Table striped bordered hover className="table-layout-fixed">
          <thead>
            <tr>
              <th>Selected</th>
              <th>Entry</th>
            </tr>
          </thead>
          <tbody>
            {entryColDefs.map((entryColDef) => {
              const { entry, hide } = entryColDef;
              return (
                <tr key={entry}>
                  <td className="text-center">
                    <Form.Check
                      type="checkbox"
                      checked={!hide}
                      onChange={() => handleEntrySelection(entry)}
                    />
                  </td>
                  <td>{getUserFacingEntryName(entry)}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </AppModal>
    </div>
  );
}

EntrySelectionHeader.propTypes = {
  columnGroup: PropTypes.shape({
    parent: PropTypes.shape({
      groupId: PropTypes.string.isRequired,
    }).isRequired,
    groupId: PropTypes.string.isRequired,
    getColGroupDef: PropTypes.func.isRequired,
  }).isRequired,
  names: PropTypes.arrayOf(PropTypes.string),
  gasType: PropTypes.string,
  context: PropTypes.shape({
    setColumnDefinitions: PropTypes.func.isRequired,
  }).isRequired,
  displayName: PropTypes.string.isRequired,
};

EntrySelectionHeader.defaultProps = {
  names: [],
  gasType: '',
};

function ToolHeader() {
  return (
    <span>Tools</span>
  );
}

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

      <AppModal
        show={showModal}
        onHide={() => setShowModal(false)}
        animation={false}
        title="Column Selection"
        primaryActionLabel="Apply"
        onPrimaryAction={handleApply}
      >
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
      </AppModal>
    </>
  );
}

ColumnSelection.propTypes = {
  selectedColumns: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
  availableColumns: PropTypes.objectOf(PropTypes.objectOf(PropTypes.string)).isRequired,
  onApply: PropTypes.func.isRequired,
};

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

      <AppModal
        show={showModal}
        onHide={handleClose}
        animation={false}
        title="Confirm Removal"
        closeLabel="Cancel"
        primaryActionLabel="Remove variations"
        onPrimaryAction={handleConfirm}
      >
        Are you sure you want to remove all variations?
      </AppModal>
    </>
  );
}

RemoveVariationsModal.propTypes = {
  onRemoveAll: PropTypes.func.isRequired,
};

function UnitToggleHeader({ column, context, api }) {
  const { units, entry } = column.getColDef();
  const { setColumnDefinitions } = context;
  const [displayUnit, setDisplayUnit] = useState(() => column.getColDef().displayUnit);
  const entryLabel = getUserFacingEntryName(entry);
  const unitLabel = displayUnit || null;
  const isToggleable = units && units.filter(Boolean).length > 1;

  const handleToggle = (e) => {
    e.stopPropagation();
    const nextUnit = units[(units.indexOf(displayUnit) + 1) % units.length];
    setDisplayUnit(nextUnit);
    setColumnDefinitions({
      type: 'set_leaf_col_def_attribute',
      colId: column.getColId(),
      attribute: 'displayUnit',
      update: nextUnit,
    });
    setTimeout(() => api.refreshCells({ force: true, columns: [column.getColId()] }), 0);
  };

  return (
    <div className="ag-header-cell-text">
      <span>{entryLabel}</span>
      {' '}
      {unitLabel && (
        isToggleable
          ? <Button size="xsm" onClick={handleToggle}>{unitLabel}</Button>
          : <span>{` (${unitLabel})`}</span>
      )}
    </div>
  );
}

UnitToggleHeader.propTypes = {
  column: PropTypes.shape({
    getColDef: PropTypes.func.isRequired,
    getColId: PropTypes.func.isRequired,
  }).isRequired,
  context: PropTypes.shape({
    setColumnDefinitions: PropTypes.func.isRequired,
  }).isRequired,
  api: PropTypes.shape({
    refreshCells: PropTypes.func.isRequired,
  }).isRequired,
};

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
  ToolHeader,
  ColumnSelection,
  SegmentFormatter,
  SegmentParser,
  SegmentSelectEditor,
  RemoveVariationsModal,
  GroupCellEditor,
  GroupCellRenderer,
  EntrySelectionHeader,
  UnitToggleHeader,
};
