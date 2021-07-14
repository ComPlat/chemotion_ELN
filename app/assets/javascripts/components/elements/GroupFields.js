/* eslint-disable react/forbid-prop-types */
import { AgGridReact } from 'ag-grid-react';
import PropTypes from 'prop-types';
import React from 'react';
import { Button, FormGroup, FormControl } from 'react-bootstrap';
import GenericSubField from '../models/GenericSubField';
import DefinedRenderer from '../generic/DefinedRenderer';

const AddRowBtn = ({ addRow }) => (
  <Button onClick={() => addRow()} bsSize="xsmall" bsStyle="primary"><i className="fa fa-plus" aria-hidden="true" /></Button>
);

AddRowBtn.propTypes = { addRow: PropTypes.func.isRequired };

const DelRowBtn = ({ delRow, node }) => {
  const { data } = node;
  const btnClick = () => {
    delRow(data);
  };
  return (<Button onClick={btnClick} bsSize="xsmall"><i className="fa fa-times" aria-hidden="true" /></Button>);
};

DelRowBtn.propTypes = { delRow: PropTypes.func.isRequired, node: PropTypes.object.isRequired };

const TypeSelect = ({ selType, node }) => (
  <FormGroup bsSize="small" style={{ marginRight: '-10px', marginLeft: '-10px' }}>
    <FormControl componentClass="select" placeholder="select the type" onChange={e => selType(e, node)} defaultValue={node.data.type}>
      <option value="label">label</option>
      <option value="number">number</option>
      <option value="text">text</option>
      <option value="system-defined">System-Defined</option>
    </FormControl>
  </FormGroup>
);

TypeSelect.propTypes = { selType: PropTypes.func.isRequired, node: PropTypes.object.isRequired };

export default class GroupFields extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      unitConfig: props.unitsFields.map(e => ({ value: e.field, name: e.label, label: e.label }))
    };
    this.autoSizeAll = this.autoSizeAll.bind(this);
    this.onGridReady = this.onGridReady.bind(this);
    this.delRow = this.delRow.bind(this);
    this.addRow = this.addRow.bind(this);
    this.selType = this.selType.bind(this);
    this.selDefined = this.selDefined.bind(this);
    this.refresh = this.refresh.bind(this);
    this.onCellValueChanged = this.onCellValueChanged.bind(this);
    this.columnDefs = [
      {
        headerName: 'Id',
        field: 'id',
        editable: false,
        minWidth: 50,
        width: 50,
      },
      {
        headerName: 'Data Type',
        field: 'type',
        editable: false,
        minWidth: 150,
        width: 150,
        cellRendererFramework: TypeSelect,
        cellRendererParams: { selType: this.selType },
      },
      {
        headerName: 'Default Value',
        field: 'value',
        editable: (e) => { if (e.data.type === 'system-defined') return false; return true; },
        minWidth: 250,
        cellRenderer: 'systemDefinedRenderer',
        cellRendererParams: { unitConfig: this.state.unitConfig, selDefined: this.selDefined },
        onCellValueChanged: this.onCellValueChanged
      },
      {
        headerName: 'Option Layers(hidden)',
        field: 'option_layers',
        width: 10,
        hide: true,
      },
      {
        headerName: 'Value System(hidden)',
        field: 'value_system',
        width: 10,
        hide: true,
      },
      {
        headerName: '',
        colId: 'actions',
        headerComponentFramework: AddRowBtn,
        headerComponentParams: { addRow: this.addRow },
        cellRendererFramework: DelRowBtn,
        cellRendererParams: { delRow: this.delRow },
        editable: false,
        filter: false,
        minWidth: 48,
        width: 48,
        suppressSizeToFit: true,
        pinned: 'left'
      },
    ];
    this.frameworkComponents = {
      systemDefinedRenderer: DefinedRenderer
    };
  }

  componentDidUpdate() {
    this.autoSizeAll();
  }

  onGridReady(e) {
    this.gridApi = e.api;
    this.autoSizeAll();
  }

  onCellValueChanged(params) {
    const { oldValue, newValue } = params;
    if (oldValue === newValue) return;
    this.refresh();
  }

  autoSizeAll() {
    if (!this.gridApi) return;
    setTimeout(() => { this.gridApi.sizeColumnsToFit(); }, 10);
  }

  delRow() {
    const selectedData = this.gridApi.getSelectedRows();
    this.gridApi.applyTransaction({ remove: selectedData });
    this.refresh();
  }

  addRow() {
    const newSub = new GenericSubField({ type: 'text', value: '' });
    const idx = this.gridApi.getDisplayedRowCount();
    this.gridApi.applyTransaction({ add: [newSub], addIndex: idx });
    this.refresh();
  }

  selType(e, node) {
    const { data } = node;
    if (e.target.value === data.type) { return; }
    data.type = e.target.value;
    data.value = '';
    const { unitConfig } = this.state;
    if (data.type === 'system-defined') {
      data.option_layers = (unitConfig || [])[0].value;
      data.value_system = ((this.props.unitsFields.find(u => u.field === data.option_layers) || {})
        .units || [])[0].key;
    } else {
      delete data.option_layers;
      delete data.value_system;
    }
    const { updSub, layerKey, field } = this.props;
    const rows = [];
    this.gridApi.forEachNode((nd) => { rows.push(nd.data); });
    field.sub_fields = rows;
    this.gridApi.setRowData(rows);
    updSub(layerKey, field, () => {});
  }

  selDefined(e, node) {
    const { data } = node;
    if (e.target.value === data.option_layers) { return; }
    data.option_layers = e.target.value;
    data.value_system = ((this.props.unitsFields.find(u => u.field === data.option_layers) || {})
      .units || [])[0].key;
    this.refresh();
  }

  refresh() {
    const { updSub, layerKey, field } = this.props;
    const rows = [];
    this.gridApi.forEachNode((nd) => { rows.push(nd.data); });
    field.sub_fields = rows;
    updSub(layerKey, field, () => {});
  }

  render() {
    const { field } = this.props;
    const sub = field.sub_fields || [];
    return (
      <div>
        <div style={{ fontSize: '10px' }}>
          <b>Input Group: </b>
          define the fields which are grouped together and display as one field;<br />
          note: &#39;System-Defined&#39; represents the Unit field which
          has one input field and one unit converter.
        </div>
        <div style={{ width: '100%', height: '100%' }} className="ag-theme-balham">
          <AgGridReact
            enableColResize
            columnDefs={this.columnDefs}
            rowSelection="single"
            onGridReady={this.onGridReady}
            rowData={sub}
            singleClickEdit
            stopEditingWhenGridLosesFocus
            frameworkComponents={this.frameworkComponents}
            domLayout="autoHeight"
          />
        </div>
      </div>
    );
  }
}

GroupFields.propTypes = {
  layerKey: PropTypes.string.isRequired,
  field: PropTypes.object.isRequired,
  updSub: PropTypes.func.isRequired,
  unitsFields: PropTypes.arrayOf(PropTypes.object).isRequired,
};
