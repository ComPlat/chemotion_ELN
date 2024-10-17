/* eslint-disable react/display-name */
import React, { useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  Button, ButtonGroup, Badge, Modal, Form, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import {
  getVariationsRowName,
  convertUnit
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
      <Badge bg='secondary' className='me-2'>{getVariationsRowName(reactionShortLabel, variationsRow.id)}</Badge>
      <ButtonGroup>
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
  const { displayUnit } = colDef.currentEntryWithDisplayUnit;
  const valueInDisplayUnit = convertUnit(Number(cellData.value), cellData.unit, displayUnit);

  return `${Number(valueInDisplayUnit).toPrecision(4)}`;
}

function PropertyParser({
  oldValue: cellData, newValue, colDef
}) {
  const { entry, displayUnit } = colDef.currentEntryWithDisplayUnit;
  let value = parseNumericString(newValue);
  if (entry !== 'temperature' && value < 0) {
    value = 0;
  }
  value = convertUnit(value, displayUnit, cellData.unit);
  const updatedCellData = { ...cellData, value };

  return updatedCellData;
}

function MaterialFormatter({ value: cellData, colDef }) {
  const { entry, displayUnit } = colDef.currentEntryWithDisplayUnit;
  const valueInDisplayUnit = convertUnit(Number(cellData[entry].value), cellData[entry].unit, displayUnit);

  return `${Number(valueInDisplayUnit).toPrecision(4)}`;
}

function MaterialParser({
  data: variationsRow, oldValue: cellData, newValue, colDef, context
}) {
  const { field } = colDef;
  const { entry, displayUnit } = colDef.currentEntryWithDisplayUnit;
  const columnGroup = field.split('.')[0];
  let value = convertUnit(parseNumericString(newValue), displayUnit, cellData[entry].unit);
  if (value < 0) {
    value = 0;
  }
  let updatedCellData = { ...cellData, [entry]: { ...cellData[entry], value } };

  if (entry === 'mass') {
    // Adapt amount to updated mass.
    const amount = getMolFromGram(value, updatedCellData);
    updatedCellData = { ...updatedCellData, amount: { ...updatedCellData.amount, value: amount } };
  }
  if (entry === 'amount') {
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

export {
  RowToolsCellRenderer,
  EquivalentFormatter,
  EquivalentParser,
  PropertyFormatter,
  PropertyParser,
  MaterialFormatter,
  MaterialParser,
  NoteCellRenderer,
  NoteCellEditor
};
