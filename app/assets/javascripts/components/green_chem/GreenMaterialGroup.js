import React, { PropTypes } from 'react';
import _ from 'lodash';
import { AgGridReact } from 'ag-grid-react';
import { Checkbox } from 'react-bootstrap';

import Sample from '../models/Sample';
import SampleName from '../common/SampleName';

function floatFormatter(params) {
  return (params.value || 0).toFixed(2);
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
    <div className="waste-chkbx">
      <Checkbox
        checked={material.waste || false}
        onChange={() => toggleWaste(material)}
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
    setTimeout(() => {
      this.api.sizeColumnsToFit();
      this.api.resetRowHeights();
    }, 0);
  }

  onCoefficientChanged(params) {
    const { materials, onChange } = this.props;
    const material = materials[params.rowIndex];
    material.coefficient = params.value;

    onChange();
  }

  toggleWaste(material) {
    const { materials, onChange } = this.props;
    material.waste = !(material.waste || false);

    onChange();
  }

  render() {
    const {
      group, materials
    } = this.props;
    if (materials.length === 0) return <span />;

    const isProduct = group === 'products';
    const contents = [];

    const columnDefs = [
      {
        headerName: _.startCase(group),
        width: 160,
        cellRendererFramework: MaterialNameWithIupac,
        cellRendererParams: { group },
      },
      { headerName: "Mass", field: "amount_g", valueFormatter: floatFormatter },
      {
        headerName: "Volume",
        field: "amount_l",
        valueFormatter: floatFormatter,
        width: 90,
      },
      { headerName: "Moles", field: "amount_mol", valueFormatter: floatFormatter },
      {
        headerName: 'Equiv.',
        field: 'equivalent',
        valueFormatter: floatFormatter
      },
      {
        headerName: 'Waste',
        field: 'waste',
        width: 77,
        cellRendererFramework: WasteCheckbox,
        cellRendererParams: { toggleWaste: this.toggleWaste },
      },
      {
        headerName: 'Coeff',
        field: 'coefficient',
        width: 72,
        editable: true,
        cellEditor: 'agTextCellEditor',
      },
    ];

    const defaultColDef = {
      editable: false,
      width: 72,
      autoHeight: true,
    };

    return (
      <div className="reaction-scheme ag-theme-balham">
        <AgGridReact
          enableColResize
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={this.onGridReady}
          rowData={materials}
          domLayout="autoHeight"
          onCellValueChanged={this.onCoefficientChanged}
        />
      </div>
    );
  }
}

GreenMaterialGroup.propTypes = {
  group: PropTypes.string.isRequired,
  materials: PropTypes.arrayOf(PropTypes.instanceOf(Sample)).isRequired,
  onChange: PropTypes.func.isRequired,
};
