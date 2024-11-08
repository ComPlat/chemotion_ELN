import React from 'react';
import PropTypes from 'prop-types';
import { Form } from 'react-bootstrap';
import _ from 'lodash';
import { AgGridReact } from 'ag-grid-react';

import Sample from 'src/models/Sample';
import SampleName from 'src/components/common/SampleName';

function floatFormatter(params) {
  if (isNaN(params.value)) {
    return 0;
  }
  return (params.value || 0).toFixed(4);
}

function MaterialNameWithIupac({ group, node }) {
  const material = node.data;
  const skipIupacName = (
    group === 'reactants' ||
    group === 'solvents' ||
    group === 'purification_solvents'
  );

  let materialName = '';
  let moleculeIupacName = '';

  if (skipIupacName) {
    materialName = material.molecule_iupac_name || material.name;
    if (group === 'solvents' || group === 'purification_solvents') {
      materialName = material.external_label || '';
    }
    if (materialName === null || materialName === '') {
      materialName = <SampleName sample={material} />;
    }
  } else {
    moleculeIupacName = material.molecule_iupac_name;
    materialName = material.title() === '' ?
      <SampleName sample={material} /> :
      material.title();
  }

  return (
    <div>
      <div>{materialName}</div>
      <div>{moleculeIupacName}</div>
    </div>
  );
}

function WasteCheckbox({ node, toggleWaste }) {
  const material = node.data;
  return (
    <div>
      <Form.Check
        type='checkbox'
        checked={material.waste || false}
        onChange={() => toggleWaste(material)}
        className='mx-4 mt-2'
      />
    </div>
  );
}

export default class GreenMaterialGroup extends React.Component {
  constructor() {
    super();

    this.onGridReady = this.onGridReady.bind(this);
    this.onCoefficientChanged = this.onCoefficientChanged.bind(this);
    this.toggleWaste = this.toggleWaste.bind(this);
    this.autoSizeAll = this.autoSizeAll.bind(this);
  }

  componentDidUpdate() {
    this.autoSizeAll();
  }

  onGridReady(params) {
    this.api = params.api;
  }

  autoSizeAll() {
    if (!this.api) return;
    if (this.api.isDestroyed()) return;
    this.api.sizeColumnsToFit();
  }

  onCoefficientChanged(params) {
    const { materials, onChange } = this.props;
    const material = materials[params.rowIndex];
    material.coefficient = params.value;

    onChange();
  }

  toggleWaste(material) {
    const { onChange } = this.props;
    material.waste = !(material.waste || false);
    this.api.refreshCells();
    onChange();
  }

  render() {
    const {
      group, materials
    } = this.props;
    if (materials && materials.length === 0) return <></>;

    const columnDefs = [
      {
        headerName: _.startCase(group),
        minWidth: 170,
        cellRenderer: MaterialNameWithIupac,
        cellRendererParams: { group },
      },
      {
        headerName: "Mass",
        field: "amount_g",
        valueFormatter: floatFormatter
      },
      {
        headerName: "Volume",
        field: "amount_l",
        valueFormatter: floatFormatter,
        minWidth: 86,
      },
      {
        headerName: "Moles",
        field: "amount_mol",
        minWidth: 76,
        valueFormatter: floatFormatter,
      },
      {
        headerName: 'Equiv.',
        field: 'equivalent',
        minWidth: 76,
        valueFormatter: floatFormatter
      },
      {
        headerName: group === 'products' ? 'Waste' : 'Recyclable',
        field: 'waste',
        minWidth: 104,
        cellRenderer: WasteCheckbox,
        cellRendererParams: { toggleWaste: this.toggleWaste },
      },
      {
        headerName: 'Coeff',
        field: 'coefficient',
        minWidth: 72,
        editable: true,
        cellEditor: 'agTextCellEditor',
      },
    ];

    const defaultColDef = {
      editable: false,
      flex: 1,
      minWidth: 71,
      autoHeight: true,
      resizable: true,
    };

    return (
      <AgGridReact
        columnDefs={columnDefs}
        autoSizeStrategy={{ type: 'fitGridWidth' }}
        defaultColDef={defaultColDef}
        onGridReady={this.onGridReady}
        rowData={materials}
        domLayout="autoHeight"
        onCellValueChanged={this.onCoefficientChanged}
      />
    );
  }
}

GreenMaterialGroup.propTypes = {
  group: PropTypes.string.isRequired,
  materials: PropTypes.arrayOf(PropTypes.instanceOf(Sample)).isRequired,
  onChange: PropTypes.func.isRequired,
};
