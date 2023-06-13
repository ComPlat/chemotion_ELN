/* eslint-disable react/display-name */
import { AgGridReact } from 'ag-grid-react';
import React, {
  useRef, forwardRef, useState, useEffect, useImperativeHandle
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  ToggleButtonGroup, ToggleButton, Button, FormGroup, Radio, ControlLabel, ButtonGroup,
  OverlayTrigger
} from 'react-bootstrap';
import _ from 'lodash';
import { iupacNameTooltip } from 'src/apps/mydb/elements/details/reactions/schemeTab/Material';
import { getMaterialData } from 'src/apps/mydb/elements/details/reactions/variationsTab/utils';

function MaterialHeader({ material }) {
  return (
    <OverlayTrigger placement="bottom" overlay={iupacNameTooltip(material)}>
      <div>
        {material.external_label || material.short_label || material.id.toString()}
      </div>
    </OverlayTrigger>
  );
}

function RowToolsCellRenderer({ data, copyRow, removeRow }) {
  return (
    <ButtonGroup>
      <Button onClick={() => copyRow(data)}>Copy</Button>
      <Button onClick={() => removeRow(data)}>Remove</Button>
    </ButtonGroup>
  );
}

const CellRenderer = (props) => {
  const { value = '', unit = 'None', aux = {} } = props.value ?? {};
  let cellContent = `${Number(value) ? Number(value).toFixed(3) : 'NaN'} [${unit}]`;
  if (aux.coefficient) {
    cellContent += `; Coeff: ${aux.coefficient}`;
  }
  if (aux.isReference) {
    cellContent += '; Ref';
  }
  if (aux.yield) {
    cellContent += `; Yield: ${aux.yield}`;
  }
  return cellContent;
};

const CellEditor = forwardRef((props, ref) => {
  const { value = '', unit = 'None', aux = {} } = props.value ?? {};
  const [editedValue, setEditedValue] = useState(value);
  const refInput = useRef(null);

  useEffect(() => {
    // focus on the input
    refInput.current.focus();
  }, []);

  useImperativeHandle(ref, () => ({
    getValue() {
      // final value to send to the grid, on completion of editing
      return { value: editedValue, unit, aux };
    },

    isCancelAfterEnd() {
      // validate edit here: return true to declare edit invalid and keep previous value
      return false;
    }
  }));

  return (
    <input
      type="number"
      ref={refInput}
      value={editedValue}
      onChange={(event) => setEditedValue(event.target.value)}
      style={{ width: '100%' }}
      disabled={aux.isReference}
    />
  );
});

export default function ReactionVariations({ reaction, onEditVariations }) {
  const gridRef = useRef();

  const togglableColumnGroups = ['Properties', 'Starting Materials', 'Reactants', 'Products'];

  const [materialUnit, setMaterialUnit] = useState('Equiv');

  function addRow() {
    const { dispValue: durationValue = '', dispUnit: durationUnit = 'None' } = reaction.durationDisplay ?? {};
    const { userText: temperatureValue = '', valueUnit: temperatureUnit = 'None' } = reaction.temperature ?? {};
    const newRow = {
      id: uuidv4(),
      properties: {
        temperature: {
          value: temperatureValue, unit: temperatureUnit
        },
        duration: {
          value: durationValue, unit: durationUnit
        }
      },
      startingMaterials: reaction.starting_materials.reduce((a, v) => (
        { ...a, [v.id]: getMaterialData(v, materialUnit) }), {}),
      reactants: reaction.reactants.reduce((a, v) => (
        { ...a, [v.id]: getMaterialData(v, materialUnit) }), {}),
      products: reaction.products.reduce((a, v) => (
        { ...a, [v.id]: getMaterialData(v, 'Amount') }), {})
    };
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
    onEditVariations(reaction.variations.filter((row) => row !== data));
  }

  function toggleColumnGroupVisibility(columnGroupsToDisplay) {
    togglableColumnGroups.forEach((column) => {
      const group = gridRef.current.columnApi.getProvidedColumnGroup(column);
      group.children.forEach(
        (child) => gridRef.current.columnApi
          .setColumnVisible(child.colId, columnGroupsToDisplay.includes(column))
      );
    });
  }

  const columnDefs = [
    {
      field: '',
      cellRenderer: RowToolsCellRenderer,
      cellRendererParams: { copyRow, removeRow },
      editable: false,
    },

    {
      headerName: 'Properties',
      groupId: 'Properties',
      children: [
        {
          headerName: 'Temperature',
          field: 'properties.temperature',
        },
        {
          headerName: 'Duration',
          field: 'properties.duration',
        },
      ]
    },
    {
      headerName: 'Starting Materials',
      groupId: 'Starting Materials',
      children: reaction.starting_materials.map(
        (material) => ({
          field: `startingMaterials.${material.id}`, // must be unique
          headerComponent: MaterialHeader,
          headerComponentParams: { material },
        })
      )
    },
    {
      headerName: 'Reactants',
      groupId: 'Reactants',
      children: reaction.reactants.map(
        (material) => ({
          field: `reactants.${material.id}`,
          headerComponent: MaterialHeader,
          headerComponentParams: { material },
        })
      )
    },
    {
      headerName: 'Products',
      groupId: 'Products',
      children: reaction.products.map(
        (material) => ({
          field: `products.${material.id}`,
          headerComponent: MaterialHeader,
          headerComponentParams: { material },
        })
      )
    }
  ];

  return (
    <div>
      <Button onClick={() => addRow()}>+</Button>
      <ToggleButtonGroup type="checkbox" defaultValue={togglableColumnGroups} onChange={(columnGroupsToDisplay) => toggleColumnGroupVisibility(columnGroupsToDisplay)}>
        {togglableColumnGroups.map(
          (column) => <ToggleButton key={column} value={column}>{column}</ToggleButton>
        )}
      </ToggleButtonGroup>
      <FormGroup>
        <ControlLabel>Material Unit</ControlLabel>
        {['Equiv', 'Amount'].map(
          (unit) => (
            <Radio
              key={unit}
              checked={materialUnit === unit}
              onChange={() => setMaterialUnit(unit)}
            >
              {unit}
            </Radio>
          )
        )}
      </FormGroup>
      <div style={{ height: '50vh' }} className="ag-theme-alpine">
        <AgGridReact
          ref={gridRef}
          rowData={reaction.variations}
          columnDefs={columnDefs}
          defaultColDef={{
            editable: true,
            cellEditor: CellEditor,
            cellRenderer: CellRenderer,
            wrapHeaderText: true,
            autoHeaderHeight: true,
            wrapText: true,
            autoHeight: true,
          }}
        />
      </div>
    </div>
  );
}
