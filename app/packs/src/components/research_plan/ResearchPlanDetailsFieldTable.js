import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { range } from 'lodash';
import { Row, Col, Button } from 'react-bootstrap';
import DataGrid from 'react-data-grid';
import { Menu } from 'react-data-grid-addons';
import ResearchPlanDetailsFieldTableContextMenu from './ResearchPlanDetailsFieldTableContextMenu';
import ResearchPlanDetailsFieldTableColumnNameModal from './ResearchPlanDetailsFieldTableColumnNameModal';
import ResearchPlanDetailsFieldTableSchemasModal from './ResearchPlanDetailsFieldTableSchemasModal';
import ResearchPlansFetcher from '../fetchers/ResearchPlansFetcher';
import { AgGridReact } from 'ag-grid-react';
import { ContextMenu, MenuItem, ContextMenuTrigger } from "react-contextmenu";
import uniqueId from 'react-html-id';
import CustomTextEditor from '../common/CustomTextEditor';

// regexp to parse tap separated paste from the clipboard
const defaultParsePaste = str => (
  str.split(/\r\n|\n|\r/).map(row => row.split('\t'))
);

export default class ResearchPlanDetailsFieldTable extends Component {

  constructor(props) {
    super(props);
    this.state = {
      update: this.props.update,
      columnNameModal: {
        show: false,
        colId: null
      },
      schemaModal: {
        show: false
      },
      selection: {},
      gridApi: {},
      columnApi: {},
      columnClicked: null,
      rowClicked: null,
      isDisable: true
    };

    uniqueId.enableUniqueIds(this)

    this.ref = React.createRef();
  }

  componentDidUpdate() {
    if (this.state.update !== this.props.update) {
      this.setState({ update: this.props.update });
    }
  }

  buildColumn(columnName) {
    return {
      key: columnName,
      name: columnName,
      editable: true,
      resizable: true,
      width: 200,
      editor: CustomTextEditor
    };
  }

  buildRow() {
    return [];
  }

  handleColumnNameModalShow(action, colId) {
    this.setState({
      columnNameModal: {
        show: true,
        action,
        colId
      }
    });
  }

  handleColumnNameModalSubmit(columnName) {
    const { action, colId } = this.state.columnNameModal;

    if (action === 'insert') {
      this.handleColumnInsert(columnName);
    } else if (action === 'rename') {
      this.handleColumnRename(colId, columnName);
    }

    this.handleColumnNameModalHide();
  }

  handleColumnNameModalHide() {
    this.setState({
      columnNameModal: {
        show: false,
        action: null,
        idx: null
      }
    });
  }

  handleColumnInsert(columnName) {
    const { field, onChange } = this.props;
    const { gridApi, columnApi } = this.state

    let columnDefs = gridApi.getColumnDefs();
    columnDefs.push({
      headerName: columnName,
      field: columnName,
    });
    gridApi.setColumnDefs(columnDefs);
    field.value.columns = gridApi.getColumnDefs();
    field.value.columnStates = columnApi.getColumnState();

    onChange(field.value, field.id);
  }

  handleColumnRename(colId, columnName) {
    const { field, onChange } = this.props;
    const { gridApi, columnApi } = this.state

    let columnDefs = gridApi.getColumnDefs();
    let columnChange = columnDefs.find(o => o.colId === colId);
    columnChange.headerName = columnName;
    gridApi.setColumnDefs(columnDefs);
    field.value.columns = gridApi.getColumnDefs();
    field.value.columnStates = columnApi.getColumnState();

    onChange(field.value, field.id);
  }

  handleColumnResize(columnIdx, width) {
    const { field, onChange } = this.props;
    field.value.columns[columnIdx]['width'] = width;
    onChange(field.value, field.id);
  }

  handleColumnDelete(columnIdx) {
    const { field, onChange } = this.props;
    const columns = field.value.columns.slice();
    columns.splice(columnIdx, 1);
    field.value.columns = columns;
    onChange(field.value, field.id);
  }

  handleRowInsert(rowIdx) {
    const { field, onChange } = this.props;
    field.value.rows.splice(rowIdx, 0, this.buildRow());
    onChange(field.value, field.id);
  }

  handleRowDelete(rowIdx) {
    const { field, onChange } = this.props;
    field.value.rows.splice(rowIdx, 1);
    onChange(field.value, field.id);
  }

  handleSchemaModalShow() {
    ResearchPlansFetcher.fetchTableSchemas().then((json) => {
      this.setState({
        schemaModal: {
          show: true,
          schemas: json['table_schemas']
        }
      });
    });
  }

  handleSchemasModalSubmit(schemaName) {
    ResearchPlansFetcher.createTableSchema(schemaName, this.props.field.value).then(() => {
      this.handleSchemaModalShow();
    });
  }

  handleSchemasModalHide() {
    this.setState({
      schemaModal: {
        show: false
      }
    });
  }

