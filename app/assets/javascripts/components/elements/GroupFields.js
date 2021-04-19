/* eslint-disable react/forbid-prop-types */
import { AgGridReact } from 'ag-grid-react';
import PropTypes from 'prop-types';
import React from 'react';
import { Button, FormGroup, FormControl } from 'react-bootstrap';
import GenericSubField from '../models/GenericSubField';

const AddRowBtn = ({ addRow }) => (
  <Button active onClick={() => addRow()} bsSize="xsmall" bsStyle="primary"><i className="fa fa-plus" aria-hidden="true" /></Button>
);

AddRowBtn.propTypes = { addRow: PropTypes.func.isRequired };

const DelRowBtn = ({ delRow, node }) => {
  const { data, gridOptionsWrapper } = node;
  const btnClick = () => {
    gridOptionsWrapper.gridOptions.suppressRowClickSelection = true;
    delRow(data);
    setTimeout(() => {
      gridOptionsWrapper.gridOptions.suppressRowClickSelection = false;
    });
  };
  return (<Button active onClick={btnClick} bsSize="xsmall" bsStyle="danger"><i className="fa fa-trash" aria-hidden="true" /></Button>);
};

DelRowBtn.propTypes = { delRow: PropTypes.func.isRequired, node: PropTypes.object.isRequired };

const TypeSelect = ({ selType, node }) => (
  <FormGroup bsSize="small" style={{ marginRight: '-10px', marginLeft: '-10px' }}>
    <FormControl componentClass="select" placeholder="select the type" onChange={e => selType(e, node)} defaultValue={node.data.type}>
      <option value="label">label</option>
      <option value="integer">integer</option>
      <option value="text">text</option>
    </FormControl>
  </FormGroup>
);

TypeSelect.propTypes = { selType: PropTypes.func.isRequired, node: PropTypes.object.isRequired };

export default class GroupFields extends React.Component {
  constructor(props) {
    super(props);
    this.autoSizeAll = this.autoSizeAll.bind(this);
    this.onGridReady = this.onGridReady.bind(this);
    this.delRow = this.delRow.bind(this);
    this.addRow = this.addRow.bind(this);
    this.selType = this.selType.bind(this);
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
        editable: true,
        minWidth: 250,
        onCellValueChanged: this.onCellValueChanged
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
        minWidth: 35,
        width: 35,
      },
    ];
  }

  componentWillReceiveProps(nextProps) {
    if (this.gridApi) this.gridApi.setRowData(nextProps.field.sub_fields);
  }

  componentDidUpdate() {
    this.autoSizeAll();
  }

  onGridReady(e) {
    this.gridApi = e.api;
    this.gridColumnApi = e.columnApi;
    this.autoSizeAll();
  }

  onCellValueChanged(params) {
    const { oldValue, newValue } = params;
    if (oldValue === newValue) return;
    const { updSub, layerKey, field } = this.props;
    const { data } = params;
    const subFields = field.sub_fields || [];
    const idxSub = subFields.findIndex(o => o.id === data.id);
    subFields.splice(idxSub, 1, data);
    field.sub_fields = subFields;
    const cb = () => { if (this.gridApi) { this.gridApi.stopEditing(); } };
    updSub(layerKey, field, cb);
  }

  autoSizeAll() {
    if (!this.gridApi) return;
    setTimeout(() => { this.gridApi.sizeColumnsToFit(); }, 10);
  }

  delRow(data) {
    const { updSub, layerKey, field } = this.props;
    const subFields = field.sub_fields || [];
    const idxSub = subFields.findIndex(o => o.id === data.id);
    subFields.splice(idxSub, 1);
    field.sub_fields = subFields;
    const cb = () => { if (this.gridApi) { this.gridApi.stopEditing(); } };
    updSub(layerKey, field, cb);
  }

  addRow() {
    if (this.gridApi) { this.gridApi.stopEditing(); }
    const { updSub, layerKey, field } = this.props;
    const newSub = GenericSubField.buildEmpty();
    const subFields = field.sub_fields || [];
    subFields.push({ id: newSub.id, type: newSub.type, value: newSub.value });
    field.sub_fields = subFields;
    updSub(layerKey, field, () => {});
  }

  selType(e, node) {
    const { data } = node;
    if (e.target.value === data.type) { return; }
    data.type = e.target.value;
    this.onCellValueChanged({ oldValue: data.type, newValue: e.target.value, data });
  }

  render() {
    const { field } = this.props;
    const sub = field.sub_fields || [];
    return (
      <div style={{ width: '100%', height: '16vh' }}>
        <div style={{ width: '100%', height: '100%' }} className="ag-theme-balham">
          <AgGridReact
            enableColResize
            columnDefs={this.columnDefs}
            rowSelection="single"
            onGridReady={this.onGridReady}
            rowData={sub}
            singleClickEdit
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
};
