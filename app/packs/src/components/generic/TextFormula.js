/* eslint-disable react/forbid-prop-types */
import { AgGridReact } from 'ag-grid-react';
import PropTypes from 'prop-types';
import React from 'react';
import { Button } from 'react-bootstrap';
import GenericSubField from 'src/models/GenericSubField';
import LayerSelect from 'src/components/generic/LayerSelect';
import FieldSelect from 'src/components/generic/FieldSelect';

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

export default class TextFormula extends React.Component {
  constructor(props) {
    super(props);
    this.autoSizeAll = this.autoSizeAll.bind(this);
    this.onGridReady = this.onGridReady.bind(this);
    this.delRow = this.delRow.bind(this);
    this.addRow = this.addRow.bind(this);
    this.selLayer = this.selLayer.bind(this);
    this.selField = this.selField.bind(this);
    this.refresh = this.refresh.bind(this);
    this.onCellValueChanged = this.onCellValueChanged.bind(this);
  }

  componentDidUpdate(prevProps) {
    const { field, allLayers } = this.props;
    const sub = field.text_sub_fields || [];
    if (this.props.allLayers !== prevProps.allLayers) {
      const columnDefs = this.gridApi.getColumnDefs();
      columnDefs.find(c => c.field === 'layer').cellRendererParams.allLayers = allLayers;
      columnDefs.find(c => c.field === 'field').cellRendererParams.allLayers = allLayers;
      this.gridApi.setColumnDefs(columnDefs);
    }
    this.gridApi && this.gridApi.setRowData(sub);
  }

  onGridReady(e) {
    this.gridApi = e.api;
    this.gridColumnApi = e.columnApi;
    const columnDefs = [
      {
        rowDrag: true,
        resizable: true,
        headerName: 'Id',
        field: 'id',
        editable: false,
        minWidth: 100,
        width: 100,
      },
      {
        headerName: 'Layer',
        field: 'layer',
        editable: false,
        minWidth: 150,
        width: 150,
        cellRendererFramework: LayerSelect,
        cellRendererParams: { allLayers: this.props.allLayers, selLayer: this.selLayer },
      },
      {
        headerName: 'Field (type: text)',
        field: 'field',
        editable: false,
        minWidth: 250,
        cellRendererFramework: FieldSelect,
        cellRendererParams: { allLayers: this.props.allLayers, selField: this.selField, types: ['text'], tableText: true },
      },
      {
        headerName: 'Separator',
        field: 'separator',
        editable: true,
        minWidth: 80,
        width: 80,
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
        minWidth: 48,
        width: 48,
        suppressSizeToFit: true,
        pinned: 'left'
      },
    ];
    this.gridApi.setColumnDefs(columnDefs);
    this.autoSizeAll();
  }

  onCellValueChanged(params) {
    const { oldValue, newValue } = params;
    if (oldValue === newValue) return;
    this.refresh();
  }

  delRow() {
    const selectedData = this.gridApi.getSelectedRows();
    this.gridApi.applyTransaction({ remove: selectedData });
    this.refresh();
  }

  addRow() {
    const { allLayers } = this.props;
    const lys = allLayers.filter(e => (e.fields || []).filter(f => f.type === 'text').length > 0);
    const ly = (lys.length > 0 && lys[0].key) || '';
    const fd = ly === '' ? '' : ((allLayers.find(e => e.key === ly) || {}).fields || []).filter(e => e.type === 'text')[0].field;
    const newSub = new GenericSubField({ layer: ly, field: fd, separator: '.' });
    const idx = this.gridApi.getDisplayedRowCount();
    this.gridApi.applyTransaction({ add: [newSub], addIndex: idx });
    this.refresh();
  }

  selLayer(e, node) {
    const { data } = node;
    if (e.target.value === data.layer) { return; }
    data.layer = e.target.value;
    const { allLayers } = this.props;
    const ly = data.layer;
    const fdf = ((allLayers.find(l => l.key === ly) || {}).fields || []).filter(l => l.type === 'text') || [];
    const fd = (fdf.length > 0 && fdf[0].field) || '';
    data.field = fd;
    const { updSub, layerKey, field } = this.props;
    const rows = [];
    this.gridApi.forEachNode((nd) => { rows.push(nd.data); });
    field.text_sub_fields = rows;
    this.gridApi.setRowData(rows);
    updSub(layerKey, field, () => {});
  }

  selField(e, node) {
    const { data } = node;
    if (e.target.value === data.field) { return; }
    data.field = e.target.value;
    this.refresh();
  }

  refresh() {
    const { updSub, layerKey, field } = this.props;
    const rows = [];
    this.gridApi.forEachNode((nd) => { rows.push(nd.data); });
    field.text_sub_fields = rows;
    updSub(layerKey, field, () => {});
  }

  autoSizeAll() {
    if (!this.gridApi) return;
    setTimeout(() => { this.gridApi.sizeColumnsToFit(); }, 10);
  }

  render() {
    const { field } = this.props;
    const sub = field.text_sub_fields || [];
    return (
      <div>
        <div style={{ fontSize: '10px' }}>
          <b>Text-Formula: </b>
          select the text fields which are combined together with separator
        </div>
        <div style={{ width: '100%', height: '100%' }} className="ag-theme-balham">
          <AgGridReact
            enableColResize
            defaultColDef={{ suppressMovable: true }}
            rowSelection="single"
            onGridReady={this.onGridReady}
            rowData={sub}
            singleClickEdit
            stopEditingWhenGridLosesFocus
            rowDragManaged
            onRowDragEnd={this.refresh}
            domLayout="autoHeight"
          />
        </div>
      </div>
    );
  }
}

TextFormula.propTypes = {
  layerKey: PropTypes.string.isRequired,
  field: PropTypes.object.isRequired,
  updSub: PropTypes.func.isRequired,
  allLayers: PropTypes.arrayOf(PropTypes.object)
};

TextFormula.defaultProps = { allLayers: [] };