  handleSchemasModalUse(schema) {
    const { field, onChange } = this.props;

    onChange(schema.value, field.id);
    this.handleSchemasModalHide();
  }

  handleSchemasModalDelete(schema) {
    ResearchPlansFetcher.deleteTableSchema(schema.id).then(() => {
      this.handleSchemaModalShow();
    });
  }

  rowGetter(idx) {
    return this.props.field.value.rows[idx];
  }


  cellValueChanged = () => {
    const { field, onChange } = this.props;
    const { gridApi, columnApi } = this.state

    let rowData = [];
    gridApi.forEachNode(node => rowData.push(node.data));
    field.value.rows = rowData
    field.value.columns = gridApi.getColumnDefs();
    field.value.columnStates = columnApi.getColumnState();

    onChange(field.value, field.id);
  }

  onGridReady = (params) => {
    this.setState({
      gridApi: params.api,
      columnApi: params.columnApi
    });

    const { field } = this.props;
    params.columnApi.setColumnState(field.value.columnStates);
  }

  onSaveGridColumnState(params) {
    const { field, onChange } = this.props;
    const { gridApi, columnApi } = this.state

    field.value.columns = gridApi.getColumnDefs();
    field.value.columnStates = columnApi.getColumnState();

    onChange(field.value, field.id);
  }

  onSaveGridRow() {
    const { field, onChange } = this.props;
    const { gridApi } = this.state

    let rowData = [];
    gridApi.forEachNode(node => rowData.push(node.data));
    field.value.rows = rowData

    onChange(field.value, field.id);
  }

  addNewColumn() {
    const { field, onChange } = this.props;
    const { gridApi, columnApi } = this.state

    let columnDefs = gridApi.getColumnDefs();
    let columnName = this.nextUniqueId();
    columnDefs.push({
      headerName: columnName,
      field: columnName,
    });
    gridApi.setColumnDefs(columnDefs);
    field.value.columns = gridApi.getColumnDefs();
    field.value.columnStates = columnApi.getColumnState();

    onChange(field.value, field.id);
  }

  addNewRow() {
    const { field, onChange } = this.props;
    const { gridApi } = this.state

    gridApi.applyTransaction({
      add: [{}],
    });

    let rowData = [];
    gridApi.forEachNode(node => rowData.push(node.data));
    field.value.columns = gridApi.getColumnDefs();
    field.value.rows = rowData

    onChange(field.value, field.id);
  }

  removeThisRow() {
    const { field, onChange } = this.props;
    const { gridApi, rowClicked } = this.state
    let rowData = [];
    gridApi.forEachNodeAfterFilterAndSort(node => {
      rowData.push(node.data);
    });
    gridApi.applyTransaction({ remove: [rowData[rowClicked]] });

    rowData = rowData.filter(function (value, index, arr) {
      return index !== rowClicked;
    });
    field.value.rows = rowData

    onChange(field.value, field.id);
  }

  removeThisColumn() {
    const { field, onChange } = this.props;
    const { gridApi, columnApi, columnClicked } = this.state
    if (columnClicked) {
      let columnDefs = gridApi.getColumnDefs();
      columnDefs = columnDefs.filter(function (value, index, arr) {
        return value.colId !== columnClicked;
      });

      gridApi.setColumnDefs(columnDefs);
      field.value.columns = gridApi.getColumnDefs();
      field.value.columnStates = columnApi.getColumnState();

      onChange(field.value, field.id);
    }
  }

  onCellContextMenu(params) {
    this.setState({ columnClicked: params.column.colId, rowClicked: params.rowIndex });
  }

  handleRenameClick() {
    const { columnClicked } = this.state;
    if (columnClicked) {
      this.handleColumnNameModalShow('rename', columnClicked);
    }
  }

  handlePaste(event) {
    const { field, onChange } = this.props;
    const { gridApi, columnApi, columnClicked, rowClicked } = this.state;
    onChange(field.value, field.id);

    navigator.clipboard.readText()
      .then(data => {
        let lines = data.split(/\n/);
        let cellData = [];
        lines.forEach(element => {
          cellData.push(element.split('\t'));
        });


        let columns = columnApi.getAllColumns();
        let rowData = [];
        gridApi.forEachNodeAfterFilterAndSort(node => {
          rowData.push(node.data);
        });

        let rowIndex = 0;
        for (let i = 0; i < rowData.length; i++) {
          let row = [];
          let startUpdate = false;
          if (i >= rowClicked) {
            let columnIndex = 0;
            for (let j = 0; j < columns.length; j++) {
              const element = columns[j];
              if (startUpdate || element.colId === columnClicked) {
                startUpdate = true;
                rowData[i][element.colId] = cellData[rowIndex][columnIndex];
                columnIndex++;
              }
            }
            rowIndex++;
          }
        }

        gridApi.applyTransaction({
          update: rowData,
        });

        field.value.rows = rowData
        onChange(field.value, field.id);
      })
      .catch(err => {
        console.error('Failed to read clipboard contents: ', err);
      });
  }

