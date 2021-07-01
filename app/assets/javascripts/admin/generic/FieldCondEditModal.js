import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { AgGridReact } from 'ag-grid-react';
import { Modal, Button } from 'react-bootstrap';
import GenericSubField from '../../components/models/GenericSubField';
import LayerSelect from '../../components/generic/LayerSelect';
import FieldSelect from '../../components/generic/FieldSelect';

const AddRowBtn = ({ addRow }) => (
  <Button active onClick={() => addRow()} bsSize="xsmall" bsStyle="primary"><i className="fa fa-plus" aria-hidden="true" /></Button>
);

AddRowBtn.propTypes = { addRow: PropTypes.func.isRequired };

const DelRowBtn = ({ delRow, node }) => {
  const { data } = node;
  const btnClick = () => {
    delRow(data);
  };
  return (<Button active onClick={btnClick} bsSize="xsmall" bsStyle="danger"><i className="fa fa-trash" aria-hidden="true" /></Button>);
};

DelRowBtn.propTypes = { delRow: PropTypes.func.isRequired, node: PropTypes.object.isRequired };

export default class FieldCondEditModal extends Component {
  constructor(props) {
    super(props);
    this.formRef = React.createRef();

    this.autoSizeAll = this.autoSizeAll.bind(this);
    this.onGridReady = this.onGridReady.bind(this);
    this.delRow = this.delRow.bind(this);
    this.addRow = this.addRow.bind(this);
    this.selLayer = this.selLayer.bind(this);
    this.selField = this.selField.bind(this);
    this.refresh = this.refresh.bind(this);
    this.onCellValueChanged = this.onCellValueChanged.bind(this);
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
        minWidth: 10,
        width: 10,
      },
      {
        headerName: 'Layer',
        field: 'layer',
        editable: false,
        minWidth: 120,
        width: 120,
        cellRendererFramework: LayerSelect,
        cellRendererParams: { allLayers: this.props.allLayers, selLayer: this.selLayer },
      },
      {
        headerName: 'Field',
        field: 'field',
        editable: false,
        minWidth: 120,
        width: 120,
        cellRendererFramework: FieldSelect,
        cellRendererParams: { allLayers: this.props.allLayers, selField: this.selField, types: ['text', 'select', 'checkbox'] },
      },
      {
        headerName: 'Value',
        field: 'value',
        editable: true,
        minWidth: 120,
        width: 120,
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

    this.gridApi.setColumnDefs(columnDefs);
    this.autoSizeAll();
  }

  delRow() {
    const selectedData = this.gridApi.getSelectedRows();
    this.gridApi.applyTransaction({ remove: selectedData });
    this.refresh();
  }

  addRow() {
    const { allLayers } = this.props;
    const lys = allLayers.filter(e => (e.fields || []).filter(f => ['text', 'select', 'checkbox'].includes(f.type)).length > 0);
    const ly = (lys.length > 0 && lys[0].key) || '';
    const fd = ly === '' ? '' : ((allLayers.find(e => e.key === ly) || {}).fields || []).filter(e => ['text', 'select', 'checkbox'].includes(e.type))[0].field;
    const newSub = new GenericSubField({ layer: ly, field: fd, value: '' });
    const idx = this.gridApi.getDisplayedRowCount();
    this.gridApi.applyTransaction({ add: [newSub], addIndex: idx });
    this.refresh();
  }

  autoSizeAll() {
    if (!this.gridApi) return;
    setTimeout(() => { this.gridApi.sizeColumnsToFit(); }, 10);
  }

  selLayer(e, node) {
    const { data } = node;
    if (e.target.value === data.layer) { return; }
    data.layer = e.target.value;
    const { allLayers } = this.props;
    const ly = data.layer;
    const fdf = ((allLayers.find(l => l.key === ly) || {}).fields || []).filter(l => ['text', 'select', 'checkbox'].includes(l.type)) || [];
    const fd = (fdf.length > 0 && fdf[0].field) || '';
    data.field = fd;
    const { updSub, updLayer, layer, layerKey, field } = this.props;
    const rows = [];
    this.gridApi.forEachNode((nd) => { rows.push(nd.data); });
    this.gridApi.setRowData(rows);
    if (field == null) {
      layer.cond_fields = rows;
      updLayer(layerKey, layer, () => {});
    } else {
      field.cond_fields = rows;
      updSub(layerKey, field, () => {});
    }
  }

  selField(e, node) {
    const { data } = node;
    if (e.target.value === data.field) { return; }
    data.field = e.target.value;
    this.refresh();
  }

  refresh() {
    const { updSub, updLayer, layer, layerKey, field } = this.props;
    const rows = [];
    this.gridApi.forEachNode((nd) => { rows.push(nd.data); });

    if (field == null) {
      layer.cond_fields = rows;
      updLayer(layerKey, layer, () => {});
    } else {
      field.cond_fields = rows;
      updSub(layerKey, field, () => {});
    }
  }

  onCellValueChanged(params) {
    const { oldValue, newValue } = params;
    if (oldValue === newValue) return;
    this.refresh();
  }

  render() {
    const {
      element, showModal, fnClose, layer, layerKey, field, allLayers
    } = this.props;

    const sub = (field == null ? layer.cond_fields : field.cond_fields) || [];
    const title = field == null ? `Layer Restriction Setting [ ${layer.label}]` : `Field Restriction Setting [ layer: ${layer.label} ] [ field: ${field.label} ]`;
    const lafi = field == null ? `layer:${layer.label}` : `field:${field.label}(in layer:${layer.label})`;

    if (showModal) {
      return (
        <Modal backdrop="static" show={showModal} onHide={() => fnClose()}>
          <Modal.Header closeButton>
            <Modal.Title>{title}</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ overflow: 'auto' }}>
            <div style={{ fontSize: '10px' }}>
              <b>Field Restriction: </b>
              when a restriction has been set, the {lafi} is hidden, it shows only when the [Layer,Field,Value] got matched;
              if there are more than one setting, the {lafi} shows when one of them got matched.
            </div>
            <div style={{ fontSize: '10px' }}>
              <b>available field type: </b>
              checkbox (true/false), select, text
            </div>
            <div style={{ width: '100%', height: '26vh' }}>
              <div style={{ width: '100%', height: '100%' }} className="ag-theme-balham">
                <AgGridReact
                  defaultColDef={{ suppressMovable: true, resizable: true }}
                  rowSelection="single"
                  onGridReady={this.onGridReady}
                  rowData={sub}
                  singleClickEdit
                  stopEditingWhenGridLosesFocus
                  rowDragManaged
                  onRowDragEnd={this.refresh}
                />
              </div>
            </div>
          </Modal.Body>
        </Modal>
      );
    }
    return <div />;
  }
}

FieldCondEditModal.propTypes = {
  showModal: PropTypes.bool.isRequired,
  layer: PropTypes.object.isRequired,
  allLayers: PropTypes.arrayOf(PropTypes.object),
  layerKey: PropTypes.string.isRequired,
  updSub: PropTypes.func.isRequired,
  updLayer: PropTypes.func.isRequired,
  field: PropTypes.object,
  element: PropTypes.object.isRequired,
  fnClose: PropTypes.func.isRequired,
};
