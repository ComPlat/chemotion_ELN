/* eslint-disable react/display-name */
import { AgGridReact } from 'ag-grid-react';
import React, {
  useRef, forwardRef, useState, useReducer, useEffect, useImperativeHandle, useCallback
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Button, FormGroup, ControlLabel, ButtonGroup,
  OverlayTrigger, Tooltip, Form, Badge, DropdownButton, MenuItem
} from 'react-bootstrap';
import _ from 'lodash';
import {
  createVariationsRow, temperatureUnits, durationUnits, massUnits, volumeUnits,
  convertUnit, materialTypes, computeEquivalent, getReferenceMaterial, getMolFromGram, getGramFromMol
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

function RowToolsCellRenderer({ data: variationRow, copyRow, removeRow }) {
  return (
    <div>
      <Badge>{variationRow.id.substring(0, 5)}</Badge>
      {' '}
      <ButtonGroup>
        <Button onClick={() => copyRow(variationRow)}><i className="fa fa-copy" /></Button>
        <Button onClick={() => removeRow(variationRow)}><i className="fa fa-trash" /></Button>
      </ButtonGroup>
    </div>
  );
}

function CellRenderer({ value: cellData, enableEquivalent }) {
  const { value = '', unit = 'None', aux = {} } = cellData ?? {};
  let cellContent = `${Number(value) ? Number(value).toFixed(6) : 'NaN'} [${unit}]`;
  if (enableEquivalent) {
    cellContent += `; ${Number(aux.equivalent) ? Number(aux.equivalent).toFixed(6) : 'NaN'} [Equiv]`;
  }

  let overlayContent = aux.coefficient ? `Coeff: ${aux.coefficient}` : '';
  overlayContent += aux.isReference ? '; Ref' : '';
  overlayContent += aux.yield ? `; Yield: ${aux.yield.toFixed(0)}%` : '';
  overlayContent += aux.molecularWeight ? `; Molar mass: ${aux.molecularWeight.toFixed(2)} g/mol` : '';
  if (!overlayContent) {
    return cellContent;
  }

  const overlay = (
    <Tooltip>
      {overlayContent}
    </Tooltip>
  );
  return (
    <OverlayTrigger placement="bottom" overlay={overlay}>
      <div>
        {cellContent}
      </div>
    </OverlayTrigger>
  );
}

const cellComparator = (item1, item2) => {
  const { value: value1, unit: unit1 } = item1;
  const { value: value2, unit: unit2 } = item2;
  if (unit1 !== unit2) {
    return 0;
  }
  return value1 - value2;
};

const cellEditorReducer = (cellData, action) => {
  switch (action.type) {
    case 'set-value': {
      const newValue = action.payload;
      // Non-reference materials require an update to their own equivalent only; those updates are applied here.
      // Reference materials require updates to other materials' equivalents, i.e., cell's that aren't currently edited;
      // those updates are handled in the Reaction model (src/models/Reaction.js).
      if (!action.enableEquivalent) {
        return { ...cellData, value: newValue };
      }

      const newEquivalent = (!cellData.aux.isReference)
        ? computeEquivalent({ value: newValue, ...cellData }, action.referenceMaterial) : cellData.aux.equivalent;
      return { ...cellData, value: newValue, aux: { ...cellData.aux, equivalent: newEquivalent } };
    }
    case 'set-unit': {
      const newValue = convertUnit(cellData.value, cellData.unit, action.payload);
      return { ...cellData, value: newValue, unit: action.payload };
    }
    case 'set-equivalent': {
      const newEquivalent = action.payload;

      const referenceMol = getMolFromGram(
        convertUnit(action.referenceMaterial.value, action.referenceMaterial.unit, 'g'),
        action.referenceMaterial
      );
      const newValue = convertUnit(getGramFromMol(referenceMol * newEquivalent, cellData), 'g', cellData.unit);
      return { ...cellData, value: newValue, aux: { ...cellData.aux, equivalent: newEquivalent } };
    }
    default:
      return cellData;
  }
};

const CellEditor = forwardRef(({
  data: variationRow, value, enableEquivalent, allowNegativeValue, unitOptions,
}, ref) => {
  const [cellData, dispatch] = useReducer(cellEditorReducer, value);
  const referenceMaterial = getReferenceMaterial(variationRow);
  const refInput = useRef(null);

  const equivalentEditor = (enableEquivalent) ? (
    <div>
      <input
        type="number"
        ref={refInput}
        value={cellData.aux.equivalent}
        min={0}
        onChange={(event) => dispatch({ type: 'set-equivalent', payload: event.target.value, referenceMaterial })}
        disabled={cellData.aux.isReference}
      />
      {' '}
      <span>Equiv</span>
    </div>
  ) : null;

  const valueWithUnitEditor = (
    <div>
      <input
        type="number"
        ref={refInput}
        value={cellData.value}
        min={allowNegativeValue ? undefined : 0}
        onChange={(event) => dispatch({
          type: 'set-value',
          payload: event.target.value,
          referenceMaterial,
          enableEquivalent
        })}
      />
      <DropdownButton title={cellData.unit}>
        {unitOptions.map(
          (option) => (
            <MenuItem
              key={option}
              onSelect={() => dispatch({ type: 'set-unit', payload: option })}
            >
              {option}
            </MenuItem>
          )
        )}
      </DropdownButton>
    </div>
  );

  const cellContent = (
    <div>
      { valueWithUnitEditor }
      { equivalentEditor }
    </div>
  );

  useEffect(() => {
    // focus on the input
    refInput.current.focus();
  }, []);

  useImperativeHandle(ref, () => ({
    getValue() {
      // Final value to send to the grid, on completion of editing.
      return cellData;
    },

    isCancelAfterEnd() {
      // Gets called once when editing is finished.
      // If you return true, then the result of the edit will be ignored.
      const valueIsInvalid = (allowNegativeValue) ? false : cellData.value < 0;
      const equivalentIsInvalid = enableEquivalent ? cellData.aux.equivalent < 0 : false;
      return valueIsInvalid || equivalentIsInvalid;
    }
  }));

  return cellContent;
});

function getMaterialHeaderIdentifier(material, identifier) {
  const fallbackIdentifier = `ID: ${material.id.toString()}`;
  switch (identifier) {
    case 'ext. label':
      return material.external_label || fallbackIdentifier;
    case 'name':
      return material.name || fallbackIdentifier;
    case 'short label':
      return material.short_label || fallbackIdentifier;
    case 'sum formula':
      return material?.molecule.sum_formular || fallbackIdentifier;
    case 'iupac name':
      return material?.molecule.iupac_name || fallbackIdentifier;
    default:
      return fallbackIdentifier;
  }
}

export default function ReactionVariations({ reaction, onEditVariations }) {
  // Presentation layer.
  // All logic regarding variations lives in the Reaction model (src/models/Reaction.js).

  const gridRef = useRef();

  const [materialHeaderIdentifier, setMaterialHeaderIdentifier] = useState('ext. label');

  function addRow() {
    const newRow = createVariationsRow(reaction, uuidv4());
    onEditVariations(
      [...reaction.variations, newRow]
    );
  }

  function copyRow(data) {
    const copiedRow = _.cloneDeep(data);
    copiedRow.id = uuidv4();
    onEditVariations(
      [...reaction.variations, copiedRow]
    );
  }

  function removeRow(data) {
    onEditVariations(reaction.variations.filter((row) => row.id !== data.id));
  }

  const updateRow = useCallback(({ data: oldRow, colDef, newValue }) => {
    const { field } = colDef;
    const updatedRow = { ...oldRow };
    _.set(updatedRow, field, newValue);
    onEditVariations(
      reaction.variations.map((row) => (row.id === oldRow.id ? updatedRow : row))
    );
  }, [reaction]);

  const columnDefs = [
    {
      field: '',
      cellRenderer: RowToolsCellRenderer,
      cellRendererParams: { copyRow, removeRow },
      lockPosition: 'left',
      editable: false,
      sortable: false,
      resizable: false,
    },

    {
      headerName: 'Properties',
      groupId: 'Properties',
      marryChildren: true,
      children: [
        {
          headerName: 'Temperature',
          field: 'properties.temperature',
          cellEditorParams: { unitOptions: temperatureUnits, allowNegativeValue: true },
        },
        {
          headerName: 'Duration',
          field: 'properties.duration',
          cellEditorParams: { unitOptions: durationUnits },
        },
      ]
    },
  ].concat(
    Object.entries(materialTypes).map(([materialType, { label, reactionAttributeName }]) => ({
      headerName: label,
      groupId: label,
      marryChildren: true,
      children: reaction[reactionAttributeName].map(
        (material) => ({
          field: `${materialType}.${material.id}`, // must be unique
          headerName: getMaterialHeaderIdentifier(material, materialHeaderIdentifier),
          cellEditorParams: {
            unitOptions: materialType === 'solvents' ? volumeUnits : massUnits,
            enableEquivalent: ['startingMaterials', 'reactants'].includes(materialType)
          },
          cellRendererParams: { enableEquivalent: ['startingMaterials', 'reactants'].includes(materialType) },
        })
      )
    }))
  );

  return (
    <div>
      <Form inline>
        <OverlayTrigger placement="bottom" overlay={<Tooltip>Add row with data from current reaction scheme.</Tooltip>}>
          <Button onClick={() => addRow()}>Add row</Button>
        </OverlayTrigger>
        {' '}
        <FormGroup>
          <ControlLabel>Identify materials by</ControlLabel>
          {' '}
          <DropdownButton
            title={materialHeaderIdentifier}
          >
            {['name', 'ext. label', 'short label', 'sum formula', 'iupac name'].map(
              (identifier) => (
                <MenuItem
                  key={identifier}
                  onSelect={() => setMaterialHeaderIdentifier(identifier)}
                >
                  {identifier}
                </MenuItem>
              )
            )}
          </DropdownButton>
        </FormGroup>
      </Form>

      <div style={{ height: '50vh' }} className="ag-theme-alpine">
        <AgGridReact
          ref={gridRef}
          rowData={reaction.variations}
          rowDragEntireRow
          rowDragManaged
          columnDefs={columnDefs}
          readOnlyEdit
          onCellEditRequest={updateRow}
          defaultColDef={{
            editable: true,
            sortable: true,
            resizable: true,
            comparator: cellComparator,
            cellEditor: CellEditor,
            cellEditorParams: { enableEquivalent: false, allowNegativeValue: false },
            cellEditorPopup: true,
            cellRenderer: CellRenderer,
            cellRendererParams: { enableEquivalent: false },
            wrapHeaderText: true,
            autoHeaderHeight: true,
          }}
        />
      </div>
    </div>
  );
}