  handleInsertColumnClick() {
    const { columnClicked } = this.state;
    if (columnClicked) {
      this.handleColumnNameModalShow('insert', columnClicked);
    }
  }

  onCellMouseOver() {
    this.setState({ isDisable: false });
  }

  onCellMouseOut() {
    this.setState({ isDisable: true });
  }

  renderEdit() {
    const { field, onExport } = this.props;
    const { rows, columns } = field.value;
    const { columnNameModal, schemaModal, isDisable } = this.state;

    let contextMenuId = this.nextUniqueId();
    const defaultColDef = {
      resizable: true,
      rowDrag: true,
      sortable: true,
      editable: true,
      cellEditor: 'agTextCellEditor',
      cellClass: 'cell-figure',
    };

    return (
      <div>
        <div className='research-plan-table-grid'>
          <div id='myGrid' className='ag-theme-alpine'>
            <ContextMenuTrigger id={contextMenuId} disable={isDisable}>
              <AgGridReact
                defaultColDef={defaultColDef}
                columnDefs={columns}
                rowData={rows}
                domLayout='autoHeight'
                onGridReady={this.onGridReady}
                onCellEditingStopped={this.cellValueChanged}
                rowDragManaged={true}
                animateRows={true}
                singleClickEdit={true}
                stopEditingWhenGridLosesFocus={true}
                rowHeight='37'
                onSortChanged={this.onSaveGridColumnState.bind(this)}
                onColumnResized={this.onSaveGridColumnState.bind(this)}
                onColumnMoved={this.onSaveGridColumnState.bind(this)}
                onCellMouseOver={this.onCellMouseOver.bind(this)}
                onCellMouseOut={this.onCellMouseOut.bind(this)}
                onRowDragEnd={this.onSaveGridRow.bind(this)}
                onCellContextMenu={this.onCellContextMenu.bind(this)}
                enableMultiRowDragging={true}
                rowSelection='multiple'
                suppressDragLeaveHidesColumns={true}
              />
            </ContextMenuTrigger>
            <ContextMenu id={contextMenuId}>
              <MenuItem onClick={this.handlePaste.bind(this)}>
                Paste
            </MenuItem>
              <MenuItem onClick={this.handleRenameClick.bind(this)}>
                Rename column
            </MenuItem>
              <MenuItem divider />
              <MenuItem onClick={this.handleInsertColumnClick.bind(this)}>
                Add new column
            </MenuItem>
              <MenuItem onClick={this.addNewRow.bind(this)}>
                Add new row
            </MenuItem>
              <MenuItem divider />
              <MenuItem onClick={this.removeThisColumn.bind(this)}>
                Remove this column
            </MenuItem>
              <MenuItem onClick={this.removeThisRow.bind(this)}>
                Remove this row
            </MenuItem>
            </ContextMenu>
          </div>
        </div>

        <div className='research-plan-table-toolbar'>
          <Row>
            <Col xs={3}>
              <Button bsSize='xsmall' onClick={this.handleSchemaModalShow.bind(this)}>
                Table schemas
              </Button>
            </Col>
            <Col xs={3} xsOffset={6}>
              <Button bsSize='xsmall' onClick={() => onExport(field)}>
                Export as Excel
              </Button>
            </Col>
          </Row>
        </div>
        <ResearchPlanDetailsFieldTableColumnNameModal
          modal={columnNameModal}
          onSubmit={this.handleColumnNameModalSubmit.bind(this)}
          onHide={this.handleColumnNameModalHide.bind(this)}
          columns={columns} />
        <ResearchPlanDetailsFieldTableSchemasModal
          modal={schemaModal}
          onSubmit={this.handleSchemasModalSubmit.bind(this)}
          onHide={this.handleSchemasModalHide.bind(this)}
          onUse={this.handleSchemasModalUse.bind(this)}
          onDelete={this.handleSchemasModalDelete.bind(this)} />
      </div>
    );
  }

  renderStatic() {
    const { field } = this.props;
    const { columns, rows } = field.value;

    const th = columns.map((column) => {
      return <th key={column.colId}>{column.headerName}</th>;
    });

    const tr = rows.map((row, index) => {
      const td = columns.map((column) => {
        return <td style={{ 'height': '37px' }} key={column.colId}>{row[column.colId]}</td>;
      });
      return (
        <tr key={index}>
          {td}
        </tr>
      );
    });

    return (
      <table className='table table-bordered'>
        <thead>
          <tr>
            {th}
          </tr>
        </thead>
        <tbody>
          {tr}
        </tbody>
      </table>
    );
  }

  render() {
    if (this.props.edit) {
      return this.renderEdit();
    }
    return this.renderStatic();
  }
}

ResearchPlanDetailsFieldTable.propTypes = {
  field: PropTypes.object,
  index: PropTypes.number,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  update: PropTypes.bool,
  edit: PropTypes.bool
};
